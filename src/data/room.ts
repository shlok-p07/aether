import { useSyncExternalStore } from 'react'
import type { Track } from '../store'
import { FIREBASE_CONFIGURED } from './sync'

/**
 * "Listen together": a host shares a link, and everyone who opens it hears the same song at the same moment.
 *
 * - The host's Aether is in charge. It writes the current song, its position, whether it's playing and what's
 *   up next to one small session record. Positions are sent as "at this moment, we were this far in", so
 *   listeners can work out where the song is now without constant updates.
 * - Each listener plays the song in their own YouTube player (which YouTube allows; playing costs no quota and
 *   needs no key) and corrects itself when it drifts more than a couple of seconds.
 * - Listeners can ask for songs (one every 10 seconds) and send a "love" (one every 5). The host can remove
 *   someone, which also blocks them from that session. The database rules enforce all of these limits.
 *
 * Clocks: "at" is the host's clock. Phones and computers set their time from the network, so they normally
 * agree to well under a second, which is inside the drift we allow.
 */

export type RoomData = {
  host: string
  hostName: string
  track: Track | null
  queue: Track[]
  playing: boolean
  pos: number // seconds into the song…
  at: number // …at this moment (ms)
  ended: boolean
  banned: string[]
  v: 1
  created: number
}
export type Member = { uid: string; name: string; at: number }
export type Love = { name: string; title: string; at: number; mine: boolean }
export type FeedItem = { key: number; at: number; kind: 'start' | 'join' | 'leave' | 'song' | 'love' | 'add' | 'remove'; who?: string; what?: string }

export interface RoomBackend {
  me(): Promise<{ uid: string; name: string }>
  onUid(cb: (uid: string | null) => void): () => void
  create(id: string, data: Omit<RoomData, 'banned'>): Promise<void>
  update(id: string, patch: Partial<RoomData>): Promise<void>
  watch(id: string, cb: (r: RoomData | null) => void, fail: (e: unknown) => void): () => void
  members(id: string, cb: (m: Member[]) => void): () => void
  heartbeat(id: string, uid: string, name: string): Promise<void>
  leave(id: string, uid: string): Promise<void>
  request(id: string, uid: string, name: string, t: Track): Promise<void>
  requests(id: string, cb: (r: { uid: string; name: string; t: Track }[]) => void): () => void
  react(id: string, uid: string, name: string, title: string): Promise<void>
  reactions(id: string, cb: (r: { uid: string; name: string; title: string; at: number }[]) => void): () => void
  remove(id: string, uid: string): Promise<void>
  end(id: string): Promise<void>
}

export type RoomStatus = {
  available: boolean
  /** off: not in a session. invited: opened a link, not joined yet. live: in a session. over: the session ended. */
  phase: 'off' | 'connecting' | 'invited' | 'live' | 'over'
  id: string | null
  role: 'host' | 'guest' | null
  me: string | null
  room: RoomData | null
  members: Member[]
  love: Love | null
  feed: FeedItem[]
  error?: string
  overReason?: string
}

// ---------------- status store ----------------

const blank = { id: null, role: null, room: null, members: [], love: null, feed: [] } satisfies Partial<RoomStatus>
let status: RoomStatus = { available: FIREBASE_CONFIGURED, phase: 'off', me: null, ...blank }
const subs = new Set<() => void>()
const set = (patch: Partial<RoomStatus>) => {
  status = { ...status, ...patch }
  subs.forEach((f) => f())
}
export const useRoom = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => status,
  )
export const roomStatus = () => status

let feedKey = 0
const log = (item: Omit<FeedItem, 'key' | 'at'>) => set({ feed: [{ ...item, key: ++feedKey, at: Date.now() }, ...status.feed].slice(0, 40) })

// ---------------- helpers ----------------

