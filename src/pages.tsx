import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowUp, ChartColumn, ChevronLeft, Clock, Download, ExternalLink, Heart, Link2, ListMusic, Plus, Search as SearchIcon, Share, Upload, Users, X } from 'lucide-react'
import { artistSongs, cleanArtist, importPlaylist, playlistId, regionName, search, trending, usesProxy, youtubeQueueLink } from './data/youtube'
import { isLocalOrigin, shareLink } from './data/share'
import {
  ACCENTS, actions, exportBackup, forgotten, importBackup, onRepeat, recentlyPlayed, searchLibrary, stats, store, timeMix, topArtists, useStore,
  type Accent, type Period, type Track,
} from './store'
import { ago, fmtLong, fmtTime, songs, useAsync, useNav, usePlayer, type SongTab } from './app/context'
import { LyricsView } from './components/lyrics'
import { AboutView } from './components/about'
import { AccountSettings, SignInNudge } from './components/account'
import { Art, Cards, Loadable, PlayAll, Shelf, ShuffleAll, TrackRows } from './components/bits'
import { YouTubeSetup } from './components/YouTubeSetup'
import { QuotaHint, QuotaMeter } from './components/quota'
import { canKeepAwake } from './app/wakelock'
import { useRoom } from './data/room'
import type { QItem } from './data/queue-ops'

const EXPLORE = ['Pop hits', 'Hip-hop', 'R&B', 'Bollywood', 'K-pop', 'Latin', 'Afrobeats', 'Rock', 'EDM', 'Lo-fi', 'Chill', 'Workout', 'Focus', 'Party', 'Throwbacks', 'Country']

