import type { Track } from '../store'
import { videoDescription } from './youtube'

/**
 * "About this song": where a song comes from.
 * - YouTube's own credits (free with the key the listener already uses). Auto-generated "Topic" uploads list the
 *   label, release date, writers and producers in their description.
 * - MusicBrainz (open music database): first release date, album, and where the artist is from.
 * - Wikipedia: the background paragraph of the song's article, or the artist's if the song has none.
 * MusicBrainz and Wikipedia are only asked when the listener turns on "Song background" in Settings.
 */

export type Credits = { label?: string; album?: string; released?: string; year?: string; writers: string[]; producers: string[]; tracks: { t: number; label: string }[] }
export type Background = {
  released?: string // YYYY, YYYY-MM or YYYY-MM-DD
  album?: string
  origin?: string // "Toronto, Canada"
  since?: { label: 'Born' | 'Formed'; year: string }
  story?: { text: string; url: string; about: 'song' | 'artist'; title: string }
}

const squash = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const uniq = (xs: string[]) => [...new Map(xs.map((x) => [x.toLowerCase(), x.trim()])).values()].filter(Boolean)
const tidy = (s: string) =>
  s
    .replace(/\s*[([](feat|ft|with|prod)\.?\s[^)\]]*[)\]]/gi, '')
    .replace(/\s*[([][^)\]]*(video|audio|lyric|visuali[sz]er|remaster(ed)?|version|mv)[^)\]]*[)\]]/gi, '')
    .replace(/\s+(feat|ft)\.?\s.*$/i, '')
    .trim()

// ---------------- YouTube credits ----------------

export function parseCredits(desc: string): Credits {
  const lines = desc.split(/\r?\n/).map((l) => l.trim())
  const out: Credits = { writers: [], producers: [], tracks: [] }
  const provided = lines.findIndex((l) => /^Provided to YouTube by /i.test(l))
  if (provided >= 0) {
    out.label = lines[provided].replace(/^Provided to YouTube by /i, '').trim()
    // Topic layout: "Provided to…", blank, "Song · Artist", blank, "Album", blank, "℗ …"
    const rest = lines.slice(provided + 1).filter(Boolean)
    if (rest[0]?.includes(' · ') && rest[1] && !/^(℗|©|Released on)/.test(rest[1])) out.album = rest[1]
  }
  for (const l of lines) {
    const rel = l.match(/^Released on:\s*(\d{4}-\d{2}-\d{2})/i)
    if (rel) out.released = rel[1]
    const p = l.match(/^[℗©]\s*(\d{4})/)
    if (p && !out.year) out.year = p[1]
    const role = l.match(/^([A-Za-z][A-Za-z ,&/-]{2,60}):\s*(.{2,80})$/)
    if (role && !/released on/i.test(role[1])) {
      if (/compos|lyric|writer|songwrit|author/i.test(role[1])) out.writers.push(role[2])
      if (/producer/i.test(role[1]) && !/executive/i.test(role[1])) out.producers.push(role[2])
    }
    const by = l.match(/^(Written|Produced) by:?\s+(.{2,200})$/i)
    if (by) (by[1].toLowerCase() === 'written' ? out.writers : out.producers).push(...by[2].split(/\s*(?:,|&|\band\b)\s*/))
  }
  // Mix tracklists: "00:00 Artist - Song", "1. Artist - Song (3:25)", "Artist - Song 1:02:10"
  const stamp = String.raw`((?:\d{1,2}:)?\d{1,2}:\d{2})`
  for (const l of lines) {
    const m = l.match(new RegExp(String.raw`^[\[(]?${stamp}[\])]?\s*[-–—.:)]?\s*(.{2,120})$`)) ?? l.match(new RegExp(String.raw`^(?:\d{1,3}[.)]\s*)?(.{2,120}?)\s*[-–—]?\s*[\[(]?${stamp}[\])]?$`))
    if (!m) continue
    const [time, label] = /:\d{2}$/.test(m[1]) && !/[a-z]/i.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]]
    const secs = time.split(':').reduce((a, x) => a * 60 + Number(x), 0)
    const clean = label.replace(/^\d{1,3}[.)]\s*/, '').trim()
    if (/[\p{L}]/u.test(clean)) out.tracks.push({ t: secs, label: clean })
  }
  out.tracks.sort((a, b) => a.t - b.t)
  if (out.tracks.length < 3) out.tracks = []
  out.writers = uniq(out.writers).slice(0, 8)
  out.producers = uniq(out.producers).slice(0, 8)
  return out
}