const NAME = 'aether.room.name'
export const savedName = () => {
  try {
    return localStorage.getItem(NAME) ?? ''
  } catch {
    return ''
  }
}
const saveName = (n: string) => {
  try {
    localStorage.setItem(NAME, n)
  } catch {
    /* ignore */
  }
}
// eslint-disable-next-line no-control-regex
export const cleanName = (n: string) => n.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24)

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => ABC[b % ABC.length]).join('')
export const roomLink = (id: string) => `${location.origin}${location.pathname}#room=${id}`
/** The session code as people read it: three groups of four. */
export const roomCode = (id: string) => id.toUpperCase().match(/.{1,4}/g)?.join('·') ?? id
export const readRoomHash = (hash = location.hash) => {
  const m = /^#room=([A-Za-z0-9]{8,32})$/.exec(hash)
  return m ? m[1] : null
}
const setHash = (id: string | null) => {
  try {
    history.replaceState(null, '', location.pathname + location.search + (id ? `#room=${id}` : ''))
  } catch {
    /* ignore */
  }
}
const slim = (t: Track): Track => ({ id: t.id, title: t.title.slice(0, 300), artist: t.artist.slice(0, 200), channelId: t.channelId ?? '', duration: t.duration || 0 })

/** Where the host's song is right now, in seconds. */
export const expectedPos = (r: Pick<RoomData, 'playing' | 'pos' | 'at'>, now = Date.now()) => (r.playing ? r.pos + Math.max(0, now - r.at) / 1000 : r.pos)

/** Listeners count as here if they've checked in within the last few minutes. */
export const present = (m: Member[], now = Date.now()) => m.filter((x) => now - x.at < 150_000)

export const REQUEST_GAP = 10_000
export const LOVE_GAP = 5_000

// ---------------- engine ----------------

let backend: RoomBackend | null = null
let loading: Promise<RoomBackend | null> | null = null
let myName = ''
let stops: (() => void)[] = []
let beat = 0
let lastPublished: Pick<RoomData, 'track' | 'playing' | 'pos' | 'at'> | null = null
let pending: Partial<RoomData> | null = null
let writing = false
let lastRequest = 0
let lastLove = 0

/** The host's Aether adds requested songs to its queue through this. */
let onRequest: (t: Track, from: string) => void = () => {}
export const setRequestHandler = (f: typeof onRequest) => {
  onRequest = f
}

function ensure(): Promise<RoomBackend | null> {
  if (backend) return Promise.resolve(backend)
  loading ??= (async () => {
    if (!FIREBASE_CONFIGURED) return null
    try {
      backend = (await import('./room-firebase')).roomBackend()
    } catch {
      backend = null
    }
    return backend
  })()
  return loading
}

function stopAll() {
  stops.forEach((f) => f())
  stops = []
  window.clearInterval(beat)
  lastPublished = null
  pending = null
}

const code = (e: unknown) => String((e as { code?: string })?.code ?? (e as Error)?.message ?? '')
const friendly = (e: unknown) => {
  const c = code(e)
  if (/offline|network|unavailable/i.test(c)) return "You're offline. Reconnect and try again."
  if (/permission/i.test(c)) return 'This session has ended or the link is wrong.'
  return "Couldn't connect to the session. Try again in a moment."
}

