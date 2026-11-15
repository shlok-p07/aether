import { useSyncExternalStore } from 'react'
import { ENV_KEY, PROXY, PROXY_KEY } from './data/youtube'

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

/** One listen: video id, when it started, seconds actually heard, and whether you skipped it early. */
export type Listen = { id: string; at: number; s: number; k?: 1 }
export type PlayStat = { t: Track; n: number; last: number; skips?: number }

export type State = {
  v: 2
  key: string | null
  accent: Accent
  liked: Track[] // newest first
  playlists: Playlist[]
  history: { t: Track; at: number }[] // newest first
  plays: Record<string, PlayStat>
  events: Listen[] // newest first
  recent: string[]
  volume: number
  autoplay: boolean
  lyrics: boolean
  about: boolean
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
  events: [],
  recent: [],
  volume: 80,
  autoplay: true,
  lyrics: false,
  about: false,
})

const MAX_EVENTS = 5000

export function isTrack(t: unknown): t is Track {
  const x = t as Track
  return !!x && typeof x.id === 'string' && typeof x.title === 'string'
}
export const fixTrack = (t: Track): Track => ({
  id: t.id.slice(0, 64),
  title: t.title.slice(0, 300),
  artist: typeof t.artist === 'string' ? t.artist.slice(0, 200) : '',
  channelId: typeof t.channelId === 'string' ? t.channelId.slice(0, 64) : '',
  duration: typeof t.duration === 'number' && Number.isFinite(t.duration) ? t.duration : 0,
})
const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d)

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

/** Cleans anything that looks like saved Aether data (localStorage or a backup file) into a valid State. */
function normalize(s: Partial<State>, base = fresh()): State {
  const plays: Record<string, PlayStat> = {}
  if (s.plays && typeof s.plays === 'object') {
    for (const [id, p] of Object.entries(s.plays)) {
      if (p && isTrack(p.t)) plays[id] = { t: fixTrack(p.t), n: num(p.n), last: num(p.last), ...(num(p.skips) ? { skips: num(p.skips) } : {}) }
    }
  }
  return {
    ...base,
    key: typeof s.key === 'string' && s.key ? s.key : null,
    accent: s.accent && s.accent in ACCENTS ? s.accent : base.accent,
    liked: Array.isArray(s.liked) ? s.liked.filter(isTrack).map(fixTrack) : [],
    playlists: Array.isArray(s.playlists)
      ? s.playlists
          .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
          .map((p) => ({ id: p.id, name: p.name.slice(0, 120), created: num(p.created, Date.now()), tracks: (Array.isArray(p.tracks) ? p.tracks : []).filter(isTrack).map(fixTrack) }))
      : [],
    history: Array.isArray(s.history) ? s.history.filter((h) => h && isTrack(h.t)).map((h) => ({ t: fixTrack(h.t), at: num(h.at) })) : [],
    plays,
    events: Array.isArray(s.events)
      ? s.events
          .filter((e) => e && typeof e.id === 'string')
          .map((e) => ({ id: e.id, at: num(e.at), s: num(e.s), ...(e.k ? { k: 1 as const } : {}) }))
          .slice(0, MAX_EVENTS)
      : [],
    recent: Array.isArray(s.recent) ? s.recent.filter((x) => typeof x === 'string').slice(0, 8) : [],
    volume: typeof s.volume === 'number' ? Math.min(100, Math.max(0, s.volume)) : base.volume,
    autoplay: s.autoplay !== false,
    lyrics: s.lyrics === true,
    about: s.about === true,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...fresh(), ...fromV1() }
    return normalize(JSON.parse(raw) as Partial<State>)
  } catch {
    return fresh()
  }
}

let state = load()
if (!state.key && ENV_KEY) state = { ...state, key: ENV_KEY }
if (!state.key && PROXY) state = { ...state, key: PROXY_KEY }
const subs = new Set<() => void>()
let saveTimer = 0
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage blocked or full: keep working in memory */
  }
}

