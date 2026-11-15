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

Your home is built from your own listening. It is computed locally from what you play, like and save, with no account, no tracking server, and no ads added by Aether.

## Operating Context

- Catalog and playback: YouTube only (official artist, label and "Topic" channels ranked first).
- The listener supplies a free YouTube Data API key (about 100 searches a day). Trending, artist pages and playback cost very little of it.
- Personal data (likes, playlists, history, settings, key) lives only in this browser's localStorage.

## Capabilities and Constraints

- **No audio modification of any kind.** YouTube's terms forbid altering its audio, and the user explicitly asked to remove all sound-editing features. That means no EQ, no effects and no tempo changes. Volume is the only control.
- The YouTube player must stay visible (at least 200×200) while it plays. Background-only playback is not allowed.
- YouTube may show its own ads inside its player. Aether adds none and must not block YouTube's.
- Personalization is local:
  - recently played
  - most-played ("On repeat")
  - top artists from plays and likes
  - "More from <artist>" via channel uploads
  - trending for the listener's region
  - autoplay of more songs from the same artist when the queue ends

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
