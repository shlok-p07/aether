import { RotateCw } from 'lucide-react'
import { fmtDate, getBackground, getCredits } from '../data/about'
import { isMix } from '../data/mix'
import { fmtTime } from '../app/context'
import { MixNotice } from './lyrics'
import { actions, useStore } from '../store'
import { useAsync, usePlayer } from '../app/context'

export function AboutOptIn() {
  return (
    <div className="notice">
      <p>
        Add the story behind each song: background from Wikipedia, plus the first release, album and the artist's hometown from MusicBrainz. Turning this on
        sends the song's title and artist to wikipedia.org and musicbrainz.org.
      </p>
      <button className="pill pill-accent" onClick={() => actions.set('about', true)}>
        Turn on song background
      </button>
    </div>
  )
}

/** Where the current song comes from: credits, first release, album, the artist's origin and the story. */
export function AboutView() {
  const player = usePlayer()
  const t = player.current
  const key = useStore((s) => s.key)
  const on = useStore((s) => s.about)
  const mix = !!t && isMix(t)
  const credits = useAsync(t && key ? (sig) => getCredits(t, key, sig) : null, [t?.id, key])
  const bg = useAsync(t && on && !mix ? (sig) => getBackground(t, sig) : null, [t?.id, on, mix])

  if (!t) return <p className="now-hint">Play a song to see where it comes from.</p>
  if (mix) {
    const tracks = credits.data?.tracks ?? []
    let at = -1
    for (let i = 0; i < tracks.length && tracks[i].t <= player.time; i++) at = i
    return (
      <div className="about">
        <MixNotice t={t} what="about" />
        {credits.status === 'loading' && <p className="now-hint">Looking for a tracklist…</p>}
        {tracks.length > 0 && (
          <section className="story" aria-labelledby="tracklist-title">
            <h3 id="tracklist-title">Tracklist</h3>
            <ol className="tracklist">
              {tracks.map((x, i) => (
                <li key={`${x.t}-${i}`}>
                  <button className={`track-cue${i === at ? ' is-now' : ''}`} aria-current={i === at ? 'true' : undefined} onClick={() => player.seek(x.t)}>
                    <span className="cue-time">{x.t ? fmtTime(x.t) : '0:00'}</span>
                    <span className="cue-label">{x.label}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="about-sources">From the YouTube upload. Tap a song to jump to it.</p>
          </section>
        )}
      </div>
    )
  }

  const c = credits.data
  const b = bg.data
  // MusicBrainz knows the original release; YouTube's date can be a reissue.
  const released = b?.released || c?.released || c?.year
  const all: [string, string | undefined][] = [
    ['Released', fmtDate(released)],
    ['Album', c?.album || b?.album],
    ['Written by', c?.writers.join(', ')],
    ['Produced by', c?.producers.join(', ')],
    ['Label', c?.label],
    ['Artist from', b?.origin],
    [b?.since?.label ?? 'Born', b?.since?.year],
  ]
  const facts = all.filter((f): f is [string, string] => !!f[1])
  const loading = credits.status === 'loading' || bg.status === 'loading'
  const fromYT = !!c && (c.writers.length || c.producers.length || c.label || c.released || c.album)
  const fromMB = !!b && (b.released || b.album || b.origin)

  return (
    <div className="about">
      {facts.length > 0 && (
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {loading && !facts.length && !b?.story && <p className="now-hint">Looking up where “{t.title}” comes from…</p>}

      {on && b?.story && (
        <section className="story" aria-labelledby="story-title">
          <h3 id="story-title">{b.story.about === 'song' ? 'Background' : `About ${t.artist}`}</h3>
          <p>{b.story.text}</p>
          <a href={b.story.url} target="_blank" rel="noreferrer">
            Read more on Wikipedia
          </a>
        </section>
      )}

      {on && bg.status === 'ready' && !b?.story && !facts.length && <p className="now-hint">No background found for “{t.title}”.</p>}

      {bg.status === 'error' && (
        <div className="notice">
          <p>{bg.error?.message}</p>
          <button className="pill pill-quiet" onClick={bg.retry}>
            <RotateCw size={16} strokeWidth={2} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!on && <AboutOptIn />}

      {(fromYT || fromMB || b?.story) && (
        <p className="about-sources">
          From{' '}
          {[
            fromYT && 'the YouTube upload',
            fromMB && (
              <a key="mb" href="https://musicbrainz.org" target="_blank" rel="noreferrer">
                MusicBrainz
              </a>
            ),
            b?.story && (
              <span key="wp">
                <a href={b.story.url} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>{' '}
                (CC BY-SA)
              </span>
            ),
          ]
            .filter(Boolean)
            .map((x, i, all) => (
              <span key={i}>
                {i > 0 && (i === all.length - 1 ? ' and ' : ', ')}
                {x}
              </span>
            ))}
          .
        </p>
      )}
    </div>
  )
}
