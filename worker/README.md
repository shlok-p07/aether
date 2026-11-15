# Aether shared YouTube server (optional)

Lets friends use Aether without creating their own YouTube key. One free key allows about 100 searches a day
for everyone together (cached results cost nothing), so this suits a handful of people, not the public.

1. Make a **separate** key in Google Cloud: Credentials → Create credentials → API key. Restrict it to
   "YouTube Data API v3" only. Don't add a website restriction; the server calls YouTube directly.
2. Deploy (free Cloudflare account):
   ```sh
   cd worker
   npx wrangler login
   npx wrangler secret put YOUTUBE_KEY      # paste the key
   # edit ALLOWED_ORIGINS in wrangler.toml to your Aether URL(s)
   npx wrangler deploy                       # prints https://aether-youtube.<you>.workers.dev
   ```
3. Build Aether with the server's URL:
   `VITE_YOUTUBE_PROXY=https://aether-youtube.<you>.workers.dev` in `.env.local` (or your host's env settings).

Anyone can still paste their own key in Settings, and that takes over from the shared server.
Add a rate-limiting rule in the Cloudflare dashboard (Security → WAF → Rate limiting) if you share widely.
