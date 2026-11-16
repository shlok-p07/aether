import { firebaseApp } from './firebase'
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { Bytes, deleteDoc, doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Backend, Remote } from './sync'

/**
 * Firebase backend for sync: Google sign-in, and one Firestore document per account at users/{uid}.
 * The library is stored compressed (deflate) to stay well under Firestore's 1 MB document limit.
 * firestore.rules lets each signed-in person read and write only their own document.
 * Loaded on demand, so listeners who never sign in don't download it.
 */

async function pack(data: unknown): Promise<{ library: Bytes | string; enc: 'deflate' | 'json' }> {
  const json = JSON.stringify(data)
  if (typeof CompressionStream === 'undefined') return { library: json, enc: 'json' }
  const out = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return { library: Bytes.fromUint8Array(new Uint8Array(await new Response(out).arrayBuffer())), enc: 'deflate' }
}

async function unpack(d: { library?: Bytes | string; enc?: string }): Promise<unknown> {
  if (!d.library) return null
  if (d.enc !== 'deflate' || typeof d.library === 'string') return JSON.parse(d.library as string)
  const out = new Blob([(d.library as Bytes).toUint8Array()]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return JSON.parse(await new Response(out).text())
}

export function firebaseBackend(): Backend {
  const app = firebaseApp()
  const auth = getAuth(app)
  const db = getFirestore(app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  getRedirectResult(auth).catch(() => {}) // finishes a redirect sign-in after the page returns

  const ref = (uid: string) => doc(db, 'users', uid)
  const toRemote = async (data: Record<string, unknown> | undefined): Promise<Remote> =>
    data ? { data: await unpack(data as { library?: Bytes | string; enc?: string }), device: String(data.device ?? '') } : null

  return {
    onUser(cb) {
      // Listeners in a "Listen together" session are signed in anonymously; that isn't an account, so it never syncs.
      return onAuthStateChanged(auth, (u) =>
        cb(u && !u.isAnonymous ? { uid: u.uid, name: u.displayName || u.email || 'You', email: u.email || '', photo: u.photoURL } : null),
      )
    },
    async signIn() {
      try {
        await signInWithPopup(auth, provider)
      } catch (e) {
        const code = (e as { code?: string }).code ?? ''
        // Home-screen apps and strict browsers can block pop-ups: fall back to a full-page redirect.
        if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(code)) await signInWithRedirect(auth, provider)
        else throw e
      }
    },
    signOut: () => signOut(auth),
    async load(uid) {
      const snap = await getDoc(ref(uid))
      return toRemote(snap.exists() ? snap.data() : undefined)
    },
    async save(uid, data, device) {
      await setDoc(ref(uid), { ...(await pack(data)), device, v: 1, updatedAt: serverTimestamp() })
    },
    watch(uid, cb) {
      return onSnapshot(ref(uid), async (snap) => {
        if (snap.metadata.hasPendingWrites) return // our own write, not yet confirmed
        cb(await toRemote(snap.exists() ? snap.data() : undefined))
      })
    },
    remove: (uid) => deleteDoc(ref(uid)),
  }
}
