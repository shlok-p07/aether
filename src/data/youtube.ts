import type { Track } from '../store'
import { quota } from './quota'

/**
 * YouTube Data API v3 with the listener's own free key.
 * Quota: 10,000 units/day. search = 100 units; everything else here = 1 unit.
 * Results are cached in localStorage so the dashboard costs almost nothing to reopen.
 */

const API = 'https://www.googleapis.com/youtube/v3'
export const ENV_KEY = (import.meta.env.VITE_YOUTUBE_KEY as string | undefined)?.trim() || null
/** Optional shared server (see worker/) that holds one key for everyone. Set VITE_YOUTUBE_PROXY to its URL. */
export const PROXY = (import.meta.env.VITE_YOUTUBE_PROXY as string | undefined)?.trim().replace(/\/+$/, '') || null
/** Stored in place of a key when the shared server is in use. */
export const PROXY_KEY = 'shared-server'
export const usesProxy = (key: string | null) => key === PROXY_KEY

export class YouTubeError extends Error {
  constructor(
    public kind: 'quota' | 'key' | 'network' | 'notFound',
    message: string,
  ) {
    super(message)
  }
}

type Snippet = { title: string; channelTitle: string; channelId: string; categoryId?: string; liveBroadcastContent?: string }
type Video = { id: string; snippet: Snippet; contentDetails?: { duration?: string }; status?: { embeddable?: boolean } }

async function call<T>(path: string, params: Record<string, string>, key: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  const shared = usesProxy(key)
  if (shared && !PROXY) throw new YouTubeError('key', 'The shared Aether server is no longer set up. Paste your own YouTube key in Settings.')
  const url = shared ? `${PROXY}${path}?${new URLSearchParams(params)}` : `${API}${path}?${new URLSearchParams({ ...params, key })}`
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      // Cancelled because the listener moved on; YouTube has most likely received and charged it already.
      if (!shared) quota.spend(key, path === '/search' ? 100 : 1)
      throw e
    }
    throw new YouTubeError('network', "Couldn't reach YouTube. Check your connection.")
  }
  // Count what this request cost (the shared server's quota belongs to everyone, so it isn't counted here).
  const cost = path === '/search' ? 100 : 1
  if (res.ok) {
    if (!shared) quota.spend(key, cost)
    return (await res.json()) as T
  }
  let reason = ''
  try {
    reason = ((await res.json()) as { error?: { errors?: { reason?: string }[] } }).error?.errors?.[0]?.reason ?? ''
  } catch {
    /* empty */
  }
  const outOfQuota = /quota|dailyLimit/i.test(reason) || reason === 'rateLimitExceeded'
  if (!shared) {
    if (/quota|dailyLimit/i.test(reason)) quota.exhausted(key) // a per-second rate limit isn't the daily limit
    else quota.spend(key, cost) // YouTube charges for refused requests too
  }
  if (outOfQuota) {
    throw new YouTubeError(
      'quota',
      shared
        ? "The shared server's daily YouTube search limit is used up. It resets at midnight Pacific time. Liked songs, playlists and history still play, or paste your own key in Settings."
        : "Your key's free daily YouTube search limit is used up. It resets at midnight Pacific time. Liked songs, playlists and history still play.",
    )
  }
  if (reason.startsWith('playlist') || res.status === 404) {
    throw new YouTubeError('notFound', "That playlist is private or doesn't exist. Set it to Public or Unlisted on YouTube, then try again.")
  }
  if (res.status === 400 || res.status === 403) {
    throw new YouTubeError(
      'key',
      shared ? "The shared Aether server couldn't reach YouTube. Paste your own key in Settings." : "YouTube didn't accept this API key. Check that YouTube Data API v3 is enabled for it.",
    )
  }
  throw new YouTubeError('network', `YouTube answered ${res.status}. Try again in a moment.`)
}

// ---------- cache ----------
const CACHE = 'aether.cache.v3'
try {
  localStorage.removeItem('aether.cache.v2') // older results weren't filtered for Shorts and duplicates
} catch {
  /* ignore */
}
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

