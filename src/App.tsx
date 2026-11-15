import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ACCENTS, actions, skippedOften, store, useStore, type Track } from './store'
import { artistSongs, art } from './data/youtube'
import { readShareLink } from './data/share'
import { ambientColor } from './data/ambient'
import { sync } from './data/sync'
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
  const st = useRef({ queue, pos, repeat, time, current, shuffle, duration })
  st.current = { queue, pos, repeat, time, current, shuffle, duration }

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
      next: () => next(false),
      prev,
      seek: (t) => {
        yt.current?.seek(t)
        setTime(t)
      },
      playNext: (t) => {
        if (!st.current.current) return playList([t], 0)
        setQueue((q) => [...q.slice(0, st.current.pos + 1), t, ...q.slice(st.current.pos + 1)])
      },
      addToQueue: (t) => {
        if (!st.current.current) return playList([t], 0)
        setQueue((q) => [...q, t])
      },
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
    [queue, pos, current, playing, loading, time, duration, shuffle, repeat, muted, playList, toggle, next, prev, setShuffle, cycleRepeat],
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
        next(true)
      }
    },
    [next, finishListen],
  )
  const onTime = useCallback((t: number, d: number) => {
    setTime(t)
    if (d) setDuration(d)
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

  // A shared playlist link (#pl=…): open it, then tidy the address bar.
  useEffect(() => {
    if (!location.hash.startsWith('#pl=')) return
    readShareLink(location.hash).then((p) => {
      history.replaceState(null, '', location.pathname + location.search)
      if (p) nav.go({ name: 'shared', title: p.name, tracks: p.tracks })
      else setToast("This share link is damaged or incomplete. Ask for the link again.")
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    const ro = new ResizeObserver(() => shell.current?.style.setProperty('--bar-space', `${Math.ceil(el.getBoundingClientRect().height)}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stage = (
    <YouTubeStage ref={yt} visible={!!current} title={current?.title ?? ''} volume={volume} muted={muted} onState={onState} onTime={onTime} onError={onError} />
  )

  return (
    <NavContext.Provider value={nav}>
      <PlayerContext.Provider value={player}>
        <div
          ref={shell}
          className={`app${current ? ' has-song' : ''}`}
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
          <div className="bottom" ref={bottom}>
            <PlayerBar />
            <TabBar />
          </div>
        </div>
      </PlayerContext.Provider>
    </NavContext.Provider>
  )
}
