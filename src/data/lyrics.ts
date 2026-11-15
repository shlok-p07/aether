import type { Track } from '../store'

/**
 * Lyrics from LRCLIB (lrclib.net), a free, open lyrics database with time-synced lines.
 * Only used when the listener turns lyrics on in Settings; it receives the song's title, artist and length.
 */

export type Line = { t: number; text: string }
export type Lyrics = {
  lines: Line[] | null // time-synced, when the timing matches this video
  plain: string | null
  instrumental: boolean
  offTiming: boolean // synced lyrics exist, but this video is a different length than the recording
}

type Hit = { trackName?: string; artistName?: string; duration?: number; instrumental?: boolean; plainLyrics?: string | null; syncedLyrics?: string | null }

const API = 'https://lrclib.net/api'
const memo = new Map<string, Lyrics | null>()

/** "Song (feat. X) [Official Video]" → "Song" */
const tidy = (s: string) =>
  s
    .replace(/\s*[([](feat|ft|with|prod)\.?\s[^)\]]*[)\]]/gi, '')
    .replace(/\s*[([][^)\]]*(video|audio|lyric|visuali[sz]er|remaster(ed)?|version|mv|m\/v)[^)\]]*[)\]]/gi, '')
    .replace(/\s+(feat|ft)\.?\s.*$/i, '')
    .trim()

export function parseLrc(text: string): Line[] {
  const out: Line[] = []
  for (const row of text.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)]
    if (!stamps.length) continue
    const words = row.replace(/\[[^\]]*\]/g, '').trim()
    for (const m of stamps) out.push({ t: +m[1] * 60 + parseFloat(m[2].replace(':', '.')), text: words })
  }
  return out.sort((a, b) => a.t - b.t)
}

function shape(h: Hit, videoSec: number): Lyrics | null {
  if (h.instrumental) return { lines: null, plain: null, instrumental: true, offTiming: false }
  const lines = h.syncedLyrics ? parseLrc(h.syncedLyrics) : []
  const plain = h.plainLyrics?.trim() || (lines.length ? lines.map((l) => l.text).join('\n') : null)
  if (!plain) return null
  // Music videos often add an intro or a skit, which would put every line out of step.
  const offTiming = !!lines.length && !!videoSec && !!h.duration && Math.abs(h.duration - videoSec) > 6
  return { lines: lines.length && !offTiming ? lines : null, plain, instrumental: false, offTiming }
}

export async function getLyrics(t: Track, signal?: AbortSignal): Promise<Lyrics | null> {
  if (memo.has(t.id)) return memo.get(t.id) ?? null
  const track = tidy(t.title)
  const artist = t.artist
  const get = async (path: string) => {
    const res = await fetch(`${API}${path}`, { signal })
    if (res.status === 404 || res.status === 400) return null
    if (!res.ok) throw new Error("Couldn't reach the lyrics service. Try again in a moment.")
    return res.json()
  }
  let out: Lyrics | null = null
  try {
    const exact = artist
      ? ((await get(`/get?${new URLSearchParams({ track_name: track, artist_name: artist, ...(t.duration ? { duration: String(Math.round(t.duration)) } : {}) })}`)) as Hit | null)
      : null
    out = exact ? shape(exact, t.duration) : null
    if (!out) {
      const query: Record<string, string> = artist ? { track_name: track, artist_name: artist } : { q: track }
      const found = ((await get(`/search?${new URLSearchParams(query)}`)) as Hit[] | null) ?? []
      const near = (h: Hit) => (t.duration && h.duration ? Math.abs(h.duration - t.duration) : 99)
      const best = found.filter((h) => h.syncedLyrics || h.plainLyrics || h.instrumental).sort((a, b) => near(a) - near(b) || +!!b.syncedLyrics - +!!a.syncedLyrics)[0]
      out = best ? shape(best, t.duration) : null
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw e instanceof TypeError ? new Error("Couldn't reach the lyrics service. Check your connection.") : e
  }
  memo.set(t.id, out)
  return out
}