/** Watches the session record, who's here and reactions; shared by hosts and listeners. */
function follow(b: RoomBackend, id: string) {
  let known: Map<string, string> | null = null
  let songId: string | null | undefined
  stops.push(
    b.watch(
      id,
      (r) => {
        if (!r || r.ended) return finish(status.role === 'host' ? 'Your session ended.' : 'The host ended the session.')
        if (status.role === 'guest' && status.me && r.banned.includes(status.me)) return finish('The host removed you from the session.')
        const now = r.track?.id ?? null
        if (songId !== undefined && now && now !== songId) log({ kind: 'song', what: r.track!.title })
        songId = now
        set({ room: r })
      },
      (e) => set({ error: friendly(e) }),
    ),
    b.members(id, (m) => {
      const next = new Map(m.map((x) => [x.uid, x.name]))
      if (known) {
        for (const [uid, name] of next) if (!known.has(uid) && uid !== status.me) log({ kind: 'join', who: name })
        for (const [uid, name] of known) if (!next.has(uid) && uid !== status.me && !status.room?.banned.includes(uid)) log({ kind: 'leave', who: name })
      }
      known = next
      set({ members: [...m].sort((a, b) => a.at - b.at) })
    }),
    b.reactions(id, (list) =>
      list.forEach((r) => {
        const mine = r.uid === status.me
        set({ love: { name: r.name, title: r.title, at: r.at, mine } })
        log({ kind: 'love', who: mine ? 'You' : r.name, what: r.title })
      }),
    ),
    // If the person signs in or out while in a session, their identity changes and they can't keep going as before.
    b.onUid((uid) => {
      if (status.phase === 'live' && status.me && uid !== status.me) finish('You signed in or out, so you left the session.')
    }),
  )
  const check = () => status.me && b.heartbeat(id, status.me, myName).catch(() => {})
  beat = window.setInterval(check, 60_000)
}

function hostListen(b: RoomBackend, id: string) {
  stops.push(
    b.requests(id, (list) =>
      list.forEach((r) => {
        onRequest(r.t, r.name)
        log({ kind: 'add', who: r.name, what: r.t.title })
      }),
    ),
  )
}

function finish(reason: string) {
  stopAll()
  setHash(null)
  set({ phase: 'over', ...blank, overReason: reason })
}

async function flush() {
  if (writing || !pending || !backend || !status.id) return
  const patch = pending
  pending = null
  writing = true
  try {
    await backend.update(status.id, patch)
  } catch (e) {
    set({ error: friendly(e) })
  }
  writing = false
  if (pending) flush()
}