const creditMemo = new Map<string, Credits>()
export async function getCredits(t: Track, key: string, signal?: AbortSignal) {
  const hit = creditMemo.get(t.id)
  if (hit) return hit
  const c = parseCredits(await videoDescription(t.id, key, signal))
  creditMemo.set(t.id, c)
  return c
}

// ---------------- MusicBrainz ----------------

const MB = 'https://musicbrainz.org/ws/2'
let mbLast = 0
/** MusicBrainz allows one request per second per client. */
async function mb<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const wait = mbLast + 1100 - Date.now()
  mbLast = Math.max(Date.now(), mbLast + 1100)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  signal?.throwIfAborted()
  const url = `${MB}${path}${path.includes('?') ? '&' : '?'}fmt=json`
  let res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (res.status === 503) {
    // Rate-limited: back off once, then give up for now (and don't remember the miss).
    await new Promise((r) => setTimeout(r, 1600))
    mbLast = Date.now()
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`MusicBrainz answered ${res.status}`)
  return (await res.json()) as T
}

type MbRelease = { title: string; status?: string; date?: string; 'release-group'?: { 'primary-type'?: string; 'secondary-types'?: string[] } }
type MbRecording = {
  title: string
  score?: number
  disambiguation?: string
  'first-release-date'?: string
  'artist-credit'?: { name: string; artist: { id: string; name: string } }[]
  releases?: MbRelease[]
}
type MbArtist = { type?: string; area?: { name: string }; 'begin-area'?: { name: string }; 'life-span'?: { begin?: string } }

/** An official studio album, single or EP: not a live album, compilation, DJ mix, remix or karaoke release. */
const original = (r: MbRelease) =>
  r.status === 'Official' &&
  !!r.date &&
  ['Album', 'Single', 'EP'].includes(r['release-group']?.['primary-type'] ?? '') &&
  !(r['release-group']?.['secondary-types'] ?? []).length

async function musicbrainz(title: string, artist: string, signal?: AbortSignal) {
  const q = `recording:"${title.replace(/"/g, '')}"` + (artist ? ` AND artist:"${artist.replace(/"/g, '')}"` : '')
  const body = await mb<{ recordings?: MbRecording[] }>(`/recording?limit=50&query=${encodeURIComponent(q)}`, signal)
  const same = (body?.recordings ?? []).filter(
    (r) =>
      (r.score ?? 0) >= 80 &&
      squash(r.title) === squash(title) &&
      !/live|karaoke|remix|instrumental|acoustic|demo|cover|mix|edit|version|sped|slowed/i.test(r.disambiguation ?? '') &&
      (!artist || r['artist-credit']?.some((a) => squash(artist).includes(squash(a.name)) || squash(a.name).includes(squash(artist)))),
  )
  if (!same.length) return {}
  // The song's origin is its earliest original release; compilations and reissues come later and are skipped.
  const releases = same.flatMap((r) => (r.releases ?? []).filter(original).map((rel) => ({ rel, rec: r })))
  releases.sort((a, b) => a.rel.date!.localeCompare(b.rel.date!))
  const first = releases[0]
  const albums = releases.filter((x) => x.rel['release-group']?.['primary-type'] === 'Album')
  const out: Pick<Background, 'released' | 'album' | 'origin' | 'since'> = {}
  if (first) {
    // A release often only has a year; the recording's own first date is more precise when it agrees.
    const precise = first.rec['first-release-date']
    out.released = precise && precise.startsWith(first.rel.date!.slice(0, 4)) && precise.length > first.rel.date!.length ? precise : first.rel.date
  }
  out.album = albums[0]?.rel.title
  const artistId = (first?.rec ?? same[0])['artist-credit']?.[0]?.artist.id
  if (artistId) {
    const a = await mb<MbArtist>(`/artist/${artistId}`, signal)
    const begin = a?.['begin-area']?.name
    const area = a?.area?.name
    out.origin = begin && area && begin !== area ? `${begin}, ${area}` : begin || area
    const year = a?.['life-span']?.begin?.slice(0, 4)
    if (year) out.since = { label: a?.type === 'Person' ? 'Born' : 'Formed', year }
  }
  return out
}

