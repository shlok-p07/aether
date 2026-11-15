import { useSyncExternalStore } from 'react'
import { applySynced, joinAccount, parseSynced, store, syncedPart, type State } from '../store'

/**
 * Optional sign-in that keeps a listener's library the same on every device.
 *
 * - First sign-in on a device: this device's library and the account's are merged (nothing is lost).
 * - After that: every change is saved to the account within a second or two, and changes from other
 *   devices arrive live. The latest change wins, so deletions carry over too.
 * - Offline changes wait and are sent when the connection returns.
 *
 * The engine talks to a small Backend interface: Firebase in production (sync-firebase.ts), and an
 * in-browser fake for development and tests (sync-fake.ts).
 */

export type SyncUser = { uid: string; name: string; email: string; photo: string | null }
export type Remote = { data: unknown; device: string } | null

export interface Backend {
  onUser(cb: (u: SyncUser | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
  load(uid: string): Promise<Remote>
  save(uid: string, data: unknown, device: string): Promise<void>
  watch(uid: string, cb: (r: Remote) => void): () => void
  remove(uid: string): Promise<void>
}

export type SyncStatus = {
  configured: boolean
  ready: boolean
  user: SyncUser | null
  phase: 'idle' | 'signing-in' | 'syncing' | 'synced' | 'offline' | 'error'
  error?: string
  at?: number
}

// ---------------- status store ----------------

let status: SyncStatus = { configured: false, ready: false, user: null, phase: 'idle' }
const subs = new Set<() => void>()
const setStatus = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch }
  subs.forEach((f) => f())
}
export const useSync = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => status,
  )

// ---------------- engine ----------------

export const FIREBASE_CONFIGURED = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
)

const LINK = 'aether.sync.uid' // which account this device's library already belongs to
const PENDING = 'aether.sync.pending' // a sign-in redirect is on its way back
const DIRTY = 'aether.sync.dirty' // changes made here that the account hasn't received yet
const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
}
const DEVICE = (() => {
  let id = ls.get('aether.device')
  if (!id) {
    id = Math.random().toString(36).slice(2, 12)
    ls.set('aether.device', id)
  }
  return id
})()

let backend: Backend | null = null
let uid: string | null = null
let applying = false
let lastSent = ''
let timer = 0
let stopWatch: (() => void) | null = null
let stopLocal: (() => void) | null = null

const snapshot = (s: State = store.get()) => JSON.stringify(syncedPart(s))
const friendly = (e: unknown) => {
  const m = (e as Error)?.message ?? ''
  if (/offline|network|unavailable/i.test(m)) return "You're offline. Changes will sync when you reconnect."
  if (/permission/i.test(m)) return 'The sync service refused access. Sign out and sign in again.'
  return "Couldn't sync just now. Your changes are safe on this device and will sync later."
}

async function push() {
  if (!backend || !uid) return
  const data = syncedPart(store.get())
  const snap = JSON.stringify(data)
  try {
    await backend.save(uid, data, DEVICE)
    lastSent = snap
    if (snapshot() === snap) ls.set(DIRTY, null)
    setStatus({ phase: 'synced', at: Date.now(), error: undefined })
  } catch (e) {
    setStatus({ phase: navigator.onLine ? 'error' : 'offline', error: friendly(e) })
  }
}

function applyRemote(r: Remote) {
  if (!r || r.device === DEVICE) return
  const incoming = parseSynced(r.data)
  if (snapshot({ ...store.get(), ...syncedPart(incoming) }) === snapshot()) return
  applying = true
  applySynced(incoming)
  applying = false
  lastSent = snapshot()
  ls.set(DIRTY, null)
  setStatus({ phase: 'synced', at: Date.now() })
}

function onLocalChange() {
  if (applying || !uid) return
  if (snapshot() === lastSent) return
  ls.set(DIRTY, '1')
  setStatus({ phase: 'syncing' })
  window.clearTimeout(timer)
  timer = window.setTimeout(push, 1200)
}

