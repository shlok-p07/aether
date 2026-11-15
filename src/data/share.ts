import { fixTrack, isTrack, type Track } from '../store'

/**
 * A playlist packed into the link itself (#pl=…), so sharing needs no server and no account.
 * Compressed with deflate when the browser supports it ("z" prefix), plain JSON otherwise ("j").
 * Opening a link needs no YouTube key: the player works without one.
 */

const MAX = 300

const b64url = (bytes: Uint8Array) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function shareLink(name: string, tracks: Track[]) {
  const body = JSON.stringify({ v: 1, n: name, t: tracks.slice(0, MAX).map((t) => [t.id, t.title, t.artist, t.channelId, Math.round(t.duration)]) })
  const raw = new TextEncoder().encode(body)
  let packed: string
  if (typeof CompressionStream !== 'undefined') packed = 'z' + b64url(await pipe(raw, new CompressionStream('deflate-raw')))
  else packed = 'j' + b64url(raw)
  return { url: `${location.origin}${location.pathname}#pl=${packed}`, truncated: tracks.length > MAX }
}

export async function readShareLink(hash: string): Promise<{ name: string; tracks: Track[] } | null> {
  const m = hash.match(/^#pl=([zj])([A-Za-z0-9_-]+)$/)
  if (!m) return null
  try {
    let bytes = fromB64url(m[2])
    if (m[1] === 'z') {
      if (typeof DecompressionStream === 'undefined') return null
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
    }
    const p = JSON.parse(new TextDecoder().decode(bytes)) as { n?: unknown; t?: unknown }
    if (!Array.isArray(p.t)) return null
    const tracks = p.t
      .slice(0, MAX)
      .map((r) => (Array.isArray(r) ? { id: r[0], title: r[1], artist: r[2], channelId: r[3], duration: r[4] } : null))
      .filter((t): t is Track => isTrack(t) && /^[A-Za-z0-9_-]{6,20}$/.test(t.id))
      .map(fixTrack)
    if (!tracks.length) return null
    return { name: typeof p.n === 'string' && p.n.trim() ? p.n.trim().slice(0, 120) : 'Shared playlist', tracks }
  } catch {
    return null
  }
}

/** Links from localhost or a home network only open on devices that can reach this computer. */
export const isLocalOrigin = () => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(location.hostname)
