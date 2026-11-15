import { useState } from 'react'
import { Cloud, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react'
import { sync, useSync, type SyncStatus } from '../data/sync'
import { useNav } from '../app/context'

/** Google's own mark, used as its branding guidelines require for a "Continue with Google" button. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export function GoogleButton() {
  const s = useSync()
  const busy = s.phase === 'signing-in'
  return (
    <button className="google-btn" onClick={() => sync.signIn()} disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={20} strokeWidth={2} aria-hidden="true" /> : <GoogleMark />}
      {busy ? 'Signing in…' : 'Continue with Google'}
    </button>
  )
}

export function Avatar({ size = 32 }: { size?: number }) {
  const { user } = useSync()
  const [broken, setBroken] = useState(false)
  if (!user) return null
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()
  return user.photo && !broken ? (
    <img className="avatar" src={user.photo} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  ) : (
    <span className="avatar avatar-initial" style={{ width: size, height: size }} aria-hidden="true">
      {initial}
    </span>
  )
}

function ago(at?: number) {
  if (!at) return ''
  const s = Math.round((Date.now() - at) / 1000)
  return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : 'earlier'
}

export function statusText(s: SyncStatus) {
  if (s.phase === 'syncing') return 'Syncing…'
  if (s.phase === 'offline') return 'Offline · will sync when you reconnect'
  if (s.phase === 'error') return "Not synced · we'll retry"
  if (s.phase === 'synced') return `Synced ${ago(s.at)}`
  return 'Signed in'
}

function StatusIcon({ s }: { s: SyncStatus }) {
  if (s.phase === 'syncing') return <RefreshCw className="spin" size={14} strokeWidth={2} aria-hidden="true" />
  if (s.phase === 'offline' || s.phase === 'error') return <CloudOff size={14} strokeWidth={2} aria-hidden="true" />
  return <Cloud size={14} strokeWidth={2} aria-hidden="true" />
}

/** Bottom of the sidebar: who's signed in and whether everything is saved. */
export function SidebarAccount() {
  const s = useSync()
  const nav = useNav()
  if (!s.configured || !s.ready) return null
  if (!s.user)
    return (
      <button className="side-item side-signin" onClick={() => nav.go({ name: 'settings' })}>
        <Cloud size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="side-label">Sign in to sync</span>
      </button>
    )
  return (
    <button className="side-account" onClick={() => nav.go({ name: 'settings' })} aria-label={`${s.user.name}, ${statusText(s)}. Open account settings`}>
      <Avatar size={32} />
      <span className="side-account-text">
        <span className="side-account-name">{s.user.name}</span>
        <span className="side-account-status">
          <StatusIcon s={s} /> {statusText(s)}
        </span>
      </span>
    </button>
  )
}

/** Settings → Account. */
export function AccountSettings() {
  const s = useSync()
  const [confirm, setConfirm] = useState(false)
  if (!s.configured) return null
  return (
    <section className="settings-group" aria-labelledby="set-account">
      <h2 id="set-account">Account</h2>
      {!s.ready ? (
        <p className="page-sub">Checking your account…</p>
      ) : !s.user ? (
        <>
          <p className="page-sub prose">
            Sign in to keep your likes, playlists, history, stats, settings and YouTube key the same on every device. Everything still works without an
            account; it just stays in this browser.
          </p>
          <GoogleButton />
          {s.error && (
            <p className="form-error" role="alert">
              {s.error}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="account-row">
            <Avatar size={48} />
            <div className="account-text">
              <p className="account-name">{s.user.name}</p>
              {s.user.email && <p className="page-sub">{s.user.email}</p>}
              <p className={`account-status${s.phase === 'error' || s.phase === 'offline' ? ' is-warn' : ''}`} role="status">
                <StatusIcon s={s} /> {statusText(s)}
              </p>
            </div>
          </div>
          {s.error && <p className="field-hint">{s.error}</p>}
          {confirm ? (
            <div className="confirm" role="alert">
              <p>Delete your library from your account? This device keeps its copy, but your other devices stop syncing and won't get it back.</p>
              <div className="head-actions">
                <button
                  className="pill pill-danger"
                  onClick={async () => {
                    await sync.deleteCloud()
                    setConfirm(false)
                  }}
                >
                  Delete from my account
                </button>
                <button className="pill pill-quiet" onClick={() => setConfirm(false)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <div className="head-actions">
              <button className="pill pill-quiet" onClick={() => sync.signOut()}>
                Sign out
              </button>
              <button className="pill pill-quiet" onClick={() => setConfirm(true)}>
                Delete saved library
              </button>
            </div>
          )}
          <p className="field-hint">Signing out keeps your library on this device.</p>
        </>
      )}
    </section>
  )
}

/** On a new device with nothing set up yet: one tap brings everything over, key included. */
export function SignInNudge() {
  const s = useSync()
  if (!s.configured || !s.ready || s.user) return null
  return (
    <div className="signin-nudge">
      <div>
        <p className="signin-nudge-title">Already use Aether?</p>
        <p>Sign in and your library and YouTube key come with you. No setup needed.</p>
      </div>
      <GoogleButton />
    </div>
  )
}
