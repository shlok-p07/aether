import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ACCENTS, actions, skippedOften, store, useStore, type Track } from './store'
import { artistSongs, art } from './data/youtube'
import { readShareLink } from './data/share'
import { ambientColor } from './data/ambient'
import { sync } from './data/sync'
import { useKeepAwake } from './app/wakelock'
import { expectedPos, readRoomHash, room, setRequestHandler, useRoom } from './data/room'
import { RoomChip, RoomPage } from './components/room'
import { NavContext, PlayerContext, type NavApi, type Page, type PlayerApi, type Repeat } from './app/context'
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

  // ---- listen together: a listener's player follows the host instead of its own queue ----
  const rs = useRoom()
  const isGuest = rs.phase === 'live' && rs.role === 'guest'
  const isHost = rs.phase === 'live' && rs.role === 'host'
  const roomRef = useRef(rs)
  roomRef.current = rs
  const [localPause, setLocalPause] = useState(false) // a listener paused just for themselves
  const localPauseRef = useRef(false)
  localPauseRef.current = localPause
  const lastSeek = useRef(0)
  const guestNow = () => roomRef.current.phase === 'live' && roomRef.current.role === 'guest'
  const hostName = () => roomRef.current.room?.hostName || 'The host'
  /** A listener asked to change playback: explain why they can't, and say so once. */
  const guestOnly = (what: string) => {
    if (!guestNow()) return false
    setToast(`${hostName()} ${what} in this session.`)
    return true
  }
  const sendRequest = (t: Track) => {
    room
      .request(t)
      .then(() => setToast(`Sent “${t.title}” to ${hostName()}'s queue.`))
      .catch((e) =>
        setToast(
          (e as Error).message === 'wait'
            ? `You can send another song in ${Math.max(1, room.requestWait())} seconds.`
            : `Couldn't send “${t.title}”. Check your connection and try again.`,
        ),
      )
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

  const playList = useCallback((list: Track[], index: number) => {
    if (!list.length) return
    if (guestNow()) return sendRequest(list[index] ?? list[0])
    wantPlay.current = true
    setToast(null)
    const s = st.current
    if (s.current && list[index]?.id === s.current.id && s.queue === list) {
      yt.current?.play()
      return
    }
    if (s.shuffle) {
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
    if (guestNow()) {
      // A listener can pause for themselves; playing again jumps back to where everyone else is.
      if (playing) {
        setLocalPause(true)
        wantPlay.current = false
        yt.current?.pause()
      } else if (!roomRef.current.room?.playing) {
        setToast(`${hostName()} paused the music.`)
      } else {
        setLocalPause(false)
        if (!listening.current) startListen(s.current)
        wantPlay.current = true
        lastSeek.current = 0
        yt.current?.play()
      }
      return
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

  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), [])

  const addToQueue = useCallback(
    (t: Track) => {
      if (guestNow()) return sendRequest(t)
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
      shuffle,
      repeat,
      muted,
      playList,
      toggle,
      next: () => guestOnly('chooses when to skip') || next(false),
      prev: () => guestOnly('chooses when to skip') || prev(),
      seek: (t) => {
        if (guestOnly('controls where the song is')) return
        yt.current?.seek(t)
        setTime(t)
      },
      playNext: (t) => {
        if (guestNow()) return sendRequest(t)
        if (!st.current.current) return playList([t], 0)
        setQueue((q) => [...q.slice(0, st.current.pos + 1), t, ...q.slice(st.current.pos + 1)])
      },
      addToQueue,
      removeAt: (i) => {
        if (i === st.current.pos) return
        setQueue((q) => q.filter((_, j) => j !== i))
        if (i < st.current.pos) setPos((p) => p - 1)
      },
      move: (from, to) =>
        setQueue((q) => {
          if (to <= st.current.pos || to >= q.length) return q
          const a = [...q]
          const [m] = a.splice(from, 1)
          a.splice(to, 0, m)
          return a
        }),
      setShuffle,
      cycleRepeat,
      setVolume: (v) => {
        actions.set('volume', v)
        if (v > 0) setMuted(false)
      },
      toggleMute: () => setMuted((m) => !m),
    }),
    [queue, pos, current, playing, loading, time, duration, shuffle, repeat, muted, playList, toggle, next, prev, setShuffle, cycleRepeat, addToQueue], // eslint-disable-line react-hooks/exhaustive-deps
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
        if (guestNow()) setPlaying(false) // the host moves everyone on
        else next(true)
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
      if (rr.role === 'guest') {
        // Stay with the host: correct drift of more than 2 seconds, at most every 4 seconds so slow connections can catch up.
        const want = expectedPos(rr.room)
        const off = Math.abs(t - want) > 2 && (!d || want < d - 1)
        if (off && (rr.room.playing ? !localPauseRef.current : true) && Date.now() - lastSeek.current > 4000) {
          lastSeek.current = Date.now()
          yt.current?.seek(want)
        }
      } else if (rr.role === 'host' && room.hostTick(s.current.id, t)) {
        room.publish({ track: s.current, queue: s.queue.slice(s.pos + 1), playing: s.playing, pos: t })
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
      if (guestNow()) {
        setToast(`“${t?.title ?? 'This song'}” won't play on this device. You'll rejoin with the next song.`)
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

  // ---- listen together ----
  // Host: share every change, and add songs listeners ask for to the queue.
  const lastPubId = useRef<string | null>(null)
  useEffect(() => {
    if (!isHost) return
    const s = st.current
    const sameSong = lastPubId.current === (current?.id ?? null)
    lastPubId.current = current?.id ?? null
    room.publish({ track: current, queue: queue.slice(pos + 1), playing: playing && !!current, pos: sameSong ? s.time : 0 })
  }, [isHost, current?.id, pos, queue, playing]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRequestHandler((t, from) => {
      addToQueue(t)
      setToast(`${from} added “${t.title}”.`)
    })
  }, [addToQueue])

  // Listener: follow the host's song and up-next list…
  const r = rs.room
  useEffect(() => {
    if (!isGuest || !r) return
    const s = st.current
    if (!r.track) {
      if (s.current) {
        wantPlay.current = false
        yt.current?.pause()
      }
      return
    }
    const q = [r.track, ...r.queue]
    if (s.current?.id !== r.track.id || s.pos !== 0) {
      wantPlay.current = r.playing && !localPauseRef.current
      lastSeek.current = 0
      setQueue(q)
      setPos(0)
    } else setQueue([s.current, ...r.queue])
  }, [isGuest, r])
  // …and play or pause with them.
  useEffect(() => {
    if (!isGuest || !r?.track || current?.id !== r.track.id || loading) return
    if (!r.playing && playing) {
      wantPlay.current = false
      yt.current?.pause()
    } else if (r.playing && !playing && !localPauseRef.current) {
      wantPlay.current = true
      yt.current?.play()
    }
  }, [isGuest, r?.playing, r?.at, r?.track?.id, current?.id, playing, loading]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isGuest) setLocalPause(false)
  }, [isGuest])

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
          className={`app${current ? ' has-song' : ''}${away ? ' chrome-away' : ''}`}
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
