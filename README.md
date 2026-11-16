# Aether

A free music app for official songs from any artist, with a home screen built from your own listening.

Aether plays songs in YouTube's official player and builds everything else around you: your rotation, time-of-day mixes, stats, playlists and likes. It's free, it adds no ads, and an account is optional.

- **Official songs.** Search ranks official artist, label and "Topic" channels first. Shorts and duplicate uploads are filtered out.
- **Personal by default.** Your home is computed from what you play, skip, like and save.
- **Your devices in sync.** Sign in with Google, optionally, and your library, settings and YouTube key follow you to every device.
- **Listen together.** Send a link and anyone can listen along, in sync, on any phone or computer, with no account, app or YouTube key.
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
- **Full view (desktop):** select the full-view button in the player, or press F, and the song takes the whole screen: the video large, synced lyrics gliding past with the current line filling as it's sung, the artwork's colour drifting behind, and a readout of your plays, when you first heard it, your place in the queue and what's next. Select **Full screen** to hide the browser too. Everything that moves follows real data (the song's position, lyric timings, your history); YouTube doesn't let web pages read its audio, so nothing pretends to react to the sound.

### Listen together

Play music with other people at the same moment, wherever they are. Select **Listen together**, enter your name, select **Go live**, and send the link, or show the QR code to people in the same room. Anyone who opens it hears what you play on their own phone or computer. They don't need an account, the app, or a YouTube key.

The session screen shows the song with a live sync readout (for example, **In sync · 0.2s**), what's up next, who's listening, and an activity log of joins, songs, requests and loves.

- **You stay in control:** only the host can skip, pause or seek. Listeners can pause for themselves and select **Play along** to catch up.
- **Requests:** listeners tap any song in Search or their library, and it joins the end of the host's queue.
- **Reactions:** listeners can send a **Love** for the song that's playing, and everyone sees it.
- **Staying in sync:** each listener's player corrects itself when it drifts more than 2 seconds from the host.
- **Ending:** the session lasts until the host selects **End session**, or 12 hours after the host was last active. Reloading the page doesn't end it.

#### Preventing spam

The database rules enforce these limits, so a modified copy of the app can't get around them:

| Limit | Value |
|---|---|
| New sessions | One a minute per person. Starting a new session deletes your previous one. |
| Song requests | One every 10 seconds per listener. |
| Loves | One every 5 seconds per listener. |
| Removing a listener | The host can remove anyone. Removed listeners can't rejoin that session. |
| What can be sent | Only real YouTube video IDs, names up to 24 characters, and at most 50 songs in up next. |
| Control | Only the host can change the session. Listeners can't read each other's requests. |

