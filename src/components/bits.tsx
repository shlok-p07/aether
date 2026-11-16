import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Check, Ellipsis, Heart, ListEnd, ListStart, Music, Pause, Play, Plus, RotateCw, Trash2, User } from 'lucide-react'
import { art as artUrl } from '../data/youtube'
import { actions, isLiked, useStore, type Track } from '../store'
import { fmtTime, useNav, usePlayer, type Async } from '../app/context'

/** Square cover from the YouTube thumbnail: the 720p frame center-cropped, falling back to the small one. */
export function Art({ id, className = '', eager }: { id: string; className?: string; eager?: boolean }) {
  // 0: 720p frame, 1: small frame, 2: no artwork. YouTube answers a missing size with a 120px grey
  // placeholder instead of an error, so a tiny image counts as missing too.
  const [stage, setStage] = useState(0)
  useEffect(() => setStage(0), [id])
  const fail = () => setStage((x) => Math.min(2, x + 1))
  return (
    <span className={`art ${className}${stage === 2 ? ' art-empty' : ''}`}>
      {stage < 2 ? (
        <img
          src={artUrl(id, stage === 0)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          onError={fail}
          onLoad={(e) => e.currentTarget.naturalWidth <= 120 && fail()}
        />
      ) : (
        <Music size={20} strokeWidth={1.75} aria-hidden="true" />
      )}
    </span>
  )
}

/** A floating panel anchored to a trigger; closes on outside click and Escape, returns focus. */
export function Popover({ trigger, children, label }: { trigger: (p: { open: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement> }) => ReactNode; children: (close: () => void) => ReactNode; label: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0, up: false, max: 480 })
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    const w = 280
    // Never drop over the player bar: measure the room above it.
    const floor = document.querySelector('.bottom')?.getBoundingClientRect().top ?? window.innerHeight
    const below = floor - r.bottom - 16
    const above = r.top - 16
    const up = below < 380 && above > below
    setPos({ left: Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8), top: up ? r.top - 8 : r.bottom + 8, up, max: Math.min(480, up ? above : below) })
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btn.current?.focus()
      }
    }
    const scroll = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key, true)
    window.addEventListener('resize', scroll)
    ;(pop.current?.querySelector('button, input') as HTMLElement | null)?.focus()
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key, true)
      window.removeEventListener('resize', scroll)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    btn.current?.focus()
  }

  return (
    <>
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: btn })}
      {open &&
        createPortal(
          <div ref={pop} id={id} className={`popover${pos.up ? ' is-up' : ''}`} style={{ left: pos.left, top: pos.top, maxHeight: pos.max }} role="dialog" aria-label={label}>
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Everything you can do with one song. */
export function TrackMenu({ track, extra }: { track: Track; extra?: (close: () => void) => ReactNode }) {
  const player = usePlayer()
  const nav = useNav()
  const playlists = useStore((s) => s.playlists)
  const liked = useStore((s) => isLiked(s, track.id))
  const [name, setName] = useState('')

  const create = (e: FormEvent, close: () => void) => {
    e.preventDefault()
    const n = name.trim() || `My playlist ${playlists.length + 1}`
    actions.createPlaylist(n, track)
    nav.notify(`Created “${n}” with “${track.title}”.`)
    setName('')
    close()
  }

  return (
    <Popover
      label={`Options for ${track.title}`}
      trigger={({ open, toggle, ref }) => (
        <button ref={ref} className="icon-btn" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-label={`More options for “${track.title}”`} title="More">
          <Ellipsis size={20} strokeWidth={1.75} />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="popover-title">{track.title}</p>
          <div className="menu">
            <button
              className="menu-item"
              onClick={() => {
                player.playNext(track)
                nav.notify(`“${track.title}” plays next.`)
                close()
              }}
            >
              <ListStart size={18} strokeWidth={1.75} aria-hidden="true" /> Play next
            </button>
            <button
              className="menu-item"
              onClick={() => {
                player.addToQueue(track)
                nav.notify(`Added “${track.title}” to the queue.`)
                close()
              }}
            >
              <ListEnd size={18} strokeWidth={1.75} aria-hidden="true" /> Add to queue
            </button>
            <button className="menu-item" onClick={() => actions.toggleLike(track)} aria-pressed={liked}>
              <Heart size={18} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" /> {liked ? 'Liked' : 'Like'}
            </button>
            {track.channelId && (
              <button
                className="menu-item"
                onClick={() => {
                  nav.go({ name: 'artist', channelId: track.channelId, artist: track.artist })
                  close()
                }}
              >
                <User size={18} strokeWidth={1.75} aria-hidden="true" /> Go to {track.artist || 'artist'}
              </button>
            )}
            {extra?.(close)}
          </div>
          <p className="popover-title">Add to playlist</p>
          {playlists.length > 0 && (
            <div className="menu menu-scroll">
              {playlists.map((p) => {
                const has = p.tracks.some((t) => t.id === track.id)
                return (
                  <button key={p.id} className="menu-item" aria-pressed={has} onClick={() => actions.toggleInPlaylist(p.id, track)}>
                    <span className="check" aria-hidden="true">
                      {has && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="menu-name">{p.name}</span>
                  </button>
                )
              })}
            </div>
          )}
          <form className="new-form" onSubmit={(e) => create(e, close)}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New playlist" aria-label="New playlist name" maxLength={60} />
            <button className="pill pill-accent" type="submit" aria-label="Create playlist with this song">
              <Plus size={16} strokeWidth={2.25} aria-hidden="true" /> Create
            </button>
          </form>
        </>
      )}
    </Popover>
  )
}

export function LikeButton({ track }: { track: Track }) {
  const liked = useStore((s) => isLiked(s, track.id))
  return (
    <button
      className={`icon-btn like${liked ? ' is-liked' : ''}`}
      onClick={() => actions.toggleLike(track)}
      aria-pressed={liked}
      aria-label={liked ? `Unlike “${track.title}”` : `Like “${track.title}”`}
      title={liked ? 'Liked' : 'Like'}
    >
      <Heart size={20} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} />
    </button>
  )
}

type RowExtra = { remove?: { label: string; run: () => void }; up?: () => void; down?: () => void }

export function TrackRow({ list, index, numbered, extra, side }: { list: Track[]; index: number; numbered?: boolean; extra?: RowExtra; side?: string }) {
  const player = usePlayer()
  const t = list[index]
  const current = player.current?.id === t.id
  const rm = extra?.remove
  return (
    <li className={`row${current ? ' is-current' : ''}`}>
      <button className="row-main" onClick={() => (current ? player.toggle() : player.playList(list, index))} aria-label={current && player.playing ? `Pause “${t.title}”` : `Play “${t.title}” by ${t.artist}`}>
        {numbered && <span className="row-num">{current && player.playing ? <span className="eq" aria-hidden="true"><i /><i /><i /></span> : index + 1}</span>}
        <span className="row-art-wrap">
          <Art id={t.id} className="row-art" />
          <span className="row-art-play" aria-hidden="true">
            {current && player.playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
          </span>
        </span>
        <span className="row-text">
          <span className="row-title">{t.title}</span>
          <span className="row-meta">
            {current ? <span className="now-tag">Playing · </span> : null}
            {t.artist}
            {side && <span className="meta-side"> · {side}</span>}
          </span>
        </span>
        <span className={`row-time${side ? ' row-side' : ''}`}>{side ?? (t.duration ? fmtTime(t.duration) : '')}</span>
      </button>
      {extra?.up && (
        <button className="icon-btn" onClick={extra.up} aria-label={`Move “${t.title}” up`} disabled={index === 0}>
          <ArrowUp size={18} strokeWidth={1.75} />
        </button>
      )}
      {extra?.down && (
        <button className="icon-btn" onClick={extra.down} aria-label={`Move “${t.title}” down`} disabled={index === list.length - 1}>
          <ArrowDown size={18} strokeWidth={1.75} />
        </button>
      )}
      <LikeButton track={t} />
      <TrackMenu
        track={t}
        extra={
          rm
            ? (close) => (
                <button
                  className="menu-item danger"
                  onClick={() => {
                    rm.run()
                    close()
                  }}
                >
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" /> {rm.label}
                </button>
              )
            : undefined
        }
      />
    </li>
  )
}

export function TrackRows({ list, numbered, extra, side }: { list: Track[]; numbered?: boolean; extra?: (i: number) => RowExtra; side?: (i: number) => string }) {
  return (
    <ul className="rows">
      {list.map((t, i) => (
        <TrackRow key={`${t.id}-${i}`} list={list} index={i} numbered={numbered} extra={extra?.(i)} side={side?.(i)} />
      ))}
    </ul>
  )
}

/** A horizontal shelf of square cards. */
export function Shelf({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Cards({ list, sub }: { list: Track[]; sub?: (t: Track, i: number) => string }) {
  const player = usePlayer()
  return (
    <ul className="cards">
      {list.map((t, i) => {
        const current = player.current?.id === t.id
        return (
          <li key={`${t.id}-${i}`}>
            <button className={`card${current ? ' is-current' : ''}`} onClick={() => (current ? player.toggle() : player.playList(list, i))}>
              <span className="card-art">
                <Art id={t.id} />
                <span className="card-play" aria-hidden="true">
                  {current && player.playing ? <Pause size={20} fill="currentColor" strokeWidth={0} /> : <Play size={20} fill="currentColor" strokeWidth={0} />}
                </span>
              </span>
              <span className="card-title">{t.title}</span>
              <span className="card-sub">{current ? 'Playing now' : sub ? sub(t, i) : t.artist}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function Loadable<T>({ a, empty, children, skeleton = 'rows' }: { a: Async<T>; empty: ReactNode; children: (d: T) => ReactNode; skeleton?: 'rows' | 'cards' }) {
  if (a.status === 'idle') return null
  if (a.status === 'loading' && !a.data) {
    return skeleton === 'cards' ? (
      <ul className="cards" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <span className="card-skeleton" />
          </li>
        ))}
      </ul>
    ) : (
      <div className="rows" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="row-skeleton" />
        ))}
      </div>
    )
  }
  if (a.status === 'error') {
    return (
      <div className="notice">
        <p>{a.error?.message || "Couldn't load this."}</p>
        <button className="pill pill-quiet" onClick={a.retry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" /> Try again
        </button>
      </div>
    )
  }
  const d = a.data as T
  if (!d || (Array.isArray(d) && d.length === 0)) return <div className="notice">{typeof empty === 'string' ? <p>{empty}</p> : empty}</div>
  return <>{children(d)}</>
}

export function PlayAll({ list, label = 'Play' }: { list: Track[]; label?: string }) {
  const player = usePlayer()
  return (
    <button className="pill pill-accent" onClick={() => list.length && player.playList(list, 0, true)} disabled={!list.length}>
      <Play size={16} strokeWidth={0} fill="currentColor" aria-hidden="true" /> {label}
    </button>
  )
}

export function ShuffleAll({ list }: { list: Track[] }) {
  const player = usePlayer()
  return (
    <button
      className="pill pill-quiet"
      onClick={() => {
        if (!list.length) return
        player.playList(list, Math.floor(Math.random() * list.length), 'shuffle')
      }}
      disabled={!list.length}
    >
      Shuffle
    </button>
  )
}
