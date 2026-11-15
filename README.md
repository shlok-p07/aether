# Aether

A free music app for official songs from any artist, with a home screen built from your own listening.

Aether plays songs in YouTube's official player and builds everything else in your browser: your rotation, time-of-day mixes, stats, playlists and likes. It has no subscription and no account, and it adds no ads.

- **Official songs.** Search ranks official artist, label and "Topic" channels first. Shorts and duplicate uploads are filtered out.
- **Personal by default.** Your home is computed locally from what you play, skip, like and save.
- **Private.** Your library, history and settings stay in your browser's local storage. There is no Aether server.
- **Installable.** Aether is a progressive web app, so you can install it on your phone's home screen.

> [!NOTE]
> Aether never alters YouTube audio and never blocks YouTube's ads. YouTube can show its own ads inside its player on monetized videos. YouTube Premium removes them when you're signed in to YouTube in the same browser.

## Features

### Home

| Shelf | What it shows |
|---|---|
| Your rotation | Your most-played songs as a cover mosaic. Tile size follows play count. |
| Jump back in | Songs you played recently. |
| Your mornings, afternoons, evenings, late nights | Songs you actually listen to at the current time of day. |
| On repeat | Songs you played often in the last 30 days. Songs you keep skipping drop down. |
| Forgotten favorites | Songs you played a lot but haven't heard in over a month. |
| More from your top artists | The latest uploads from each of your top artists. |
| Trending | The most popular music videos in your country. |

### Library and search

- **Search:** your own library matches as you type, at no cost to your quota. Press Enter to search YouTube.
- **Liked songs, Recently played and playlists:** create, rename, reorder and delete playlists.
- **Import from YouTube:** paste a Public or Unlisted YouTube or YouTube Music playlist link to import up to 500 songs.
- **Share a playlist:** Aether packs the songs into the link itself. The person who opens it doesn't need an account or an API key to play it.
- **Your stats:** listening time, top songs, top artists and when you listen, for the last 7 days, 30 days or all time. Only time you actually hear counts.

### Now playing

