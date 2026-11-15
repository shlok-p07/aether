/**
 * Aether shared YouTube server (Cloudflare Worker).
 *
 * Holds one YouTube Data API key so friends can use Aether without making their own.
 * - Only the four read-only calls Aether makes are allowed, with an allow-list of parameters.
 * - Answers are cached at Cloudflare's edge (search 24 h, everything else 1 h), so repeat searches by
 *   anyone cost nothing.
 * - Only the origins in ALLOWED_ORIGINS get CORS access. Non-browser clients can fake an Origin header,
 *   so also add a Cloudflare rate-limiting rule if you share the URL widely.
 *
 * Secrets / vars (see wrangler.toml and README):
 *   YOUTUBE_KEY      wrangler secret put YOUTUBE_KEY
 *   ALLOWED_ORIGINS  comma-separated, e.g. "https://aether.example.com,http://localhost:5180"
 */

const UPSTREAM = 'https://www.googleapis.com/youtube/v3'

const ROUTES = {
  '/videos': { params: ['part', 'id', 'chart', 'videoCategoryId', 'regionCode', 'maxResults'], ttl: 3600 },
  '/search': { params: ['part', 'type', 'videoCategoryId', 'videoEmbeddable', 'maxResults', 'q'], ttl: 86400 },
  '/playlistItems': { params: ['part', 'playlistId', 'maxResults', 'pageToken'], ttl: 3600 },
  '/playlists': { params: ['part', 'id'], ttl: 3600 },
}

const json = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

export default {
  async fetch(request, env, ctx) {
    const origins = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const origin = request.headers.get('Origin') || ''
    const okOrigin = origins.includes(origin)
    const cors = okOrigin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' } : { Vary: 'Origin' }

    if (request.method === 'OPTIONS') return new Response(null, { status: okOrigin ? 204 : 403, headers: cors })
    if (request.method !== 'GET') return json(405, { error: { message: 'Only GET is allowed.' } }, cors)
    if (!okOrigin) return json(403, { error: { message: 'This origin is not allowed.', errors: [{ reason: 'forbidden' }] } }, cors)
    if (!env.YOUTUBE_KEY) return json(500, { error: { message: 'YOUTUBE_KEY secret is not set.' } }, cors)

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')
    const route = ROUTES[path]
    if (!route) return json(404, { error: { message: 'Unknown endpoint.', errors: [{ reason: 'notFound' }] } }, cors)

    const params = new URLSearchParams()
    for (const k of route.params) {
      const v = url.searchParams.get(k)
      if (v !== null) params.set(k, v.slice(0, 200))
    }
    params.sort()

    // The cache key never includes the API key.
    const cacheKey = new Request(`https://aether-cache.invalid${path}?${params}`)
    const cache = caches.default
    let res = await cache.match(cacheKey)
    if (!res) {
      const upstream = await fetch(`${UPSTREAM}${path}?${params}&key=${encodeURIComponent(env.YOUTUBE_KEY)}`)
      res = new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'application/json' } })
      if (upstream.ok) {
        res.headers.set('Cache-Control', `public, max-age=${route.ttl}`)
        ctx.waitUntil(cache.put(cacheKey, res.clone()))
      }
    }
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
    out.headers.delete('Set-Cookie')
    return out
  },
}
