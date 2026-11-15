import { DAILY_UNITS, resetTime, useQuota } from '../data/quota'
import { usesProxy } from '../data/youtube'

const n = (x: number) => x.toLocaleString()
const plural = (x: number) => `${x} ${x === 1 ? 'search' : 'searches'}`
const LOW = 10

/** Settings → YouTube: how much of today's free allowance is left. */
export function QuotaMeter({ apiKey }: { apiKey: string | null }) {
  const q = useQuota(apiKey)
  if (!apiKey || usesProxy(apiKey)) return null
  const pct = Math.round((q.used / DAILY_UNITS) * 100)
  return (
    <div className="quota">
      <p className="quota-head">
        <span className="field-label">{q.empty ? "Today's searches are used up" : `About ${plural(q.searchesLeft)} left today`}</span>
        <span className="quota-reset">Resets at {resetTime()}</span>
      </p>
      <div
        className={`quota-bar${q.empty ? ' is-empty' : ''}`}
        role="meter"
        aria-label="YouTube allowance used today"
        aria-valuemin={0}
        aria-valuemax={DAILY_UNITS}
        aria-valuenow={q.used}
        aria-valuetext={`${n(q.used)} of ${n(DAILY_UNITS)} units used`}
        style={{ ['--used' as string]: `${pct}%` }}
      />
      <p className="field-hint">
        {n(q.used)} of {n(DAILY_UNITS)} units used. A search costs 101; playing music and repeating a search cost nothing.
      </p>
      <p className="field-hint">
        This is an estimate from this browser. Searches on your other devices, or other apps using the same key, aren't counted here.
      </p>
    </div>
  )
}

/** One line under the search box. */
export function QuotaHint({ apiKey }: { apiKey: string | null }) {
  const q = useQuota(apiKey)
  if (!apiKey || usesProxy(apiKey)) return null
  if (q.empty)
    return (
      <p className="quota-hint is-warn" role="status">
        Today's YouTube searches are used up. They come back at {resetTime()}. Your library still searches as you type.
      </p>
    )
  return (
    <p className={`quota-hint${q.searchesLeft <= LOW ? ' is-warn' : ''}`}>
      {q.searchesLeft <= LOW ? `Only ${plural(q.searchesLeft)} left today` : `About ${plural(q.searchesLeft)} left today`} · resets at {resetTime()}
    </p>
  )
}
