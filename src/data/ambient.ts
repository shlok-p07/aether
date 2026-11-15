import { art } from './youtube'

/**
 * The ambient colour of a song: the dominant hue of its artwork, used to tint the shell.
 * YouTube thumbnails allow cross-origin reads, so a tiny canvas can sample them.
 * The result is clamped by WCAG relative luminance (≤ 0.05, or ≤ 0.035 for mostly grey artwork), so secondary
 * text (#a1a1a6) keeps at least 4.5:1 even where the colour is strongest; yellow and green covers come out darker than red ones.
 */

const memo = new Map<string, string | null>()

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255))
}

/** WCAG relative luminance of an sRGB colour. */
function luminance([r, g, b]: number[]) {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function ambientColor(id: string): Promise<string | null> {
  if (memo.has(id)) return Promise.resolve(memo.get(id) ?? null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onerror = () => {
      memo.set(id, null)
      resolve(null)
    }
    img.onload = () => {
      try {
        const w = 32
        const h = 18
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('no canvas')
        ctx.drawImage(img, 0, 0, w, h)
        const px = ctx.getImageData(0, 0, w, h).data
        // 12 hue buckets, weighted toward saturated mid-tones; greys barely count.
        const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0 }))
        let grey = 0
        for (let i = 0; i < px.length; i += 4) {
          const [hh, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2])
          if (l < 0.07 || l > 0.93) continue
          const weight = s * (1 - Math.abs(l - 0.5) * 1.6)
          if (s < 0.12) {
            grey += 1
            continue
          }
          const b = buckets[Math.floor(hh / 30) % 12]
          b.w += weight
          b.h += hh * weight
          b.s += s * weight
        }
        const best = buckets.reduce((a, b) => (b.w > a.w ? b : a))
        let out: string | null = null
        if (best.w > 0.6) {
          const hue = best.h / best.w
          const sat = Math.min(0.72, Math.max(0.35, best.s / best.w))
          const cap = grey > (w * h) / 2 ? 0.035 : 0.05
          let l = 0.32
          let rgb = hslToRgb(hue, sat, l)
          while (luminance(rgb) > cap && l > 0.08) rgb = hslToRgb(hue, sat, (l -= 0.01))
          out = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`
        }
        memo.set(id, out)
        resolve(out)
      } catch {
        memo.set(id, null)
        resolve(null)
      }
    }
    img.src = art(id, false)
  })
}
