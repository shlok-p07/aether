import type { Track } from '../store'

/**
 * DJ mixes, mixtapes and compilations hold many songs in one video, so there is no single set of lyrics,
 * release date or story. We spot them from the title and length and say so, instead of looking things up.
 */

const MIX_WORDS =
  /\b(mix|mixes|mixtape|megamix|mashup|playlist|compilation|non[- ]?stop|full album|best of|greatest hits|hits of|top \d+|\d+\s*(hours?|hrs?)|dj set|live set)\b/i

export function isMix(t: Track) {
  const words = MIX_WORDS.test(t.title)
  const listy = (t.title.match(/[|,]/g)?.length ?? 0) >= 2
  const long = t.duration >= 12 * 60
  return t.duration >= 25 * 60 || (words && (long || listy || !t.duration))
}

const NOT_NAMES = /\b(mix|mixtape|video|audio|official|lyrics?|playlist|songs?|hits|music|best|new|latest|top|vol|volume|dj|non[- ]?stop|20\d\d|19\d\d)\b/i
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s)

/** Artist names listed in a mix title, e.g. "… | BURNA BOY, AYRA STARR, REMA" → ["Burna Boy", "Ayra Starr", "Rema"]. */
export function mixArtists(title: string) {
  const parts = title.split(/\s*[|•–—]\s*|\s+-\s+/)
  const names = parts
    .filter((p) => /,|&|\bx\b/i.test(p))
    .flatMap((p) => p.split(/\s*(?:,|&|\bx\b|\band\b|\bft\.?|\bfeat\.?)\s*/i))
    .map((n) => n.replace(/[()[\]]/g, '').trim())
    .filter((n) => n.length >= 2 && n.length <= 30 && !NOT_NAMES.test(n) && n.split(/\s+/).length <= 4)
  return [...new Map(names.map((n) => [n.toLowerCase(), titleCase(n)])).values()].slice(0, 6)
}
