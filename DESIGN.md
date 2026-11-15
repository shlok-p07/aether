---
name: Aether
description: A calm dark music dashboard where your own listening is the decoration.
colors:
  ground: "#000000"
  panel: "#101012"
  surface: "#1c1c1e"
  raised: "#2c2c2e"
  raised-hover: "#3a3a3c"
  hairline: "rgba(255, 255, 255, 0.1)"
  text: "#f5f5f7"
  text-secondary: "#a1a1a6"
  text-glass: "#c7c7cc"
  text-tertiary: "#8e8e93"
  ambient-default: "#26262b"
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
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  shelf:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  now-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
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
  dock: "20px"
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
  shell-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
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
  player-dock:
    textColor: "{colors.text}"
    rounded: "{rounded.dock}"
    padding: "10px 16px 10px 10px"
  popover:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.stage}"
    padding: "8px"
    width: "280px"
---

# Design System: Aether

## Overview

**Creative North Star: "The Listening Room"**

Aether is a dark room with the lights down, and the only things that glow are the covers of what you have been playing. The chrome is Apple-style neutral grey on true black, set in the system font, with pill controls and softly rounded containers. Everything that is not music or a control steps back so album art and song titles carry the screen. Your own listening is the decoration: the home screen's one expressive move, "Your rotation", is built from your play counts, not from editorial or trending content. The room takes its light from the record on the turntable: the playing (or last-played) song's cover colour pools faintly at the top of the page, falls down the rail and tints the glass of the player, and nothing else in the chrome carries colour.

The density is that of a working music app. On desktop three rounded panels float on a black ground in 8px gutters: a 232px sidebar, a scrolling main column capped at 1080px and a 400px now-playing rail, with a frosted player dock floating over the foot of all three. Shelves of cover cards, numbered track rows and a single mosaic make up every page. One listener-chosen accent marks what is selected, playing, liked or in progress, and nothing else. Motion is quiet and short: fades, 3 to 6px lifts, a slight easing-in of artwork and small presses, and nothing loops for decoration.

The world rejects the grey streaming-app clone whose home is filled with trending content while personal history is buried. Trending exists, but below your own shelves.

**Key Characteristics:**
- True black ground under near-black floating panels, two grey surface steps and a white hairline.
- One accent, chosen by the listener from six Apple system colours, with black text on accent fills.
- An ambient colour sampled from the song's artwork, clamped dark, as atmosphere only.
- System font only; 48/32/17/13 heading scale with recorded 24, 22, 20 and 15px steps.
- Pill controls, 18px panels and containers, a 20px frosted dock, smaller nested radii for art.
- Album art is the only imagery and the source of every colour field.
- 44px minimum target on every control.

## Colors

A neutral dark ladder with one listener-owned accent; the only other colour in the chrome is light borrowed from the album art.

### Primary
- **Listener Accent** (default Pink, set per listener as `--accent` from six options: Blue, Pink, Orange, Green, Purple, Teal): the only chromatic chrome colour that means anything. It fills the primary pill ("Play rotation", "Play"), the hover play disc on covers, checked switches and checkboxes, scrubber and volume progress, the phone progress line, the active tab, the current-page sidebar icon, the now-playing title in rows and cards, liked hearts, the focus ring, text selection and links. All six accents hold AA contrast with black text, which is why on-accent text is always black.

