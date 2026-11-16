import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ACCENTS, actions, skippedOften, store, useStore, type Track } from './store'
import { artistSongs, art } from './data/youtube'
import { readShareLink } from './data/share'
import { ambientColor } from './data/ambient'
import { sync } from './data/sync'
import { useKeepAwake } from './app/wakelock'
import { readRoomHash, room, useRoom } from './data/room'
import { nextRepeat, ops, posNow, type QItem } from './data/queue-ops'
import { RoomChip, RoomPage } from './components/room'
import { Stage } from './components/stage'
import { stage as fullView, useStage } from './app/stage'
import { fmtTime, NavContext, PlayerContext, type NavApi, type Page, type PlayerApi, type Repeat } from './app/context'
import { YouTubeStage, type YTHandle, type YTState } from './components/YouTubeStage'
import { NowPlaying, PlayerBar, Sidebar, TabBar } from './components/chrome'
import { Artist, History, Home, Library, Liked, PlaylistPage, Queue, Search, Settings, Shared, SongPage, Stats } from './pages'

const shuffled = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function App() {
  const accent = useStore((s) => s.accent)
  const volume = useStore((s) => s.volume)

  // ---------------- navigation ----------------
  const [stack, setStack] = useState<Page[]>([{ name: 'home' }])
  const page = stack[stack.length - 1]
  const main = useRef<HTMLElement>(null)
  const [toast, setToast] = useState<string | null>(null)

  const nav = useMemo<NavApi>(
    () => ({
      page,
      go: (p) => {
        setStack((s) => {
          const top = ['home', 'search', 'library', 'settings'].includes(p.name)
          return top ? [p] : [...s, p].slice(-20)
        })
        main.current?.scrollTo({ top: 0 })
      },
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      canGoBack: stack.length > 1,
      notify: setToast,
    }),
    [page, stack.length],
  )

  // ---------------- player ----------------
  const yt = useRef<YTHandle>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffleState] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [muted, setMuted] = useState(false)
  const unshuffled = useRef<Track[] | null>(null)
  const wantPlay = useRef(false)
  const counted = useRef<string | null>(null)
  const failures = useRef(0)
  const current = queue[pos] ?? null
  const st = useRef({ queue, pos, repeat, time, current, shuffle, duration, loading, playing })
  st.current = { queue, pos, repeat, time, current, shuffle, duration, loading, playing }

  // ---- listen together: in a session, the session is the player. Every control changes it, every device follows it. ----
  const rs = useRoom()
  const live = rs.phase === 'live' && !!rs.room
  const roomRef = useRef(rs)
  roomRef.current = rs
  const lastSeek = useRef(0)
  const [nudge, setNudge] = useState(0) // follow the session again after a change from here didn't go through
  const inSession = () => roomRef.current.phase === 'live' && !!roomRef.current.room
  const hostName = () => roomRef.current.room?.hostName || 'The host'
  const sendRequest = (t: Track) => {
    room
      .request(t)
      .then(() => setToast(`Sent “${t.title}” to ${hostName()}.`))
      .catch((e) =>
        setToast(
          (e as Error).message === 'wait'
            ? `You can send another song in ${Math.max(1, room.requestWait())} seconds.`
            : `Couldn't send “${t.title}”. Check your connection and try again.`,
        ),
      )
  }
  /** Run a change on the session's shared queue. `none` is said if there was nothing to change, `done` when it worked. */
  const shared = (kind: string, what: string, change: Parameters<typeof room.command>[2], msg: { none?: string; done?: string } = {}) => {
    if (!room.canControl()) {
      setToast(`${hostName()} is keeping control of the music. You can still send songs.`)
      setNudge((n) => n + 1)
      return
    }
    room
      .command(kind, what, change)
      .then((ok) => {
        if (!ok) setNudge((n) => n + 1)
        if (!ok && msg.none) setToast(msg.none)
        else if (ok && msg.done) setToast(msg.done)
      })
      .catch(() => {
        setNudge((n) => n + 1)
        setToast("Couldn't reach the session. Check your connection and try again.")
      })
  }

  // ---- listening log: seconds actually heard (seeking doesn't count), and whether the song was skipped ----
  const listening = useRef<Track | null>(null)
  const heard = useRef(0)
  const lastT = useRef<number | null>(null)
  const startListen = (t: Track) => {
    listening.current = t
    heard.current = 0
    lastT.current = null
  }
  /** 'ended': played out. 'skip': you moved on. 'quiet': stopped for another reason (error, closing the tab), never a skip. */
  const finishListen = useCallback((how: 'ended' | 'skip' | 'quiet') => {
    const t = listening.current
    if (!t) return
    listening.current = null
    const sec = Math.round(heard.current)
    heard.current = 0
    lastT.current = null
    const need = Math.min(30, (st.current.duration || t.duration || 60) / 2)
    const skipped = how === 'skip' && sec < need
    if (sec >= 1 || skipped) actions.logListen(t, sec, skipped)
  }, [])

  useEffect(() => {
    const bye = () => {
      finishListen('quiet')
      store.flush()
    }
    window.addEventListener('pagehide', bye)
    return () => window.removeEventListener('pagehide', bye)
  }, [finishListen])

  // A new song: load it into YouTube's player and remember it.
  useEffect(() => {
    finishListen('skip') // no-op if the last song already ended or failed
    if (!current) return
    yt.current?.load(current.id, wantPlay.current)
    if (wantPlay.current) setLoading(true)
    setTime(0)
    setDuration(current.duration)
    counted.current = null
    if (wantPlay.current) {
      actions.logStart(current)
      startListen(current)
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: 'Aether',
        artwork: [{ src: art(current.id, false), sizes: '320x180', type: 'image/jpeg' }],
      })
    }
  }, [current?.id, pos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Count a play once 30 seconds (or half a short song) have been heard.
  useEffect(() => {
    if (!current || counted.current === current.id) return
    const need = Math.min(30, (duration || 60) / 2)
    if (time >= need) {
      counted.current = current.id
      actions.countPlay(current)
    }
  }, [time, current, duration])

  const playList = useCallback((list: Track[], index: number, whole?: boolean | 'shuffle') => {
    if (!list.length) return
    if (inSession()) {
      const s = st.current
      const t = list[index] ?? list[0]
      // A song in up next: jump straight to it, for everyone.
      if (list === s.queue) {
        if (index === s.pos) return shared('play', '', (x, now) => ops.play(x, now))
        const k = (t as QItem).k
        if (k) shared('jump', t.title, (x, now) => ops.jump(x, k, now), { none: 'That song is no longer in up next.' })
        return
      }
      if (!room.canControl()) return sendRequest(t)
      // "Play" or "Shuffle" on a list replaces up next; tapping one song plays it now and leaves up next alone.
      if (whole) return shared('list', t.title, (x, now, by) => ops.playList(x, list, index, by, now, whole === 'shuffle'))
      return shared('playNow', t.title, (x, now, by) => ops.playNow(x, t, by, now))
    }
    wantPlay.current = true
    setToast(null)
    const s = st.current
    if (whole === 'shuffle') setShuffleState(true)
    if (s.current && list[index]?.id === s.current.id && s.queue === list) {
      yt.current?.play()
      return
    }
    if (s.shuffle || whole === 'shuffle') {
      // keep the chosen song first, shuffle the rest
      unshuffled.current = list
      setQueue([list[index], ...shuffled(list.filter((_, i) => i !== index))])
      setPos(0)
    } else {
      unshuffled.current = null
      setQueue(list)
      setPos(index)
    }
  }, [])

  const toggle = useCallback(() => {
    const s = st.current
    if (!s.current) return
    if (inSession()) {
      const r = roomRef.current.room!
      if (r.playing && !playing) {
        // The session is playing but this device isn't (the browser held it back): play along.
        if (!listening.current) startListen(s.current)
        wantPlay.current = true
        lastSeek.current = 0
        yt.current?.play()
        return
      }
      if (room.canControl()) {
        // Answer at once here; everyone else follows within a moment.
        wantPlay.current = !r.playing
        if (r.playing) yt.current?.pause()
        else yt.current?.play()
      }
      return shared(r.playing ? 'pause' : 'play', '', (x, now) => (x.playing ? ops.pause(x, now) : ops.play(x, now)))
    }
    if (playing) {
      wantPlay.current = false
      yt.current?.pause()
    } else {
      if (!wantPlay.current && s.time < 1) actions.logStart(s.current)
      if (!listening.current) startListen(s.current)
      wantPlay.current = true
      yt.current?.play()
    }
  }, [playing])

  const autoplayMore = useCallback(async () => {
    const s = st.current
    const key = store.get().key
    if (!s.current || !key || !store.get().autoplay || !s.current.channelId) return false
    try {
      const more = await artistSongs(s.current.channelId, key)
      const now = store.get()
      const seen = new Set([...s.queue.map((t) => t.id), ...now.history.slice(0, 40).map((h) => h.t.id)])
      const fresh = shuffled(more.filter((t) => !seen.has(t.id) && !skippedOften(now, t.id))).slice(0, 10)
      if (!fresh.length) return false
      setQueue((q) => [...q, ...fresh])
      setPos((p) => p + 1)
      setToast(`Autoplay: more from ${s.current.artist}.`)
      return true
    } catch {
      return false
    }
  }, [])

  const next = useCallback(
    (auto = false) => {
      const s = st.current
      if (!s.queue.length) return
      wantPlay.current = true
      if (auto && s.repeat === 'one') {
        if (s.current) startListen(s.current)
        counted.current = null
        yt.current?.seek(0)
        yt.current?.play()
        return
      }
      if (s.pos < s.queue.length - 1) setPos(s.pos + 1)
      else if (s.repeat === 'all') setPos(0)
      else
        autoplayMore().then((ok) => {
          if (ok) return
          if (auto) {
            wantPlay.current = false
            setPlaying(false)
          } else setToast("That's the end of the queue.")
        })
    },
    [autoplayMore],
  )

  const prev = useCallback(() => {
    const s = st.current
    if (s.time > 3 || s.pos === 0) {
      yt.current?.seek(0)
      return
    }
    wantPlay.current = true
    setPos(s.pos - 1)
  }, [])

  const setShuffle = useCallback((on: boolean) => {
    if (inSession()) return shared('shuffle', on ? 'on' : 'off', (x) => ops.setShuffle(x, on))
    setShuffleState(on)
    const s = st.current
    if (!s.queue.length) return
    if (on) {
      unshuffled.current = s.queue
      setQueue([...s.queue.slice(0, s.pos + 1), ...shuffled(s.queue.slice(s.pos + 1))])
    } else if (unshuffled.current) {
      const orig = unshuffled.current
      const at = orig.findIndex((t) => t.id === s.current?.id)
      unshuffled.current = null
      setQueue(orig)
      setPos(at < 0 ? 0 : at)
    }
  }, [])

  const cycleRepeat = useCallback(() => {
    if (inSession()) {
      const n = nextRepeat(roomRef.current.room!.repeat)
      return shared('repeat', n === 'one' ? 'to this song' : n === 'all' ? 'to everything' : 'off', (x) => ops.setRepeat(x, nextRepeat(x.repeat)))
    }
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addToQueue = useCallback(
    (t: Track) => {
      if (inSession()) {
        if (!room.canControl()) return sendRequest(t)
        return shared('add', t.title, (x, now, by) => ops.add(x, [t], by, now), { none: 'Up next is full (100 songs).', done: `Added “${t.title}” to up next.` })
      }
      if (!st.current.current) return playList([t], 0)
      setQueue((q) => [...q, t])
    },
    [playList], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const player = useMemo<PlayerApi>(
    () => ({
      queue,
      pos,
      current,
      playing,
      loading,
      time,
      duration,
      shuffle: live ? rs.room!.shuffle : shuffle,
      repeat: live ? rs.room!.repeat : repeat,
      muted,
      playList,
      toggle,
      next: () => (inSession() ? shared('next', '', (x, now) => ops.next(x, now), { none: 'Nothing queued after this song.' }) : next(false)),
      prev: () => (inSession() ? shared('prev', '', (x, now) => ops.prev(x, now)) : prev()),
      seek: (t) => {
        if (inSession()) {
          if (!room.canControl()) return shared('seek', '', () => null)
          lastSeek.current = Date.now()
          yt.current?.seek(t)
          setTime(t)
          return shared('seek', fmtTime(t), (x, now) => ops.seek(x, t, now))
        }
        yt.current?.seek(t)
        setTime(t)
      },
      playNext: (t) => {
        if (inSession()) {
          if (!room.canControl()) return sendRequest(t)
          return shared('playNext', t.title, (x, now, by) => ops.playNext(x, t, by, now), { done: `“${t.title}” plays next.` })
        }
        if (!st.current.current) return playList([t], 0)
        setQueue((q) => [...q.slice(0, st.current.pos + 1), t, ...q.slice(st.current.pos + 1)])
      },
      addToQueue,
      removeAt: (i) => {
        if (i === st.current.pos) return
        if (inSession()) {
          const it = st.current.queue[i] as QItem | undefined
          if (it?.k) shared('remove', it.title, (x) => ops.remove(x, it.k))
          return
        }
        setQueue((q) => q.filter((_, j) => j !== i))
        if (i < st.current.pos) setPos((p) => p - 1)
      },
      move: (from, to) => {
        if (inSession()) {
          const it = st.current.queue[from] as QItem | undefined
          if (it?.k && to > st.current.pos) shared('move', it.title, (x) => ops.move(x, it.k, to - st.current.pos - 1))
          return
        }
        setQueue((q) => {
          if (to <= st.current.pos || to >= q.length) return q
          const a = [...q]
          const [m] = a.splice(from, 1)
          a.splice(to, 0, m)
          return a
        })
      },
      clearQueue: () => {
        if (inSession()) return shared('clear', '', (x) => ops.clear(x))
        setQueue((q) => q.slice(0, st.current.pos + 1))
      },
      setShuffle,
      cycleRepeat,
      setVolume: (v) => {
        actions.set('volume', v)
        if (v > 0) setMuted(false)
      },
      toggleMute: () => setMuted((m) => !m),
    }),
    [queue, pos, current, playing, loading, time, duration, shuffle, repeat, muted, playList, toggle, next, prev, setShuffle, cycleRepeat, addToQueue, live, rs.room?.shuffle, rs.room?.repeat], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    yt.current?.volume(volume, muted)
  }, [volume, muted])

  const onState = useCallback(
    (s: YTState) => {
      if (s === 'playing') {
        setPlaying(true)
        setLoading(false)
        failures.current = 0
      } else if (s === 'paused') setPlaying(false)
      else if (s === 'buffering') setLoading(true)
      else if (s === 'ended') {
        finishListen('ended')
        if (inSession()) {
          // Every device reports the end; the session moves on once, from whichever report arrives first.
          // A late report (about a song the session already replaced, or one the session thinks is still mid-way) is
          // ignored, and this device simply catches up with the session.
          setPlaying(false)
          const r = roomRef.current.room!
          const here = st.current
          const end = here.duration || r.track?.duration || 0
          const real = !!r.track && here.current?.id === r.track.id && (!end || posNow(r) >= end - 5)
          if (real && room.canControl()) room.command('auto', '', (x, now) => ops.ended(x, r.seq, now)).catch(() => {})
        } else next(true)
      }
    },
    [next, finishListen],
  )
  const onTime = useCallback((t: number, d: number) => {
    setTime(t)
    if (d) setDuration(d)
    const rr = roomRef.current
    const s = st.current
    if (rr.phase === 'live' && rr.room?.track && s.current?.id === rr.room.track.id && !s.loading) {
      // Stay with the session: correct drift of more than 2 seconds, at most every 4 seconds so slow connections can catch up.
      const want = posNow(rr.room)
      if (Math.abs(t - want) > 2 && (!d || want < d - 1) && Date.now() - lastSeek.current > 4000) {
        lastSeek.current = Date.now()
        yt.current?.seek(want)
      }
    }
    if (listening.current) {
      const dt = lastT.current === null ? 0 : t - lastT.current
      if (dt > 0 && dt < 1.5) heard.current += dt
      lastT.current = t
    }
  }, [])
  const onError = useCallback(
    (code: number) => {
      const t = st.current.current
      finishListen('quiet')
      setLoading(false)
      if (inSession()) {
        // A song its owner keeps to youtube.com won't play for anyone, so move the session on; otherwise just this device.
        const blocked = code === 101 || code === 150
        setToast(blocked ? `Skipped “${t?.title ?? 'a song'}”: its owner only allows it on YouTube itself.` : `“${t?.title ?? 'This song'}” won't play on this device. You'll rejoin with the next song.`)
        const seq = roomRef.current.room!.seq
        if (blocked && room.canControl()) room.command('auto', '', (x, now) => ops.ended(x, seq, now)).catch(() => {})
        return
      }
      failures.current += 1
      const why = code === 101 || code === 150 ? 'its owner only allows it on YouTube itself' : "YouTube couldn't play it"
      if (failures.current <= 3) {
        setToast(`Skipped “${t?.title ?? 'a song'}”: ${why}.`)
        next(true)
      } else {
        setToast(`“${t?.title ?? 'This song'}” can't play here: ${why}.`)
        wantPlay.current = false
      }
    },
    [next, finishListen],
  )

  // Links into the app: a shared playlist (#pl=…) or a Listen together invitation (#room=…).
  // Handled on load and whenever the address changes, e.g. when a link is pasted into an open tab.
  useEffect(() => {
    const open = () => {
      if (location.hash.startsWith('#pl=')) {
        readShareLink(location.hash).then((p) => {
          history.replaceState(null, '', location.pathname + location.search)
          if (p) nav.go({ name: 'shared', title: p.name, tracks: p.tracks })
          else setToast("This share link is damaged or incomplete. Ask for the link again.")
        })
        return
      }
      const id = readRoomHash()
      if (!id || (roomRef.current.id === id && roomRef.current.phase === 'live')) return
      room.open(id)
      nav.go({ name: 'room' })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- listen together: follow the session ----
  // The song, up next, and whether it's playing come from the session; this device's player keeps in step.
  const r = rs.room
  const followKey = useRef('')
  useEffect(() => {
    if (!live || !r) {
      followKey.current = ''
      return
    }
    const s = st.current
    if (!r.track) {
      if (s.current && s.playing) {
        wantPlay.current = false
        yt.current?.pause()
      }
      return
    }
    const q = [r.track, ...r.queue]
    const key = `${r.track.k}:${r.seq}`
    if (key !== followKey.current) {
      followKey.current = key
      lastSeek.current = 0
      if (s.current?.id === r.track.id && s.pos === 0) {
        // The same video again (a replay, repeat one, or the same song twice in a row): start over without reloading.
        setQueue(q)
        counted.current = null
        if (r.playing) {
          if (s.current) startListen(s.current)
          wantPlay.current = true
          yt.current?.seek(posNow(r))
          yt.current?.play()
        }
      } else {
        wantPlay.current = r.playing
        setQueue(q)
        setPos(0)
      }
    } else setQueue(q)
  }, [live, r, nudge]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!live || !r?.track || current?.id !== r.track.id || loading) return
    const end = duration || r.track.duration || 0
    const over = end > 0 && posNow(r) >= end - 1
    if (!r.playing && playing) {
      wantPlay.current = false
      yt.current?.pause()
    } else if (r.playing && !playing && !over) {
      wantPlay.current = true
      yt.current?.play()
    }
  }, [live, r?.playing, r?.at, r?.seq, r?.track?.k, current?.id, playing, loading, nudge]) // eslint-disable-line react-hooks/exhaustive-deps

  // Love reactions, and the end of a session, show as a message.
  useEffect(() => {
    if (rs.love && !rs.love.mine) setToast(`${rs.love.name} loves “${rs.love.title}”.`)
  }, [rs.love])
  const wasLive = useRef(false)
  useEffect(() => {
    if (rs.phase === 'over' && wasLive.current && rs.overReason) setToast(rs.overReason)
    wasLive.current = rs.phase === 'live'
  }, [rs.phase, rs.overReason])


  // Keep a phone's screen on while a song plays, so it doesn't lock (and pause) mid-song.
  const awake = useStore((s) => s.awake)
  useKeepAwake(playing && awake)

  // Lock screen / media keys
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', () => toggle())
    navigator.mediaSession.setActionHandler('pause', () => toggle())
    navigator.mediaSession.setActionHandler('nexttrack', () => next(false))
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  }, [playing, toggle, next, prev])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable], .popover')) return
      const k = e.key.toLowerCase()
      if (k === ' ' && !el.closest('button')) {
        e.preventDefault()
        toggle()
      } else if (k === 'n') next(false)
      else if (k === 'p') prev()
      else if (k === 'm') setMuted((m) => !m)
      else if (k === 's') setShuffle(!st.current.shuffle)
      else if (k === 'r') cycleRepeat()
      else if (k === 'l' && st.current.current) actions.toggleLike(st.current.current)
      else if (k === 'f' && st.current.current) fullView.toggle()
      else if (k === '/') {
        e.preventDefault()
        nav.go({ name: 'search' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, next, prev, setShuffle, cycleRepeat, nav])

  // Optional sign-in and sync between devices (does nothing unless Firebase is configured).
  useEffect(() => {
    sync.start()
  }, [])

  // Ambient colour: the playing (or last played) song's artwork tints the shell.
  const lastId = useStore((s) => s.history[0]?.t.id ?? null)
  const ambientId = current?.id ?? lastId
  const [ambient, setAmbient] = useState<string | null>(null)
  useEffect(() => {
    if (!ambientId) return setAmbient(null)
    let live = true
    ambientColor(ambientId).then((c) => live && setAmbient(c))
    return () => {
      live = false
    }
  }, [ambientId])

  // The player floats over the content; content leaves room for it, whatever its height.
  const bottom = useRef<HTMLDivElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = bottom.current
    if (!el) return
    const measure = () => {
      const st = shell.current?.style
      if (!st) return
      st.setProperty('--bar-space', `${Math.ceil(el.getBoundingClientRect().height)}px`)
      // On tablets the video sits in the dock's left end, 8px in from the player's edges.
      const bar = el.querySelector('.bar')?.getBoundingClientRect()
      if (bar) {
        st.setProperty('--stage-x', `${Math.round(bar.left + 8)}px`)
        st.setProperty('--stage-y', `${Math.round(window.innerHeight - bar.bottom + 8)}px`)
      }
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const bar = el.querySelector('.bar')
    if (bar) ro.observe(bar)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // The full-screen "now playing" view (desktop). It closes when there's nothing playing.
  const staged = useStage()
  useEffect(() => {
    if (!current) fullView.close()
  }, [current])

  // Phones: the player and tabs slide away while you scroll down a page, and come back when you scroll up,
  // reach the end, change page, or a message appears. The video stays, as YouTube requires.
  const [away, setAway] = useState(false)
  useEffect(() => {
    const el = main.current
    if (!el) return
    const mq = window.matchMedia('(max-width: 759px), (max-height: 560px)')
    let last = el.scrollTop
    const onScroll = () => {
      const y = el.scrollTop
      if (Math.abs(y - last) < 8) return
      const down = y > last
      last = y
      const atEnd = y + el.clientHeight >= el.scrollHeight - 40
      setAway(mq.matches && down && y > 120 && !atEnd)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setAway(false), [page, toast])

  const stage = (
    <YouTubeStage ref={yt} visible={!!current} title={current?.title ?? ''} volume={volume} muted={muted} onState={onState} onTime={onTime} onError={onError} />
  )

  return (
    <NavContext.Provider value={nav}>
      <PlayerContext.Provider value={player}>
        <div
          ref={shell}
          className={`app${current ? ' has-song' : ''}${away ? ' chrome-away' : ''}${staged && current ? ' is-staged' : ''}`}
          style={{ ['--accent' as string]: ACCENTS[accent].color, ...(ambient ? { ['--ambient' as string]: ambient } : {}) }}
        >
          <Sidebar />
          <div className={`main-area${toast ? ' has-toast' : ''}`}>
          <main className="main" ref={main}>
            {page.name === 'home' && <Home />}
            {page.name === 'search' && <Search key={page.q ?? ''} initial={page.q} />}
            {page.name === 'library' && <Library />}
            {page.name === 'liked' && <Liked />}
            {page.name === 'history' && <History />}
            {page.name === 'playlist' && <PlaylistPage key={page.id} id={page.id} />}
            {page.name === 'artist' && <Artist key={page.channelId} channelId={page.channelId} artist={page.artist} />}
            {page.name === 'queue' && <Queue />}
            {page.name === 'settings' && <Settings />}
            {page.name === 'stats' && <Stats />}
            {page.name === 'song' && <SongPage key={page.tab} initial={page.tab} />}
            {page.name === 'shared' && <Shared title={page.title} tracks={page.tracks} />}
            {page.name === 'room' && <RoomPage />}
          </main>
            {toast && (
              <div className="toast" role="status">
                <span>{toast}</span>
                <button className="icon-btn" onClick={() => setToast(null)} aria-label="Dismiss message">
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
          <NowPlaying stage={stage} />
          {staged && current && <Stage toast={toast} />}
          <div className="bottom" ref={bottom} onFocus={() => setAway(false)}>
            <RoomChip />
            <PlayerBar />
            <TabBar />
          </div>
        </div>
      </PlayerContext.Provider>
    </NavContext.Provider>
  )
}