function useKey() {
  return useStore((s) => s.key)
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function BackLink() {
  const nav = useNav()
  if (!nav.canGoBack) return null
  return (
    <button className="back" onClick={nav.back}>
      <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" /> Back
    </button>
  )
}

function Explore() {
  const nav = useNav()
  return (
    <div className="chips">
      {EXPLORE.map((q) => (
        <button key={q} className="chip" onClick={() => nav.go({ name: 'search', q })}>
          {q}
        </button>
      ))}
    </div>
  )
}

// ---------------- Home ----------------

/** Tile size follows play count: a clear #1 gets the big square, songs near the top get wide tiles. */
function tileSize(top: { n: number }[], i: number) {
  const max = top[0]?.n ?? 1
  const n = top[i].n
  if (i === 0) return top.length < 2 || n >= 1.4 * top[1].n ? 'xl' : 'wide'
  return n / max >= 0.6 ? 'wide' : 'sq'
}

/** The signature move: a mosaic of your most-played covers, sized by how much you play them. */
function Rotation({ top }: { top: { t: Track; n: number }[] }) {
  const player = usePlayer()
  const list = top.map((p) => p.t)
  const shown = top.slice(0, 6)
  return (
    <section className="shelf rotation-shelf" aria-labelledby="rotation-title">
      <div className="shelf-head">
        <h2 id="rotation-title">Your rotation</h2>
        <PlayAll list={list} label="Play rotation" />
      </div>
      <ol className="rotation">
        {shown.map((p, i) => (
          <li key={p.t.id} className={`rot-${tileSize(shown, i)}`}>
            <button className="rot-tile" onClick={() => player.playList(list, i)} aria-label={`Play “${p.t.title}” by ${p.t.artist}, played ${p.n} times`}>
              <Art id={p.t.id} eager />
              <span className="rot-caption">
                <span className="rot-title">{p.t.title}</span>
                <span className="rot-plays">{p.n} plays</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ArtistShelf({ channelId, artist }: { channelId: string; artist: string }) {
  const key = useKey()
  const nav = useNav()
  const a = useAsync(key ? (s) => artistSongs(channelId, key, s) : null, [channelId, key])
  if (a.status === 'ready' && !a.data?.length) return null
  return (
    <Shelf
      title={`More from ${artist}`}
      action={
        <button className="text-btn" onClick={() => nav.go({ name: 'artist', channelId, artist })}>
          See all
        </button>
      }
    >
      <Loadable a={a} empty="" skeleton="cards">
        {(d) => <Cards list={d.slice(0, 12)} />}
      </Loadable>
    </Shelf>
  )
}

export function Home() {
  const key = useKey()
  const s = useStore((x) => x)
  const top = useMemo(() => onRepeat(s), [s.plays]) // eslint-disable-line react-hooks/exhaustive-deps
  const recent = useMemo(() => recentlyPlayed(s), [s.history]) // eslint-disable-line react-hooks/exhaustive-deps
  const artists = useMemo(() => topArtists(s, 3), [s.plays, s.liked, s.history]) // eslint-disable-line react-hooks/exhaustive-deps
  const mix = useMemo(() => timeMix(s), [s.events, s.plays]) // eslint-disable-line react-hooks/exhaustive-deps
  const old = useMemo(() => forgotten(s), [s.plays]) // eslint-disable-line react-hooks/exhaustive-deps
  const hot = useAsync(key ? (sig) => trending(key, sig) : null, [key])
  const [allHot, setAllHot] = useState(false)

  const subtitle = artists.length
    ? `Lately you've been into ${artists.map((a) => a.artist).slice(0, 2).join(' and ')}.`
    : key
      ? 'Play a few songs and your home starts building itself around them.'
      : 'Connect YouTube once and every official song is a search away.'

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="home-greeting">{greeting()}</h1>
        <p className="page-sub">{subtitle}</p>
      </header>

      {!key && <SignInNudge />}
      {!key && <YouTubeSetup />}

      {top.length >= 3 ? (
        <Rotation top={top} />
      ) : (
        key && (
          <section className="shelf">
            <div className="shelf-head">
              <h2>Start your rotation</h2>
            </div>
            <p className="page-sub">Songs you play more than once land here, biggest first. Pick a vibe to begin:</p>
            <Explore />
          </section>
        )
      )}

      {recent.length > 0 && (
        <Shelf title="Jump back in">
          <Cards list={recent} />
        </Shelf>
      )}

      {mix.list.length > 0 && (
        <Shelf title={`Your ${mix.slot.label.toLowerCase()}`} action={<PlayAll list={mix.list} label="Play" />}>
          <Cards list={mix.list} />
        </Shelf>
      )}

      {top.length >= 3 && (
        <Shelf title="On repeat">
          <Cards list={top.map((p) => p.t)} sub={(_, i) => `${top[i].n} plays`} />
        </Shelf>
      )}

      {old.length >= 3 && (
        <Shelf title="Forgotten favorites" action={<PlayAll list={old.map((p) => p.t)} label="Play" />}>
          <Cards list={old.map((p) => p.t)} sub={(_, i) => `Last played ${ago(old[i].last)}`} />
        </Shelf>
      )}

      {artists.map((a) => (
        <ArtistShelf key={a.channelId} channelId={a.channelId} artist={a.artist} />
      ))}

      {key && (
        <Shelf
          title={`Trending in ${regionName()}`}
          action={
            hot.data && hot.data.length > 10 ? (
              <button className="text-btn" onClick={() => setAllHot(!allHot)}>
                {allHot ? 'Show less' : `Show all ${hot.data.length}`}
              </button>
            ) : null
          }
        >
          <Loadable a={hot} empty="Nothing is trending in your region right now.">
            {(d) => <TrackRows list={allHot ? d : d.slice(0, 10)} numbered />}
          </Loadable>
        </Shelf>
      )}

      {key && top.length >= 3 && (
        <Shelf title="Explore">
          <Explore />
        </Shelf>
      )}
    </div>
  )
}

// ---------------- Search ----------------

export function Search({ initial }: { initial?: string }) {
  const key = useKey()
  const recent = useStore((s) => s.recent)
  const nav = useNav()
  const [text, setText] = useState(initial ?? '')
  const [q, setQ] = useState(initial ?? '')
  // Searching YouTube costs quota, so it runs when you press Enter. Your own library is searched as you type, for free.
  const r = useAsync(key && q ? (s) => search(q, key, s) : null, [q, key])
  const st = useStore((s) => s)
  const local = useMemo(() => (text.trim().length >= 2 ? searchLibrary(st, text) : null), [text, st.liked, st.plays, st.playlists, st.history]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    setQ(v)
    actions.addRecent(v)
  }
  const run = (v: string) => {
    setText(v)
    setQ(v)
    actions.addRecent(v)
  }

  const artists = useMemo(() => {
    const m = new Map<string, { channelId: string; artist: string; n: number; first: Track }>()
    for (const t of r.data ?? []) {
      if (!t.channelId) continue
      const e = m.get(t.channelId) ?? { channelId: t.channelId, artist: t.artist, n: 0, first: t }
      e.n += 1
      m.set(t.channelId, e)
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8)
  }, [r.data])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Search</h1>
      </header>
      <form className="search" role="search" onSubmit={submit}>
        <SearchIcon size={20} strokeWidth={1.75} aria-hidden="true" />
        <input
          id="search-input"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Any song or artist"
          aria-label="Search songs and artists"
          autoFocus
          enterKeyHint="search"
        />
        {text && (
          <button type="button" className="search-clear" onClick={() => setText('')} aria-label="Clear search text">
            <X size={16} strokeWidth={2} />
          </button>
        )}
        <button type="submit" className="pill pill-accent" disabled={!key || !text.trim()}>
          Search
        </button>
      </form>
      <QuotaHint apiKey={key} />

      {local && (local.tracks.length > 0 || local.playlists.length > 0) && (
        <Shelf title="In your library">
          {local.playlists.length > 0 && (
            <div className="chips">
              {local.playlists.map((p) => (
                <button key={p.id} className="chip" onClick={() => nav.go({ name: 'playlist', id: p.id })}>
                  <ListMusic size={14} strokeWidth={2} aria-hidden="true" /> {p.name}
                </button>
              ))}
            </div>
          )}
          {local.tracks.length > 0 && <TrackRows list={local.tracks.slice(0, q ? 4 : 8)} />}
        </Shelf>
      )}

      {!key && <YouTubeSetup />}

      {key && !q && (
        <>
          {recent.length > 0 && (
            <Shelf
              title="Recent searches"
              action={
                <button className="text-btn" onClick={() => actions.set('recent', [])}>
                  Clear
                </button>
              }
            >
              <div className="chips">
                {recent.map((x) => (
                  <button key={x} className="chip" onClick={() => run(x)}>
                    <Clock size={14} strokeWidth={2} aria-hidden="true" /> {x}
                  </button>
                ))}
              </div>
            </Shelf>
          )}
          <Shelf title="Explore">
            <div className="chips">
              {EXPLORE.map((x) => (
                <button key={x} className="chip" onClick={() => run(x)}>
                  {x}
                </button>
              ))}
            </div>
          </Shelf>
        </>
      )}

      {key && q && (
        <Loadable a={r} empty={<p>No songs found for “{q}”. Check the spelling, or try just the artist's name.</p>}>
          {(d) => (
            <>
              {artists.length > 0 && (
                <Shelf title="Artists">
                  <ul className="artist-chips">
                    {artists.map((a) => (
                      <li key={a.channelId}>
                        <button className="artist-chip" onClick={() => nav.go({ name: 'artist', channelId: a.channelId, artist: a.artist })}>
                          <Art id={a.first.id} className="artist-face" />
                          <span>{a.artist}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Shelf>
              )}
              <Shelf title="Songs" action={<PlayAll list={d} label="Play all" />}>
                <TrackRows list={d} />
              </Shelf>
            </>
          )}
        </Loadable>
      )}
    </div>
  )
}

// ---------------- Artist ----------------

export function Artist({ channelId, artist }: { channelId: string; artist: string }) {
  const key = useKey()
  const nav = useNav()
  const a = useAsync(key ? (s) => artistSongs(channelId, key, s) : null, [channelId, key])
  const name = cleanArtist(artist)
  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>{name}</h1>
        <p className="page-sub">{a.data ? `${songs(a.data.length)} · latest uploads` : 'Artist'}</p>
        <div className="head-actions">
          <PlayAll list={a.data ?? []} />
          <ShuffleAll list={a.data ?? []} />
        </div>
      </header>
      <Loadable
        a={a}
        empty={
          <>
            <p>This channel has no public songs to list.</p>
            <button className="pill pill-quiet" onClick={() => nav.go({ name: 'search', q: name })}>
              Search for {name}
            </button>
          </>
        }
      >
        {(d) => <TrackRows list={d} numbered />}
      </Loadable>
    </div>
  )
}

// ---------------- Library ----------------

function ImportPlaylist({ onDone }: { onDone: () => void }) {
  const key = useKey()
  const nav = useNav()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!key) return setErr('Connect YouTube in Settings first. Importing reads the playlist through YouTube.')
    const id = playlistId(url)
    if (!id) return setErr('That doesn’t look like a playlist link. It should contain “list=”, like youtube.com/playlist?list=PL…')
    setBusy(true)
    try {
      const r = await importPlaylist(id, key)
      if (!r.tracks.length) return setErr(`“${r.title}” has no songs that can play here.`)
      const pid = actions.createPlaylist(r.title, r.tracks)
      nav.notify(
        `Imported ${songs(r.tracks.length)} from “${r.title}”.` +
          (r.skipped ? ` ${r.skipped === 1 ? '1 video' : `${r.skipped} videos`} couldn't be added: private, deleted, or only playable on YouTube.` : ''),
      )
      onDone()
      nav.go({ name: 'playlist', id: pid })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="import-form" onSubmit={submit}>
      <label htmlFor="yt-import" className="field-label">
        YouTube or YouTube Music playlist link
      </label>
      <div className="new-form">
        <input
          id="yt-import"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="youtube.com/playlist?list=…"
          inputMode="url"
          autoComplete="off"
          aria-describedby="yt-import-hint"
          aria-invalid={!!err}
        />
        <button className="pill pill-accent" type="submit" disabled={busy || !url.trim()}>
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button className="pill pill-quiet" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
      {err ? (
        <p className="form-error" role="alert">
          {err}
        </p>
      ) : (
        <p className="field-hint" id="yt-import-hint">
          Public and Unlisted playlists work, up to 500 songs. It becomes an Aether playlist you can edit.
        </p>
      )}
    </form>
  )
}

export function Library() {
  const nav = useNav()
  const liked = useStore((s) => s.liked)
  const history = useStore((s) => s.history)
  const playlists = useStore((s) => s.playlists)
  const events = useStore((s) => s.events)
  const week = useMemo(() => stats(store.get(), 7).sec, [events])
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [name, setName] = useState('')
  const roomOn = useRoom().available

  const create = (e: FormEvent) => {
    e.preventDefault()
    const id = actions.createPlaylist(name.trim() || `My playlist ${playlists.length + 1}`)
    setName('')
    setCreating(false)
    nav.go({ name: 'playlist', id })
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Library</h1>
      </header>
      <div className="tiles">
        <button className="tile tile-liked" onClick={() => nav.go({ name: 'liked' })}>
          <Heart size={28} strokeWidth={2} fill="currentColor" aria-hidden="true" />
          <span className="tile-title">Liked songs</span>
          <span className="tile-sub">{songs(liked.length)}</span>
        </button>
        <button className="tile" onClick={() => nav.go({ name: 'history' })}>
          <Clock size={28} strokeWidth={1.75} aria-hidden="true" />
          <span className="tile-title">Recently played</span>
          <span className="tile-sub">{songs(history.length)}</span>
        </button>
        <button className="tile" onClick={() => nav.go({ name: 'stats' })}>
          <ChartColumn size={28} strokeWidth={1.75} aria-hidden="true" />
          <span className="tile-title">Your stats</span>
          <span className="tile-sub">{events.length ? `${fmtLong(week)} this week` : 'Starts counting with your next song'}</span>
        </button>
      </div>

      <Shelf title="Playlists">
        {importing && <ImportPlaylist onDone={() => setImporting(false)} />}
        {creating && (
          <form className="new-form" onSubmit={create}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" aria-label="Playlist name" maxLength={60} />
            <button className="pill pill-accent" type="submit">
              Create
            </button>
            <button className="pill pill-quiet" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </form>
        )}
        <ul className="rows">
          {!creating && !importing && (
            <>
              <li className="row">
                <button className="row-main" onClick={() => setCreating(true)}>
                  <span className="row-art-wrap">
                    <span className="art row-art art-empty art-action" aria-hidden="true">
                      <Plus size={22} strokeWidth={2} />
                    </span>
                  </span>
                  <span className="row-text">
                    <span className="row-title">New playlist</span>
                  </span>
                </button>
              </li>
              {roomOn && (
                <li className="row">
                  <button className="row-main" onClick={() => nav.go({ name: 'room' })}>
                    <span className="row-art-wrap">
                      <span className="art row-art art-empty art-action" aria-hidden="true">
                        <Users size={20} strokeWidth={2} />
                      </span>
                    </span>
                    <span className="row-text">
                      <span className="row-title">Listen together</span>
                      <span className="row-meta">Play music with friends, at the same moment</span>
                    </span>
                  </button>
                </li>
              )}
              <li className="row">
                <button className="row-main" onClick={() => setImporting(true)}>
                  <span className="row-art-wrap">
                    <span className="art row-art art-empty art-action" aria-hidden="true">
                      <Link2 size={20} strokeWidth={2} />
                    </span>
                  </span>
                  <span className="row-text">
                    <span className="row-title">Import from YouTube</span>
                    <span className="row-meta">Paste a playlist link</span>
                  </span>
                </button>
              </li>
            </>
          )}
          {playlists.map((p) => (
            <li key={p.id} className="row">
              <button className="row-main" onClick={() => nav.go({ name: 'playlist', id: p.id })}>
                <span className="row-art-wrap">
                  {p.tracks[0] ? (
                    <Art id={p.tracks[0].id} className="row-art" />
                  ) : (
                    <span className="art row-art art-empty" aria-hidden="true">
                      <ListMusic size={20} strokeWidth={1.75} />
                    </span>
                  )}
                </span>
                <span className="row-text">
                  <span className="row-title">{p.name}</span>
                  <span className="row-meta">{songs(p.tracks.length)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Shelf>
    </div>
  )
}

const total = (list: Track[]) => {
  const s = list.reduce((a, t) => a + (t.duration || 0), 0)
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? ` · ${h} hr ${m} min` : ` · ${m} min`
}

export function Liked() {
  const liked = useStore((s) => s.liked)
  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>Liked songs</h1>
        <p className="page-sub">{songs(liked.length) + total(liked)}</p>
        <div className="head-actions">
          <PlayAll list={liked} />
          <ShuffleAll list={liked} />
        </div>
      </header>
      {liked.length ? (
        <TrackRows list={liked} numbered />
      ) : (
        <div className="notice">
          <p>Songs you like show up here. Tap the heart on any song.</p>
        </div>
      )}
    </div>
  )
}

export function History() {
  const history = useStore((s) => s.history)
  const [confirm, setConfirm] = useState(false)
  const list = history.map((h) => h.t)
  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>Recently played</h1>
        <p className="page-sub">{songs(list.length)}</p>
        <div className="head-actions">
          <PlayAll list={list} />
          {list.length > 0 && (
            <button className="pill pill-quiet" onClick={() => setConfirm(true)}>
              Clear history
            </button>
          )}
        </div>
      </header>
      {confirm && (
        <div className="confirm" role="alert">
          <p>Clear your listening history? Your rotation, mixes and stats start over. Likes and playlists stay.</p>
          <div className="head-actions">
            <button
              className="pill pill-danger"
              onClick={() => {
                actions.clearListening()
                setConfirm(false)
              }}
            >
              Clear history
            </button>
            <button className="pill pill-quiet" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {list.length ? (
        <TrackRows list={list} />
      ) : (
        <div className="notice">
          <p>Nothing played yet.</p>
        </div>
      )}
    </div>
  )
}

export function PlaylistPage({ id }: { id: string }) {
  const nav = useNav()
  const p = useStore((s) => s.playlists.find((x) => x.id === id))
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(p?.name ?? '')
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)

  if (!p) {
    return (
      <div className="page">
        <div className="notice">
          <p>This playlist was deleted.</p>
          <button className="pill pill-quiet" onClick={() => nav.go({ name: 'library' })}>
            Back to Library
          </button>
        </div>
      </div>
    )
  }
  const share = async () => {
    const { url, truncated } = await shareLink(p.name, p.tracks)
    const notes = (truncated ? ' It includes the first 300 songs.' : '') + (isLocalOrigin() ? ' Until Aether is online, it only opens on devices that can reach this computer.' : '')
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: p.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setFallback(null)
      nav.notify(`Link copied. Anyone with it can play and save “${p.name}”.${notes}`)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setFallback(url)
    }
  }
  const move = (from: number, to: number) =>
    actions.editPlaylist(p.id, (pl) => {
      if (to < 0 || to >= pl.tracks.length) return pl
      const tracks = [...pl.tracks]
      const [m] = tracks.splice(from, 1)
      tracks.splice(to, 0, m)
      return { ...pl, tracks }
    })

  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>{p.name}</h1>
        <p className="page-sub">{songs(p.tracks.length) + total(p.tracks)}</p>
        <div className="head-actions">
          <PlayAll list={p.tracks} />
          <ShuffleAll list={p.tracks} />
          <button className="pill pill-quiet" onClick={share} disabled={!p.tracks.length}>
            <Share size={16} strokeWidth={2} aria-hidden="true" /> Share
          </button>
          <button className="pill pill-quiet" onClick={() => setRenaming(!renaming)} aria-expanded={renaming}>
            Rename
          </button>
          {p.tracks.length > 1 && (
            <button className="pill pill-quiet" aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {editing ? 'Done' : 'Reorder'}
            </button>
          )}
          <button className="pill pill-quiet" onClick={() => setConfirm(true)}>
            Delete
          </button>
        </div>
      </header>
      {fallback && (
        <div className="import-form">
          <label htmlFor="share-url" className="field-label">
            Copy this link to share “{p.name}”
          </label>
          <input id="share-url" className="share-url" readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} autoFocus />
        </div>
      )}
      {renaming && (
        <form
          className="new-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) actions.editPlaylist(p.id, (pl) => ({ ...pl, name: name.trim() }))
            setRenaming(false)
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Playlist name" maxLength={60} />
          <button className="pill pill-accent" type="submit">
            Save
          </button>
        </form>
      )}
      {confirm && (
        <div className="confirm" role="alert">
          <p>Delete “{p.name}”? This can't be undone.</p>
          <div className="head-actions">
            <button
              className="pill pill-danger"
              onClick={() => {
                actions.editPlaylist(p.id, () => null)
                nav.go({ name: 'library' })
              }}
            >
              Delete playlist
            </button>
            <button className="pill pill-quiet" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {p.tracks.length ? (
        <TrackRows
          list={p.tracks}
          numbered
          extra={(i) =>
            editing
              ? { up: () => move(i, i - 1), down: () => move(i, i + 1) }
              : { remove: { label: 'Remove from this playlist', run: () => actions.editPlaylist(p.id, (pl) => ({ ...pl, tracks: pl.tracks.filter((_, j) => j !== i) })) } }
          }
        />
      ) : (
        <div className="notice">
          <p>This playlist is empty. Pick “More” on any song to add it here.</p>
          <button className="pill pill-quiet" onClick={() => nav.go({ name: 'search' })}>
            Find songs
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Queue ----------------

export function Queue() {
  const player = usePlayer()
  const shared = useRoom().phase === 'live'
  const upNext = player.queue.slice(player.pos + 1)
  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>Queue</h1>
        <p className="page-sub">
          {player.shuffle ? 'Shuffle on · ' : ''}
          {player.repeat === 'one' ? 'Repeating this song' : player.repeat === 'all' ? 'Repeating the queue' : songs(upNext.length) + ' up next'}
        </p>
        {player.current && (
          <>
            <div className="head-actions">
              {/* An anchor, not window.open, so phones open it straight in the YouTube app. */}
              <a
                className="pill pill-quiet"
                href={youtubeQueueLink([player.current, ...upNext])}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => player.playing && player.toggle()}
              >
                <ExternalLink size={16} strokeWidth={2} aria-hidden="true" /> {canKeepAwake ? 'Play in YouTube app' : 'Open on YouTube'}
              </a>
            </div>
            {canKeepAwake && (
              <p className="field-hint prose">
                YouTube only lets Aether play with the screen on. Its own app keeps playing with the screen locked if you have YouTube Premium. This hands over{' '}
                {upNext.length ? `this song and the next ${songs(Math.min(upNext.length, 49))}` : 'this song'} and pauses Aether.
              </p>
            )}
          </>
        )}
      </header>
      {player.current ? (
        <>
          <Shelf title="Now playing">
            <TrackRows list={[player.current]} />
          </Shelf>
          <Shelf
            title="Up next"
            action={
              upNext.length ? (
                <button className="text-btn" onClick={player.clearQueue}>
                  Clear
                </button>
              ) : undefined
            }
          >
            {shared && <p className="field-hint">Shared with everyone in this session. Changes show on every screen.</p>}
            {upNext.length ? (
              <ul className="rows">
                {upNext.map((t, i) => {
                  const qi = player.pos + 1 + i
                  return (
                    <li key={(t as QItem).k ?? `${t.id}-${qi}`} className="row">
                      <button className="row-main" onClick={() => player.playList(player.queue, qi)} aria-label={`Play “${t.title}” now`}>
                        <span className="row-art-wrap">
                          <Art id={t.id} className="row-art" />
                        </span>
                        <span className="row-text">
                          <span className="row-title">{t.title}</span>
                          <span className="row-meta">{t.artist}</span>
                        </span>
                        <span className="row-time">{t.duration ? fmtTime(t.duration) : ''}</span>
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => player.move(qi, qi - 1)}
                        disabled={i === 0}
                        aria-label={`Move “${t.title}” up`}
                        title="Move up"
                      >
                        <ArrowUp size={18} strokeWidth={1.75} />
                      </button>
                      <button className="icon-btn" onClick={() => player.removeAt(qi)} aria-label={`Remove “${t.title}” from the queue`} title="Remove">
                        <X size={18} strokeWidth={1.75} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="notice">
                <p>
                  {shared
                    ? 'Nothing queued. Add songs from Search or your library, and they play next for everyone.'
                    : store.get().autoplay
                      ? 'Nothing queued. When this song ends, Aether keeps going with more from the same artist.'
                      : 'Nothing queued.'}
                </p>
              </div>
            )}
          </Shelf>
        </>
      ) : (
        <div className="notice">
          <p>Nothing is playing. Pick a song from Home or Search.</p>
        </div>
      )}
    </div>
  )
}

// ---------------- Settings ----------------

function listOf(parts: string[]) {
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

function DataBackup() {
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aether-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setMsg({ ok: true, text: 'Backup saved to your downloads.' })
  }
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const n = importBackup(await f.text())
      const parts = [
        n.liked ? `${n.liked} liked ${n.liked === 1 ? 'song' : 'songs'}` : '',
        n.playlists ? `${n.playlists} ${n.playlists === 1 ? 'playlist' : 'playlists'}` : '',
        n.plays ? `${n.plays} ${n.plays === 1 ? 'play' : 'plays'}` : '',
      ].filter(Boolean)
      setMsg({ ok: true, text: parts.length ? `Added ${listOf(parts)}.` : 'Everything in that backup is already here.' })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <section className="settings-group" aria-labelledby="set-data">
      <h2 id="set-data">Your data</h2>
      <p className="page-sub prose">
        Likes, playlists, history and stats live only in this browser. Save a backup now and then, or use one to move to another device. Importing adds to
        what's here and never deletes anything. Your YouTube key isn't included.
      </p>
      <div className="head-actions">
        <button className="pill pill-quiet" onClick={download}>
          <Download size={16} strokeWidth={2} aria-hidden="true" /> Export backup
        </button>
        <button className="pill pill-quiet" onClick={() => file.current?.click()}>
          <Upload size={16} strokeWidth={2} aria-hidden="true" /> Import backup
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {msg && (
        <p className={msg.ok ? 'field-hint' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>
          {msg.text}
        </p>
      )}
    </section>
  )
}

export function Settings() {
  const s = useStore((x) => x)
  const [confirmKey, setConfirmKey] = useState(false)
  return (
    <div className="page">
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <AccountSettings />

      <section className="settings-group" aria-labelledby="set-accent">
        <h2 id="set-accent">Accent colour</h2>
        <div className="swatches" role="radiogroup" aria-labelledby="set-accent">
          {(Object.keys(ACCENTS) as Accent[]).map((a) => (
            <button key={a} role="radio" aria-checked={s.accent === a} className="swatch" style={{ ['--sw' as string]: ACCENTS[a].color }} onClick={() => actions.set('accent', a)}>
              <span className="swatch-dot" aria-hidden="true" />
              {ACCENTS[a].label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-group" aria-labelledby="set-play">
        <h2 id="set-play">Playback</h2>
        <label className="switch-row">
          <span>
            <span className="switch-title">Autoplay</span>
            <span className="switch-sub">When the queue ends, keep playing more from the same artist.</span>
          </span>
          <input type="checkbox" role="switch" checked={s.autoplay} onChange={(e) => actions.set('autoplay', e.target.checked)} />
        </label>
        {canKeepAwake && (
          <label className="switch-row">
            <span>
              <span className="switch-title">Keep screen on while playing</span>
              <span className="switch-sub">
                YouTube's player stops when your phone locks, so Aether keeps the screen on while a song plays. It turns off as usual when you pause. To
                listen with the screen locked, open the queue and choose Play in YouTube app (needs YouTube Premium).
              </span>
            </span>
            <input type="checkbox" role="switch" checked={s.awake} onChange={(e) => actions.set('awake', e.target.checked)} />
          </label>
        )}
        <label className="switch-row">
          <span>
            <span className="switch-title">Lyrics</span>
            <span className="switch-sub">Synced lyrics from LRCLIB, a free lyrics database. When on, each song's title and artist are sent to lrclib.net.</span>
          </span>
          <input type="checkbox" role="switch" checked={s.lyrics} onChange={(e) => actions.set('lyrics', e.target.checked)} />
        </label>
        <label className="switch-row">
          <span>
            <span className="switch-title">Song background</span>
            <span className="switch-sub">
              Where each song comes from: its story from Wikipedia, plus first release, album and the artist's hometown from MusicBrainz. When on, the title and
              artist are sent to wikipedia.org and musicbrainz.org. Credits from the YouTube upload show either way.
            </span>
          </span>
          <input type="checkbox" role="switch" checked={s.about} onChange={(e) => actions.set('about', e.target.checked)} />
        </label>
      </section>

      <section className="settings-group" aria-labelledby="set-yt">
        <h2 id="set-yt">YouTube</h2>
        {usesProxy(s.key) ? (
          <>
            <p className="page-sub prose">
              Connected through the shared Aether server, so you don't need a key of your own. Everyone using it shares one daily search limit. Add your own free
              key to get your own.
            </p>
            <YouTubeSetup compact />
          </>
        ) : s.key ? (
          <>
            <p className="page-sub">Connected with your own API key.</p>
            <QuotaMeter apiKey={s.key} />
            {confirmKey ? (
              <div className="head-actions">
                <button
                  className="pill pill-danger"
                  onClick={() => {
                    actions.set('key', null)
                    setConfirmKey(false)
                  }}
                >
                  Disconnect YouTube
                </button>
                <button className="pill pill-quiet" onClick={() => setConfirmKey(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="pill pill-quiet" onClick={() => setConfirmKey(true)}>
                Disconnect
              </button>
            )}
          </>
        ) : (
          <YouTubeSetup />
        )}
      </section>

      <DataBackup />

      <section className="settings-group" aria-labelledby="set-about">
        <h2 id="set-about">About</h2>
        <p className="page-sub prose">
          Aether is free and adds no ads. Songs play in YouTube's own player, which may show YouTube's ads, and their sound is never changed. Without an
          account, your library stays in this browser. If you sign in, it's also saved to your account so your devices stay in sync. Song titles go to LRCLIB,
          Wikipedia and MusicBrainz only if you turn on lyrics or song background.
        </p>
      </section>
    </div>
  )
}

// ---------------- Stats ----------------

const PERIODS: { v: Period; label: string }[] = [
  { v: 7, label: '7 days' },
  { v: 30, label: '30 days' },
  { v: 'all', label: 'All time' },
]

export function Stats() {
  const s = useStore((x) => x)
  const nav = useNav()
  const [period, setPeriod] = useState<Period>(30)
  const st = useMemo(() => stats(s, period), [s.events, s.plays, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = st.slots[0]
  const when = top && top.sec > 0 ? (top.key === 'night' ? ', mostly late at night' : `, mostly in the ${top.label.toLowerCase()}`) : ''
  const skipPct = st.listens ? Math.round((st.skips / st.listens) * 100) : 0
  const span = period === 'all' ? 'Since Aether started counting' : `In the last ${period} days`
  const slotMax = Math.max(1, ...st.slots.map((x) => x.sec))

  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>Your listening</h1>
        <p className="page-sub">Counted in this browser from what you actually hear. Paused and skipped-over time doesn't count.</p>
        <div className="seg" role="group" aria-label="Time period">
          {PERIODS.map((x) => (
            <button key={x.label} aria-pressed={period === x.v} onClick={() => setPeriod(x.v)}>
              {x.label}
            </button>
          ))}
        </div>
      </header>

      {!st.listens ? (
        <div className="notice">
          <p>{s.events.length ? `Nothing played in the last ${period} days.` : 'Stats start with your next song. Play something and come back.'}</p>
        </div>
      ) : (
        <>
          <p className="stats-lede">
            {span}, you listened for <strong>{fmtLong(st.sec)}</strong> across {songs(st.distinct)} on {st.days === 1 ? '1 day' : `${st.days} days`}
            {when}.{st.artists[0] ? ` Your top artist was ${st.artists[0].name}.` : ''}
            {skipPct >= 5 ? ` You skipped ${skipPct}% of songs early.` : ''}
          </p>

          {st.songs.length > 0 && (
            <Shelf title="Top songs" action={<PlayAll list={st.songs.map((x) => x.t)} label="Play" />}>
              <TrackRows list={st.songs.map((x) => x.t)} numbered side={(i) => (st.songs[i].plays === 1 ? '1 play' : `${st.songs[i].plays} plays`)} />
            </Shelf>
          )}

          {st.artists.length > 0 && (
            <Shelf title="Top artists">
              <ol className="rows">
                {st.artists.map((a, i) => (
                  <li key={a.channelId || a.name} className="row">
                    <button
                      className="row-main"
                      disabled={!a.channelId}
                      onClick={() => nav.go({ name: 'artist', channelId: a.channelId, artist: a.name })}
                      aria-label={`${a.name}: ${fmtLong(a.sec)} listened. Open artist`}
                    >
                      <span className="row-num">{i + 1}</span>
                      <span className="row-art-wrap">
                        <Art id={a.sample.id} className="row-art row-art-round" />
                      </span>
                      <span className="row-text">
                        <span className="row-title">{a.name}</span>
                        <span className="row-meta">
                          {a.plays === 1 ? '1 play' : `${a.plays} plays`} · {fmtLong(a.sec)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </Shelf>
          )}

          <Shelf title="When you listen">
            <ul className="slot-list">
              {st.slots.map((x) => (
                <li key={x.key} style={{ ['--share' as string]: `${(x.sec / slotMax) * 100}%` }}>
                  <span className="slot-name">{x.label}</span>
                  <span className="slot-time">{x.sec ? fmtLong(x.sec) : 'None'}</span>
                  <span className="slot-bar" aria-hidden="true" />
                </li>
              ))}
            </ul>
          </Shelf>

          {st.since && <p className="field-hint">Counting since {new Date(st.since).toLocaleDateString(undefined, { dateStyle: 'long' })}.</p>}
        </>
      )}
    </div>
  )
}

// ---------------- Shared playlist (from a link) ----------------

export function Shared({ title, tracks }: { title: string; tracks: Track[] }) {
  const nav = useNav()
  const [saved, setSaved] = useState<string | null>(null)
  return (
    <div className="page">
      <BackLink />
      <header className="page-head">
        <h1>{title}</h1>
        <p className="page-sub">Shared with you · {songs(tracks.length) + total(tracks)}</p>
        <div className="head-actions">
          <PlayAll list={tracks} />
          <ShuffleAll list={tracks} />
          {saved ? (
            <button className="pill pill-quiet" onClick={() => nav.go({ name: 'playlist', id: saved })}>
              <ListMusic size={16} strokeWidth={2} aria-hidden="true" /> Open in Library
            </button>
          ) : (
            <button
              className="pill pill-quiet"
              onClick={() => {
                setSaved(actions.createPlaylist(title, tracks))
                nav.notify(`Saved “${title}” to your Library.`)
              }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> Save to Library
            </button>
          )}
        </div>
      </header>
      <TrackRows list={tracks} numbered />
    </div>
  )
}

// ---------------- Song: lyrics and where it comes from ----------------

export function SongPage({ initial }: { initial: SongTab }) {
  const t = usePlayer().current
  const [tab, setTab] = useState<SongTab>(initial)
  return (
    <div className="page page-song">
      <BackLink />
      <header className="page-head">
        <h1>{t ? t.title : 'Nothing playing'}</h1>
        {t && <p className="page-sub">{t.artist}</p>}
        {t && (
          <div className="seg" role="group" aria-label="Show">
            <button aria-pressed={tab === 'lyrics'} onClick={() => setTab('lyrics')}>
              Lyrics
            </button>
            <button aria-pressed={tab === 'about'} onClick={() => setTab('about')}>
              About
            </button>
          </div>
        )}
      </header>
      {!t ? (
        <div className="notice">
          <p>Play a song to see its lyrics and where it comes from.</p>
        </div>
      ) : tab === 'lyrics' ? (
        <LyricsView where="page" />
      ) : (
        <AboutView />
      )}
    </div>
  )
}
