---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Aether app shell: Home dashboard, Search, Library, Artist, Now Playing

Mode: Operate. The listener finds and plays music and manages a library; the world serves the task.
Audience/job: free listeners on laptop and phone who want official songs from any artist, with a home built from their own listening.
Constraints: YouTube IFrame player visible (at least 200x200) while playing; no audio modification; no ads added by Aether; WCAG AA, 44px targets, keyboard, no timed UI.

## Direction contract

THESIS: A calm dark music dashboard where your own listening is the decoration. It refuses the grey streaming-app clone where trending content fills the home and personal history is buried.

OWN-WORLD (user-pinned): Apple-style neutral darks (#000 ground, #1c1c1e surfaces, #2c2c2e raised), #f5f5f7 text and #a1a1a6 secondary text. One listener-chosen accent (blue, pink, orange, green, purple or teal), used for selection, progress, play and liked state, with black text on accent fills. System font, 48/32/17/13 at weight 600 for headings, 18px cards with a hairline and soft shadow, pill buttons, and easing cubic-bezier(0.25, 0.1, 0.25, 1).

STORY: The listener opens Aether and sees their rotation, recently played songs, songs on repeat and more from their top artists. They search any artist, press play and the official song plays at once. They like it, queue it and save it to a playlist without leaving the page.

FIRST VIEWPORT: Desktop has a left sidebar (Home, Search, Library and the playlist list), a scrolling main area and a 400px right rail with the YouTube player, title, artist, Like, Add and Up next, plus a full-width player bar along the bottom. Home leads with a time-of-day greeting, then "Your rotation" (the signature move), then shelves. On phone the video sticks to the top, content scrolls and a player bar sits over a tab bar.

FORM: User-pinned "Clean and minimal" (canon direction, executed at full fidelity; no roll). seed: none (roll skipped: the user pinned the direction, "Clean and minimal", so no direction roll was run). Signature move: "Your rotation", a bento mosaic of your most-played covers with tile size set by play count. Recorded deviation: shelf headings use 17px/700 (in scale) and list titles use 15px for density. Motion grammar: quiet 200 to 300ms fades and lifts on the Apple curve, nothing on loop.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
