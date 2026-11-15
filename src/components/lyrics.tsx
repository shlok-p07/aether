import { useEffect, useRef, useState } from 'react'
import { LocateFixed, RotateCw } from 'lucide-react'
import { getLyrics } from '../data/lyrics'
import { actions, useStore } from '../store'
import { useAsync, usePlayer } from '../app/context'

/** Explains what turning lyrics on sends where, and turns it on. */
export function LyricsOptIn() {
  return (
    <div className="notice">
      <p>
        Lyrics come from LRCLIB, a free, open lyrics database. Turning them on sends the title and artist of each song you play to lrclib.net. Nothing else
        leaves your browser.
      </p>
      <button className="pill pill-accent" onClick={() => actions.set('lyrics', true)}>
        Turn on lyrics
      </button>
    </div>
  )
}

/** The current song's lyrics. Synced lines follow the song; tap a line to jump there. */
export function LyricsView({ where }: { where: 'rail' | 'page' }) {
  const player = usePlayer()
  const t = player.current
  const on = useStore((s) => s.lyrics)
  const a = useAsync(t && on ? (sig) => getLyrics(t, sig) : null, [t?.id, on])
  const box = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)

  const lines = a.data?.lines ?? null
  let at = -1
  if (lines) for (let i = 0; i < lines.length && lines[i].t <= player.time + 0.25; i++) at = i

  useEffect(() => setFollow(true), [t?.id])
  useEffect(() => {
    const el = box.current
    if (!el || !follow || at < 0) return
    const line = el.querySelector<HTMLElement>(`[data-i="${at}"]`)
    if (!line) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: line.offsetTop - el.clientHeight / 3, behavior: reduce ? 'auto' : 'smooth' })
  }, [at, follow])

  if (!on) return <LyricsOptIn />
  if (!t) return <p className="now-hint">Play a song to see its lyrics.</p>
  if (a.status === 'loading' && !a.data) return <p className="now-hint">Looking up lyrics…</p>
  if (a.status === 'error')
    return (
      <div className="notice">
        <p>{a.error?.message}</p>
        <button className="pill pill-quiet" onClick={a.retry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" /> Try again
        </button>
      </div>
    )
  if (!a.data) return <p className="now-hint">No lyrics found for “{t.title}”.</p>
  if (a.data.instrumental) return <p className="now-hint">This one is instrumental.</p>

  // Wheel, touch and arrow keys only come from the listener, so they pause following; our own scrolling doesn't.
  const userScroll = () => lines && setFollow(false)

  return (
    <div className={`lyrics-wrap lyrics-${where}`}>
      <div
        ref={box}
        className="lyrics"
        onWheel={userScroll}
        onTouchMove={userScroll}
        onKeyDown={(e) => ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key) && userScroll()}
        tabIndex={0}
        aria-label={`Lyrics for ${t.title}`}
      >
        {lines ? (
          <ol className="lyric-lines">
            {lines.map((l, i) => (
              <li key={i}>
                <button
                  data-i={i}
                  className={`lyric${i === at ? ' is-now' : i < at ? ' is-past' : ''}`}
                  aria-current={i === at ? 'true' : undefined}
                  onClick={() => {
                    player.seek(l.t)
                    setFollow(true)
                  }}
                >
                  {l.text || '·'}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="lyric-plain">{a.data.plain}</p>
        )}
      </div>
      <div className="lyrics-foot">
        <span>
          {a.data.offTiming ? 'Timing off: this video is a different length than the recording. ' : ''}Lyrics from{' '}
          <a href="https://lrclib.net" target="_blank" rel="noreferrer">
            LRCLIB
          </a>
        </span>
        {lines && !follow && (
          <button className="pill pill-quiet" onClick={() => setFollow(true)}>
            <LocateFixed size={16} strokeWidth={2} aria-hidden="true" /> Follow along
          </button>
        )}
      </div>
    </div>
  )
}
