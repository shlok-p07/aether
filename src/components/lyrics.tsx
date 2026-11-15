import { useEffect, useRef, useState } from 'react'
import { LocateFixed, RotateCw, Search } from 'lucide-react'
import { getLyrics } from '../data/lyrics'
import { isMix, mixArtists } from '../data/mix'
import { actions, useStore, type Track } from '../store'
import { useAsync, useNav, usePlayer } from '../app/context'

/** Said instead of "no lyrics found" when the video is a DJ mix or compilation. */
export function MixNotice({ t, what }: { t: Track; what: 'lyrics' | 'about' }) {
  const nav = useNav()
  const names = mixArtists(t.title)
  return (
    <div className="notice">
      <p>
        {what === 'lyrics'
          ? 'This video is a mix of many songs, so it has no single set of lyrics. Play one of the songs on its own to see its lyrics.'
          : 'This video is a mix of many songs, so it has no single release date, album or story.'}
      </p>
      {names.length > 0 && (
        <div className="mix-artists">
          <p className="field-label">Artists in this mix</p>
          <div className="chips">
            {names.map((n) => (
              <button key={n} className="chip" onClick={() => nav.go({ name: 'search', q: n })}>
                <Search size={14} strokeWidth={2} aria-hidden="true" /> {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const mix = !!t && isMix(t)
  const a = useAsync(t && on && !mix ? (sig) => getLyrics(t, sig) : null, [t?.id, on, mix])
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

  if (!t) return <p className="now-hint">Play a song to see its lyrics.</p>
  if (mix) return <MixNotice t={t} what="lyrics" />
  if (!on) return <LyricsOptIn />
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