const squash = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function split(rawTitle: string, channel: string) {
  const t = decode(rawTitle).replace(NOISE, '').trim()
  const artist = cleanArtist(channel)
  const dash = t.indexOf(' - ')
  if (dash > 0) {
    const left = t.slice(0, dash).trim()
    const right = t.slice(dash + 3).trim()
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

/** Drops Shorts, teasers and (unless allowed) hour-long compilations. Unknown lengths pass. */
function songLike(v: Video, maxSec = 15 * 60) {
  if (/#shorts?\b/i.test(v.snippet.title)) return false
  const d = iso(v.contentDetails?.duration)
  return !d || (d >= 60 && d <= maxSec)
}

/** One copy of each song: the first (most official) upload wins. */
function dedupe(list: Track[]) {
  const seen = new Set<string>()
  return list.filter((t) => {
    const k = `${squash(t.artist)}|${squash(t.title)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

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
  const out = dedupe((body.items ?? []).filter((v) => playable(v) && songLike(v)).map(toTrack))
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
  // Long mixes stay in search (someone may want "lo-fi 1 hour"), Shorts don't.
  const out = dedupe(
    vids
      .filter((v) => songLike(v, Infinity))
      .map((v, i) => ({ v, score: officialness(v) * 10 - i }))
      .sort((a, b) => b.score - a.score)
      .map(({ v }) => toTrack(v)),
  )
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
    if (e instanceof YouTubeError && e.kind === 'notFound') return { items: [] } // channels with no public uploads answer 404
    throw e
  })
  const ids = (list.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[]
  const vids = await details(ids.slice(0, 50), key, signal)
  const out = dedupe(vids.filter((v) => (!v.snippet.categoryId || v.snippet.categoryId === '10') && songLike(v)).map(toTrack))
  remember(ck, out)
  return out
}

/** The playlist id from a YouTube or YouTube Music link, or a bare id. */
export function playlistId(input: string): string | null {
  const s = input.trim()
  try {
    const l = new URL(s).searchParams.get('list')
    if (l) return l
  } catch {
    /* not a URL */
  }
  return /^[A-Za-z0-9_-]{12,64}$/.test(s) ? s : null
}

/**
 * Reads a public or unlisted playlist: 1 unit for the name, then 2 units per 50 songs. Not cached, since playlists change.
 * Songs that are private, deleted or blocked from embedding are counted in `skipped`.
 */
export async function importPlaylist(id: string, key: string, signal?: AbortSignal): Promise<{ title: string; tracks: Track[]; skipped: number }> {
  if (/^(RD|UL)/.test(id)) throw new YouTubeError('notFound', 'YouTube Mixes are made on the fly and can’t be imported. Save the songs to a playlist on YouTube first.')
  if (id === 'LL' || id === 'WL' || id === 'LM') {
    throw new YouTubeError('notFound', 'Liked videos and Watch later are private to your Google account, so they can’t be read here. Copy the songs into a Public or Unlisted playlist first.')
  }
  const meta = await call<{ items?: { snippet?: { title?: string } }[] }>('/playlists', { part: 'snippet', id }, key, signal)
  const title = meta.items?.[0]?.snippet?.title
  if (!title) throw new YouTubeError('notFound', "That playlist is private or doesn't exist. Set it to Public or Unlisted on YouTube, then try again.")
  const ids: string[] = []
  let page = ''
  do {
    const body = await call<{ items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string }>(
      '/playlistItems',
      { part: 'contentDetails', playlistId: id, maxResults: '50', ...(page ? { pageToken: page } : {}) },
      key,
      signal,
    )
    for (const i of body.items ?? []) if (i.contentDetails?.videoId) ids.push(i.contentDetails.videoId)
    page = body.nextPageToken ?? ''
  } while (page && ids.length < 500)
  const unique = [...new Set(ids)]
  const tracks: Track[] = []
  for (let i = 0; i < unique.length; i += 50) tracks.push(...(await details(unique.slice(i, i + 50), key, signal)).map(toTrack))
  return { title: decode(title), tracks, skipped: unique.length - tracks.length }
}

/** A video's description, where YouTube's auto-generated uploads list label, release date and credits (1 unit). */
export async function videoDescription(id: string, key: string, signal?: AbortSignal) {
  const body = await call<{ items?: { snippet?: { description?: string } }[] }>('/videos', { part: 'snippet', id }, key, signal)
  return body.items?.[0]?.snippet?.description ?? ''
}

/** Cheap check that a pasted key works (1 unit). */
export const checkKey = (key: string) => call('/videos', { part: 'id', chart: 'mostPopular', videoCategoryId: '10', maxResults: '1' }, key)

export const art = (id: string, hi = true) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${hi ? 'hq720' : 'mqdefault'}.jpg`

/**
 * A link that opens the songs as a queue on YouTube (up to 50), in the YouTube app on phones.
 * This is YouTube's own "watch_videos" address, which turns a list of videos into a temporary playlist.
 */
export const youtubeQueueLink = (tracks: { id: string }[]) =>
  `https://www.youtube.com/watch_videos?video_ids=${tracks
    .slice(0, 50)
    .map((t) => encodeURIComponent(t.id))
    .join(',')}`
