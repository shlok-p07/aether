import type { Track } from '../store'

/**
 * The shared queue of a "Listen together" session, as pure functions: each takes the session as it is now and
 * returns the fields to change (or null for "nothing to do"). The engine runs them inside a database transaction,
 * so two people editing at the same moment both land, in order, and nobody's change is lost.
 *
 * Every song in the session carries its own key `k`, so "remove this one" and "move this one" mean that exact
 * entry even if the list changed in between, and the same song can be queued twice.
 * `seq` counts song starts (a replay or repeat counts too); "the song ended, move on" only applies once per start,
 * however many devices report the end.
 */

export type QItem = Track & { k: string; by?: string }
export type Repeat = 'off' | 'all' | 'one'
export type Session = {
  track: QItem | null
  queue: QItem[]
  past: QItem[]
  playing: boolean
  pos: number // seconds into the song…
  at: number // …at this moment (ms)
  seq: number
  repeat: Repeat
  shuffle: boolean
  order: QItem[] | null // up next as it was before shuffle, to restore it
}
export type Patch = Partial<Session>

export const MAX_QUEUE = 100
export const MAX_PAST = 20

const ABC = 'abcdefghijkmnopqrstuvwxyz23456789'
export const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ABC[b % ABC.length]).join('')

/** A clean copy for the session: only the fields the database rules accept. A new entry always gets a new key. */
export const item = (t: Track, by?: string): QItem => ({
  id: t.id,
  title: t.title.slice(0, 300),
  artist: t.artist.slice(0, 200),
  channelId: t.channelId ?? '',
  duration: t.duration || 0,
  k: newKey(),
  ...(by ? { by: by.slice(0, 24) } : {}),
})

export const posNow = (s: Pick<Session, 'playing' | 'pos' | 'at'>, now = Date.now()) => (s.playing ? s.pos + Math.max(0, now - s.at) / 1000 : s.pos)

