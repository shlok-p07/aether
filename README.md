# Aether

Aether is a free music app for official songs from any artist, with a home screen built from your own listening. It has no subscription, no account, and Aether adds no ads.

Songs play in YouTube's own player, untouched. YouTube may show its own ads inside that player, and Aether doesn't block them, since that would break YouTube's rules.

## Run it

```sh
npm install
npm run dev        # http://localhost:5180 (also reachable from your phone on the same Wi-Fi)
```

## Connect YouTube (once, about 2 minutes, free)

1. Open [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) in Google Cloud. Create a free project if asked, then press **Enable**.
2. Go to [Credentials](https://console.cloud.google.com/apis/credentials) and choose **Create credentials → API key**.
3. Paste the key into Aether: the Home screen shows a setup card, or go to **Settings**. The key is stored only in this browser.
   - Alternatively, put it in a `.env.local` file (git-ignored) as `VITE_YOUTUBE_KEY=your-key` and restart `npm run dev`. Only do this on your own machine: a `VITE_` value is built into the app's public JavaScript, so never set it on a public host.

A free key covers about 100 searches a day. Search runs only when you press Enter, and results are cached. Home, trending, artist pages and playback use almost none of it.
Tip: in Google Cloud, restrict the key to "YouTube Data API v3" and to `http://localhost:5180/*`.

## What's inside

- **Home, built from your listening:**
  - **Your rotation:** your most-played songs as a cover collage, with your #1 as the biggest tile.
  - **Jump back in:** songs you played recently.
  - **Your mornings / afternoons / evenings / late nights:** what you actually play at this time of day.
  - **On repeat:** songs you've played a lot in the last month. Songs you keep skipping sink.
  - **Forgotten favorites:** songs you loved but haven't played in over a month.
  - **More from your top artists:** each top artist's latest songs.
  - **Trending in your country.**
  - **Explore:** mood and genre shortcuts.
- **Search:** your own library matches instantly as you type (free); press Enter to search YouTube, with official artist and label channels first, an Artists row, and recent searches. Shorts and duplicate uploads are filtered out.
- **Artist pages:** latest songs from the artist's channel (no Shorts, teasers or hour-long compilations), with Play and Shuffle.
- **Library:**
  - Liked songs.
  - Recently played, which you can clear.
  - Playlists: create, rename, reorder, remove songs, delete.
  - **Import from YouTube:** paste a Public or Unlisted YouTube or YouTube Music playlist link (up to 500 songs, a few units of quota).
  - **Share a playlist as a link:** the songs are packed into the link itself, so no server or account is needed, and the person opening it doesn't need a key to play it.
- **Your stats:** listening time, top songs, top artists and when you listen, for 7 days, 30 days or all time. Only time you actually hear counts.
- **Lyrics and About, for whatever's playing:** open them from the side panel's Lyrics and About tabs, or tap the song's title in the player bar (works on phone too).
  - **Lyrics:** time-synced lyrics from [LRCLIB](https://lrclib.net); tap a line to jump there.
  - **About:** where the song comes from. It shows the original release date, album, writers, producers and label, where the artist is from, and the story behind the song.
    - Credits come from the YouTube upload itself (auto-generated "Topic" uploads list them).
    - Dates, albums and hometowns come from [MusicBrainz](https://musicbrainz.org).
    - The background comes from [Wikipedia](https://wikipedia.org), or the artist's article when the song has none.
  - Both ask once before turning on, because they send the song's title and artist to those services (lrclib.net, musicbrainz.org, wikipedia.org). You can switch them in Settings too.
- **Player:**
  - Play, pause, next, previous, seek, volume and mute.
  - Shuffle, plus repeat (all or one song).
  - Queue: Play next, Add to queue, remove songs.
  - Autoplay: when the queue runs out, more songs from the same artist.
- **Personalized look:** pick your accent colour in Settings.
- **Keyboard shortcuts:**
  - Space: play or pause
  - N / P: next or previous song
  - S: shuffle
  - R: repeat
  - M: mute
  - L: like
  - /: search
- **Media keys and lock-screen controls** work too.

Everything personal (likes, playlists, history, stats, settings, key) stays in your browser's local storage. **Settings → Your data** exports a backup file and imports one (importing merges and never deletes), which is also how you move to another device.

## Put it online (optional, free)

Aether is a static site, so any static host works. On [Vercel](https://vercel.com), [Netlify](https://netlify.com) or [Cloudflare Pages](https://pages.cloudflare.com): import the project, build command `npm run build`, output folder `dist`.

- Then open it on your phone and use **Add to Home Screen** (Safari) or **Install app** (Chrome); it opens full screen like an app.
- Add the new address to your key's website restrictions in Google Cloud (for example `https://your-aether.vercel.app/*`).
- Don't set `VITE_YOUTUBE_KEY` on the host; everyone could read it. Each person pastes their own key, or you run the shared server below.

## Let friends skip the key (optional)

`worker/` holds a small Cloudflare Worker that keeps one key on the server and caches results for everyone. See [worker/README.md](worker/README.md). Build Aether with `VITE_YOUTUBE_PROXY=<worker URL>` and people can use it without a key. One free key gives about 100 searches a day for everyone together, so it suits a few friends, not the public.

## Limits

- The YouTube player has to stay visible while it plays (YouTube's rules), so there's no background-only listening. On phone, the video sits at the top of the screen.
- Some songs' owners only allow playback on youtube.com. Aether skips those and says why.
- Your data doesn't sync between devices automatically; use a backup file to move it.
- YouTube removed "related videos" from its API, so discovery comes from your top artists, trending and search, not "songs like this".
- Lyrics timing is turned off when a music video's length differs from the recording (intros, skits), and the lyrics show unsynced.

The earlier Sound Shape version is archived in `.backup/v1-soundshape-src.tgz`.
