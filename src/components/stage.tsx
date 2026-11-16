import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { getLyrics, type Line } from '../data/lyrics'
import { isMix } from '../data/mix'
import { art } from '../data/youtube'
import { present, useRoom } from '../data/room'
import { actions, slotOf, useStore } from '../store'
import { fmtTime, useAsync, usePlayer } from '../app/context'
import { stage } from '../app/stage'
import { LikeButton } from './bits'

/**
 * The full-screen "now playing" view on desktop: the song's own video large, its synced lyrics gliding past,
 * the artwork's colour filling the room, and a quiet readout of where you are in the song and in your own history
 * with it. Everything that moves is driven by real data (the song's position, lyric timings, your plays); nothing
 * pretends to react to the audio, which YouTube's player keeps to itself.
 *
 * The YouTube player isn't moved (that would reload it): it's drawn over the slot measured here.
 */

const SESSION: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Late night' }
const pad = (n: number) => String(n).padStart(2, '0')
const day = (at: number) => new Date(at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

function Eq({ on }: { on: boolean }) {
  return (
    <span className={`eq${on ? ' is-on' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

/** Synced lyrics as a slow column: the current line large and centred, with a thin line filling as it's sung. */
function StageLyrics({ lines, time, onSeek }: { lines: Line[]; time: number; onSeek: (t: number) => void }) {
  let at = -1
  for (let i = 0; i < lines.length && lines[i].t <= time + 0.25; i++) at = i
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const [shift, setShift] = useState(0)
  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-i="${Math.max(0, at)}"]`)
    const h = box.current?.clientHeight ?? 0
    if (el) setShift(el.offsetTop + el.offsetHeight / 2 - h * 0.4)
  }, [at, lines])
  const now = lines[at]
  const next = lines[at + 1]
  const span = now && next ? next.t - now.t : 4
  const p = now ? Math.min(1, Math.max(0, (time - now.t) / span)) : 0
  const first = lines.find((l) => l.text.trim())
  return (
    <div className="stage-lyrics" ref={box}>
      {at < 0 && first && <p className="stage-intro mono">Lyrics in {fmtTime(Math.max(0, first.t - time))}</p>}
      <ol ref={list} style={{ transform: `translateY(${-shift}px)` }}>
        {lines.map((l, i) => (
          <li key={i}>
            <button
              data-i={i}
              className={`stage-line${i === at ? ' is-now' : i < at ? ' is-past' : ''}`}
              aria-current={i === at ? 'true' : undefined}
              onClick={() => onSeek(l.t)}
              tabIndex={Math.abs(i - at) <= 3 ? 0 : -1}
            >
              {l.text || '·'}
              {i === at && <span className="stage-line-fill" style={{ ['--lp' as string]: p }} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Stage({ toast }: { toast: string | null }) {
  const p = usePlayer()
  const t = p.current
  const rs = useRoom()
  const lyricsOn = useStore((s) => s.lyrics)
  const stat = useStore((s) => (t ? s.plays[t.id] : undefined))
  const firstHeard = useStore((s) => {
    if (!t) return null
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].id === t.id) return s.events[i].at
    return null
  })
  const mix = !!t && isMix(t)
  const lyr = useAsync(t && lyricsOn && !mix ? (sig) => getLyrics(t, sig) : null, [t?.id, lyricsOn, mix])
  const lines = lyr.data?.lines?.length ? lyr.data.lines : null
  const slot = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const [full, setFull] = useState(!!document.fullscreenElement)

  // Draw the YouTube player over the video slot.
  useLayoutEffect(() => {
    const el = slot.current
    if (!el) return
    const root = document.documentElement.style
    const place = () => {
      const r = el.getBoundingClientRect()
      root.setProperty('--sv-x', `${Math.round(r.left)}px`)
      root.setProperty('--sv-y', `${Math.round(r.top)}px`)
      root.setProperty('--sv-w', `${Math.round(r.width)}px`)
      root.setProperty('--sv-h', `${Math.round(r.height)}px`)
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [])

  // A full view: keyboard focus stays in it, Esc leaves, and focus returns to where it was.
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    close.current?.focus()
    const behind = [...document.querySelectorAll<HTMLElement>('.sidebar, .main-area, .bottom')]
    behind.forEach((el) => el.setAttribute('inert', ''))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.fullscreenElement && stage.close()
    const onFull = () => setFull(!!document.fullscreenElement)
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFull)
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'))
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFull)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      back?.focus?.()
    }
  }, [])

  const now = new Date()
  const session = `${SESSION[slotOf(now.getHours()).key]} · ${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dur = p.duration || t?.duration || 0
  const next = p.queue[p.pos + 1]
  const left = Math.max(0, dur - p.time)
  const live = rs.phase === 'live' && rs.room
  const hud = useMemo(() => {
    const out: [string, string][] = []
    if (stat?.n) out.push(['Plays', pad(stat.n)])
    if (firstHeard) out.push(['First heard', day(firstHeard)])
    if (p.queue.length > 1) out.push(['Queue', `${pad(p.pos + 1)}/${pad(p.queue.length)}`])
    return out
  }, [stat?.n, firstHeard, p.pos, p.queue.length])

  if (!t) return null
  return (
    <div className="stage" role="dialog" aria-modal="true" aria-label={`Now playing: ${t.title} by ${t.artist}`}>
      <div className="stage-bg" aria-hidden="true">
        <img src={art(t.id)} alt="" key={t.id} />
      </div>

      <header className="stage-top">
        <div className="stage-status mono">
          {live ? (
            <span className="live-badge">
              <span className="live-dot" aria-hidden="true" />
              Live
            </span>
          ) : (
            <Eq on={p.playing} />
          )}
          <span>
            {live
              ? `${rs.role === 'host' ? 'Hosting' : `With ${rs.room!.hostName}`} · ${present(rs.members).length} listening`
              : p.playing
                ? 'Playing'
                : 'Paused'}
          </span>
        </div>
        <p className="stage-session mono" aria-label={`${session}`}>
          {session}
        </p>
        <div className="stage-actions">
          <button
            className="icon-btn"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
            aria-label={full ? 'Exit full screen' : 'Full screen'}
            title={full ? 'Exit full screen' : 'Full screen'}
          >
            {full ? <Minimize size={20} strokeWidth={1.75} /> : <Maximize size={20} strokeWidth={1.75} />}
          </button>
          <button ref={close} className="icon-btn" onClick={stage.close} aria-label="Close full view" title="Close (Esc)">
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className={`stage-body${lines ? '' : ' no-lyrics'}`}>
        <section className="stage-song">
          <div className="stage-slot" ref={slot} />
          <div className="stage-meta" key={t.id}>
            <div className="stage-names">
              <h1 className="stage-title">{t.title}</h1>
              <p className="stage-artist">{t.artist}</p>
            </div>
            <LikeButton track={t} />
          </div>
          {hud.length > 0 && (
            <dl className="stage-hud mono" key={`hud-${t.id}`}>
              {hud.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="stage-side" aria-label={lines ? 'Lyrics' : 'Up next'}>
          {lines ? (
            <StageLyrics lines={lines} time={p.time} onSeek={p.seek} />
          ) : (
            <div className="stage-next">
              {!lyricsOn && !mix && (
                <button className="pill pill-quiet" onClick={() => actions.set('lyrics', true)}>
                  Show synced lyrics here
                </button>
              )}
              <h2>Up next</h2>
              {p.queue.slice(p.pos + 1, p.pos + 6).length ? (
                <ol>
                  {p.queue.slice(p.pos + 1, p.pos + 6).map((x, i) => (
                    <li key={`${x.id}-${i}`}>
                      <span className="mono">{pad(i + 1)}</span>
                      <span className="row-text">
                        <span className="row-title">{x.title}</span>
                        <span className="row-meta">{x.artist}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="field-hint">Nothing queued after this song.</p>
              )}
              {!lyricsOn && !mix && <p className="field-hint">Lyrics come from LRCLIB; turning them on sends each song's title and artist to lrclib.net.</p>}
            </div>
          )}
        </section>
      </div>

      <footer className="stage-bottom">
        <div className="scrub stage-scrub">
          <span className="mono">{fmtTime(p.time)}</span>
          <input
            type="range"
            min={0}
            max={dur || 1}
            step={1}
            value={Math.min(p.time, dur || 1)}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${fmtTime(p.time)} of ${fmtTime(dur)}`}
            style={{ ['--pct' as string]: `${dur ? (p.time / dur) * 100 : 0}%` }}
          />
          <span className="mono">-{fmtTime(left)}</span>
        </div>
        <div className="stage-controls">
          <p className="stage-upnext mono">{next ? `Next · ${next.title} · in ${fmtTime(left)}` : ''}</p>
          <div className="stage-buttons">
            <button className="icon-btn" onClick={p.prev} aria-label="Previous" title="Previous (P)">
              <SkipBack size={24} strokeWidth={1.75} fill="currentColor" />
            </button>
            <button className="play stage-play" onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'} title="Play/pause (Space)">
              {p.playing ? <Pause size={26} strokeWidth={0} fill="currentColor" /> : <Play size={26} strokeWidth={0} fill="currentColor" className="nudge" />}
            </button>
            <button className="icon-btn" onClick={p.next} aria-label="Next" title="Next (N)">
              <SkipForward size={24} strokeWidth={1.75} fill="currentColor" />
            </button>
          </div>
          <p className="stage-keys mono" aria-hidden="true">
            Space play · N next · Esc close
          </p>
        </div>
      </footer>

      {toast && (
        <p className="stage-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}
