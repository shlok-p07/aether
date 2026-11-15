import { useMemo, useState, type ReactNode } from 'react'
import {
  Home as HomeIcon, Library as LibraryIcon, ListMusic, Pause, Play, Repeat, Repeat1, Search, Settings as SettingsIcon, Shuffle, SkipBack,
  SkipForward, Volume1, Volume2, VolumeX, LoaderCircle, Heart, ChevronUp, ChevronDown, MicVocal, Music,
} from 'lucide-react'
import { useStore } from '../store'
import { art } from '../data/youtube'
import { fmtTime, useNav, usePlayer, type Page } from '../app/context'
import { Art, LikeButton, TrackMenu } from './bits'
import { LyricsView } from './lyrics'
import { AboutView } from './about'
import { SidebarAccount } from './account'

const NAV: { page: Page; label: string; icon: ReactNode }[] = [
  { page: { name: 'home' }, label: 'Home', icon: <HomeIcon size={20} strokeWidth={1.75} aria-hidden="true" /> },
  { page: { name: 'search' }, label: 'Search', icon: <Search size={20} strokeWidth={1.75} aria-hidden="true" /> },
  { page: { name: 'library' }, label: 'Library', icon: <LibraryIcon size={20} strokeWidth={1.75} aria-hidden="true" /> },
  { page: { name: 'settings' }, label: 'Settings', icon: <SettingsIcon size={20} strokeWidth={1.75} aria-hidden="true" /> },
]

const section = (p: Page) =>
  ['liked', 'history', 'playlist', 'stats'].includes(p.name) ? 'library' : ['artist', 'queue', 'song', 'shared'].includes(p.name) ? '' : p.name