const pushPast = (past: QItem[], ...items: (QItem | null)[]) => [...past, ...items.filter((x): x is QItem => !!x)].slice(-MAX_PAST)
const startPatch = (s: Session, track: QItem, now: number): Patch => ({ track, pos: 0, at: now, seq: s.seq + 1, playing: true })
const shuffled = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const ops = {
  play: (s: Session, now: number): Patch | null => (s.track && !s.playing ? { playing: true, at: now } : null),

  pause: (s: Session, now: number): Patch | null => (s.playing ? { playing: false, pos: posNow(s, now), at: now } : null),

  seek: (s: Session, t: number, now: number): Patch | null => (s.track ? { pos: Math.max(0, t), at: now } : null),

  /** Next song. `auto` is "the song ended": repeat-one replays, and nothing left means stop. */
  next(s: Session, now: number, auto = false): Patch | null {
    if (auto && s.repeat === 'one' && s.track) return { pos: 0, at: now, seq: s.seq + 1, playing: true }
    if (s.queue.length) return { ...startPatch(s, s.queue[0], now), queue: s.queue.slice(1), past: pushPast(s.past, s.track) }
    if (s.repeat === 'all' && s.track) {
      const all = [...s.past, s.track]
      return { ...startPatch(s, all[0], now), queue: all.slice(1), past: [] }
    }
    return auto ? { playing: false, pos: 0, at: now } : null
  },

  /** "The song ended" from one device: only acts if nobody has moved the session on since that song started. */
  ended: (s: Session, seq: number, now: number): Patch | null => (s.seq === seq ? ops.next(s, now, true) : null),

  /** Previous: back to the start if more than 3 seconds in, otherwise the song before. */
  prev(s: Session, now: number): Patch | null {
    if (!s.track) return null
    if (posNow(s, now) > 3 || !s.past.length) return { pos: 0, at: now, seq: s.seq + 1, playing: true }
    const back = s.past[s.past.length - 1]
    return { ...startPatch(s, back, now), past: s.past.slice(0, -1), queue: [s.track, ...s.queue].slice(0, MAX_QUEUE) }
  },

  /** Tap a song in up next: play it now; the songs before it count as played. */
  jump(s: Session, k: string, now: number): Patch | null {
    const i = s.queue.findIndex((x) => x.k === k)
    if (i < 0) return null
    return { ...startPatch(s, s.queue[i], now), queue: s.queue.slice(i + 1), past: pushPast(s.past, s.track, ...s.queue.slice(0, i)) }
  },

  /** Play a song now; up next stays as it is. */
  playNow: (s: Session, t: Track, by: string, now: number): Patch => ({ ...startPatch(s, item(t, by), now), past: pushPast(s.past, s.track) }),

  /** Play a list now: its first chosen song plays, the rest of the list becomes up next. */
  playList(s: Session, list: Track[], index: number, by: string, now: number, shuffle = false): Patch | null {
    if (!list[index]) return null
    const rest = list.filter((_, i) => i !== index).map((t) => item(t, by))
    const after = shuffle ? shuffled(rest) : list.slice(index + 1).map((t) => item(t, by))
    return {
      ...startPatch(s, item(list[index], by), now),
      queue: after.slice(0, MAX_QUEUE),
      past: pushPast(s.past, s.track),
      shuffle,
      order: shuffle ? rest.slice(0, MAX_QUEUE) : null,
    }
  },

  /** Put a song first in up next (or play it, if nothing is playing). */
  playNext(s: Session, t: Track, by: string, now: number): Patch {
    if (!s.track) return { ...startPatch(s, item(t, by), now) }
    const x = item(t, by)
    return { queue: [x, ...s.queue].slice(0, MAX_QUEUE), ...(s.order ? { order: [x, ...s.order].slice(0, MAX_QUEUE) } : {}) }
  },

  /** Add songs to the end of up next (the first plays at once if nothing is playing). */
  add(s: Session, ts: Track[], by: string, now: number): Patch | null {
    const xs = ts.map((t) => item(t, by))
    if (!xs.length) return null
    if (!s.track) return { ...startPatch(s, xs[0], now), queue: [...s.queue, ...xs.slice(1)].slice(0, MAX_QUEUE) }
    const room = MAX_QUEUE - s.queue.length
    if (room <= 0) return null
    return { queue: [...s.queue, ...xs.slice(0, room)], ...(s.order ? { order: [...s.order, ...xs.slice(0, room)].slice(0, MAX_QUEUE) } : {}) }
  },

  remove(s: Session, k: string): Patch | null {
    if (!s.queue.some((x) => x.k === k)) return null
    return { queue: s.queue.filter((x) => x.k !== k), ...(s.order ? { order: s.order.filter((x) => x.k !== k) } : {}) }
  },

  /** Move one entry of up next to position `to` (0 = first). */
  move(s: Session, k: string, to: number): Patch | null {
    const from = s.queue.findIndex((x) => x.k === k)
    if (from < 0) return null
    const q = [...s.queue]
    const [x] = q.splice(from, 1)
    q.splice(Math.max(0, Math.min(to, q.length)), 0, x)
    return { queue: q }
  },

  clear: (s: Session): Patch | null => (s.queue.length ? { queue: [], order: null } : null),

  setRepeat: (s: Session, r: Repeat): Patch | null => (s.repeat === r ? null : { repeat: r }),

  /** Shuffle up next; turning it off puts it back in the order it was (songs added since keep their place at the end). */
  setShuffle(s: Session, on: boolean): Patch | null {
    if (on) return { shuffle: true, order: [...s.queue], queue: shuffled(s.queue) }
    if (!s.shuffle) return null
    const here = new Set(s.queue.map((x) => x.k))
    const before = (s.order ?? []).filter((x) => here.has(x.k))
    const known = new Set(before.map((x) => x.k))
    return { shuffle: false, order: null, queue: [...before, ...s.queue.filter((x) => !known.has(x.k))] }
  },
}

export const nextRepeat = (r: Repeat): Repeat => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')