// ---------------- Wikipedia ----------------

const WIKI = 'https://en.wikipedia.org'
type Summary = { type?: string; title: string; extract?: string; content_urls?: { desktop?: { page?: string } } }

async function summary(page: string, signal?: AbortSignal) {
  const res = await fetch(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(page.replace(/ /g, '_'))}`, { signal })
  if (!res.ok) return null
  const s = (await res.json()) as Summary
  return s.type === 'disambiguation' || !s.extract ? null : s
}

async function wikipedia(title: string, artist: string, signal?: AbortSignal): Promise<Background['story']> {
  const params = new URLSearchParams({ action: 'query', list: 'search', format: 'json', origin: '*', srlimit: '6', srsearch: `${title} ${artist} song` })
  const res = await fetch(`${WIKI}/w/api.php?${params}`, { signal })
  if (res.ok) {
    const hits = ((await res.json()) as { query?: { search?: { title: string }[] } }).query?.search ?? []
    // "Blinding Lights", "Hello (Adele song)", "Bad Guy (song)"
    const page = hits.find((h) => squash(h.title.replace(/\s*\(.*\)$/, '')) === squash(title))
    if (page) {
      const s = await summary(page.title, signal)
      // Only trust it if the article is about a song by this artist.
      if (s?.extract && /\b(song|single|track)\b/i.test(s.extract) && (!artist || squash(s.extract).includes(squash(artist.split(/\s*[,&]\s*/)[0])))) {
        return { text: s.extract, url: s.content_urls?.desktop?.page ?? `${WIKI}/wiki/${encodeURIComponent(s.title)}`, about: 'song', title: s.title }
      }
    }
  }
  if (!artist) return undefined
  // No article for the song: say where the artist comes from instead.
  for (const name of [artist, `${artist} (musician)`, `${artist} (singer)`, `${artist} (band)`]) {
    const s = await summary(name, signal)
    if (s?.extract && /\b(singer|rapper|band|musician|songwriter|group|DJ|record producer|duo|composer|artist)\b/i.test(s.extract)) {
      return { text: s.extract, url: s.content_urls?.desktop?.page ?? `${WIKI}/wiki/${encodeURIComponent(s.title)}`, about: 'artist', title: s.title }
    }
  }
  return undefined
}

const bgMemo = new Map<string, Background>()
export async function getBackground(t: Track, signal?: AbortSignal): Promise<Background> {
  const hit = bgMemo.get(t.id)
  if (hit) return hit
  const title = tidy(t.title)
  const [m, w] = await Promise.allSettled([musicbrainz(title, t.artist, signal), wikipedia(title, t.artist, signal)])
  signal?.throwIfAborted()
  if (m.status === 'rejected' && w.status === 'rejected') throw new Error("Couldn't reach Wikipedia or MusicBrainz. Check your connection.")
  const out: Background = { ...(m.status === 'fulfilled' ? m.value : {}), story: w.status === 'fulfilled' ? w.value : undefined }
  // Only remember complete answers, so a brief outage doesn't hide facts for the rest of the session.
  if (m.status === 'fulfilled' && w.status === 'fulfilled') bgMemo.set(t.id, out)
  return out
}

/** "2019-11-29" → "29 November 2019", "2019-11" → "November 2019" */
export function fmtDate(d?: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  if (!m) return String(y)
  return new Date(y, m - 1, day || 1).toLocaleDateString(undefined, day ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' })
}
