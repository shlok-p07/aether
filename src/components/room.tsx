import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Check, Copy, Heart, Link2, ListPlus, LoaderCircle, QrCode, Radio, Share, ShieldCheck, UserMinus, Users } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { cleanName, expectedPos, present, room, roomCode, roomLink, savedName, useRoom, type FeedItem, type Member, type RoomData } from '../data/room'
import { useSync } from '../data/sync'
import { fmtTime, useNav, usePlayer } from '../app/context'
import { Art } from './bits'

const listening = (n: number) => `${n} ${n === 1 ? 'person' : 'people'} listening`
const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** The pulsing "Live" badge. The word carries the meaning; the dot is decoration. */
function LiveBadge() {
  return (
    <span className="live-badge">
      <span className="live-dot" aria-hidden="true" />
      Live
    </span>
  )
}

/** Equaliser bars: move while music plays, rest when it's paused. Decorative. */
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

/** A QR code drawn as SVG squares, for joining from a phone in the same room. */
function QR({ text }: { text: string }) {
  const code = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    const n = q.getModuleCount()
    let d = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + 2} ${y + 2}h1v1h-1z`
    return { d, size: n + 4 }
  }, [text])
  return (
    <svg className="qr" viewBox={`0 0 ${code.size} ${code.size}`} role="img" aria-label="QR code for the invitation link" shapeRendering="crispEdges">
      <rect width={code.size} height={code.size} fill="#fff" />
      <path d={code.d} fill="#000" />
    </svg>
  )
}

function NameForm({ cta, busyLabel, busy, onSubmit, note }: { cta: string; busyLabel: string; busy: boolean; onSubmit: (name: string) => void; note?: string }) {
  const account = useSync()
  const [name, setName] = useState(() => savedName() || cleanName(account.user?.name.split(' ')[0] ?? ''))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(cleanName(name))
  }
  return (
    <form className="live-form" onSubmit={submit}>
      <label className="field-label" htmlFor="room-name">
        Your name
      </label>
      <div className="new-form">
        <input
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What friends call you"
          aria-describedby="room-name-hint"
          maxLength={24}
          autoComplete="given-name"
          enterKeyHint="go"
        />
        <button className="pill pill-accent" type="submit" disabled={busy}>
          {busy ? busyLabel : cta}
        </button>
      </div>
      <p className="field-hint" id="room-name-hint">
        {note ?? 'Shown to the people listening with you.'}
      </p>
    </form>
  )
}

/** The song everyone is hearing, where it is, and whether you're in step. */
function Stage({ r, role, children }: { r: RoomData; role: 'host' | 'guest' | 'invited'; children?: ReactNode }) {
  const p = usePlayer()
  const t = r.track
  const hearing = !!t && p.current?.id === t.id
  const dur = p.duration || t?.duration || 0
  const pos = hearing ? p.time : expectedPos(r)
  const drift = hearing && p.playing ? Math.abs(p.time - expectedPos(r)) : null
  let state: string
  if (!t) state = role === 'host' ? 'Play any song and everyone hears it' : `Waiting for ${r.hostName} to play something`
  else if (!r.playing) state = role === 'host' ? 'Paused for everyone' : `Paused by ${r.hostName}`
  else if (role === 'host') state = 'Playing for everyone'
  else if (role === 'invited') state = 'Playing now · join to listen'
  else if (drift === null) state = "You're not hearing it"
  else state = drift < 1 ? `In sync · ${drift.toFixed(1)}s` : 'Catching up…'
  const moving = !!t && r.playing && (role === 'host' ? p.playing : role === 'invited' || drift !== null)
  return (
    <section className="live-stage" aria-label="Now playing">
      {t ? <Art id={t.id} className="live-art" eager /> : <span className="art live-art art-empty" aria-hidden="true" />}
      <div className="live-meta">
        {t ? (
          <>
            <h2 className="live-title">{t.title}</h2>
            <p className="live-artist">{t.artist}</p>
          </>
        ) : (
          <h2 className="live-title is-quiet">Nothing playing yet</h2>
        )}
        <p className="live-state">
          <Eq on={moving} />
          <span className={drift !== null ? 'mono' : undefined}>{state}</span>
        </p>
        {t && dur > 0 && (
          <div className="live-progress" aria-hidden="true">
            <span className="mono">{fmtTime(Math.min(pos, dur))}</span>
            <span className="live-track">
              <span style={{ width: `${Math.min(100, (pos / dur) * 100)}%` }} />
            </span>
            <span className="mono">{fmtTime(dur)}</span>
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function People({ members, r, me, canRemove }: { members: Member[]; r: RoomData; me: string | null; canRemove: boolean }) {
  const here = present(members)
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <section className="live-section" aria-labelledby="live-people">
      <h2 id="live-people">
        People <span className="live-count mono">{here.length}</span>
      </h2>
      <ul className="live-people">
        {here.map((m) => {
          const tags = [m.uid === r.host && 'host', m.uid === me && 'you'].filter(Boolean).join(' · ')
          return (
            <li key={m.uid}>
              <span className="avatar avatar-initial" aria-hidden="true">
                {initial(m.name)}
              </span>
              <span className="live-person">{m.name}</span>
              {tags && <span className="live-tag mono">{tags}</span>}
              {canRemove && m.uid !== me && (
                <span className="live-person-end">
                  {confirm === m.uid ? (
                    <>
                      <button
                        className="pill pill-danger"
                        onClick={() => {
                          setConfirm(null)
                          room.remove(m.uid, m.name)
                        }}
                      >
                        Remove
                      </button>
                      <button className="pill pill-quiet" onClick={() => setConfirm(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="icon-btn" onClick={() => setConfirm(m.uid)} aria-label={`Remove ${m.name} from the session`} title="Remove">
                      <UserMinus size={18} strokeWidth={1.75} />
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {canRemove && here.length > 1 && <p className="field-hint">Removing someone also stops them rejoining this session.</p>}
    </section>
  )
}

const line = (f: FeedItem) => {
  switch (f.kind) {
    case 'start':
      return 'You went live'
    case 'join':
      return `${f.who} joined`
    case 'leave':
      return `${f.who} left`
    case 'song':
      return `Now playing ${f.what}`
    case 'love':
      return `${f.who} loved ${f.what}`
    case 'add':
      return `${f.who} added ${f.what}`
    case 'remove':
      return `${f.who} was removed`
  }
}

function Activity({ feed }: { feed: FeedItem[] }) {
  return (
    <section className="live-section" aria-labelledby="live-activity">
      <h2 id="live-activity">Activity</h2>
      {feed.length ? (
        <ol className="live-log" role="log">
          {feed.slice(0, 12).map((f) => (
            <li key={f.key}>
              <time className="mono" dateTime={new Date(f.at).toISOString()}>
                {clock(f.at)}
              </time>
              <span>{line(f)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="field-hint">Joins, songs, requests and loves show up here.</p>
      )}
    </section>
  )
}

function UpNext({ r, role }: { r: RoomData; role: 'host' | 'guest' }) {
  const nav = useNav()
  return (
    <section className="live-section" aria-labelledby="live-next">
      <h2 id="live-next">
        Up next <span className="live-count mono">{r.queue.length}</span>
      </h2>
      {r.queue.length ? (
        <ol className="live-queue">
          {r.queue.slice(0, 8).map((t, i) => (
            <li key={`${t.id}-${i}`}>
              <span className="mono live-n" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Art id={t.id} className="mini-art" />
              <span className="row-text">
                <span className="row-title">{t.title}</span>
                <span className="row-meta">{t.artist}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="field-hint">Nothing queued yet.</p>
      )}
      {role === 'guest' ? (
        <div className="live-add">
          <p className="field-hint">Tap any song in Search or your library to add it to {r.hostName}'s queue.</p>
          <button className="pill pill-quiet" onClick={() => nav.go({ name: 'library' })}>
            <ListPlus size={16} strokeWidth={2} aria-hidden="true" /> Add a song
          </button>
        </div>
      ) : (
        <p className="field-hint">Songs people send you join the end of this list.</p>
      )}
    </section>
  )
}

function Invite({ id, hostName }: { id: string; hostName: string }) {
  const link = roomLink(id)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      ;(document.getElementById('room-link') as HTMLInputElement | null)?.select()
    }
  }
  return (
    <section className="live-section" aria-labelledby="live-invite">
      <h2 id="live-invite">Invite</h2>
      <div className="new-form">
        <input id="room-link" className="share-url mono" value={link} readOnly aria-label="Invitation link" onFocus={(e) => e.target.select()} />
        <button className="pill pill-accent" onClick={copy}>
          {copied ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={2} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {'share' in navigator && (
          <button
            className="pill pill-quiet"
            onClick={() => navigator.share({ title: 'Listen with me on Aether', text: `${hostName} is playing music on Aether. Listen along:`, url: link }).catch(() => {})}
          >
            <Share size={16} strokeWidth={2} aria-hidden="true" /> Share
          </button>
        )}
        <button className="pill pill-quiet" onClick={() => setQr(!qr)} aria-expanded={qr} aria-controls="live-qr">
          <QrCode size={16} strokeWidth={2} aria-hidden="true" /> QR code
        </button>
      </div>
      {qr && (
        <figure className="live-qr" id="live-qr">
          <QR text={link} />
          <figcaption className="field-hint">Point a phone camera here to join.</figcaption>
        </figure>
      )}
    </section>
  )
}

/** The page for starting, joining and being in a "Listen together" session. */
export function RoomPage() {
  const rs = useRoom()
  const player = usePlayer()
  const [busy, setBusy] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [loved, setLoved] = useState<string | null>(null)

  if (!rs.available)
    return (
      <div className="page">
        <header className="page-head">
          <h1>Listen together</h1>
          <p className="page-sub prose">Listening together needs sign-in to be set up on this copy of Aether. The README explains how.</p>
        </header>
      </div>
    )

  if (rs.phase === 'connecting')
    return (
      <div className="page">
        <header className="page-head">
          <h1>Listen together</h1>
          <p className="page-sub live-wait" role="status">
            <LoaderCircle className="spin" size={18} strokeWidth={2} aria-hidden="true" /> Connecting…
          </p>
        </header>
      </div>
    )

  // ---------- invited ----------
  if (rs.phase === 'invited' && rs.room) {
    const r = rs.room
    return (
      <div className="page live">
        <header className="page-head live-head">
          <div className="live-row">
            <LiveBadge />
            {rs.id && <span className="live-code mono">{roomCode(rs.id)}</span>}
          </div>
          <h1>{r.hostName} invited you to listen together</h1>
          <p className="page-sub prose">You'll hear what {r.hostName} plays, at the same moment. No account, app or YouTube key needed.</p>
        </header>
        <Stage r={r} role="invited" />
        <NameForm
          cta="Join"
          busyLabel="Joining…"
          busy={busy}
          note={player.current ? 'Shown to the people listening with you. Joining stops the song you’re playing now.' : undefined}
          onSubmit={async (n) => {
            setBusy(true)
            await room.join(n || 'Listener')
            setBusy(false)
          }}
        />
        {rs.error && (
          <p className="form-error" role="alert">
            {rs.error}
          </p>
        )}
      </div>
    )
  }

  // ---------- live ----------
  if (rs.phase === 'live' && rs.room && rs.id && rs.role) {
    const r = rs.room
    const role = rs.role
    const here = present(rs.members).length
    const hearing = player.current?.id === r.track?.id
    const behind = role === 'guest' && r.playing && hearing && !player.playing && !player.loading
    return (
      <div className="page live">
        <header className="page-head live-head">
          <div className="live-row">
            <LiveBadge />
            <span className="live-code mono" aria-label={`Session code ${roomCode(rs.id)}`}>
              {roomCode(rs.id)}
            </span>
          </div>
          <h1>{role === 'host' ? 'Your session' : `Listening with ${r.hostName}`}</h1>
          <p className="page-sub">{listening(here)}</p>
        </header>

        <Stage r={r} role={role}>
          {role === 'guest' && (
            <div className="head-actions">
              {behind && (
                <button className="pill pill-accent" onClick={player.toggle}>
                  <Radio size={16} strokeWidth={2} aria-hidden="true" /> Play along
                </button>
              )}
              {r.track && (
                <button
                  className="pill pill-quiet"
                  aria-pressed={loved === r.track.id}
                  onClick={() => {
                    if (loved === r.track?.id) return
                    setLoved(r.track!.id)
                    room.love()
                  }}
                >
                  <Heart size={16} strokeWidth={2} fill={loved === r.track.id ? 'currentColor' : 'none'} aria-hidden="true" />
                  {loved === r.track.id ? 'Loved' : 'Love this'}
                </button>
              )}
            </div>
          )}
        </Stage>

        {role === 'host' && <Invite id={rs.id} hostName={r.hostName} />}

        <div className="live-grid">
          <UpNext r={r} role={role} />
          <div className="live-col">
            <People members={rs.members} r={r} me={rs.me} canRemove={role === 'host'} />
            <Activity feed={rs.feed} />
          </div>
        </div>

        {role === 'host' ? (
          confirmEnd ? (
            <div className="confirm" role="alert">
              <p>End the session for everyone? The music keeps playing for you.</p>
              <div className="head-actions">
                <button className="pill pill-danger" onClick={() => room.leave()}>
                  End session
                </button>
                <button className="pill pill-quiet" onClick={() => setConfirmEnd(false)}>
                  Keep going
                </button>
              </div>
            </div>
          ) : (
            <div className="head-actions">
              <button className="pill pill-quiet" onClick={() => setConfirmEnd(true)}>
                End session
              </button>
            </div>
          )
        ) : (
          <div className="head-actions">
            <button className="pill pill-quiet" onClick={() => room.leave()}>
              Leave
            </button>
          </div>
        )}
      </div>
    )
  }

  // ---------- ended ----------
  if (rs.phase === 'over')
    return (
      <div className="page">
        <header className="page-head">
          <h1>Session over</h1>
          <p className="page-sub">{rs.overReason ?? 'This session has ended.'}</p>
        </header>
        <div className="head-actions">
          <button className="pill pill-accent" onClick={() => room.reset()}>
            Start your own
          </button>
        </div>
      </div>
    )

  // ---------- start ----------
  return (
    <div className="page live">
      <header className="page-head">
        <h1>Listen together</h1>
        <p className="page-sub prose">
          One link, and everyone hears the same song at the same moment, on any phone or computer. No account, app or YouTube key needed.
        </p>
      </header>
      <NameForm
        cta="Go live"
        busyLabel="Starting…"
        busy={busy}
        onSubmit={async (n) => {
          setBusy(true)
          await room.start(n, { track: player.current, queue: player.queue.slice(player.pos + 1), playing: player.playing, pos: player.time })
          setBusy(false)
        }}
      />
      {rs.error && (
        <p className="form-error" role="alert">
          {rs.error}
        </p>
      )}
      <ul className="live-points">
        <li>
          <Link2 size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Share one link.</strong> Or show a QR code to people in the room.
          </span>
        </li>
        <li>
          <Radio size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Stays in sync.</strong> Every player follows yours to within a couple of seconds.
          </span>
        </li>
        <li>
          <ListPlus size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Friends add songs.</strong> Their picks join the end of your queue.
          </span>
        </li>
        <li>
          <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>You're in control.</strong> Only you can skip or pause, and you can remove anyone.
          </span>
        </li>
      </ul>
    </div>
  )
}

/** Sidebar entry, showing how many are listening during a session. */
export function RoomNavItem({ active }: { active: boolean }) {
  const rs = useRoom()
  const nav = useNav()
  if (!rs.available) return null
  const live = rs.phase === 'live'
  const n = present(rs.members).length
  return (
    <button
      className="side-item"
      aria-current={active ? 'page' : undefined}
      aria-label={live ? `Listen together, live, ${listening(n)}` : undefined}
      onClick={() => nav.go({ name: 'room' })}
    >
      <Users size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="side-label">Listen together</span>
      {live && (
        <span className="side-count room-live mono" aria-hidden="true">
          <span className="live-dot" />
          {n}
        </span>
      )}
    </button>
  )
}

/** On phones and tablets, a reminder above the player that you're in a session. */
export function RoomChip() {
  const rs = useRoom()
  const nav = useNav()
  if (rs.phase !== 'live' || !rs.room) return null
  const n = present(rs.members).length
  return (
    <button className="room-chip" onClick={() => nav.go({ name: 'room' })}>
      <span className="live-dot" aria-hidden="true" />
      {rs.role === 'host' ? `Live · ${listening(n)}` : `With ${rs.room.hostName} · ${listening(n)}`}
    </button>
  )
}