- **Player:** queue, Play next, shuffle, repeat (all or one song), and autoplay of more songs from the same artist.
- **Lyrics:** time-synced lyrics from [LRCLIB](https://lrclib.net). Select a line to jump to it.
- **About:** the song's original release date, album, writers, producers and label, where the artist is from, and its background story.
- **Mixes:** for DJ mixes and compilations, Aether explains why it can't show lyrics, lists the artists named in the title, and shows the uploader's tracklist with tap-to-jump.
- **Ambient colour:** the playing song's artwork tints the interface.
- **Controls:** keyboard shortcuts, media keys and lock-screen controls.

## Before you begin

You need:

- [Node.js](https://nodejs.org) 18 or later, with npm.
- A free YouTube Data API v3 key. To create one, see [Getting a YouTube API key](#getting-a-youtube-api-key).

## Getting started

1. Clone the repository and install the dependencies:

   ```sh
   git clone https://github.com/shlok-p07/aether.git
   cd aether
   npm install
   ```

2. Start the development server:

   ```sh
   npm run dev
   ```

   The server prints a local address and a network address:

   ```text
   ➜  Local:   http://localhost:5180/
   ➜  Network: http://192.168.1.20:5180/
   ```

   Use the network address to open Aether on a phone that's on the same Wi-Fi network.

3. Open `http://localhost:5180`. On the setup card, paste your API key and select **Connect**.

To check that it works, search for any artist and press Enter. A list of songs appears, and selecting one plays it in the panel on the right.

## Getting a YouTube API key

The key is free and takes about 2 minutes to create.

1. In the Google Cloud console, open the [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) page. If prompted, create a project. Then select **Enable**.
2. Go to [Credentials](https://console.cloud.google.com/apis/credentials) and select **Create credentials** > **API key**.
3. Optional but recommended: restrict the key. Under **API restrictions**, allow only **YouTube Data API v3**. Under **Website restrictions**, add `http://localhost:5180/*` and the address where you host Aether.

Aether stores the key only in your browser's local storage.

### Understanding the quota

A free key includes 10,000 quota units a day. The quota resets at midnight Pacific time.

| Action | Cost | Cached for |
|---|---|---|
| Search | 101 units (about 100 searches a day) | 24 hours |
| Trending | 1 unit | 1 hour |
| Artist page | 2 units | 6 hours |
| Song credits (About tab) | 1 unit | The session |
| Playlist import | About 2 units for each 50 songs | Not cached |
| Playback | Free | — |

Search runs only when you press Enter, never on each keystroke.

## Configuring environment variables

Aether reads these optional variables at build time. For local development, put them in a `.env.local` file. Git ignores that file.

| Variable | Purpose |
|---|---|
| `VITE_YOUTUBE_KEY` | Pre-fills your API key for local development. |
| `VITE_YOUTUBE_PROXY` | The URL of a [shared key server](#sharing-one-key-with-friends). When set, people can use Aether without a key of their own. |

```sh
# .env.local
VITE_YOUTUBE_KEY=your-api-key
```

Restart `npm run dev` after you change `.env.local`.

> [!WARNING]
> Never set `VITE_YOUTUBE_KEY` on a public host. Vite builds every `VITE_` variable into the public JavaScript bundle, so anyone could copy the key and use up its quota.

## Deploying to Vercel

Aether is a static site and needs no server-side configuration.

1. In [Vercel](https://vercel.com), select **Add New** > **Project** and import the repository.
2. Keep the detected settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Select **Deploy**.
4. Add your deployment address, for example `https://your-aether.vercel.app/*`, to the key's website restrictions in Google Cloud.

Every push to `main` redeploys the site. Netlify and Cloudflare Pages work with the same build command and output directory.

To install Aether on a phone, open your deployment address. In Safari, select **Share** > **Add to Home Screen**. In Chrome, select **Install app**.

### Moving your library to a new address

Each browser and each address has its own local storage, so a new deployment starts empty. To bring your library with you:

1. In your current copy, go to **Settings** > **Your data** and select **Export backup**.
2. In the new copy, go to **Settings** > **Your data** and select **Import backup**.

Importing merges the backup into the existing library and never deletes anything. Backups don't include your API key.

## Sharing one key with friends

The `worker/` directory contains an optional [Cloudflare Worker](https://developers.cloudflare.com/workers/) that keeps one API key on the server. It allows only the read-only calls that Aether makes and caches responses at Cloudflare's edge.

1. Deploy the worker by following [worker/README.md](worker/README.md).
2. In your hosting provider's environment settings, set `VITE_YOUTUBE_PROXY` to the worker's URL.
3. Redeploy Aether.

All users share one key's daily quota, so this setup suits a small group. Anyone can still paste a personal key in **Settings**, and a personal key takes priority over the shared server.

## Using keyboard shortcuts

| Key | Action |
|---|---|
| Space | Play or pause |
| N | Next song |
| P | Previous song |
| S | Shuffle on or off |
| R | Cycle repeat: off, all, one |
| M | Mute or unmute |
| L | Like or unlike the current song |
| / | Open search |

## Privacy

Aether has no backend and no analytics. Your browser contacts these services directly:

| Service | When | What it receives |
|---|---|---|
| YouTube | Always | Searches, video IDs and playback through the official player. |
| [LRCLIB](https://lrclib.net) | Only after you turn on lyrics | The song title, artist and length. |
| [MusicBrainz](https://musicbrainz.org) and [Wikipedia](https://www.wikipedia.org) | Only after you turn on song background | The song title and artist. |

You can turn lyrics and song background on or off in **Settings**.

## Known limitations

- **Visible player only.** YouTube's terms require the player to stay visible, so audio-only background playback isn't available. On phones, the video sits at the top of the screen.
- **Some videos don't play.** Some owners allow playback only on youtube.com. Aether skips those videos and tells you why.
- **No automatic sync.** Your data doesn't sync between devices. Use a backup file to move it.
- **No "songs like this".** The YouTube Data API no longer offers related videos, so discovery comes from your top artists, trending and search.
- **Lyrics timing.** When a music video's length differs from the recording, for example because of an intro, Aether shows the lyrics without timing.

## Developing

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server on port 5180. |
| `npm run build` | Type-checks the code and builds the production site into `dist/`. |
| `npm run preview` | Serves the production build locally. |

### Tech stack

- [React](https://react.dev) 18, [TypeScript](https://www.typescriptlang.org) and [Vite](https://vitejs.dev) 5
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) and [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Lucide](https://lucide.dev) icons
- A web app manifest and a service worker that caches only the app shell, never YouTube or API responses

### Project structure

```text
src/
  App.tsx            App shell, player state, navigation, listening log
  pages.tsx          Home, Search, Library, Stats, Settings and other pages
  store.ts           Local storage state, personalization, backup import and export
  components/        Player bar, side panel, rows, lyrics and About views
  data/
    youtube.ts       YouTube Data API client, filtering and caching
    lyrics.ts        LRCLIB client and synced-lyrics parser
    about.ts         Song credits, MusicBrainz and Wikipedia lookups
    ambient.ts       Artwork colour sampling for the ambient tint
    share.ts         Playlist share links
    mix.ts           DJ mix and compilation detection
public/              Icons, web app manifest and service worker
worker/              Optional shared-key Cloudflare Worker
DESIGN.md            Design system: tokens, components and rules
```

## Acknowledgments

- Song metadata from [MusicBrainz](https://musicbrainz.org), available under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- Song and artist backgrounds from [Wikipedia](https://www.wikipedia.org), available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Synced lyrics from [LRCLIB](https://lrclib.net).

Aether is an independent project. It isn't affiliated with or endorsed by YouTube or Google.
