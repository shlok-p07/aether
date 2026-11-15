import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, Clock, Heart, ListMusic, Plus, Search as SearchIcon, X } from 'lucide-react'
import { artistSongs, cleanArtist, regionName, search, trending } from './data/youtube'
import { ACCENTS, actions, onRepeat, recentlyPlayed, store, topArtists, useStore, type Accent, type Track } from './store'
import { fmtTime, songs, useAsync, useNav, usePlayer } from './app/context'
import { Art, Cards, Loadable, PlayAll, Shelf, ShuffleAll, TrackRows } from './components/bits'
import { YouTubeSetup } from './components/YouTubeSetup'

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

      {top.length >= 3 && (
        <Shelf title="On repeat">
          <Cards list={top.map((p) => p.t)} sub={(_, i) => `${top[i].n} plays`} />
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
  // Searching costs quota, so it runs when you press Enter, not on every keystroke.
  const r = useAsync(key && q ? (s) => search(q, key, s) : null, [q, key])

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

export function Library() {
  const nav = useNav()
  const liked = useStore((s) => s.liked)
  const history = useStore((s) => s.history)
  const playlists = useStore((s) => s.playlists)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

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
      </div>

      <Shelf
        title="Playlists"
        action={
          !creating && (
            <button className="pill pill-quiet" onClick={() => setCreating(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> New playlist
            </button>
          )
        }
      >
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
        {playlists.length === 0 && !creating ? (
          <div className="notice">
            <p>No playlists yet. Make one here, or pick “More” on any song and add it to a new playlist.</p>
          </div>
        ) : (
          <ul className="rows">
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
        )}
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
          <p>Clear your listening history? Your rotation and recommendations start over. Likes and playlists stay.</p>
          <div className="head-actions">
            <button
              className="pill pill-danger"
              onClick={() => {
                store.set((s) => ({ ...s, history: [], plays: {} }))
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
      </header>
      {player.current ? (
        <>
          <Shelf title="Now playing">
            <TrackRows list={[player.current]} />
          </Shelf>
          <Shelf title="Up next">
            {upNext.length ? (
              <ul className="rows">
                {upNext.map((t, i) => {
                  const qi = player.pos + 1 + i
                  return (
                    <li key={`${t.id}-${qi}`} className="row">
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
                      <button className="icon-btn" onClick={() => player.removeAt(qi)} aria-label={`Remove “${t.title}” from the queue`} title="Remove">
                        <X size={18} strokeWidth={1.75} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="notice">
                <p>{store.get().autoplay ? 'Nothing queued. When this song ends, Aether keeps going with more from the same artist.' : 'Nothing queued.'}</p>
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

export function Settings() {
  const s = useStore((x) => x)
  const [confirmKey, setConfirmKey] = useState(false)
  return (
    <div className="page">
      <header className="page-head">
        <h1>Settings</h1>
      </header>

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
      </section>

      <section className="settings-group" aria-labelledby="set-yt">
        <h2 id="set-yt">YouTube</h2>
        {s.key ? (
          <>
            <p className="page-sub">Connected with your API key (stored only in this browser).</p>
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

      <section className="settings-group" aria-labelledby="set-about">
        <h2 id="set-about">About</h2>
        <p className="page-sub prose">
          Aether is free and adds no ads. Songs play in YouTube's own player, which may show YouTube's ads, and their sound is never changed. Your likes,
          playlists and history stay in this browser; nothing is sent anywhere except searches to YouTube.
        </p>
      </section>
    </div>
  )
}
