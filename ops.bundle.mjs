// src/data/queue-ops.ts
var MAX_QUEUE = 100;
var MAX_PAST = 20;
var ABC = "abcdefghijkmnopqrstuvwxyz23456789";
var newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ABC[b % ABC.length]).join("");
var item = (t, by) => ({
  id: t.id,
  title: t.title.slice(0, 300),
  artist: t.artist.slice(0, 200),
  channelId: t.channelId ?? "",
  duration: t.duration || 0,
  k: newKey(),
  ...by ? { by: by.slice(0, 24) } : {}
});
var posNow = (s, now = Date.now()) => s.playing ? s.pos + Math.max(0, now - s.at) / 1e3 : s.pos;
var pushPast = (past, ...items) => [...past, ...items.filter((x) => !!x)].slice(-MAX_PAST);
var startPatch = (s, track, now) => ({ track, pos: 0, at: now, seq: s.seq + 1, playing: true });
var shuffled = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
var ops = {
  play: (s, now) => s.track && !s.playing ? { playing: true, at: now } : null,
  pause: (s, now) => s.playing ? { playing: false, pos: posNow(s, now), at: now } : null,
  seek: (s, t, now) => s.track ? { pos: Math.max(0, t), at: now } : null,
  /** Next song. `auto` is "the song ended": repeat-one replays, and nothing left means stop. */
  next(s, now, auto = false) {
    if (auto && s.repeat === "one" && s.track) return { pos: 0, at: now, seq: s.seq + 1, playing: true };
    if (s.queue.length) return { ...startPatch(s, s.queue[0], now), queue: s.queue.slice(1), past: pushPast(s.past, s.track) };
    if (s.repeat === "all" && s.track) {
      const all = [...s.past, s.track];
      return { ...startPatch(s, all[0], now), queue: all.slice(1), past: [] };
    }
    return auto ? { playing: false, pos: 0, at: now } : null;
  },
  /** "The song ended" from one device: only acts if nobody has moved the session on since that song started. */
  ended: (s, seq, now) => s.seq === seq ? ops.next(s, now, true) : null,
  /** Previous: back to the start if more than 3 seconds in, otherwise the song before. */
  prev(s, now) {
    if (!s.track) return null;
    if (posNow(s, now) > 3 || !s.past.length) return { pos: 0, at: now, seq: s.seq + 1, playing: true };
    const back = s.past[s.past.length - 1];
    return { ...startPatch(s, back, now), past: s.past.slice(0, -1), queue: [s.track, ...s.queue].slice(0, MAX_QUEUE) };
  },
  /** Tap a song in up next: play it now; the songs before it count as played. */
  jump(s, k, now) {
    const i = s.queue.findIndex((x) => x.k === k);
    if (i < 0) return null;
    return { ...startPatch(s, s.queue[i], now), queue: s.queue.slice(i + 1), past: pushPast(s.past, s.track, ...s.queue.slice(0, i)) };
  },
  /** Play a song now; up next stays as it is. */
  playNow: (s, t, by, now) => ({ ...startPatch(s, item(t, by), now), past: pushPast(s.past, s.track) }),
  /** Play a list now: its first chosen song plays, the rest of the list becomes up next. */
  playList(s, list, index, by, now, shuffle = false) {
    if (!list[index]) return null;
    const rest = list.filter((_, i) => i !== index).map((t) => item(t, by));
    const after = shuffle ? shuffled(rest) : list.slice(index + 1).map((t) => item(t, by));
    return {
      ...startPatch(s, item(list[index], by), now),
      queue: after.slice(0, MAX_QUEUE),
      past: pushPast(s.past, s.track),
      shuffle,
      order: shuffle ? rest.slice(0, MAX_QUEUE) : null
    };
  },
  /** Put a song first in up next (or play it, if nothing is playing). */
  playNext(s, t, by, now) {
    if (!s.track) return { ...startPatch(s, item(t, by), now) };
    const x = item(t, by);
    return { queue: [x, ...s.queue].slice(0, MAX_QUEUE), ...s.order ? { order: [x, ...s.order].slice(0, MAX_QUEUE) } : {} };
  },
  /** Add songs to the end of up next (the first plays at once if nothing is playing). */
  add(s, ts, by, now) {
    const xs = ts.map((t) => item(t, by));
    if (!xs.length) return null;
    if (!s.track) return { ...startPatch(s, xs[0], now), queue: [...s.queue, ...xs.slice(1)].slice(0, MAX_QUEUE) };
    const room = MAX_QUEUE - s.queue.length;
    if (room <= 0) return null;
    return { queue: [...s.queue, ...xs.slice(0, room)], ...s.order ? { order: [...s.order, ...xs.slice(0, room)].slice(0, MAX_QUEUE) } : {} };
  },
  remove(s, k) {
    if (!s.queue.some((x) => x.k === k)) return null;
    return { queue: s.queue.filter((x) => x.k !== k), ...s.order ? { order: s.order.filter((x) => x.k !== k) } : {} };
  },
  /** Move one entry of up next to position `to` (0 = first). */
  move(s, k, to) {
    const from = s.queue.findIndex((x2) => x2.k === k);
    if (from < 0) return null;
    const q = [...s.queue];
    const [x] = q.splice(from, 1);
    q.splice(Math.max(0, Math.min(to, q.length)), 0, x);
    return { queue: q };
  },
  clear: (s) => s.queue.length ? { queue: [], order: null } : null,
  setRepeat: (s, r) => s.repeat === r ? null : { repeat: r },
  /** Shuffle up next; turning it off puts it back in the order it was (songs added since keep their place at the end). */
  setShuffle(s, on) {
    if (on) return { shuffle: true, order: [...s.queue], queue: shuffled(s.queue) };
    if (!s.shuffle) return null;
    const here = new Set(s.queue.map((x) => x.k));
    const before = (s.order ?? []).filter((x) => here.has(x.k));
    const known = new Set(before.map((x) => x.k));
    return { shuffle: false, order: null, queue: [...before, ...s.queue.filter((x) => !known.has(x.k))] };
  }
};
var nextRepeat = (r) => r === "off" ? "all" : r === "all" ? "one" : "off";
export {
  MAX_PAST,
  MAX_QUEUE,
  item,
  newKey,
  nextRepeat,
  ops,
  posNow
};