### Ambient
- **Ambient Song Colour** (runtime `--ambient`, falling back to the dim graphite `ambient-default` when no song has played or the art can't be read): sampled from the playing song's thumbnail, or the last-played song's when nothing is playing. A 32x18 canvas sample sorts saturated mid-tone pixels into twelve 30-degree hue buckets and takes the heaviest; saturation is held between 35% and 72%, and lightness steps down from 32% until the colour's WCAG relative luminance is at most 0.05 (at most 0.035 when more than half the art is grey), so yellow and green covers land darker than red ones. Art with no real hue yields no colour and the fallback holds. Composited where it is strongest, it keeps Secondary Grey at 5:1 or better. It appears in exactly four places: a pool at the top of the main panel (a radial wash at 55% plus a linear wash at 30%, 420px tall), a glow down the rail (a radial wash at 70%, 520px tall, hidden on phone), a tinted shadow under the video stage (on phone too, spilling below the full-bleed video), and a 22% tint in the player glass. It cross-fades over 1.2s on the Apple curve between songs, on those layers only; everything else takes the new value at once.

### Neutral
- **True Black Ground** (#000000): the app ground showing in the gutters between panels; the phone video band.
- **Panel Black** (#101012): the three floating shell panels (sidebar, main, rail); on phone the main column's ground.
- **Graphite Surface** (#1c1c1e): cards, chips, search field, settings groups, skeletons; the base the dock's glass is mixed from.
- **Raised Graphite** (#2c2c2e): current nav item, quiet pills, popovers, toast, art placeholders; one step lighter (#3a3a3c) on quiet-pill hover.
- **Hairline** (rgba(255, 255, 255, 0.1)): every panel and container border and divider. The floating dock's edge is a touch brighter (12% white).
- **Paper White** (#f5f5f7): primary text, the white play disc, the wordmark's disc mark, the pressed state of a quiet pill.
- **Secondary Grey** (#a1a1a6): subtitles, artist names, meta, counts, times, idle icons. At least 5.4:1 on every surface and 5:1 under the strongest ambient wash.
- **Glass Grey** (#c7c7cc): secondary text, times, idle icons and tab labels on the frosted dock and tab bar, a step brighter so they hold AA (above 6:1) even with bright artwork scrolling beneath the glass.
- **Tertiary Grey** (#8e8e93): input placeholders and lyric lines that aren't being sung (6:1 on black, 4.9:1 on graphite).
- **System Red** (#ff453a): destructive actions and errors only, with black text on fills.

Hover washes are translucent white over the current surface (5% on rows, 6% on nav and mini rows, 8% on icon buttons and menu items), never a new colour.

### Named Rules
**The Listener Owns the Colour Rule.** The accent is never fixed in code paths: read `var(--accent)`, never a hex. A surface must look right in all six accents.

**The Black on Accent Rule.** Text and icons on an accent fill are black (#000000), never white.

**The Art Is the Colour Rule.** Colour in the chrome is light from the album art and nothing else: no fixed tints, brand gradients or coloured panels. The gradients in the system are the black scrim under rotation captions, the lyrics edge mask and the ambient pool and glow; every one exists for legibility or to carry the art's colour.

**The Ambient Is Atmosphere Rule.** The ambient colour never marks state, never fills a control and never sits behind text without the luminance clamp. Selection, progress, play and liked state stay on the listener accent.

## Typography

**Display Font:** System UI stack (-apple-system, SF Pro Text, Segoe UI, Roboto, with sans-serif fallback)
**Body Font:** the same stack
**Label/Mono Font:** the same stack with tabular figures for counts and times

**Character:** One family, set tight and heavy at the top and plain at reading sizes, so it reads as the platform rather than a brand.

### Hierarchy
- **Display** (700, 48px, 1.12, -0.025em): the time-of-day greeting on Home at 760px and wider; 32px below.
- **Headline** (700, 32px, 1.12, -0.025em, balanced wrap): page titles (Search, Library, Settings, artist and playlist names), and the caption of the largest rotation tile.
- **Statement** (500 to 700, 24px, 1.35, -0.01em): the one summary sentence on Stats and full-page lyric lines; 20px on phone for the Stats sentence. A recorded step, used nowhere else.
- **Shelf** (700, 22px, 1.2, -0.02em): shelf headings ("Your rotation", "Jump back in", "Up next"); 20px on phone. A recorded deviation, the section size of Apple's own music app.
- **Now Playing** (700, 20px, 1.25, -0.015em): the song title in the rail. A recorded step.
- **Title** (700, 17px): the setup card heading and the About "Background" heading. Settings group headings and library tile titles use 17px at 600.
- **Body** (400, 17px, 1.45): base text and the search input. Explanatory paragraphs cap at 62ch.
- **List** (600 or 500, 15px): card, row and player titles at 600; nav items, chips, menu items, pills and page subtitles at 500 or 400. This is the recorded density deviation from the 48/32/17/13 scale.
- **Label** (400 or 600, 13px, tabular numerals): artist and meta lines, play counts, times, counts, tab labels, sidebar group heading, "See all".

The wordmark is 22px/700 at -0.025em beside a 24px paper-white disc mark, and appears only in the sidebar.

### Named Rules
**The Recorded Steps Rule.** Sizes come from 48, 32, 17 and 13, plus the recorded steps 24 (Statement), 22 (shelf headings, wordmark), 20 (now-playing title; shelf headings and the Stats sentence on phone) and 15 (list density). Nothing else in content; inputs that need 16px to avoid mobile zoom are the exception.

**The Tabular Numbers Rule.** Every count, time, track number and play count uses tabular figures.

## Layout

Desktop (1180px and up) is three floating panels on the black ground: a 232px sidebar, a fluid main column and a 400px now-playing rail, separated and inset by an 8px gutter. The outer inset grows to the safe area on any edge that has one (top, left, right; the dock takes the bottom). Each panel is Panel Black with an 18px radius and a hairline, and scrolls on its own. The main column has 40px padding; page content is centred at a 1080px maximum and stacks with 32px gaps. The rail holds the YouTube stage at 16:9, the song title and actions, then the Up next / Lyrics / About control.

The player dock floats over the foot of all three panels, inset by the same gutter so its edges line up with the outer panel edges. Its height is measured live (a ResizeObserver writes it to `--bar-space`, 104px until measured), and every panel pads its foot by that height plus its own margin, so the last row of content, the scroll target and the toast always clear the dock whatever its height.

From 760px to 1179px the sidebar is removed and the rail stays 400px wide (so the video stage stays at least 200px tall, as YouTube requires); the player and a four-tab bar (Home, Search, Library, Settings) share one frosted dock.

Below 760px the layout is a single column with no gutters: panels lose their borders and radius, the video band sticks to the top edge to edge (only while a song is loaded) over the main column, content scrolls in 16px gutters with 24px section gaps, and the dock becomes a floating player capsule (8px in from each side) above a full-bleed frosted tab bar.

Horizontal shelves bleed to the column edge (negative margin equal to the gutter) and scroll with snap; desktop cover columns are 168px, phone 140px. Library tiles use an auto-fill grid with a 220px minimum.

Spacing steps are 4, 8, 12, 16, 24, 32 and 48px, with 40px for the desktop main panel's padding; 2px is used only for text-stack gaps inside cards and rows.

### Named Rules
**The Visible Player Rule.** The YouTube stage is always on screen while a song plays: in the rail on desktop and tablet, pinned to the top on phone. No layout may hide or shrink it below 200x200 CSS pixels.

**The 44 Rule.** Every interactive element is at least 44px in its smallest dimension (rows 64px, mini rows 56px, the search field 56px). The search field's inner clear button (32px) is the only smaller control.

**The Clear the Dock Rule.** Anything that floats over content (the dock, the toast) reserves its measured height in the content beneath it; nothing scrolls permanently out of reach behind glass.

## Elevation & Depth

Depth is mostly tonal: black ground, near-black floating panels, graphite cards, raised graphite for things that sit above. Shadows are soft and dark, and they belong to artwork and floating layers rather than to every box; the video stage's shadow takes the song's ambient colour. Glass appears only where content actually passes beneath: the floating player dock and the phone tab bar. Hairlines do the separating; shadows only add weight under art and floating UI.

### Shadow Vocabulary
- **Soft Lift** (`0 8px 24px -8px rgba(0, 0, 0, 0.6)`): cover art, rotation tiles, artist faces, library tiles, the setup card and the toast.
- **Cover Hover** (`0 18px 32px -12px rgba(0, 0, 0, 0.9)`): a cover card's art while it lifts on hover.
- **Tile Hover** (`0 22px 40px -16px rgba(0, 0, 0, 0.9)`): a rotation tile while it lifts on hover.
- **Ambient Stage** (`0 24px 48px -18px` in the ambient colour mixed 70% with black, over `0 10px 24px -12px rgba(0, 0, 0, 0.8)`): the video stage in the rail. On phone a single `0 16px 36px -12px` in the ambient mixed 85% with black, spilling below the band.
- **Float** (`0 24px 48px -12px rgba(0, 0, 0, 0.9), 0 4px 12px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)`): the player dock and phone player capsule, with a faint highlight along the top inner edge.
- **Play Disc** (`0 4px 12px rgba(0, 0, 0, 0.5)`): the accent play disc that appears over a cover on hover or focus. The dock's white play disc carries `0 6px 16px -6px rgba(0, 0, 0, 0.7)` and its thumbnail `0 6px 14px -6px rgba(0, 0, 0, 0.8)`.
- **Floating Menu** (`0 24px 48px -12px rgba(0, 0, 0, 0.8)`): popovers only.
- **Switch Knob** (`0 2px 6px rgba(0, 0, 0, 0.3)`): the white switch thumb.

### Frosted Glass
One recipe: graphite (#1c1c1e) mixed with 22% of the ambient colour, at 88% opacity, behind `blur(28px) saturate(1.7)`, with a 12% white edge, the Float shadow and a 20px radius. The phone tab bar uses the same blur over a neutral #121214 at 90%, without tint, edge or shadow. Secondary text on either glass is Glass Grey.

### Named Rules
**The Hairline First Rule.** Panels and containers are separated by a 1px white hairline (10%; 12% on the dock). A shadow never replaces the hairline on a container.

**The Glass Only Over Content Rule.** Backdrop blur is reserved for the floating dock and the phone tab bar, the two layers content scrolls beneath. Panels, cards, popovers and the toast stay opaque.

## Shapes

Corners are soft and nested: the outer the element, the larger the radius. Controls are full pills (999px): buttons, chips, the search field, inputs, icon buttons, the play disc and swatches. The floating dock and phone player capsule are 20px. Shell panels and containers are 18px: the three panels, settings groups, notices, library tiles, rotation tiles, the setup card and the toast. The video stage and popovers are 14px. Cover art and track rows are 12px; nav items and mini rows 10px; row and bar thumbnails and menu items 8px; mini thumbnails and checkboxes 6px. Artist faces are the only circles besides dots, the switch knob and the wordmark's disc mark.

Artwork is cropped, not letterboxed: every cover image sits 8% zoomed inside its frame to trim the letterbox bars and corner watermarks of video stills (12% inside rotation tiles), and every art frame carries a 1px inner highlight (7% white) like the edge of a printed sleeve.

Borders are always the 1px hairline, except the dock (12% white), the destructive confirmation (1px System Red) and the selected swatch (paper-white ring).

## Components

### Buttons
Calm, round and obvious.
- **Shape:** full pill (999px), 44px tall, 20px side padding, 15px/600 label, optional 6px-gapped leading icon.
- **Accent:** listener accent fill with black text; the screen's one primary action ("Play rotation", "Play"). Hover brightens by 10%.
- **Quiet:** raised graphite with paper-white text for secondary actions (Shuffle, Disconnect, the rail's Resume, so the accent stays with play); hover steps to #3a3a3c; when it is a pressed toggle or open trigger it inverts to paper white with black text.
- **Danger:** System Red with black text, inside a destructive confirmation only.
- **Press:** every pill scales to 0.97 on press over 200ms on the Apple curve.
- **Icon button:** a 44px transparent circle, secondary-grey icon (Glass Grey on the dock); hover adds an 8% white wash and paper-white icon; a pressed toggle or liked heart turns accent.
- **Play disc:** 48px paper-white circle with a black glyph in the player; hover scales to 1.06 and press to 0.94, over 250ms on the expo-out curve. While buffering it shows a spinner.
- **Text button:** 13px/600 secondary grey, no fill ("See all", "Open queue"); hover goes paper white.

### Chips
- **Style:** graphite surface, hairline border, pill, 44px, 15px/500 paper-white text, optional secondary-grey icon.
- **State:** hover steps to raised graphite. Used for Explore genres and search suggestions; they are actions, not filters.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** graphite surface on the panel; library tiles step to raised graphite on hover.
- **Shadow Strategy:** Soft Lift on library tiles and the setup card; none on settings groups and notices.
- **Border:** hairline on all of them.
- **Internal Padding:** 24px for groups, notices and setup; 20px for library tiles (132px minimum height, icon above title and count).

### Cover Cards
Art first, two lines of text, nothing else. A square 12px-radius cover with Soft Lift and the inner highlight edge, then a 15px/600 title and a 13px secondary line, both single-line with ellipsis. On devices that can hover, hovering lifts the art 4px into the Cover Hover shadow over 350ms and eases the image 4% closer over 700ms, both on the expo-out curve. On hover or focus a 44px accent play disc rises 4px into the cover's bottom-right corner; on the current song it stays visible and the title turns accent. Missing or tiny thumbnails fall back to a raised-graphite square with a centred icon.

### Track Rows
64px rows at 12px radius with an 8px pad: optional right-aligned tabular number (replaced by three static accent bars for the playing song), a 48px thumbnail with a dark play overlay on hover, title and artist, then the duration and a more button. Hover is a 5% white wash. The playing row's title turns accent and its meta reads "Playing · artist". Durations hide on phone.

### Inputs / Fields
- **Search:** a 56px pill on graphite with a hairline, a leading secondary-grey icon, a 17px input and a 32px raised clear button.
- **Inline name field:** a 44px pill on true black with a hairline and 16px text.
- **Focus:** the hairline turns accent; elsewhere focus is a 2px accent outline at 2px offset.
- **Switch:** a 51x31 iOS-style track (#39393d off, accent on) with a 27px white knob that slides 20px over 250ms.
- **Swatches:** raised pills holding a 24px colour dot and the accent name; the selected one gets a paper-white ring.

### Navigation
- **Sidebar:** the 232px left panel, opening with the wordmark (a 24px paper-white disc mark, a record seen from above, beside "Aether"), then Home, Search, Library, Settings, a 13px/600 secondary-grey "Your music" group heading, and Liked songs plus each playlist with a tabular count. Items are 44px, 15px/500, 10px radius; hover is a 6% white wash; the current page gets raised graphite with an accent icon.
- **Tab bar (below 1180px):** four equal 56px tabs, icon over a 13px/500 label in Glass Grey; the current tab is accent. On tablet it sits inside the dock beneath a hairline; on phone it is a full-bleed frosted bar. Respects the bottom safe area.
- **Back:** a 44px pill-shaped text link with a chevron in secondary grey, above page titles that can go back.

### Now Playing Rail
The 400px right panel (the same on tablet, to keep the video at least 200px tall), lit from the top by the ambient glow. The 14px-radius video stage sits on the Ambient Stage shadow, then the 20px/700 song title, the artist, Like and More, then the segmented control. With nothing playing, the stage shows the last-played cover at 85% opacity, zoomed 1.22 from a point at 70% across and 30% down so the bottom-left corner, where music-video watermarks sit, crops away; beneath it the title, "artist · last played" and a quiet Resume pill.

### Player Dock
A frosted capsule (see Frosted Glass) that floats over the content and carries the song's colour in its tint. On desktop it spans the three panels edge to edge, 10px in on the left and top and 16px on the right, laid out as song, transport and end controls in a 1 : 1.6 : 1 grid. Song side: a 56px 8px-radius thumbnail (a raised square with a 22px music icon when nothing has played), 15px/600 title, 13px artist in Glass Grey and the like heart. Centre: shuffle, previous, play disc, next and repeat, over a scrubber of tabular times either side of a 4px track (accent fill to the current position, 20% white beyond) with a 14px white thumb. End: queue, mute and a 120px volume slider in the same style. On tablet one dock holds the player above the tab bar, divided by a hairline. On phone the player is its own floating capsule over the tab bar: one row (title, play, next, a chevron that opens shuffle, repeat and the scrubber), with a 2px progress line inset 20px along the capsule's top edge (accent over 14% white).

### Popover Menu
A 280px raised-graphite panel with a hairline, 14px radius and Floating Menu shadow, 8px padding, a 13px/600 secondary-grey title and 44px menu items at 8px radius (8% wash on hover). Playlist options show a 20px checkbox that fills accent when the song is in that playlist. It flips above its trigger and clamps inside the viewport so it never covers the player dock; long playlist lists scroll inside a 180px region.

### Toast
A single status message in the main panel, centred 16px above the dock: raised graphite, hairline, 18px radius, Soft Lift, 15px text and a dismiss icon button. It never times out; the listener dismisses it, and the main column gains bottom padding so it never hides content.

### Your Rotation (Signature Component)
The home screen's signature: a mosaic of the listener's six most-played songs, at most 760px wide, on a four-column grid of square cells with 12px gaps (8px on phone) and dense packing. Tile size comes from play share. The top song takes a 2x2 square when it leads the next by 40% or more, otherwise a wide tile. Any other song with at least 60% of the leader's plays gets a 2x1 wide tile, and the rest get single squares. Each tile is an 18px-radius, hairline-bordered button with Soft Lift, the cover filling it at 1.12 zoom, and a bottom caption on a black-to-clear scrim: title (15px/600; 17px on wide tiles; 32px/700 on the large square) and a tabular "N plays" line in light grey. Hover lifts the tile 3px into the Tile Hover shadow and eases the cover to 1.16, over 400ms on the expo-out curve. On phone captions shrink (the large square to 17px, wide to 13px) and single squares drop the play count. It appears once the listener has three repeated songs; before that, a "Start your rotation" shelf of Explore chips takes its place.

### Segmented Control
A pill group on a 6% white wash holding 44px pill buttons (15px/600, secondary grey). The pressed option fills raised graphite with paper-white text. Used for the Stats period (7 days, 30 days, All time), the rail's Up next / Lyrics / About switch (three equal thirds, shown whenever a song is loaded; hidden on phone) and the song page's Lyrics / About switch.

### Library Action Rows
"New playlist" and "Import from YouTube" sit at the top of the Playlists list as ordinary track-row-sized rows, with the accent glyph on an empty 48px tile, instead of header buttons. Choosing one swaps the rows for its inline form (label, pill field, accent submit, quiet Cancel, 13px hint or System Red error).

### Stats
A page title, a 15px explanation, the period control, then the Statement sentence in secondary grey with the listening time in paper white (never broken across lines). Top songs reuse track rows with "N plays" in the duration slot (moved into the meta line on phone); top artists are rows with a round thumbnail and "N plays · time". "When you listen" is four 15px rows with a 4px track whose accent fill is that slot's share of the busiest one; the time is always written out, so the bar is never the only signal.

### Lyrics
Lines are full-width 44px buttons (17px/600 in the rail, 24px/700 on the Lyrics page): the sung line is paper white, others tertiary grey, and tapping a line seeks there. The list scrolls inside its own region with a 24px masked fade at both edges and follows the song, keeping the current line a third of the way down; a wheel, touch or arrow-key scroll pauses following and shows a quiet "Follow along" pill. A 13px foot credits LRCLIB and says when timing is off because the video's length differs from the recording.

### About This Song
A definition list of facts (Released, Album, Written by, Produced by, Label, Artist from, Born or Formed): 15px rows split by hairlines, the label in secondary grey in a 112px column (140px on the song page), the value in paper white. Missing facts are left out, never shown as blanks. Below, a "Background" (or "About <artist>") 17px/700 heading, the Wikipedia intro at 15px/1.55 in secondary grey capped at 62ch, and a "Read more on Wikipedia" link; a 13px line names the sources with links and the CC BY-SA credit. Before the listener opts in, an inline notice explains what is sent where and offers one accent button.

### Song Page
Opened by tapping the playing song's title in the player dock (a 44px tappable block with a 6% wash on hover-capable devices only) or the lyrics button. The page title is the song, the subtitle the artist, then the Lyrics / About segmented control.

### Account and Sync
- **Continue with Google:** Google's dark-theme sign-in button as its branding guidelines specify (#131314 fill, #8e918f outline, #e3e3e3 15px/600 label, the full-colour G mark), shaped as a 44px pill. It is the only multi-colour element in the chrome, because Google's mark requires it.
- **Sidebar account chip:** at the foot of the sidebar. Signed out, a quiet side item "Sign in to sync" with a cloud icon. Signed in, a 52px hairline tile with a 32px avatar (Google photo, or the initial on raised graphite), the name at 15px/600 and a 13px status line with an icon: "Synced just now", "Syncing…", "Offline · will sync when you reconnect". It opens Settings.
- **Settings → Account:** the first settings group. Signed out: one sentence on what sign-in keeps in sync and that everything works without it, then the Google button. Signed in: a 48px avatar, name, email and status, then quiet Sign out and Delete saved library pills (deletion asks inside a red-outlined confirm) and the note that signing out keeps the library on the device. Warning states colour the status #ffd60a and always say it in words.
- **New-device prompt:** on Home, above the YouTube setup card, only when no key is set and nobody is signed in: "Already use Aether?" with the Google button, so a returning listener skips setup entirely.

## Do's and Don'ts

### Do:
- **Do** use `var(--accent)` for every accent use, and check the surface in all six accents.
- **Do** put black text on accent and System Red fills.
- **Do** keep the 48/32/17/13 size set with its recorded steps (24 Statement, 22 shelf, 20 now-playing, 15 list) and weights 700 for page and shelf headings, 600 for list titles and labels that need weight.
- **Do** give panels and containers an 18px radius and a 1px hairline (rgba(255, 255, 255, 0.1)); give controls a full pill.
- **Do** use the Apple curve (cubic-bezier(0.25, 0.1, 0.25, 1)) for state changes at 150 to 300ms, the expo-out curve (cubic-bezier(0.22, 1, 0.36, 1)) for lifts, presses and artwork easing at 250 to 700ms, and collapse all of it under reduced-motion.
- **Do** keep every target at least 44px and every count in tabular figures.
- **Do** keep the YouTube stage visible while a song plays.
- **Do** let album art supply the colour: sample it into `--ambient`, clamp it, and keep it to the main pool, rail glow, stage shadow and dock tint.
- **Do** reserve the dock's measured height (`--bar-space`) under any scrolling content or floating message.
- **Do** brighten secondary text to Glass Grey on frosted surfaces.

### Don't:
- **Don't** hard-code an accent hex or put white text on an accent fill.
- **Don't** add fixed tints, brand gradients or coloured panels to the chrome; the caption scrim, the lyrics edge mask and the ambient pool and glow are the only gradients.
- **Don't** use the ambient colour for state, controls or text, or skip its luminance clamp.
- **Don't** put backdrop blur anywhere but the floating dock and the phone tab bar.
- **Don't** add a second typeface or web font; the system stack is the user-pinned choice.
- **Don't** fill Home with trending or editorial content ahead of the listener's own shelves.
- **Don't** auto-dismiss toasts or add any timed UI.
- **Don't** loop decorative motion; the buffering spinner is the only looping animation, and the ambient cross-fade runs once per song change.
- **Don't** use colour alone for state: the current song also gets "Playing ·" text or the bars, liked also changes the heart's fill.
