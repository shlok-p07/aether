/**
 * Aether's shared YouTube server, as a Vercel Edge Function at /api/youtube/<endpoint>.
 *
 * Holds one YouTube Data API key (the YOUTUBE_API_KEY environment variable, never sent to browsers) so friends
 * can use Aether without making their own key. Set VITE_YOUTUBE_PROXY=/api/youtube to switch the app over.
 * - Only the four read-only calls Aether makes are allowed, each with an allow-list of parameters.
 * - Only pages on this site may call it (checked with the browser's Sec-Fetch-Site / Origin headers).
 * - Successful answers are cached on Vercel's network (search 24 h, everything else 1 h), so a repeat
 *   search by anyone costs no quota.
 * Worst case, someone uses up the day's quota: YouTube's API has no billing, so it can't cost money; it
 * resets at midnight Pacific time.
 *
 * vercel.json rewrites /api/youtube/<endpoint> to /api/youtube?p=<endpoint>.
 */
export const config = { runtime: 'edge' }

const UPSTREAM = 'https://www.googleapis.com/youtube/v3'

const ROUTES = {
  videos: { params: ['part', 'id', 'chart', 'videoCategoryId', 'regionCode', 'maxResults'], ttl: 3600 },
  search: { params: ['part', 'type', 'videoCategoryId', 'videoEmbeddable', 'maxResults', 'q'], ttl: 86400 },
  playlistItems: { params: ['part', 'playlistId', 'maxResults', 'pageToken'], ttl: 3600 },
  playlists: { params: ['part', 'id'], ttl: 3600 },
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const fail = (status, message, reason) => json(status, { error: { message, errors: [{ reason }] } })

/** True when the request comes from a page on this same site. */
function fromThisSite(request, url) {
  const site = request.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin'
  const from = request.headers.get('origin') || request.headers.get('referer')
  try {
    return !!from && new URL(from).host === url.host
  } catch {
    return false
  }
}

export default async function handler(request) {
  const url = new URL(request.url)
  if (request.method !== 'GET') return fail(405, 'Only GET is allowed.', 'badRequest')
  if (!fromThisSite(request, url)) return fail(403, 'This server only answers Aether itself.', 'forbidden')
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return fail(500, 'The shared YouTube key is not set on the server.', 'keyMissing')

  const name = (url.searchParams.get('p') || '').replace(/^\/+|\/+$/g, '')
  const route = Object.prototype.hasOwnProperty.call(ROUTES, name) ? ROUTES[name] : null
  if (!route) return fail(404, 'Unknown endpoint.', 'notFound')

  const params = new URLSearchParams()
  for (const k of route.params) {
    const v = url.searchParams.get(k)
    if (v !== null) params.set(k, v.slice(0, 200))
  }
  params.sort()

  let upstream
  try {
    upstream = await fetch(`${UPSTREAM}/${name}?${params}&key=${encodeURIComponent(key)}`)
  } catch {
    return fail(502, "Couldn't reach YouTube.", 'backendError')
  }
  // Errors (including "quota used up") pass through unchanged so the app can explain them, and are never cached.
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': upstream.ok ? `public, max-age=0, s-maxage=${route.ttl}, stale-while-revalidate=600` : 'no-store',
    },
  })
}
