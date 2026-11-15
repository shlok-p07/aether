import type { Backend, Remote, SyncUser } from './sync'

/**
 * Development-only stand-in for Firebase, so sync can be tried and tested without a cloud account.
 * Turn it on in a dev build with: localStorage.setItem('aether.fakeSync', '1').
 * By default the "cloud" lives in localStorage and changes reach other tabs live. An automated test can
 * instead provide window.__aetherCloud (get/set) to share one cloud between separate browser profiles,
 * and announce changes with a window 'aether-cloud' event.
 * Vite drops this file from production builds.
 */

type Bridge = { get(uid: string): Promise<string | null>; set(uid: string, json: string | null): Promise<void> }

const CLOUD = 'aether.fakeCloud'
const USER = 'aether.fakeUser'
const demo: SyncUser = { uid: 'demo-user', name: 'Demo Listener', email: 'demo@example.com', photo: null }

export function fakeBackend(): Backend {
  const bridge = (window as unknown as { __aetherCloud?: Bridge }).__aetherCloud
  const channel = new BroadcastChannel('aether-fake-sync')
  const local = (): Record<string, Remote> => JSON.parse(localStorage.getItem(CLOUD) || '{}')
  const read = async (uid: string): Promise<Remote> => {
    if (bridge) {
      const j = await bridge.get(uid)
      return j ? JSON.parse(j) : null
    }
    return local()[uid] ?? null
  }
  const write = async (uid: string, r: Remote) => {
    if (bridge) return bridge.set(uid, r ? JSON.stringify(r) : null)
    const all = local()
    if (r) all[uid] = r
    else delete all[uid]
    localStorage.setItem(CLOUD, JSON.stringify(all))
    channel.postMessage(uid)
  }
  const userCbs = new Set<(u: SyncUser | null) => void>()
  const emitUser = () => userCbs.forEach((f) => f(localStorage.getItem(USER) ? demo : null))
  window.addEventListener('storage', (e) => e.key === USER && emitUser())
  const wait = () => new Promise((r) => setTimeout(r, 120))
  return {
    onUser(cb) {
      userCbs.add(cb)
      setTimeout(() => cb(localStorage.getItem(USER) ? demo : null), 50)
      return () => userCbs.delete(cb)
    },
    async signIn() {
      await wait()
      localStorage.setItem(USER, '1')
      emitUser()
    },
    async signOut() {
      localStorage.removeItem(USER)
      emitUser()
    },
    async load(uid) {
      await wait()
      return read(uid)
    },
    async save(uid, data, device) {
      await wait()
      await write(uid, { data, device })
    },
    watch(uid, cb) {
      const fire = async () => cb(await read(uid))
      const onMsg = (e: MessageEvent) => e.data === uid && fire()
      const onEvt = (e: Event) => (e as CustomEvent).detail === uid && fire()
      channel.addEventListener('message', onMsg)
      window.addEventListener('aether-cloud', onEvt)
      return () => {
        channel.removeEventListener('message', onMsg)
        window.removeEventListener('aether-cloud', onEvt)
      }
    },
    remove: (uid) => write(uid, null),
  }
}
