import { useSyncExternalStore } from 'react'
import type { Track } from '../store'
import { FIREBASE_CONFIGURED } from './sync'
import { item, ops, posNow, type Patch, type QItem, type Repeat, type Session } from './queue-ops'

/**
 * "Listen together": a host shares a link, and everyone who opens it hears the same song at the same moment.
 *
 * - The session itself is the player. One small record holds the song, where it is ("at this moment it was this far
 *   in"), whether it's playing, up next, the songs before, repeat and shuffle. Every device, the host's included,
 *   plays its own YouTube player in step with it and corrects drift of more than a couple of seconds.
 * - Play, pause, skip, previous, seek, play next, add, remove, reorder, clear, repeat and shuffle all change that
 *   record, from anyone's device, inside a database transaction: edits made at the same moment both land, and every
 *   screen updates. The changes themselves are the pure functions in queue-ops.ts.
 * - The host can keep control to themselves; then others can still send songs (one every 10 seconds), which the
 *   host's device adds. Anyone can send a "love" (one every 5). The host can remove someone, which also blocks them.
 *   The database rules enforce all of this.
 *
 * Clocks: "at" is the clock of whoever made the change. Phones and computers set their time from the network,
 * so they normally agree to well under a second, which is inside the drift we allow.
 */

export type Act = { by: string; uid: string; kind: string; what: string }
export type RoomData = Session & {
  host: string
  hostName: string
  everyone: boolean // anyone in the session may control the music
  act: Act // the last change, for the activity log
  ended: boolean
  banned: string[]
  v: 2
  created: number
}
export type Member = { uid: string; name: string; at: number }
export type Love = { name: string; title: string; at: number; mine: boolean }
export type FeedItem = { key: number; at: number; text: string }

export interface RoomBackend {
  me(): Promise<{ uid: string; name: string }>
  onUid(cb: (uid: string | null) => void): () => void
  create(id: string, data: Omit<RoomData, 'banned'>): Promise<void>
  update(id: string, patch: Partial<RoomData>): Promise<void>
  transact(id: string, change: (r: RoomData) => Partial<RoomData> | null): Promise<boolean>
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
const log = (text: string) => set({ feed: [{ key: ++feedKey, at: Date.now(), text }, ...status.feed].slice(0, 40) })

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

/** Where the session's song is right now, in seconds. */
export const expectedPos = posNow

/** Listeners count as here if they've checked in within the last few minutes. */
export const present = (m: Member[], now = Date.now()) => m.filter((x) => now - x.at < 150_000)

export const REQUEST_GAP = 10_000
export const LOVE_GAP = 5_000

/** What the activity log says about a change. */
const said = (a: Act, mine: boolean): string | null => {
  const who = mine ? 'You' : a.by
  const w = a.what
  switch (a.kind) {
    case 'start':
      return `${who} went live`
    case 'play':
      return `${who} pressed play`
    case 'pause':
      return `${who} paused`
    case 'seek':
      return `${who} jumped to ${w}`
    case 'next':
      return `${who} skipped`
    case 'prev':
      return `${who} went back`
    case 'jump':
    case 'playNow':
      return `${who} played ${w}`
    case 'list':
      return `${who} played ${w}`
    case 'playNext':
      return `${who} put ${w} next`
    case 'add':
      return `${who} added ${w}`
    case 'remove':
      return `${who} removed ${w}`
    case 'move':
      return `${who} moved ${w}`
    case 'clear':
      return `${who} cleared up next`
    case 'repeat':
      return `${who} set repeat ${w}`
    case 'shuffle':
      return `${who} turned shuffle ${w}`
    case 'control':
      return w === 'on' ? `${who} let everyone control the music` : `${who} kept control of the music`
    default:
      return null // songs ending on their own aren't news
  }
}

// ---------------- engine ----------------

let backend: RoomBackend | null = null
let loading: Promise<RoomBackend | null> | null = null
let myName = ''
let stops: (() => void)[] = []
let beat = 0
let lastRequest = 0
let lastLove = 0

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
}

const code = (e: unknown) => String((e as { code?: string })?.code ?? (e as Error)?.message ?? '')
const friendly = (e: unknown) => {
  const c = code(e)
  if (/offline|network|unavailable/i.test(c)) return "You're offline. Reconnect and try again."
  if (/permission/i.test(c)) return 'This session has ended or the link is wrong.'
  return "Couldn't connect to the session. Try again in a moment."
}

/** Older sessions (before shared control) lack some fields; fill them so every device sees the same shape. */
const normal = (r: RoomData): RoomData => ({
  ...r,
  past: r.past ?? [],
  seq: r.seq ?? 1,
  repeat: r.repeat ?? 'off',
  shuffle: r.shuffle ?? false,
  order: r.order ?? null,
  everyone: r.everyone ?? false,
  banned: r.banned ?? [],
})