function stop() {
  stopWatch?.()
  stopLocal?.()
  stopWatch = stopLocal = null
  window.clearTimeout(timer)
  uid = null
}

async function connect(u: SyncUser) {
  if (!backend) return
  stop()
  uid = u.uid
  setStatus({ user: u, phase: 'syncing', error: undefined })
  try {
    const remote = await backend.load(u.uid)
    const linked = ls.get(LINK) === u.uid
    if (remote && !linked) {
      joinAccount(parseSynced(remote.data)) // first time on this device: keep both
      await push()
    } else if (remote && linked && !ls.get(DIRTY)) {
      applyRemote({ ...remote, device: '' })
    } else {
      await push() // new account, or this device has changes the account hasn't seen
    }
    ls.set(LINK, u.uid)
    lastSent = snapshot()
    stopWatch = backend.watch(u.uid, applyRemote)
    stopLocal = store.subscribe(onLocalChange)
    if (status.phase === 'syncing') setStatus({ phase: 'synced', at: Date.now() })
  } catch (e) {
    setStatus({ phase: navigator.onLine ? 'error' : 'offline', error: friendly(e) })
  }
}

const fake = () => import.meta.env.DEV && ls.get('aether.fakeSync') === '1'

/** Loads the sign-in service on first need, so people who never sign in never download it. */
let loading: Promise<Backend | null> | null = null
function ensureBackend(): Promise<Backend | null> {
  if (backend) return Promise.resolve(backend)
  loading ??= (async () => {
    try {
      if (fake()) backend = (await import('./sync-fake')).fakeBackend()
      else if (FIREBASE_CONFIGURED) backend = (await import('./sync-firebase')).firebaseBackend()
    } catch {
      backend = null
    }
    if (backend) listen(backend)
    return backend
  })()
  return loading
}

function listen(b: Backend) {
  b.onUser((u) => {
    setStatus({ ready: true })
    if (u) connect(u)
    else {
      stop()
      // keep "Signing in…" while Google's window is still open
      setStatus({ user: null, phase: status.phase === 'signing-in' ? 'signing-in' : 'idle' })
    }
  })
  window.addEventListener('online', () => uid && ls.get(DIRTY) && push())
  window.addEventListener('pagehide', () => {
    if (uid && ls.get(DIRTY)) push()
  })
}

export const sync = {
  async start() {
    if (!fake() && !FIREBASE_CONFIGURED) return setStatus({ configured: false, ready: true })
    setStatus({ configured: true })
    // Only a device that's already signed in (or coming back from a sign-in redirect) loads the service now.
    if (ls.get(LINK) || ls.get(PENDING)) {
      ls.set(PENDING, null)
      if (!(await ensureBackend())) setStatus({ configured: false, ready: true })
    } else setStatus({ ready: true })
  },
  async signIn() {
    setStatus({ phase: 'signing-in', error: undefined })
    const b = await ensureBackend()
    if (!b) return setStatus({ phase: 'idle', error: "Sign-in isn't available right now. Try again later." })
    try {
      ls.set(PENDING, '1') // in case the browser leaves the page for a redirect sign-in
      await b.signIn()
      ls.set(PENDING, null)
    } catch (e) {
      ls.set(PENDING, null)
      const code = (e as { code?: string }).code ?? ''
      const cancelled = /popup-closed|cancelled-popup|user-cancelled/.test(code)
      setStatus({ phase: 'idle', error: cancelled ? undefined : "Couldn't sign in with Google. Check your connection and try again." })
    }
  },
  async signOut() {
    if (!backend) return
    if (uid && ls.get(DIRTY)) await push()
    stop()
    ls.set(LINK, null)
    await backend.signOut()
  },
  /** Deletes the account's saved library, then signs out. This device keeps its own copy. */
  async deleteCloud() {
    if (!backend || !uid) return
    const id = uid
    stop()
    await backend.remove(id)
    ls.set(LINK, null)
    ls.set(DIRTY, null)
    await backend.signOut()
  },
}
