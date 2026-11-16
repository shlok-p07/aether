# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite (user's choice). Playback through YouTube's IFrame Player API; catalog through the YouTube Data API v3 with the listener's own free API key.

## Users

Music lovers who want the real, official songs from any artist, for free. They don't want to pay for Spotify, and they use the app on both laptop and phone in equal measure.

## Product Purpose

A free, ad-free-by-Aether music app with a personalized dashboard. It covers search, trending, liked songs, playlists, queue, history, shuffle and repeat. Success means the listener opens Aether and their home already reflects what they love, and any song is one search away.

## Positioning

Your home is built from your own listening. It is computed from what you play, like and save, with no tracking, no analytics and no ads added by Aether. An account is optional: signing in with Google only keeps your library the same on every device.

## Operating Context

- Catalog and playback: YouTube only (official artist, label and "Topic" channels ranked first).
- The listener supplies a free YouTube Data API key (about 100 searches a day). Trending, artist pages and playback cost very little of it.
- Personal data (likes, playlists, history, stats, settings, key) lives in this browser's localStorage. Optional Google sign-in (Firebase Auth + one Firestore document per person, readable only by them) syncs it across devices: merge on a device's first sign-in, then live with the latest change winning. Volume stays per device. Firebase loads only when someone signs in.
- Getting started for non-technical listeners: a returning listener taps "Continue with Google" and their key and library arrive; a new listener gets a free YouTube key in three plain steps and pastes it, which connects instantly. The user chose to keep per-listener YouTube keys rather than one shared key.

## Capabilities and Constraints

- **No audio modification of any kind.** YouTube's terms forbid altering its audio, and the user explicitly asked to remove all sound-editing features. That means no EQ, no effects and no tempo changes. Volume is the only control.
- The YouTube player must stay visible (at least 200×200) while it plays. Background-only playback is not allowed, including screen-off playback on phones (the user asked for it; it is out of scope under YouTube's terms). The allowed substitute: on touch devices Aether holds a Screen Wake Lock while a song plays, so the phone doesn't lock mid-song (Settings → Playback, on by default, per device).
- YouTube may show its own ads inside its player. Aether adds none and must not block YouTube's.
- Personalization is local, from a listening log of seconds actually heard and early skips:
  - recently played
  - most-played in the last 30 days ("On repeat"); repeated skips lower a song
  - a time-of-day shelf (mornings, afternoons, evenings, late nights)
  - "Forgotten favorites": heavily played, not heard in 30+ days
  - top artists from plays and likes
  - "More from <artist>" via channel uploads
  - trending for the listener's region
  - autoplay of more songs from the same artist when the queue ends, skipping songs the listener keeps skipping
  - a Stats page (time, top songs, top artists, time of day) for 7 days, 30 days or all time
- Lyrics (LRCLIB) and "About this song" background (MusicBrainz for original release, album and artist origin; Wikipedia for the story) are opt-in, asked once in place; only then do song titles and artists leave the browser. YouTube-upload credits (writers, producers, label) need no extra opt-in since YouTube is already the source.
- Data portability without a server: JSON backup export/import (merge, never delete), YouTube playlist import by link, and playlists shared as self-contained links.
- Installable as a web app (manifest + a shell-only service worker that never caches YouTube, Google API or LRCLIB requests).
- An optional shared server (worker/) can hold one key for a few friends; a personal key always takes over.
- Listen together (the user's chosen differentiator: group listening that leaders keep behind subscriptions and their own apps): a host shares a link; anyone opens it on any device and hears the same song at the same moment, with no account, app or YouTube key (listeners are signed in anonymously to Firebase; playback is each listener's own visible YouTube player, so it stays within YouTube's terms). Host-only control; listeners can pause for themselves, request songs into the host's queue, and send a Love. One Firestore document per session, host-only writes. Anti-spam is enforced in firestore.rules (one new session a minute per person via hosts/{uid}; requests every 10 s and loves every 5 s per listener using server time; host can remove and block; only real YouTube IDs). Sessions expire 12 h after the host's last activity; automatic deletion (TTL) needs billing, which the user ruled out, so expired sessions are closed by the rules and a host's previous session is deleted when they start a new one. Visual direction for the session screen (user asked for "clean, techy, vibes"): Live badge with a pulsing dot, session code and clocks in the system monospace, equaliser bars, a single ambient-tinted stage card, hairline-separated sections, an activity log.

## Brand Commitments

- Name: **Aether**.
- Look (user-pinned): clean and minimal. A calm dark dashboard with album art and one accent colour the listener chooses. It follows the user's Apple-style notes: system font, neutral greys, pills, and 18px cards with hairlines.

## Evidence on Hand

None. There are no user counts or testimonials, and the product must not invent them.

## Product Principles

1. The music leads: album art and titles carry the screen, and the chrome stays quiet.
2. Personal by default: home is computed from your own listening, with nothing to set up beyond the key.
3. Honest about limits: say plainly what YouTube allows (no audio changes, its own ads).
4. Every common music-app job works: search, play, queue, like, playlists, history.

## Accessibility & Inclusion

WCAG AA contrast, 44px targets, keyboard control, no colour-only meaning, and no timed UI.
