import { createContext, useContext, useEffect, useState } from 'react'
import type { Track } from '../store'

export type Repeat = 'off' | 'all' | 'one'

export type PlayerApi = {
  queue: Track[]
  pos: number
  current: Track | null
  playing: boolean
  loading: boolean
  time: number
  duration: number
  shuffle: boolean
  repeat: Repeat
  muted: boolean
  playList: (list: Track[], index: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (t: number) => void
  playNext: (t: Track) => void
  addToQueue: (t: Track) => void
  removeAt: (i: number) => void
  move: (from: number, to: number) => void
  setShuffle: (on: boolean) => void
  cycleRepeat: () => void
  setVolume: (v: number) => void
  toggleMute: () => void
}

export type Page =
  | { name: 'home' }
  | { name: 'search'; q?: string }
  | { name: 'library' }
  | { name: 'liked' }
  | { name: 'history' }
  | { name: 'playlist'; id: string }
  | { name: 'artist'; channelId: string; artist: string }
  | { name: 'queue' }
  | { name: 'settings' }

export type NavApi = {
  page: Page
  go: (p: Page) => void
  back: () => void
  canGoBack: boolean
  notify: (msg: string) => void
}

export const PlayerContext = createContext<PlayerApi | null>(null)
export const NavContext = createContext<NavApi | null>(null)

export function usePlayer() {
  const v = useContext(PlayerContext)
  if (!v) throw new Error('usePlayer outside provider')
  return v
}
export function useNav() {
  const v = useContext(NavContext)
  if (!v) throw new Error('useNav outside provider')
  return v
}

export type Async<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: Error | null; retry: () => void }

/** Fetch with abort-on-change, loading and error states, and a retry. A null fn means "nothing to load". */
export function useAsync<T>(fn: ((signal: AbortSignal) => Promise<T>) | null, deps: unknown[]): Async<T> {
  const [s, set] = useState<{ status: Async<T>['status']; data: T | null; error: Error | null }>({ status: fn ? 'loading' : 'idle', data: null, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!fn) {
      set({ status: 'idle', data: null, error: null })
      return
    }
    const ac = new AbortController()
    set((p) => ({ status: 'loading', data: p.data, error: null }))
    fn(ac.signal)
      .then((data) => set({ status: 'ready', data, error: null }))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') set({ status: 'error', data: null, error: e as Error })
      })
    return () => ac.abort()
  }, [...deps, n]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...s, retry: () => setN((x) => x + 1) }
}

export const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s <= 0) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export const songs = (n: number) => (n === 1 ? '1 song' : `${n} songs`)
