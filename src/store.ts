import { useSyncExternalStore } from 'react'
import { ENV_KEY } from './data/youtube'

/** A YouTube video, as Aether keeps it. `id` is the YouTube video id. */
export type Track = { id: string; title: string; artist: string; channelId: string; duration: number }
export type Playlist = { id: string; name: string; tracks: Track[]; created: number }
export type Accent = 'blue' | 'pink' | 'orange' | 'green' | 'purple' | 'teal'

export const ACCENTS: Record<Accent, { label: string; color: string }> = {
  blue: { label: 'Blue', color: '#0a84ff' },
  pink: { label: 'Pink', color: '#ff375f' },
  orange: { label: 'Orange', color: '#ff9f0a' },
  green: { label: 'Green', color: '#30d158' },
  purple: { label: 'Purple', color: '#bf5af2' },
  teal: { label: 'Teal', color: '#64d2ff' },
}

export type State = {
  v: 2
  key: string | null
  accent: Accent
  liked: Track[] // newest first
  playlists: Playlist[]
  history: { t: Track; at: number }[] // newest first
  plays: Record<string, { t: Track; n: number; last: number }>
  recent: string[]
  volume: number
  autoplay: boolean
}

const KEY = 'aether.v2'

const fresh = (): State => ({
  v: 2,
  key: null,
  accent: 'pink',
  liked: [],
  playlists: [],
  history: [],
  plays: {},
  recent: [],
  volume: 80,
  autoplay: true,
})

function isTrack(t: unknown): t is Track {
  const x = t as Track
  return !!x && typeof x.id === 'string' && typeof x.title === 'string'
}
const fixTrack = (t: Track): Track => ({
  id: t.id,
  title: t.title,
  artist: typeof t.artist === 'string' ? t.artist : '',
  channelId: typeof t.channelId === 'string' ? t.channelId : '',
  duration: typeof t.duration === 'number' ? t.duration : 0,
})

/** Bring likes, playlists and the key over from the first version of Aether (YouTube songs only). */
function fromV1(): Partial<State> {
  try {
    const raw = localStorage.getItem('aether.profile.v1')
    if (!raw) return {}
    const p = JSON.parse(raw)
    const conv = (t: { id?: string; source?: string; title?: string; artist?: string; duration?: number }): Track | null =>
      t?.source === 'youtube' && typeof t.id === 'string' && t.id.startsWith('yt:')
        ? { id: t.id.slice(3), title: t.title ?? '', artist: t.artist ?? '', channelId: '', duration: t.duration ?? 0 }
        : null
    const liked = Object.values(p.loved ?? {}).map((t) => conv(t as never)).filter(Boolean).reverse() as Track[]
    const playlists = (Array.isArray(p.playlists) ? p.playlists : []).map((pl: { id: string; name: string; created?: number; tracks?: unknown[] }) => ({
      id: pl.id,
      name: pl.name,
      created: pl.created ?? Date.now(),
      tracks: (pl.tracks ?? []).map((t) => conv(t as never)).filter(Boolean) as Track[],
    }))
    return { key: typeof p.youtubeKey === 'string' ? p.youtubeKey : null, liked, playlists }
  } catch {
    return {}
  }
}

function load(): State {
  const base = fresh()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...base, ...fromV1() }
    const s = JSON.parse(raw) as Partial<State>
    return {
      ...base,
      key: typeof s.key === 'string' && s.key ? s.key : null,
      accent: s.accent && s.accent in ACCENTS ? s.accent : base.accent,
      liked: Array.isArray(s.liked) ? s.liked.filter(isTrack).map(fixTrack) : [],
      playlists: Array.isArray(s.playlists)
        ? s.playlists
            .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
            .map((p) => ({ id: p.id, name: p.name, created: p.created ?? Date.now(), tracks: (p.tracks ?? []).filter(isTrack).map(fixTrack) }))
        : [],
      history: Array.isArray(s.history) ? s.history.filter((h) => h && isTrack(h.t)).map((h) => ({ t: fixTrack(h.t), at: h.at })) : [],
      plays: s.plays && typeof s.plays === 'object' ? s.plays : {},
      recent: Array.isArray(s.recent) ? s.recent.filter((x) => typeof x === 'string').slice(0, 8) : [],
      volume: typeof s.volume === 'number' ? Math.min(100, Math.max(0, s.volume)) : base.volume,
      autoplay: s.autoplay !== false,
    }
  } catch {
    return base
  }
}

let state = load()
if (!state.key && ENV_KEY) state = { ...state, key: ENV_KEY }
const subs = new Set<() => void>()
let saveTimer = 0

export const store = {
  get: () => state,
  set(fn: (s: State) => State) {
    state = fn(state)
    subs.forEach((f) => f())
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        /* storage blocked or full: keep working in memory */
      }
    }, 150)
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => pick(store.get()))
}

// ---------- actions ----------

export const isLiked = (s: State, id: string) => s.liked.some((t) => t.id === id)

export const actions = {
  toggleLike(t: Track) {
    store.set((s) => ({ ...s, liked: isLiked(s, t.id) ? s.liked.filter((x) => x.id !== t.id) : [t, ...s.liked] }))
    return isLiked(store.get(), t.id)
  },
  logStart(t: Track) {
    store.set((s) => ({ ...s, history: [{ t, at: Date.now() }, ...s.history.filter((h) => h.t.id !== t.id)].slice(0, 200) }))
  },
  countPlay(t: Track) {
    store.set((s) => {
      const p = s.plays[t.id]
      return { ...s, plays: { ...s.plays, [t.id]: { t, n: (p?.n ?? 0) + 1, last: Date.now() } } }
    })
  },
  createPlaylist(name: string, first?: Track) {
    const id = `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    store.set((s) => ({ ...s, playlists: [...s.playlists, { id, name, created: Date.now(), tracks: first ? [first] : [] }] }))
    return id
  },
  editPlaylist(id: string, fn: (p: Playlist) => Playlist | null) {
    store.set((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === id ? fn(p) : p)).filter(Boolean) as Playlist[] }))
  },
  toggleInPlaylist(id: string, t: Track) {
    actions.editPlaylist(id, (p) => ({ ...p, tracks: p.tracks.some((x) => x.id === t.id) ? p.tracks.filter((x) => x.id !== t.id) : [...p.tracks, t] }))
  },
  addRecent(q: string) {
    store.set((s) => ({ ...s, recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8) }))
  },
  set<K extends keyof State>(k: K, v: State[K]) {
    store.set((s) => ({ ...s, [k]: v }))
  },
}

// ---------- personalization (all local) ----------

export function topArtists(s: State, n = 3) {
  const score = new Map<string, { artist: string; channelId: string; score: number; sample: Track }>()
  const add = (t: Track, w: number) => {
    if (!t.channelId) return
    const cur = score.get(t.channelId) ?? { artist: t.artist, channelId: t.channelId, score: 0, sample: t }
    cur.score += w
    score.set(t.channelId, cur)
  }
  Object.values(s.plays).forEach((p) => add(p.t, p.n))
  s.liked.forEach((t) => add(t, 3))
  s.history.slice(0, 30).forEach((h) => add(h.t, 0.5))
  return [...score.values()].sort((a, b) => b.score - a.score).slice(0, n)
}

export const onRepeat = (s: State) =>
  Object.values(s.plays)
    .filter((p) => p.n >= 2)
    .sort((a, b) => b.n - a.n || b.last - a.last)
    .slice(0, 12)

export const recentlyPlayed = (s: State) => s.history.slice(0, 12).map((h) => h.t)