export function Sidebar() {
  const nav = useNav()
  const playlists = useStore((s) => s.playlists)
  const liked = useStore((s) => s.liked.length)
  const active = section(nav.page)
  return (
    <nav className="sidebar" aria-label="Main">
      <span className="wordmark">
        <svg className="wordmark-mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="currentColor" />
          <circle cx="32" cy="32" r="18" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="2" />
          <circle cx="32" cy="32" r="7" fill="#000" />
        </svg>
        Aether
      </span>
      <ul className="side-list">
        {NAV.map((n) => (
          <li key={n.label}>
            <button className="side-item" aria-current={active === n.page.name ? 'page' : undefined} onClick={() => nav.go(n.page)}>
              {n.icon}
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="side-heading">Your music</p>
      <ul className="side-list side-scroll">
        <li>
          <button className="side-item" aria-current={nav.page.name === 'liked' ? 'page' : undefined} onClick={() => nav.go({ name: 'liked' })}>
            <Heart size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="side-label">Liked songs</span>
            <span className="side-count">{liked}</span>
          </button>
        </li>
        {playlists.map((p) => (
          <li key={p.id}>
            <button
              className="side-item"
              aria-current={nav.page.name === 'playlist' && nav.page.id === p.id ? 'page' : undefined}
              onClick={() => nav.go({ name: 'playlist', id: p.id })}
            >
              <ListMusic size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="side-label">{p.name}</span>
              <span className="side-count">{p.tracks.length}</span>
            </button>
          </li>
        ))}
      </ul>
      <SidebarAccount />
    </nav>
  )
}

export function TabBar() {
  const nav = useNav()
  const active = section(nav.page)
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV.map((n) => (
        <button key={n.label} className="tab" aria-current={active === n.page.name ? 'page' : undefined} onClick={() => nav.go(n.page)}>
          {n.icon}
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** Right rail on wide screens: the YouTube player, the song, and what's next. On phones only the player shows, pinned on top. */
export function NowPlaying({ stage }: { stage: ReactNode }) {
  const player = usePlayer()
  const nav = useNav()
  const t = player.current
  const upNext = player.queue.slice(player.pos + 1, player.pos + 7)
  const history = useStore((s) => s.history)
  const plays = useStore((s) => s.plays)
  const recent = useMemo(() => history.slice(0, 20).map((h) => h.t), [history])
  const rotation = useMemo(
    () =>
      Object.values(plays)
        .sort((a, b) => b.n - a.n)
        .slice(0, 6)
        .map((p) => p.t),
    [plays],
  )
  const last = recent[0]
  const [tab, setTab] = useState<'next' | 'lyrics' | 'about'>('next')
  return (
    <aside className={`now${t ? '' : ' is-empty'}`} aria-label="Now playing">
      <div className="now-stage">
        {stage}
        {!t && last && <img className="now-resume-art" src={art(last.id)} alt="" />}
        {!t && !last && (
          <div className="now-placeholder">
            <p>Nothing playing yet</p>
          </div>
        )}
      </div>
      {!t && last && (
        <div className="now-info">
          <div className="now-text">
            <p className="now-title">{last.title}</p>
            <p className="now-artist">{last.artist} · last played</p>
          </div>
          <button className="pill pill-quiet" onClick={() => player.playList(recent, 0)}>
            <Play size={16} strokeWidth={0} fill="currentColor" aria-hidden="true" /> Resume
          </button>
        </div>
      )}
      {!t && rotation.length > 1 && (
        <section className="now-next" aria-labelledby="rail-rotation">
          <div className="shelf-head">
            <h2 id="rail-rotation">From your rotation</h2>
          </div>
          <ul className="mini-rows">
            {rotation.map((x, i) => (
              <li key={x.id}>
                <button className="mini-row" onClick={() => player.playList(rotation, i)}>
                  <Art id={x.id} className="mini-art" />
                  <span className="row-text">
                    <span className="row-title">{x.title}</span>
                    <span className="row-meta">{x.artist}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!t && !last && <p className="now-hint">Pick a song from Home or Search and it plays here.</p>}
      {t && (
        <div className="now-info">
          <div className="now-text">
            <p className="now-title">{t.title}</p>
            {t.channelId ? (
              <button className="now-artist" onClick={() => nav.go({ name: 'artist', channelId: t.channelId, artist: t.artist })}>
                {t.artist}
              </button>
            ) : (
              <p className="now-artist">{t.artist}</p>
            )}
          </div>
          <LikeButton track={t} />
          <TrackMenu track={t} />
        </div>
      )}
      {t && (
        <div className="seg" role="group" aria-label="Show in this panel">
          {(
            [
              ['next', 'Up next'],
              ['lyrics', 'Lyrics'],
              ['about', 'About'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {t && tab === 'lyrics' && (
        <section className="now-next now-lyrics" aria-label="Lyrics">
          <LyricsView where="rail" />
        </section>
      )}
      {t && tab === 'about' && (
        <section className="now-next" aria-label="About this song">
          <AboutView />
        </section>
      )}
      {t && tab === 'next' && (
        <section className="now-next" aria-labelledby="up-next">
          <div className="shelf-head">
            <h2 id="up-next">Up next</h2>
            <button className="text-btn" onClick={() => nav.go({ name: 'queue' })}>
              Open queue
            </button>
          </div>
          {upNext.length ? (
            <ul className="mini-rows">
              {upNext.map((x, i) => (
                <li key={`${x.id}-${i}`}>
                  <button className="mini-row" onClick={() => player.playList(player.queue, player.pos + 1 + i)}>
                    <Art id={x.id} className="mini-art" />
                    <span className="row-text">
                      <span className="row-title">{x.title}</span>
                      <span className="row-meta">{x.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="now-hint">Nothing queued after this song.</p>
          )}
        </section>
      )}
    </aside>
  )
}

export function PlayerBar() {
  const p = usePlayer()
  const nav = useNav()
  const volume = useStore((s) => s.volume)
  const t = p.current
  const dur = p.duration || t?.duration || 0
  const pct = dur ? Math.min(100, (p.time / dur) * 100) : 0
  const VolIcon = p.muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const [open, setOpen] = useState(false)
  return (
    <section className={`bar${open ? ' is-open' : ''}`} aria-label="Player" style={{ ['--pct' as string]: `${pct}%` }}>
      <span className="bar-progress" aria-hidden="true" />
      <div className="bar-song">
        {t ? (
          <Art id={t.id} className="bar-art" />
        ) : (
          <span className="art bar-art art-empty" aria-hidden="true">
            <Music size={22} strokeWidth={1.75} />
          </span>
        )}
        {t ? (
          <button
            className="bar-text bar-open"
            onClick={() => (nav.page.name === 'song' ? nav.back() : nav.go({ name: 'song', tab: 'about' }))}
            aria-label={`${t.title} by ${t.artist}. Open lyrics and song info`}
          >
            <span className="bar-title">{t.title}</span>
            <span className="bar-artist">{t.artist}</span>
          </button>
        ) : (
          <div className="bar-text">
            <p className="bar-title">Not playing</p>
            <p className="bar-artist">Choose a song to start</p>
          </div>
        )}
        {t && <LikeButton track={t} />}
      </div>

      <div className="bar-center">
        <div className="bar-buttons">
          <button className="icon-btn toggle" aria-pressed={p.shuffle} onClick={() => p.setShuffle(!p.shuffle)} aria-label="Shuffle" title="Shuffle (S)">
            <Shuffle size={18} strokeWidth={1.75} />
          </button>
          <button className="icon-btn" onClick={p.prev} aria-label="Previous" title="Previous (P)" disabled={!t}>
            <SkipBack size={20} strokeWidth={1.75} fill="currentColor" />
          </button>
          <button className="play" onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'} title="Play/pause (Space)" disabled={!t}>
            {p.loading ? (
              <LoaderCircle className="spin" size={24} strokeWidth={2} />
            ) : p.playing ? (
              <Pause size={22} strokeWidth={0} fill="currentColor" />
            ) : (
              <Play size={22} strokeWidth={0} fill="currentColor" className="nudge" />
            )}
          </button>
          <button className="icon-btn" onClick={p.next} aria-label="Next" title="Next (N)" disabled={!t}>
            <SkipForward size={20} strokeWidth={1.75} fill="currentColor" />
          </button>
          <button
            className="icon-btn toggle"
            aria-pressed={p.repeat !== 'off'}
            onClick={p.cycleRepeat}
            aria-label={p.repeat === 'one' ? 'Repeat: this song' : p.repeat === 'all' ? 'Repeat: queue' : 'Repeat: off'}
            title="Repeat (R)"
          >
            {p.repeat === 'one' ? <Repeat1 size={18} strokeWidth={1.75} /> : <Repeat size={18} strokeWidth={1.75} />}
          </button>
        </div>
        <div className="scrub">
          <span className="time">{fmtTime(p.time)}</span>
          <input
            type="range"
            min={0}
            max={dur || 1}
            step={1}
            value={Math.min(p.time, dur || 1)}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${fmtTime(p.time)} of ${fmtTime(dur)}`}
            style={{ ['--pct' as string]: `${pct}%` }}
            disabled={!t}
          />
          <span className="time">{fmtTime(dur)}</span>
        </div>
      </div>

      <div className="bar-end">
        <button className="icon-btn bar-more" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Fewer player controls' : 'More player controls'}>
          {open ? <ChevronDown size={20} strokeWidth={1.75} /> : <ChevronUp size={20} strokeWidth={1.75} />}
        </button>
        <button className="icon-btn" onClick={() => nav.go({ name: 'queue' })} aria-label="Queue" title="Queue">
          <ListMusic size={20} strokeWidth={1.75} />
        </button>
        <button className="icon-btn" onClick={p.toggleMute} aria-label={p.muted ? 'Unmute' : 'Mute'} aria-pressed={p.muted} title="Mute (M)">
          <VolIcon size={20} strokeWidth={1.75} />
        </button>
        <input
          className="volume"
          type="range"
          min={0}
          max={100}
          value={p.muted ? 0 : volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          aria-label="Volume"
          style={{ ['--pct' as string]: `${p.muted ? 0 : volume}%` }}
        />
        {t && (
          <button
            className="icon-btn bar-lyrics"
            onClick={() => (nav.page.name === 'song' ? nav.back() : nav.go({ name: 'song', tab: 'lyrics' }))}
            aria-pressed={nav.page.name === 'song'}
            aria-label="Lyrics"
            title="Lyrics"
          >
            <MicVocal size={20} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </section>
  )
}