export const store = {
  get: () => state,
  set(fn: (s: State) => State) {
    state = fn(state)
    subs.forEach((f) => f())
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(save, 150)
  },
  /** Write now, e.g. when the tab is closing. */
  flush() {
    window.clearTimeout(saveTimer)
    save()
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
      return { ...s, plays: { ...s.plays, [t.id]: { ...p, t, n: (p?.n ?? 0) + 1, last: Date.now() } } }
    })
  },
  createPlaylist(name: string, first?: Track | Track[]) {
    const id = `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const tracks = Array.isArray(first) ? [...first] : first ? [first] : []
    store.set((s) => ({ ...s, playlists: [...s.playlists, { id, name, created: Date.now(), tracks }] }))
    return id
  },
  editPlaylist(id: string, fn: (p: Playlist) => Playlist | null) {
    store.set((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === id ? fn(p) : p)).filter(Boolean) as Playlist[] }))
  },
  toggleInPlaylist(id: string, t: Track) {
    actions.editPlaylist(id, (p) => ({ ...p, tracks: p.tracks.some((x) => x.id === t.id) ? p.tracks.filter((x) => x.id !== t.id) : [...p.tracks, t] }))
  },
  /** Called when a song stops being the current one. Skips count against a song; time heard feeds Stats. */
  logListen(t: Track, seconds: number, skipped: boolean) {
    store.set((s) => {
      const p = s.plays[t.id]
      const ev: Listen = { id: t.id, at: Date.now() - seconds * 1000, s: seconds, ...(skipped ? { k: 1 as const } : {}) }
      return {
        ...s,
        events: [ev, ...s.events].slice(0, MAX_EVENTS),
        plays: { ...s.plays, [t.id]: { t, n: p?.n ?? 0, last: p?.last ?? 0, ...((p?.skips ?? 0) + (skipped ? 1 : 0) ? { skips: (p?.skips ?? 0) + (skipped ? 1 : 0) } : {}) } },
      }
    })
  },
  clearListening() {
    store.set((s) => ({ ...s, history: [], plays: {}, events: [] }))
  },
  addRecent(q: string) {
    store.set((s) => ({ ...s, recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8) }))
  },
  set<K extends keyof State>(k: K, v: State[K]) {
    store.set((s) => ({ ...s, [k]: v }))
  },
}

// ---------- backup ----------

/** Everything except the API key, as a JSON file body. */
export function exportBackup() {
  const { key: _key, ...data } = store.get()
  return JSON.stringify({ app: 'aether', version: 2, exported: new Date().toISOString(), data }, null, 1)
}

/** Merges a backup into what's here. Importing the same file twice changes nothing. */
export function importBackup(text: string) {
  let parsed: { app?: string; data?: Partial<State> }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("This file isn't an Aether backup. Choose the .json file that Export saved.")
  }
  if (parsed?.app !== 'aether' || !parsed.data) throw new Error("This file isn't an Aether backup. Choose the .json file that Export saved.")
  const merged = mergeLibraries(store.get(), normalize(parsed.data))
  store.set((s) => ({ ...s, ...syncedPart(merged.state), key: s.key }))
  return merged.added
}

/**
 * Union of two libraries: nothing in either is lost. `a` is this device; `b` is the other copy.
 * Used by backup import and the first time a device signs in.
 */
export function mergeLibraries(a: State, b: State) {
  const added = { liked: 0, playlists: 0, plays: 0 }
  const likedIds = new Set(a.liked.map((t) => t.id))
  const liked = [...a.liked, ...b.liked.filter((t) => !likedIds.has(t.id) && likedIds.add(t.id))]
  added.liked = liked.length - a.liked.length
  const plIds = new Set(a.playlists.map((p) => p.id))
  const newPls = b.playlists.filter((p) => !plIds.has(p.id))
  added.playlists = newPls.length
  const plays = { ...a.plays }
  for (const [id, p] of Object.entries(b.plays)) {
    const cur = plays[id]
    if (!cur) added.plays += p.n
    else if (p.n > cur.n) added.plays += p.n - cur.n
    plays[id] = cur ? { ...cur, n: Math.max(cur.n, p.n), last: Math.max(cur.last, p.last), skips: Math.max(cur.skips ?? 0, p.skips ?? 0) || undefined } : p
  }
  const seenH = new Set(a.history.map((h) => h.t.id))
  const history = [...a.history, ...b.history.filter((h) => !seenH.has(h.t.id) && seenH.add(h.t.id))].sort((x, y) => y.at - x.at).slice(0, 200)
  const seenE = new Set(a.events.map((e) => `${e.id}@${e.at}`))
  const events = [...a.events, ...b.events.filter((e) => !seenE.has(`${e.id}@${e.at}`))].sort((x, y) => y.at - x.at).slice(0, MAX_EVENTS)
  const recent = [...a.recent, ...b.recent.filter((q) => !a.recent.includes(q))].slice(0, 8)
  return { state: { ...a, liked, playlists: [...a.playlists, ...newPls], plays, history, events, recent, key: a.key ?? b.key }, added }
}

// ---------- sync between devices ----------

/** What follows you between devices when you sign in. Volume stays per device. */
export const SYNCED = ['key', 'accent', 'liked', 'playlists', 'history', 'plays', 'events', 'recent', 'autoplay', 'lyrics', 'about'] as const
export type Synced = Pick<State, (typeof SYNCED)[number]>
export const syncedPart = (s: State): Synced => Object.fromEntries(SYNCED.map((k) => [k, s[k]])) as Synced
export const parseSynced = (data: unknown): State => normalize((data ?? {}) as Partial<State>)

/** Takes another device's copy as the truth (last change wins, so deletions carry over). A missing key never erases this device's key. */
export function applySynced(data: State) {
  store.set((s) => ({ ...s, ...syncedPart(data), key: data.key ?? s.key }))
}

/** First sign-in on a device: keep everything from both, and take the account's settings when it has some. */
export function joinAccount(cloud: State) {
  store.set((s) => {
    const { state } = mergeLibraries(s, cloud)
    return { ...s, ...syncedPart(state), accent: cloud.accent, autoplay: cloud.autoplay, lyrics: cloud.lyrics || s.lyrics, about: cloud.about || s.about }
  })
}

// ---------- personalization (all local) ----------

const DAY = 86400e3
/** Plays minus skips: a song you keep skipping sinks even if you once played it a lot. */
const weight = (p: PlayStat) => p.n - 0.75 * (p.skips ?? 0)
export const skippedOften = (s: State, id: string) => {
  const p = s.plays[id]
  return !!p && (p.skips ?? 0) >= 2 && (p.skips ?? 0) > p.n
}

export function topArtists(s: State, n = 3) {
  const score = new Map<string, { artist: string; channelId: string; score: number; sample: Track }>()
  const add = (t: Track, w: number) => {
    if (!t.channelId) return
    const cur = score.get(t.channelId) ?? { artist: t.artist, channelId: t.channelId, score: 0, sample: t }
    cur.score += w
    score.set(t.channelId, cur)
  }
  Object.values(s.plays).forEach((p) => add(p.t, Math.max(0, weight(p))))
  s.liked.forEach((t) => add(t, 3))
  s.history.slice(0, 30).forEach((h) => add(h.t, 0.5))
  return [...score.values()].sort((a, b) => b.score - a.score).slice(0, n)
}

/** What you're playing a lot lately: 2+ plays, last heard within 30 days, ranked by plays minus skips. */
export const onRepeat = (s: State, now = Date.now()) =>
  Object.values(s.plays)
    .filter((p) => p.n >= 2 && weight(p) >= 1.5 && now - p.last < 30 * DAY)
    .sort((a, b) => weight(b) - weight(a) || b.last - a.last)
    .slice(0, 12)

/** Songs you played a lot but haven't heard in over a month. */
export const forgotten = (s: State, now = Date.now()) =>
  Object.values(s.plays)
    .filter((p) => p.n >= 3 && weight(p) >= 2 && p.last && now - p.last > 30 * DAY)
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, 12)

export const SLOTS = [
  { key: 'morning', label: 'Mornings', from: 5, to: 12 },
  { key: 'afternoon', label: 'Afternoons', from: 12, to: 17 },
  { key: 'evening', label: 'Evenings', from: 17, to: 22 },
  { key: 'night', label: 'Late nights', from: 22, to: 5 },
] as const
export type Slot = (typeof SLOTS)[number]
export const slotOf = (hour: number): Slot => SLOTS.find((x) => (x.from < x.to ? hour >= x.from && hour < x.to : hour >= x.from || hour < x.to))!

/** Songs you actually listen to at this time of day (heard 30s+, not skipped). Needs 5 different songs to show. */
export function timeMix(s: State, now = new Date()) {
  const slot = slotOf(now.getHours())
  const count = new Map<string, number>()
  for (const e of s.events) {
    if (e.k || e.s < 30 || slotOf(new Date(e.at).getHours()) !== slot) continue
    count.set(e.id, (count.get(e.id) ?? 0) + 1)
  }
  const list = [...count.entries()]
    .filter(([id]) => s.plays[id] && !skippedOften(s, id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => s.plays[id].t)
  return { slot, list: list.length >= 5 ? list : [] }
}

export type Period = 7 | 30 | 'all'
export function stats(s: State, period: Period, now = Date.now()) {
  const from = period === 'all' ? 0 : now - period * DAY
  const evs = s.events.filter((e) => e.at >= from)
  const songs = new Map<string, { t: Track; plays: number; sec: number }>()
  const artists = new Map<string, { name: string; channelId: string; sample: Track; plays: number; sec: number }>()
  const slots = new Map<Slot['key'], number>(SLOTS.map((x) => [x.key, 0]))
  const days = new Set<string>()
  let sec = 0
  let skips = 0
  for (const e of evs) {
    const t = s.plays[e.id]?.t
    sec += e.s
    if (e.k) skips += 1
    const d = new Date(e.at)
    days.add(d.toDateString())
    const sk = slotOf(d.getHours()).key
    slots.set(sk, (slots.get(sk) ?? 0) + e.s)
    if (!t) continue
    const counted = !e.k ? 1 : 0
    const so = songs.get(t.id) ?? { t, plays: 0, sec: 0 }
    so.plays += counted
    so.sec += e.s
    songs.set(t.id, so)
    const ak = t.channelId || t.artist
    const ar = artists.get(ak) ?? { name: t.artist, channelId: t.channelId, sample: t, plays: 0, sec: 0 }
    ar.plays += counted
    ar.sec += e.s
    artists.set(ak, ar)
  }
  return {
    sec,
    listens: evs.length,
    skips,
    days: days.size,
    distinct: [...songs.values()].filter((x) => x.plays > 0).length,
    since: s.events.length ? s.events[s.events.length - 1].at : null,
    songs: [...songs.values()].filter((x) => x.plays > 0).sort((a, b) => b.plays - a.plays || b.sec - a.sec).slice(0, 10),
    artists: [...artists.values()].filter((x) => x.plays > 0).sort((a, b) => b.sec - a.sec).slice(0, 8),
    slots: SLOTS.map((x) => ({ ...x, sec: slots.get(x.key) ?? 0 })).sort((a, b) => b.sec - a.sec),
  }
}

/** Instant search over everything already in your library: no YouTube quota. */
export function searchLibrary(s: State, text: string) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return { tracks: [] as Track[], playlists: [] as Playlist[] }
  const hit = (str: string) => {
    const h = str.toLowerCase()
    return words.every((w) => h.includes(w))
  }
  const seen = new Map<string, { t: Track; rank: number }>()
  const add = (t: Track, rank: number) => {
    if (!hit(`${t.title} ${t.artist}`)) return
    const cur = seen.get(t.id)
    if (!cur || cur.rank < rank) seen.set(t.id, { t, rank })
  }
  s.liked.forEach((t) => add(t, 1000))
  Object.values(s.plays).forEach((p) => add(p.t, weight(p)))
  s.playlists.forEach((pl) => pl.tracks.forEach((t) => add(t, 1)))
  s.history.forEach((h) => add(h.t, 0))
  return {
    tracks: [...seen.values()].sort((a, b) => b.rank - a.rank).slice(0, 8).map((x) => x.t),
    playlists: s.playlists.filter((p) => hit(p.name)).slice(0, 6),
  }
}
export const recentlyPlayed = (s: State) => s.history.slice(0, 12).map((h) => h.t)