/** Watches the session record, who's here and reactions; the same for hosts and listeners. */
function follow(b: RoomBackend, id: string) {
  let known: Map<string, string> | null = null
  let lastAct = ''
  let songKey: string | null | undefined
  stops.push(
    b.watch(
      id,
      (raw) => {
        if (!raw || raw.ended) return finish(status.role === 'host' ? 'Your session ended.' : 'The host ended the session.')
        const r = normal(raw)
        if (status.role === 'guest' && status.me && r.banned.includes(status.me)) return finish('The host removed you from the session.')
        const actKey = JSON.stringify(r.act ?? null)
        if (lastAct && actKey !== lastAct && r.act) {
          const line = said(r.act, r.act.uid === status.me)
          if (line) log(line)
        }
        lastAct = actKey
        const now = r.track ? `${r.track.k}:${r.seq}` : null
        if (songKey !== undefined && now && now !== songKey && r.track) log(`Now playing ${r.track.title}`)
        songKey = now
        set({ room: r })
      },
      (e) => set({ error: friendly(e) }),
    ),
    b.members(id, (m) => {
      const next = new Map(m.map((x) => [x.uid, x.name]))
      if (known) {
        for (const [uid, name] of next) if (!known.has(uid) && uid !== status.me) log(`${name} joined`)
        for (const [uid, name] of known) if (!next.has(uid) && uid !== status.me && !status.room?.banned.includes(uid)) log(`${name} left`)
      }
      known = next
      set({ members: [...m].sort((a, b) => a.at - b.at) })
    }),
    b.reactions(id, (list) =>
      list.forEach((r) => {
        const mine = r.uid === status.me
        set({ love: { name: r.name, title: r.title, at: r.at, mine } })
        log(`${mine ? 'You' : r.name} loved ${r.title}`)
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

/** When the host keeps control, songs other people send arrive here and the host's device adds them. */
function hostListen(b: RoomBackend, id: string) {
  stops.push(
    b.requests(id, (list) =>
      list.forEach((r) => {
        room.command('add', r.t.title, (s, now, by) => ops.add(s, [r.t], by, now), r.name).catch(() => {})
      }),
    ),
  )
}

function finish(reason: string) {
  stopAll()
  setHash(null)
  set({ phase: 'over', ...blank, overReason: reason })
}

export const room = {
  /** Starts a session with just the song playing now (nothing else is added) and returns its link. */
  async start(name: string, now: { track: Track | null; playing: boolean; pos: number }) {
    set({ phase: 'connecting', error: undefined })
    const b = await ensure()
    if (!b) return set({ phase: 'off', error: "Listening together isn't available right now." })
    try {
      const me = await b.me()
      myName = cleanName(name) || cleanName(me.name) || 'Host'
      saveName(myName)
      const id = newId()
      const data: Omit<RoomData, 'banned'> = {
        host: me.uid,
        hostName: myName,
        everyone: true,
        track: now.track ? item(now.track, myName) : null,
        queue: [],
        past: [],
        playing: !!now.track && now.playing,
        pos: Math.round(now.pos * 10) / 10,
        at: Date.now(),
        seq: 1,
        repeat: 'off',
        shuffle: false,
        order: null,
        act: { by: myName, uid: me.uid, kind: 'start', what: '' },
        ended: false,
        v: 2,
        created: Date.now(),
      }
      await b.create(id, data)
      await b.heartbeat(id, me.uid, myName)
      set({ phase: 'live', ...blank, id, role: 'host', me: me.uid, room: { ...data, banned: [] }, overReason: undefined })
      setHash(id)
      log('You went live')
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
          (raw) => {
            if (!first && status.phase === 'live') return
            first = false
            if (!raw || raw.ended) return finish('This session has ended.')
            const r = normal(raw)
            if (r.banned.includes(me.uid)) return finish("The host removed you from this session, so you can't rejoin it.")
            if (r.host === me.uid) {
              // The host reloaded the page: carry on hosting.
              stopAll()
              myName = r.hostName
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
      log('You joined')
      follow(b, id)
    } catch (e) {
      set({ error: friendly(e) })
    }
  },

  /** Whether this device may change the music: always for the host, for everyone else when the host allows it. */
  canControl: () => status.phase === 'live' && (status.role === 'host' || !!status.room?.everyone),

  /**
   * Changes the session: `change` gets the session as it is in the database right now and returns what to change.
   * Resolves to true if something changed. `by` names someone else (a song the host adds for a listener).
   */
  async command(kind: string, what: string, change: (s: Session, now: number, by: string) => Patch | null, by?: string): Promise<boolean> {
    const b = backend
    const id = status.id
    if (!b || !id || !status.me || status.phase !== 'live') return false
    const me = status.me
    const who = by ?? myName
    return b.transact(id, (r) => {
      const p = change(normal(r), Date.now(), who)
      return p ? { ...p, act: { by: who, uid: me, kind, what: what.slice(0, 300) } } : null
    })
  },

  /** Host only: let everyone control the music, or keep it to yourself. */
  async setEveryone(on: boolean) {
    const b = backend
    if (!b || !status.id || status.role !== 'host' || !status.me) return
    await b.update(status.id, { everyone: on, act: { by: myName, uid: status.me, kind: 'control', what: on ? 'on' : 'off' } })
  },

  /** Seconds until this listener may send another song (0 = now). */
  requestWait: () => Math.max(0, Math.ceil((lastRequest + REQUEST_GAP - Date.now()) / 1000)),

  /** Listener, when the host keeps control: ask the host to add a song. Throws "wait" if it's too soon. */
  async request(t: Track) {
    const b = backend
    if (!b || !status.id || !status.me) return
    if (room.requestWait() > 0) throw new Error('wait')
    lastRequest = Date.now()
    try {
      await b.request(status.id, status.me, myName, slim(t))
      log(`You sent ${t.title}`)
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
    log(`${name} was removed`)
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

export type { QItem, Repeat }