export const room = {
  /** Starts a session with what's playing now and returns its link. */
  async start(name: string, now: { track: Track | null; queue: Track[]; playing: boolean; pos: number }) {
    set({ phase: 'connecting', error: undefined })
    const b = await ensure()
    if (!b) return set({ phase: 'off', error: "Listening together isn't available right now." })
    try {
      const me = await b.me()
      myName = cleanName(name) || cleanName(me.name) || 'Host'
      saveName(myName)
      const id = newId()
      const data = {
        host: me.uid,
        hostName: myName,
        track: now.track ? slim(now.track) : null,
        queue: now.queue.slice(0, 50).map(slim),
        playing: now.playing,
        pos: Math.round(now.pos * 10) / 10,
        at: Date.now(),
        ended: false,
        v: 1 as const,
        created: Date.now(),
      }
      await b.create(id, data)
      lastPublished = data
      await b.heartbeat(id, me.uid, myName)
      set({ phase: 'live', ...blank, id, role: 'host', me: me.uid, room: { ...data, banned: [] }, overReason: undefined })
      setHash(id)
      log({ kind: 'start', who: 'You' })
      follow(b, id)
      hostListen(b, id)
      return roomLink(id)
    } catch (e) {
      set({ phase: 'off', error: /permission/i.test(code(e)) ? 'You started a session less than a minute ago. Try again in a moment.' : friendly(e) })
    }
  },

  /** Opens an invitation link: shows who's hosting and what's playing, before joining. A host coming back resumes. */
  async open(id: string) {
    if (status.id === id && status.phase === 'live') return
    stopAll()
    set({ phase: 'connecting', ...blank, id, error: undefined })
    const b = await ensure()
    if (!b) return set({ phase: 'over', overReason: "Listening together isn't available on this copy of Aether." })
    try {
      const me = await b.me()
      set({ me: me.uid })
      let first = true
      stops.push(
        b.watch(
          id,
          (r) => {
            if (!first && status.phase === 'live') return
            first = false
            if (!r || r.ended) return finish('This session has ended.')
            if (r.banned.includes(me.uid)) return finish("The host removed you from this session, so you can't rejoin it.")
            if (r.host === me.uid) {
              // The host reloaded the page: carry on hosting.
              stopAll()
              myName = r.hostName
              lastPublished = r
              set({ phase: 'live', role: 'host', room: r })
              follow(b, id)
              hostListen(b, id)
              b.heartbeat(id, me.uid, myName).catch(() => {})
              return
            }
            set({ phase: 'invited', room: r })
          },
          (e) => set({ phase: 'over', overReason: friendly(e) }),
        ),
      )
      if (!savedName() && me.name) saveName(cleanName(me.name))
    } catch (e) {
      set({ phase: 'over', overReason: friendly(e) })
    }
  },

  /** Joins as a listener. Call it from a tap, so the browser lets the music start. */
  async join(name: string) {
    const b = backend
    const id = status.id
    if (!b || !id || !status.me) return
    myName = cleanName(name) || 'Listener'
    saveName(myName)
    try {
      await b.heartbeat(id, status.me, myName)
      stopAll()
      set({ phase: 'live', role: 'guest', error: undefined, love: null, feed: [] })
      log({ kind: 'join', who: 'You' })
      follow(b, id)
    } catch (e) {
      set({ error: friendly(e) })
    }
  },

  /** Host only: send the latest playback state. Rapid changes are combined into one write. */
  publish(s: { track: Track | null; queue: Track[]; playing: boolean; pos: number }) {
    if (status.role !== 'host' || status.phase !== 'live') return
    const patch: Partial<RoomData> = {
      track: s.track ? slim(s.track) : null,
      queue: s.queue.slice(0, 50).map(slim),
      playing: s.playing,
      pos: Math.round(s.pos * 10) / 10,
      at: Date.now(),
    }
    lastPublished = { track: patch.track!, playing: patch.playing!, pos: patch.pos!, at: patch.at! }
    pending = { ...pending, ...patch }
    window.setTimeout(flush, 250)
  },

  /** Host only: called with the player's position; true when the song has drifted from what listeners expect (a seek, buffering). */
  hostTick(trackId: string | undefined, t: number) {
    const p = lastPublished
    if (status.role !== 'host' || !p || !p.track || p.track.id !== trackId) return false
    return Math.abs(expectedPos(p) - t) > 1.5
  },

  /** Seconds until this listener may send another song (0 = now). */
  requestWait: () => Math.max(0, Math.ceil((lastRequest + REQUEST_GAP - Date.now()) / 1000)),

  /** Listener: ask the host to add a song. Throws "wait" if it's too soon after the last one. */
  async request(t: Track) {
    const b = backend
    if (!b || !status.id || !status.me) return
    if (room.requestWait() > 0) throw new Error('wait')
    lastRequest = Date.now()
    try {
      await b.request(status.id, status.me, myName, slim(t))
      log({ kind: 'add', who: 'You', what: t.title })
    } catch (e) {
      if (/permission/i.test(code(e))) throw new Error('wait')
      throw e
    }
  },

  async love() {
    const b = backend
    const title = status.room?.track?.title
    if (!b || !status.id || !status.me || !title || Date.now() - lastLove < LOVE_GAP) return
    lastLove = Date.now()
    await b.react(status.id, status.me, myName, title.slice(0, 300)).catch(() => {})
  },

  /** Host only: remove a listener and block them from this session. */
  async remove(uid: string, name: string) {
    const b = backend
    if (!b || !status.id || status.role !== 'host' || uid === status.me) return
    await b.remove(status.id, uid)
    log({ kind: 'remove', who: name })
  },

  /** A listener leaves; a host ends the session for everyone. */
  async leave() {
    const b = backend
    const id = status.id
    const me = status.me
    const wasHost = status.role === 'host'
    stopAll()
    setHash(null)
    set({ phase: 'off', ...blank, overReason: undefined })
    if (!b || !id) return
    if (wasHost) await b.end(id).catch(() => {})
    else if (me) await b.leave(id, me).catch(() => {})
  },

  /** Back to the start screen after a session ended. */
  reset() {
    stopAll()
    setHash(null)
    set({ phase: 'off', ...blank, error: undefined, overReason: undefined })
  },
}
