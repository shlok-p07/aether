---
name: Aether
description: A calm dark music dashboard where your own listening is the decoration.
colors:
  ground: "#000000"
  surface: "#1c1c1e"
  raised: "#2c2c2e"
  raised-hover: "#3a3a3c"
  hairline: "rgba(255, 255, 255, 0.1)"
  text: "#f5f5f7"
  text-secondary: "#a1a1a6"
  text-tertiary: "#8e8e93"
  accent: "#ff375f"
  accent-blue: "#0a84ff"
  accent-pink: "#ff375f"
  accent-orange: "#ff9f0a"
  accent-green: "#30d158"
  accent-purple: "#bf5af2"
  accent-teal: "#64d2ff"
  on-accent: "#000000"
  danger: "#ff453a"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
  list:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
rounded:
  thumb: "8px"
  item: "10px"
  art: "12px"
  stage: "14px"
  card: "18px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.list}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-quiet:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    typography: "{typography.list}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.raised-hover}"
  button-quiet-pressed:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
  button-play:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    size: "48px"
  button-icon:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "6px 6px 6px 18px"
    height: "56px"
  container-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "24px"
  rotation-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  cover-card:
    rounded: "{rounded.art}"
    width: "168px"
  track-row:
    typography: "{typography.list}"
    rounded: "{rounded.art}"
    padding: "8px"
    height: "64px"
  nav-item:
    textColor: "{colors.text}"
    rounded: "{rounded.item}"
    padding: "0 12px"
    height: "44px"
  nav-item-current:
    backgroundColor: "{colors.raised}"
  popover:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.stage}"
    padding: "8px"
    width: "280px"
---

# Design System: Aether

## Overview

**Creative North Star: "The Listening Room"**

Aether is a dark room with the lights down, and the only things that glow are the covers of what you have been playing. The chrome is Apple-style neutral grey on true black, set in the system font, with pill controls and softly rounded containers. Everything that is not music or a control steps back so album art and song titles carry the screen. Your own listening is the decoration: the home screen's one expressive move, "Your rotation", is built from your play counts, not from editorial or trending content.

The density is that of a working music app. A 232px sidebar, a scrolling main column capped at 1080px and a 400px now-playing rail sit above a full-width player bar on desktop. Shelves of cover cards, numbered track rows and a single mosaic make up every page. One listener-chosen accent marks what is selected, playing, liked or in progress, and nothing else. Motion is quiet and short: fades, 2 to 6px lifts and small presses on one curve, and nothing loops for decoration.

The world rejects the grey streaming-app clone whose home is filled with trending content while personal history is buried. Trending exists, but below your own shelves.

**Key Characteristics:**
- True black ground with two grey surface steps and a white hairline.
- One accent, chosen by the listener from six Apple system colours, with black text on accent fills.
- System font only; 48/32/17/13 heading scale, 15px for dense list text.
- Pill controls, 18px containers, smaller nested radii for art.
- Album art is the only imagery and the only colour field.
- 44px minimum target on every control.

## Colors

A neutral dark ladder with one listener-owned accent; colour comes from the album art, not the chrome.

### Primary
- **Listener Accent** (default Pink, set per listener as `--accent` from six options: Blue, Pink, Orange, Green, Purple, Teal): the only chromatic chrome colour. It fills the primary pill ("Play rotation", "Resume"), the hover play disc on covers, checked switches and checkboxes, scrubber and volume progress, the phone progress hairline, the active tab, the current-page sidebar icon, the now-playing title in rows and cards, liked hearts, the focus ring, text selection and links. All six accents hold AA contrast with black text, which is why on-accent text is always black.

