import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/* Minimal typing for the YouTube IFrame Player API. */
type YTPlayer = {
  loadVideoById: (id: string) => void
  cueVideoById: (id: string) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (s: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (v: number) => void
  mute: () => void
  unMute: () => void
  destroy: () => void
}
type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let api: Promise<YTNamespace> | null = null
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!api) {
    api = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT!)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return api
}

export type YTState = 'playing' | 'paused' | 'ended' | 'buffering'
export type YTHandle = {
  load: (id: string, autoplay: boolean) => void
  play: () => void
  pause: () => void
  stop: () => void
  seek: (t: number) => void
  volume: (v: number, muted: boolean) => void
}

type Props = {
  visible: boolean
  title: string
  volume: number
  muted: boolean
  onState: (s: YTState) => void
  onTime: (t: number, d: number) => void
  onError: (code: number) => void
}

/**
 * YouTube's own player. It is never hidden while it plays and its audio is never altered,
 * as YouTube's terms require. Aether only drives play/pause/seek/volume through the official API.
 */
export const YouTubeStage = forwardRef<YTHandle, Props>(function YouTubeStage({ visible, title, volume, muted, onState, onTime, onError }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const ready = useRef(false)
  const pending = useRef<{ id: string; autoplay: boolean } | null>(null)
  const cb = useRef({ onState, onTime, onError })
  cb.current = { onState, onTime, onError }
  const vol = useRef({ volume, muted })
  vol.current = { volume, muted }
  const applyVolume = () => {
    const pl = player.current
    if (!pl || !ready.current) return
    pl.setVolume(vol.current.volume)
    if (vol.current.muted) pl.mute()
    else pl.unMute()
  }

  useEffect(() => {
    let alive = true
    let poll = 0
    loadApi().then((YT) => {
      if (!alive || !host.current) return
      const mount = document.createElement('div')
      host.current.appendChild(mount)
      player.current = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            ready.current = true
            applyVolume()
            const p = pending.current
            if (p) {
              pending.current = null
              start(p.id, p.autoplay)
            }
          },
          onStateChange: (e: { data: number }) => {
            const map: Record<number, YTState> = { 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering' }
            const s = map[e.data]
            if (s) cb.current.onState(s)
          },
          onError: (e: { data: number }) => cb.current.onError(e.data),
        },
      })
      poll = window.setInterval(() => {
        const pl = player.current
        if (!ready.current || !pl) return
        cb.current.onTime(pl.getCurrentTime() || 0, pl.getDuration() || 0)
      }, 500)
    })
    return () => {
      alive = false
      window.clearInterval(poll)
      player.current?.destroy()
      player.current = null
      ready.current = false
    }
  }, [])

  const start = (id: string, autoplay: boolean) => {
    if (autoplay) player.current?.loadVideoById(id)
    else player.current?.cueVideoById(id)
  }

  useImperativeHandle(ref, () => ({
    load: (id, autoplay) => (ready.current ? start(id, autoplay) : (pending.current = { id, autoplay })),
    play: () => player.current?.playVideo(),
    pause: () => player.current?.pauseVideo(),
    stop: () => {
      pending.current = null
      if (ready.current) player.current?.stopVideo()
    },
    seek: (t) => player.current?.seekTo(t, true),
    volume: (v, m) => {
      vol.current = { volume: v, muted: m }
      applyVolume()
    },
  }))

  return (
    <div className="yt-frame" ref={host} hidden={!visible} aria-label={title ? `YouTube video: ${title}` : 'YouTube player'} role="region" />
  )
})
