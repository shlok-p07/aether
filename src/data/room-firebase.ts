import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firebaseApp } from './firebase'
import type { RoomBackend, RoomData } from './room'

/**
 * Firestore backend for "Listen together" (rules in firestore.rules).
 * - rooms/{id}: the session, written only by the host. "expires" moves forward while the host is active.
 * - rooms/{id}/members|requests|reactions/{uid}: one record per person, so nobody can flood a session;
 *   the rules also space out requests (10 s) and reactions (5 s) using the server's clock.
 * - hosts/{uid}: written with each new session; limits everyone to one new session a minute.
 * Listeners who aren't signed in are signed in anonymously: no account, no personal details.
 */

const LIFETIME = 12 * 3600e3
const expires = () => Timestamp.fromMillis(Date.now() + LIFETIME)
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : Date.now())
const data = (d: QueryDocumentSnapshot<DocumentData>) => d.data({ serverTimestamps: 'estimate' })

export function roomBackend(): RoomBackend {
  const app = firebaseApp()
  const auth = getAuth(app)
  const db = getFirestore(app)
  const room = (id: string) => doc(db, 'rooms', id)
  const sub = (id: string, name: 'members' | 'requests' | 'reactions') => collection(db, 'rooms', id, name)
  const mine = (id: string, name: 'members' | 'requests' | 'reactions', uid: string) => doc(db, 'rooms', id, name, uid)

  /** Snapshot listener that skips what was already there, so only new requests and reactions come through. */
  function fresh<T>(id: string, name: 'requests' | 'reactions', map: (uid: string, d: DocumentData) => T, cb: (list: T[]) => void) {
    let first = true
    return onSnapshot(sub(id, name), (s) => {
      if (first) return void (first = false)
      const list = s
        .docChanges()
        .filter((c) => c.type !== 'removed')
        .map((c) => map(c.doc.id, data(c.doc)))
      if (list.length) cb(list)
    })
  }

  async function clear(id: string) {
    for (const name of ['members', 'requests', 'reactions'] as const) {
      const docs = await getDocs(sub(id, name)).catch(() => null)
      await Promise.all((docs?.docs ?? []).map((d) => deleteDoc(d.ref).catch(() => {})))
    }
    await deleteDoc(room(id)).catch(() => {})
  }

  return {
    async me() {
      await auth.authStateReady()
      if (!auth.currentUser) await signInAnonymously(auth)
      const u = auth.currentUser!
      return { uid: u.uid, name: u.isAnonymous ? '' : (u.displayName ?? '').split(' ')[0] }
    },
    onUid(cb) {
      return onAuthStateChanged(auth, (u) => cb(u?.uid ?? null))
    },
    async create(id, d) {
      const uid = auth.currentUser!.uid
      // Tidy up this person's previous session, if they left one running.
      const prev = await getDoc(doc(db, 'hosts', uid)).catch(() => null)
      const old = prev?.exists() ? (prev.data().room as string) : null
      if (old && old !== id) await clear(old)
      const b = writeBatch(db)
      b.set(doc(db, 'hosts', uid), { room: id, at: serverTimestamp(), expires: expires() })
      b.set(room(id), { ...d, banned: [], expires: expires() })
      await b.commit()
    },
    async update(id, patch) {
      await updateDoc(room(id), { ...patch, expires: expires() })
    },
    /** Reads the session and writes the change in one step; retried automatically if someone else changed it meanwhile. */
    async transact(id, change) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(room(id))
        if (!snap.exists()) return false
        const r = snap.data() as RoomData & { expires?: unknown }
        if (r.ended || ms(r.expires) < Date.now()) return false
        const patch = change(r)
        if (!patch) return false
        tx.update(room(id), { ...patch, expires: expires() })
        return true
      })
    },
    watch(id, cb, fail) {
      let gone = 0
      const stop = onSnapshot(
        room(id),
        (s) => {
          // Only what the server accepted: a change made here that the rules refuse is never shown, even for a moment.
          if (s.metadata.hasPendingWrites) return
          if (!s.exists()) {
            // A delete from this device shows up at once, before the server answers, and comes back if it's refused.
            // So only believe it after a short wait. (A host ending the session also marks it "ended" first.)
            window.clearTimeout(gone)
            gone = window.setTimeout(() => cb(null), 2000)
            return
          }
          window.clearTimeout(gone)
          const r = s.data() as RoomData & { expires?: unknown }
          cb({ ...r, banned: r.banned ?? [], ended: r.ended || ms(r.expires) < Date.now() })
        },
        (e) => fail(e),
      )
      return () => {
        window.clearTimeout(gone)
        stop()
      }
    },
    members(id, cb) {
      return onSnapshot(sub(id, 'members'), (s) => cb(s.docs.map((d) => ({ uid: d.id, name: String(data(d).name ?? ''), at: ms(data(d).at) }))))
    },
    async heartbeat(id, uid, name) {
      await setDoc(mine(id, 'members', uid), { name, at: serverTimestamp(), expires: expires() })
    },
    async leave(id, uid) {
      await deleteDoc(mine(id, 'members', uid))
    },
    async request(id, uid, name, t) {
      await setDoc(mine(id, 'requests', uid), { name, t, at: serverTimestamp(), expires: expires() })
    },
    requests(id, cb) {
      return fresh(id, 'requests', (uid, d) => ({ uid, name: String(d.name), t: d.t as RoomData['queue'][number] }), cb)
    },
    async react(id, uid, name, title) {
      await setDoc(mine(id, 'reactions', uid), { name, kind: 'love', title, at: serverTimestamp(), expires: expires() })
    },
    reactions(id, cb) {
      return fresh(id, 'reactions', (uid, d) => ({ uid, name: String(d.name), title: String(d.title), at: ms(d.at) }), cb)
    },
    async remove(id, uid) {
      await updateDoc(room(id), { banned: arrayUnion(uid), expires: expires() })
      await deleteDoc(mine(id, 'members', uid)).catch(() => {})
    },
    async end(id) {
      await updateDoc(room(id), { ended: true, playing: false })
      await clear(id)
    },
  }
}
