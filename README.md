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
   - Alternatively, put it in a `.env.local` file (git-ignored) as `VITE_YOUTUBE_KEY=your-key` and restart `npm run dev`.

A free key covers about 100 searches a day. Search runs only when you press Enter, and results are cached. Home, trending, artist pages and playback use almost none of it.
Tip: in Google Cloud, restrict the key to "YouTube Data API v3" and to `http://localhost:5180/*`.

## What's inside

- **Home, built from your listening:**
  - **Your rotation:** your most-played songs as a cover collage, with your #1 as the biggest tile.
  - **Jump back in:** songs you played recently.
  - **On repeat:** songs you play most.
  - **More from your top artists:** each top artist's latest songs.
  - **Trending in your country.**
  - **Explore:** mood and genre shortcuts.
- **Search:** any song or artist, with official artist and label channels first, an Artists row, and recent searches.
- **Artist pages:** latest songs from the artist's channel, with Play and Shuffle.
- **Library:**
  - Liked songs.
  - Recently played, which you can clear.
  - Playlists: create, rename, reorder, remove songs, delete.
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

Everything personal (likes, playlists, history, settings, key) stays in your browser's local storage.

## Limits

- The YouTube player has to stay visible while it plays (YouTube's rules), so there's no background-only listening. On phone, the video sits at the top of the screen.
- Some songs' owners only allow playback on youtube.com. Aether skips those and says why.
- Your data doesn't sync between devices.

The earlier Sound Shape version is archived in `.backup/v1-soundshape-src.tgz`.