### Neutral
- **True Black Ground** (#000000): app background and main column; the phone video band.
- **Graphite Surface** (#1c1c1e): sidebar, now-playing rail, player bar, cards, chips, search field, settings groups, skeletons.
- **Raised Graphite** (#2c2c2e): current nav item, quiet pills, popovers, toast, art placeholders; one step lighter (#3a3a3c) on quiet-pill hover.
- **Hairline** (rgba(255, 255, 255, 0.1)): every container border and pane divider.
- **Paper White** (#f5f5f7): primary text, the white play disc, the pressed state of a quiet pill.
- **Secondary Grey** (#a1a1a6): subtitles, artist names, meta, counts, times, idle icons. At least 5.4:1 on every surface.
- **Tertiary Grey** (#8e8e93): input placeholders only.
- **System Red** (#ff453a): destructive actions and errors only, with black text on fills.

Hover washes are translucent white over the current surface (5% on rows, 6% on nav and mini rows, 8% on icon buttons and menu items), never a new colour.

### Named Rules
**The Listener Owns the Colour Rule.** The accent is never fixed in code paths: read `var(--accent)`, never a hex. A surface must look right in all six accents.

**The Black on Accent Rule.** Text and icons on an accent fill are black (#000000), never white.

**The Art Is the Colour Rule.** No gradients, tints or coloured panels in the chrome. The one gradient in the system is the black scrim under rotation captions, which exists for legibility over art.

## Typography

**Display Font:** System UI stack (-apple-system, SF Pro Text, Segoe UI, Roboto, with sans-serif fallback)
**Body Font:** the same stack
**Label/Mono Font:** the same stack with tabular figures for counts and times

**Character:** One family, set tight and heavy at the top and plain at reading sizes, so it reads as the platform rather than a brand.

### Hierarchy
- **Display** (700, 48px, 1.15, -0.02em): the time-of-day greeting on Home at 760px and wider; 32px below.
- **Headline** (700, 32px, 1.15, -0.02em, balanced wrap): page titles (Search, Library, Settings, artist and playlist names), and the caption of the largest rotation tile.
- **Title** (700, 17px): shelf headings ("Your rotation", "Jump back in", "Up next") and the setup card heading. Settings group headings, library tile titles and the now-playing song title use 17px at 600.
- **Body** (400, 17px, 1.45): base text and the search input. Explanatory paragraphs cap at 62ch.
- **List** (600 or 500, 15px): card, row and player-bar titles at 600; nav items, chips, menu items, pills and page subtitles at 500 or 400. This is the recorded density deviation from the 48/32/17/13 scale.
- **Label** (400 or 600, 13px, tabular numerals): artist and meta lines, play counts, times, counts, tab labels, sidebar group heading, "See all".

The wordmark is 24px/700 at -0.02em and appears only in the sidebar.

### Named Rules
**The Four Plus One Rule.** Sizes come from 48, 32, 17, 15 and 13. Nothing else in content; inputs that need 16px to avoid mobile zoom are the exception.

**The Tabular Numbers Rule.** Every count, time, track number and play count uses tabular figures.

## Layout

Desktop (1180px and up) is a three-column grid: a 232px sidebar, a fluid main column and a 400px now-playing rail, with a full-width player bar beneath all three. The main column scrolls on its own with 32px side padding and 48px at the foot; page content is centred at a 1080px maximum and stacks with 32px gaps. The rail holds the YouTube stage at 16:9, the song title and actions, then "Up next".

From 760px to 1179px the sidebar is removed, the rail stays at 400px and a four-tab bar (Home, Search, Library, Settings) appears below the player bar.

Below 760px the layout is a single column: the video band sticks to the top edge to edge (only while a song is loaded), content scrolls in 16px gutters with 24px section gaps, and the player bar collapses to one row (title, play, next, a chevron that opens shuffle, repeat and the scrubber) with a 2px accent progress line on its top edge, above the tab bar.

Horizontal shelves bleed to the column edge (negative margin equal to the gutter) and scroll with snap; desktop cover columns are 168px, phone 140px. Library tiles use an auto-fill grid with a 220px minimum.

Spacing steps are 4, 8, 12, 16, 24, 32 and 48px; 2px is used only for text-stack gaps inside cards and rows.

### Named Rules
**The Visible Player Rule.** The YouTube stage is always on screen while a song plays: in the rail on desktop and tablet, pinned to the top on phone. No layout may hide or shrink it below 200x200 CSS pixels.

**The 44 Rule.** Every interactive element is at least 44px in its smallest dimension (rows 64px, mini rows 56px, the search field 56px). The search field's inner clear button (32px) is the only smaller control.

## Elevation & Depth

Depth is mostly tonal: black ground, graphite panes, raised graphite for things that sit above. Shadows are soft, dark and short, and they belong to artwork and floating layers rather than to every box. Hairlines do the separating; shadows only add weight under art and floating UI.

### Shadow Vocabulary
- **Soft Lift** (`0 8px 24px -8px rgba(0, 0, 0, 0.6)`): cover art, rotation tiles, artist faces, library tiles, the setup card, the video stage and the toast.
- **Play Disc** (`0 4px 12px rgba(0, 0, 0, 0.5)`): the accent play disc that appears over a cover on hover or focus.
- **Floating Menu** (`0 24px 48px -12px rgba(0, 0, 0, 0.8)`): popovers only.
- **Switch Knob** (`0 2px 6px rgba(0, 0, 0, 0.3)`): the white switch thumb.

### Named Rules
**The Hairline First Rule.** Panes and containers are separated by a 1px white hairline at 10%. A shadow never replaces the hairline on a container.

## Shapes

Corners are soft and nested: the outer the element, the larger the radius. Controls are full pills (999px): buttons, chips, the search field, inputs, icon buttons, the play disc and swatches. Containers are 18px: settings groups, notices, library tiles, rotation tiles, the setup card and the toast. The video stage and popovers are 14px. Cover art and track rows are 12px; nav items and mini rows 10px; row and bar thumbnails and menu items 8px; mini thumbnails and checkboxes 6px. Artist faces are the only circles besides dots and the switch knob.

Borders are always the 1px hairline, except the destructive confirmation (1px System Red) and the selected swatch (paper-white ring).

## Components

### Buttons
Calm, round and obvious.
- **Shape:** full pill (999px), 44px tall, 20px side padding, 15px/600 label, optional 6px-gapped leading icon.
- **Accent:** listener accent fill with black text; the screen's one primary action ("Play rotation", "Resume", "Play"). Hover brightens by 10%.
- **Quiet:** raised graphite with paper-white text for secondary actions (Shuffle, Disconnect); hover steps to #3a3a3c; when it is a pressed toggle or open trigger it inverts to paper white with black text.
- **Danger:** System Red with black text, inside a destructive confirmation only.
- **Press:** every pill scales to 0.97 on press over 200ms on the Apple curve.
- **Icon button:** a 44px transparent circle, secondary-grey icon; hover adds an 8% white wash and paper-white icon; a pressed toggle or liked heart turns accent.
- **Play disc:** 48px paper-white circle with a black glyph in the player bar; hover scales to 1.05. While buffering it shows a spinner.
- **Text button:** 13px/600 secondary grey, no fill ("See all", "Open queue"); hover goes paper white.

### Chips
- **Style:** graphite surface, hairline border, pill, 44px, 15px/500 paper-white text, optional secondary-grey icon.
- **State:** hover steps to raised graphite. Used for Explore genres and search suggestions; they are actions, not filters.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** graphite surface; library tiles step to raised graphite on hover.
- **Shadow Strategy:** Soft Lift on library tiles and the setup card; none on settings groups and notices.
- **Border:** hairline on all of them.
- **Internal Padding:** 24px for groups, notices and setup; 20px for library tiles (132px minimum height, icon above title and count).

### Cover Cards
Art first, two lines of text, nothing else. A square 12px-radius cover with Soft Lift, then a 15px/600 title and a 13px secondary line, both single-line with ellipsis. On hover or focus a 44px accent play disc rises 4px into the cover's bottom-right corner; on the current song it stays visible and the title turns accent. Missing or tiny thumbnails fall back to a raised-graphite square with a centred icon.

### Track Rows
64px rows at 12px radius with an 8px pad: optional right-aligned tabular number (replaced by three static accent bars for the playing song), a 48px thumbnail with a dark play overlay on hover, title and artist, then the duration and a more button. Hover is a 5% white wash. The playing row's title turns accent and its meta reads "Playing · artist". Durations hide on phone.

### Inputs / Fields
- **Search:** a 56px pill on graphite with a hairline, a leading secondary-grey icon, a 17px input and a 32px raised clear button.
- **Inline name field:** a 44px pill on true black with a hairline and 16px text.
- **Focus:** the hairline turns accent; elsewhere focus is a 2px accent outline at 2px offset.
- **Switch:** a 51x31 iOS-style track (#39393d off, accent on) with a 27px white knob that slides 20px over 250ms.
- **Swatches:** raised pills holding a 24px colour dot and the accent name; the selected one gets a paper-white ring.

### Navigation
- **Sidebar:** 232px graphite pane with the wordmark, then Home, Search, Library, Settings, a 13px/600 secondary-grey "Your music" group heading, and Liked songs plus each playlist with a tabular count. Items are 44px, 15px/500, 10px radius; hover is a 6% white wash; the current page gets raised graphite with an accent icon.
- **Tab bar (below 1180px):** four equal 56px tabs, icon over a 13px/500 label, secondary grey; the current tab is accent. Respects the bottom safe area.
- **Back:** a 44px pill-shaped text link with a chevron in secondary grey, above page titles that can go back.

### Player Bar
A graphite strip with a hairline top, laid out as song, transport and end controls in a 1 : 1.6 : 1 grid on desktop. Song side: a 56px 8px-radius thumbnail, 15px/600 title, 13px artist and the like heart. Centre: shuffle, previous, play disc, next and repeat, over a scrubber of tabular times either side of a 4px track (accent fill to the current position, 20% white beyond) with a 14px white thumb. End: queue, mute and a 120px volume slider in the same style. On phone it becomes the one-row mini player described in Layout.

### Popover Menu
A 280px raised-graphite panel with a hairline, 14px radius and Floating Menu shadow, 8px padding, a 13px/600 secondary-grey title and 44px menu items at 8px radius (8% wash on hover). Playlist options show a 20px checkbox that fills accent when the song is in that playlist. It flips above its trigger and clamps inside the viewport so it never covers the player bar; long playlist lists scroll inside a 180px region.

### Toast
A single status message in the main column, centred 16px above its foot: raised graphite, hairline, 18px radius, Soft Lift, 15px text and a dismiss icon button. It never times out; the listener dismisses it, and the main column gains bottom padding so it never hides content.

### Your Rotation (Signature Component)
The home screen's signature: a mosaic of the listener's six most-played songs, at most 760px wide, on a four-column grid of square cells with 12px gaps (8px on phone) and dense packing. Tile size comes from play share. The top song takes a 2x2 square when it leads the next by 40% or more, otherwise a wide tile. Any other song with at least 60% of the leader's plays gets a 2x1 wide tile, and the rest get single squares. Each tile is an 18px-radius, hairline-bordered button with Soft Lift, the cover filling it, and a bottom caption on a black-to-clear scrim: title (13px/600; 17px on wide tiles; 32px/700 on the large square) and a tabular "N plays" line in light grey. Hover lifts the tile 2px over 300ms. On phone captions shrink (the large square to 17px, wide to 13px) and single squares drop the play count. It appears once the listener has three repeated songs; before that, a "Start your rotation" shelf of Explore chips takes its place.

## Do's and Don'ts

### Do:
- **Do** use `var(--accent)` for every accent use, and check the surface in all six accents.
- **Do** put black text on accent and System Red fills.
- **Do** keep the 48/32/17/15/13 size set and weights 700 for page and shelf headings, 600 for list titles and labels that need weight.
- **Do** give containers an 18px radius and a 1px hairline (rgba(255, 255, 255, 0.1)); give controls a full pill.
- **Do** use the Apple curve (cubic-bezier(0.25, 0.1, 0.25, 1)) for all transitions, at 150 to 300ms, and collapse motion under reduced-motion.
- **Do** keep every target at least 44px and every count in tabular figures.
- **Do** keep the YouTube stage visible while a song plays.
- **Do** let album art supply the colour; the chrome stays neutral.

### Don't:
- **Don't** hard-code an accent hex or put white text on an accent fill.
- **Don't** add gradients, tints or coloured panels to the chrome; the caption scrim over art is the only gradient.
- **Don't** add a second typeface or web font; the system stack is the user-pinned choice.
- **Don't** fill Home with trending or editorial content ahead of the listener's own shelves.
- **Don't** auto-dismiss toasts or add any timed UI.
- **Don't** loop decorative motion; the buffering spinner is the only looping animation.
- **Don't** use colour alone for state: the current song also gets "Playing ·" text or the bars, liked also changes the heart's fill.
