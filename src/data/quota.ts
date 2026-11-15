import { useSyncExternalStore } from 'react'

/**
 * An estimate of how much of today's free YouTube quota this browser has used.
 *
 * YouTube doesn't tell an app how much quota is left, so Aether adds up what it spends: a search
 * costs 100 units and every other request 1, out of 10,000 a day. Google's day starts at midnight
 * Pacific time. If YouTube says the limit is used up, the count jumps to the full amount.
 * Requests answered from Aether's own cache cost nothing and aren't counted.
 */

export const DAILY_UNITS = 10_000
export const SEARCH_UNITS = 101 // the search itself (100) plus one request for the songs' details (1)

const STORE = 'aether.quota'
type Saved = { day: string; key: string; units: number }

/** Today's date in Google's quota day (Pacific time), as YYYY-MM-DD. */
const pacificDay = (at = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at)

/** When the quota next resets, as a timestamp. */
export function resetsAt(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  )
  const elapsed = ((parts.hour ?? 0) * 3600 + (parts.minute ?? 0) * 60 + (parts.second ?? 0)) * 1000
  return now - elapsed + 24 * 3600e3
}

/** "3:00 AM" in the listener's own time zone. */
export const resetTime = () => new Date(resetsAt()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Keys are long; a short fingerprint is enough to notice that the listener switched keys.
const fingerprint = (key: string) => key.slice(-8)

function read(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null')
  } catch {
    return null
  }
}

let snapshot = { units: 0, key: '' }
const subs = new Set<() => void>()
function refresh() {
  const s = read()
  const units = s && s.day === pacificDay() ? s.units : 0
  const key = s?.key ?? ''
  if (units !== snapshot.units || key !== snapshot.key) snapshot = { units, key }
  subs.forEach((f) => f())
}
refresh()
try {
  window.addEventListener('storage', (e) => e.key === STORE && refresh()) // other tabs
} catch {
  /* not in a browser */
}

function write(key: string, units: (prev: number) => number) {
  const s = read()
  const fp = fingerprint(key)
  const prev = s && s.day === pacificDay() && s.key === fp ? s.units : 0
  try {
    localStorage.setItem(STORE, JSON.stringify({ day: pacificDay(), key: fp, units: Math.min(DAILY_UNITS, units(prev)) }))
  } catch {
    /* storage full or blocked: the counter just won't move */
  }
  refresh()
}

export const quota = {
  /** A request reached YouTube and was charged. */
  spend: (key: string, units: number) => write(key, (u) => u + units),
  /** YouTube said the limit is used up. */
  exhausted: (key: string) => write(key, () => DAILY_UNITS),
}

export type QuotaView = { used: number; left: number; searchesLeft: number; empty: boolean }

/** Today's estimate for this key. Re-checks the date on every render, so it resets on its own after midnight Pacific. */
export function useQuota(key: string | null): QuotaView {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => snapshot,
  )
  const today = read()?.day === pacificDay()
  const used = key && today && s.key === fingerprint(key) ? s.units : 0
  const left = Math.max(0, DAILY_UNITS - used)
  return { used, left, searchesLeft: Math.floor(left / SEARCH_UNITS), empty: left < SEARCH_UNITS }
}