Listen together needs [Firebase set up](#setting-up-sign-in-and-sync), with anonymous sign-in turned on.

## Using Aether

If someone shared an Aether link with you, you don't need to install anything.

1. Open the link. On a phone, add it to your home screen: in Safari, select **Share** > **Add to Home Screen**; in Chrome, select **Install app**.
2. Choose how to start:
   - **You've used Aether before:** select **Continue with Google**. Your library and YouTube key arrive, and you're done.
   - **You're new:** follow the three steps on the **Connect YouTube** card to get a free key, then paste it. Aether connects as soon as you paste.

To keep your library on all your devices, go to **Settings** > **Account** and select **Continue with Google**.

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

Aether shows how many searches you have left today under the search box, and the full count in **Settings** > **YouTube**. YouTube doesn't report remaining quota to apps, so this is an estimate. Aether adds up what each request from that browser costs, starts again at midnight Pacific time, and shows the quota as used up when YouTube says it is. Searches from your other devices aren't included. When you use the shared server, Aether hides the count because all users share that quota.

## Configuring environment variables

Aether reads these optional variables at build time. For local development, put them in a `.env.local` file. Git ignores that file.

| Variable | Purpose |
|---|---|
| `VITE_YOUTUBE_KEY` | Pre-fills your API key for local development. |
| `VITE_YOUTUBE_PROXY` | The URL of a [shared key server](#sharing-one-key-with-friends). When set, people can use Aether without a key of their own. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Turns on Google sign-in and sync. See [Setting up sign-in and sync](#setting-up-sign-in-and-sync). |

Copy `.env.example` to `.env.local` and fill in the values you need:

```sh
cp .env.example .env.local
```

Restart `npm run dev` after you change `.env.local`.

> [!WARNING]
> Never set `VITE_YOUTUBE_KEY` on a public host. Vite builds every `VITE_` variable into the public JavaScript bundle, so anyone could copy the key and use up its quota. The Firebase values are different: they're public by design, and the database rules protect each person's data.

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

Each browser and each address has its own local storage, so a new deployment starts empty. If [sign-in](#setting-up-sign-in-and-sync) is set up, select **Continue with Google** and your library arrives. Otherwise, use a backup file:

1. In your current copy, go to **Settings** > **Your data** and select **Export backup**.
2. In the new copy, go to **Settings** > **Your data** and select **Import backup**.

Importing merges the backup into the existing library and never deletes anything. Backups don't include your API key.

## Setting up sign-in and sync

Sign-in is optional. Without it, Aether stores everything in the browser. With it, people select **Continue with Google** and their library, settings and YouTube key stay in sync on every device. Sync uses [Firebase](https://firebase.google.com) on its free Spark plan.

1. In the [Firebase console](https://console.firebase.google.com), select **Create a project**. You can turn off Google Analytics.
2. Turn on Google sign-in:
   1. Go to **Build** > **Authentication** and select **Get started**.
   2. On the **Sign-in method** tab, select **Google**, turn on **Enable**, choose a support email, and select **Save**.
   3. For Listen together, also select **Add new provider** > **Anonymous**, turn on **Enable**, and select **Save**. Listeners are signed in anonymously, which needs no account or personal details.
   4. On the **Settings** tab, open **Authorized domains** and add your deployment's domain, for example `your-aether.vercel.app`. `localhost` is already listed.
3. Create the database:
   1. Go to **Build** > **Firestore Database** and select **Create database**.
   2. Choose a location near your listeners and start in **production mode**.
   3. On the **Rules** tab, replace the contents with [`firestore.rules`](firestore.rules) from this repository, and select **Publish**.
4. Register the web app:
   1. Go to **Project settings** (the gear icon). Under **Your apps**, select the web icon (**</>**), enter a nickname, and select **Register app**.
   2. Copy the `apiKey`, `authDomain`, `projectId` and `appId` values from the configuration it shows.
5. Add the values as environment variables: in `.env.local` for local development, and in Vercel under **Settings** > **Environment Variables** for your deployment. Then redeploy.

   ```sh
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

To check that it works, open Aether, go to **Settings** > **Account**, and select **Continue with Google**. After you sign in, the account card shows **Synced just now**. Open Aether in a second browser, sign in with the same account, and your library appears.

Each person's library is one document that only they can read and write. Each Listen together session is one document that only its host can change, and anyone with the link can read. Aether loads the Firebase code only when someone signs in or uses Listen together, so other people don't download it.

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
| F | Open or close the full view (desktop) |
| Esc | Close the full view |

## Privacy

Aether has no analytics and no server of its own. Your browser contacts these services directly:

| Service | When | What it receives |
|---|---|---|
| YouTube | Always | Searches, video IDs and playback through the official player. |
| [LRCLIB](https://lrclib.net) | Only after you turn on lyrics | The song title, artist and length. |
| [MusicBrainz](https://musicbrainz.org) and [Wikipedia](https://www.wikipedia.org) | Only after you turn on song background | The song title and artist. |
| Google sign-in and [Firebase](https://firebase.google.com) | Only after you sign in | Your Google name, email and photo for the account, and your library, settings and YouTube key, stored in a document that only you can read. |
| [Firebase](https://firebase.google.com) | Only during Listen together | The name you enter, an anonymous ID, the songs in the session, song requests and reactions. People with the link can see them. The host's Aether deletes the session when it ends. |

You can turn lyrics and song background on or off in **Settings**. Under **Settings** > **Account**, you can sign out, which keeps your library on the device, or delete your saved library from your account.

## Known limitations

- **Visible player only.** YouTube's terms require the player to stay visible, so audio-only background playback isn't available. On phones, the video sits at the top of the screen. Phone browsers pause the player when the screen locks, so while a song plays, Aether keeps the screen on. To turn this off, go to **Settings** > **Playback** > **Keep screen on while playing**. Music stops when you lock the phone or switch to another app. To keep listening with the screen locked, open the queue and select **Play in YouTube app**. This hands the current song and up to 49 more to YouTube's own app, which plays in the background if you have YouTube Premium.
- **Some videos don't play.** Some owners allow playback only on youtube.com. Aether skips those videos and tells you why.
- **Listen together timing.** Listeners stay within about 2 seconds of the host. A listener whose phone clock is set by hand can drift further. On some phones, the first song needs a tap on **Play along** before it starts, because browsers block sound until you interact with the page.
- **Sync conflicts.** If two signed-in devices change the library within the same second or two, the later change wins.
- **Sync needs setup.** Sign-in appears only when the deployment has [Firebase configured](#setting-up-sign-in-and-sync). Without it, use a backup file to move your library.
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
- [Firebase](https://firebase.google.com) Authentication and Cloud Firestore for optional sync, loaded on demand
- [Lucide](https://lucide.dev) icons
- A web app manifest and a service worker that caches only the app shell, never YouTube or API responses

### Project structure

```text
src/
  App.tsx            App shell, player state, navigation, listening log
  pages.tsx          Home, Search, Library, Stats, Settings and other pages
  store.ts           Local storage state, personalization, backup import and export
  components/        Player bar, side panel, rows, account, lyrics and About views
  data/
    youtube.ts       YouTube Data API client, filtering and caching
    lyrics.ts        LRCLIB client and synced-lyrics parser
    about.ts         Song credits, MusicBrainz and Wikipedia lookups
    ambient.ts       Artwork colour sampling for the ambient tint
    share.ts         Playlist share links
    mix.ts           DJ mix and compilation detection
    sync.ts          Sign-in and sync engine (merge on first sign-in, then live)
    sync-firebase.ts Firebase backend: Google sign-in and Firestore
    room.ts          Listen together engine: sessions, sync maths, requests
    room-firebase.ts Firebase backend for Listen together sessions
    quota.ts         Estimate of today's YouTube quota
public/              Icons, web app manifest and service worker
worker/              Optional shared-key Cloudflare Worker
firestore.rules      Database rules: private libraries, host-only Listen together sessions
DESIGN.md            Design system: tokens, components and rules
```

## Acknowledgments

- Song metadata from [MusicBrainz](https://musicbrainz.org), available under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- Song and artist backgrounds from [Wikipedia](https://www.wikipedia.org), available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Synced lyrics from [LRCLIB](https://lrclib.net).

Aether is an independent project. It isn't affiliated with or endorsed by YouTube or Google.
