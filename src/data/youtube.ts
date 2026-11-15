import type { Track } from '../store'

/**
 * YouTube Data API v3 with the listener's own free key.
 * Quota: 10,000 units/day. search = 100 units; everything else here = 1 unit.
 * Results are cached in localStorage so the dashboard costs almost nothing to reopen.
 */

const API = 'https://www.googleapis.com/youtube/v3'
export const ENV_KEY = (import.meta.env.VITE_YOUTUBE_KEY as string | undefined)?.trim() || null

export class YouTubeError extends Error {
  constructor(
    public kind: 'quota' | 'key' | 'network',
    message: string,
  ) {
    super(message)
  }
}

type Snippet = { title: string; channelTitle: string; channelId: string; categoryId?: string; liveBroadcastContent?: string }
type Video = { id: string; snippet: Snippet; contentDetails?: { duration?: string }; status?: { embeddable?: boolean } }

async function call<T>(path: string, params: Record<string, string>, key: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}?${new URLSearchParams({ ...params, key })}`, { signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new YouTubeError('network', "Couldn't reach YouTube. Check your connection.")
  }
  if (res.ok) return (await res.json()) as T
  let reason = ''
  try {
    reason = ((await res.json()) as { error?: { errors?: { reason?: string }[] } }).error?.errors?.[0]?.reason ?? ''
  } catch {
    /* empty */
  }
  if (reason.includes('quota') || reason === 'rateLimitExceeded') {
    throw new YouTubeError('quota', "Your key's free daily YouTube search limit is used up. It resets at midnight Pacific time; liked songs, playlists and history still play.")
  }
  if (res.status === 400 || res.status === 403) {
    throw new YouTubeError('key', "YouTube didn't accept this API key. Check that YouTube Data API v3 is enabled for it.")
  }
  throw new YouTubeError('network', `YouTube answered ${res.status}. Try again in a moment.`)
}

// ---------- cache ----------
const CACHE = 'aether.cache.v2'
type Entry = { at: number; data: Track[] }
function readCache(): Record<string, Entry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || '{}')
  } catch {
    return {}
  }
}
function cached(k: string, ttlMs: number): Track[] | null {
  const e = readCache()[k]
  return e && Date.now() - e.at < ttlMs ? e.data : null
}
function remember(k: string, data: Track[]) {
  try {
    const c = readCache()
    c[k] = { at: Date.now(), data }
    // keep the cache small: newest 60 entries
    const keep = Object.entries(c).sort((a, b) => b[1].at - a[1].at).slice(0, 60)
    localStorage.setItem(CACHE, JSON.stringify(Object.fromEntries(keep)))
  } catch {
    /* ignore */
  }
}
const HOUR = 3600e3

// ---------- shaping ----------
const decode = (s: string) => {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}
const NOISE = /\s*[([](official\s*(music\s*)?(video|audio|visuali[sz]er|lyric video)|lyrics?( video)?|audio|hd|4k|visuali[sz]er|explicit)[)\]]/gi
export const cleanArtist = (channel: string) => decode(channel).replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim()

function split(rawTitle: string, channel: string) {
  const t = decode(rawTitle).replace(NOISE, '').trim()
  const artist = cleanArtist(channel)
  const dash = t.indexOf(' - ')
  if (dash > 0) {
    const left = t.slice(0, dash).trim()
    const right = t.slice(dash + 3).trim()
    const squash = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    const a = squash(artist)
    const l = squash(left)
    if (a && l && (l.includes(a) || a.includes(l))) return { title: right, artist: left }
  }
  return { title: t, artist }
}

function iso(d?: string) {
  const m = d?.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return +(m[1] || 0) * 86400 + +(m[2] || 0) * 3600 + +(m[3] || 0) * 60 + +(m[4] || 0)
}

const officialness = (v: Video) =>
  (/ - Topic$/i.test(v.snippet.channelTitle) ? 3 : 0) + (/VEVO$/i.test(v.snippet.channelTitle) ? 3 : 0) + (/official/i.test(v.snippet.title) ? 1 : 0)

function toTrack(v: Video): Track {
  const { title, artist } = split(v.snippet.title, v.snippet.channelTitle)
  return { id: v.id, title, artist, channelId: v.snippet.channelId, duration: iso(v.contentDetails?.duration) }
}

const playable = (v: Video) => v.status?.embeddable !== false && v.snippet.liveBroadcastContent !== 'live' && v.snippet.liveBroadcastContent !== 'upcoming'

async function details(ids: string[], key: string, signal?: AbortSignal) {
  if (!ids.length) return []
  const body = await call<{ items?: Video[] }>('/videos', { part: 'snippet,contentDetails,status', id: ids.join(',') }, key, signal)
  const byId = new Map((body.items ?? []).map((v) => [v.id, v]))
  return ids.map((id) => byId.get(id)).filter((v): v is Video => !!v && playable(v))
}

// ---------- public ----------
export const region = () => {
  try {
    const r = new Intl.Locale(navigator.language).maximize().region
    return r && /^[A-Z]{2}$/.test(r) ? r : 'US'
  } catch {
    return 'US'
  }
}
export const regionName = () => {
  try {
    return new Intl.DisplayNames([navigator.language], { type: 'region' }).of(region()) ?? region()
  } catch {
    return region()
  }
}

/** The most-watched music right now in your country (1 unit, cached 1 hour). */
export async function trending(key: string, signal?: AbortSignal): Promise<Track[]> {
  const ck = `trending:${region()}`
  const hit = cached(ck, HOUR)
  if (hit) return hit
  const body = await call<{ items?: Video[] }>(
    '/videos',
    { part: 'snippet,contentDetails,status', chart: 'mostPopular', videoCategoryId: '10', regionCode: region(), maxResults: '40' },
    key,
    signal,
  )
  const out = (body.items ?? []).filter(playable).map(toTrack)
  remember(ck, out)
  return out
}

/** Songs for a search, official channels first (101 units, cached 1 day). */
export async function search(q: string, key: string, signal?: AbortSignal): Promise<Track[]> {
  const ck = `q:${q.toLowerCase()}`
  const hit = cached(ck, 24 * HOUR)
  if (hit) return hit
  const found = await call<{ items?: { id: { videoId?: string } }[] }>(
    '/search',
    { part: 'id', type: 'video', videoCategoryId: '10', videoEmbeddable: 'true', maxResults: '25', q },
    key,
    signal,
  )
  const ids = (found.items ?? []).map((i) => i.id.videoId).filter(Boolean) as string[]
  const vids = await details(ids, key, signal)
  const out = vids
    .map((v, i) => ({ v, score: officialness(v) * 10 - i }))
    .sort((a, b) => b.score - a.score)
    .map(({ v }) => toTrack(v))
  remember(ck, out)
  return out
}

/** A channel's latest uploads (2 units, cached 6 hours). Works for artist, VEVO and "Topic" channels. */
export async function artistSongs(channelId: string, key: string, signal?: AbortSignal): Promise<Track[]> {
  if (!channelId.startsWith('UC')) return []
  const ck = `ch:${channelId}`
  const hit = cached(ck, 6 * HOUR)
  if (hit) return hit
  const list = await call<{ items?: { contentDetails?: { videoId?: string } }[] }>(
    '/playlistItems',
    { part: 'contentDetails', playlistId: `UU${channelId.slice(2)}`, maxResults: '50' },
    key,
    signal,
  ).catch((e) => {
    if (e instanceof YouTubeError && e.kind !== 'key') throw e
    return { items: [] } // channels with no public uploads answer 404
  })
  const ids = (list.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[]
  const vids = await details(ids.slice(0, 50), key, signal)
  const out = vids.filter((v) => !v.snippet.categoryId || v.snippet.categoryId === '10').map(toTrack)
  remember(ck, out)
  return out
}

/** Cheap check that a pasted key works (1 unit). */
export const checkKey = (key: string) => call('/videos', { part: 'id', chart: 'mostPopular', videoCategoryId: '10', maxResults: '1' }, key)

export const art = (id: string, hi = true) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${hi ? 'hq720' : 'mqdefault'}.jpg`
