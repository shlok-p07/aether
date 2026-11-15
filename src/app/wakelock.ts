import { useEffect } from 'react'

/**
 * Keeps a phone's screen from turning off while music plays.
 *
 * YouTube's player has to stay on screen, and phone browsers pause it once the screen locks, so
 * Aether can't play with the screen off. What it can do is stop the screen from timing out in the
 * middle of a song. The lock is held only while a song plays and Aether is on screen; the browser
 * drops it automatically when the listener switches apps, and it's taken again on return.
 */

/** Phones and tablets that can keep the screen on. Laptops keep playing when the display sleeps, so they don't need it. */
export const canKeepAwake = (() => {
  try {
    return 'wakeLock' in navigator && matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
})()

type Lock = { release(): Promise<void>; released: boolean; addEventListener(t: 'release', f: () => void): void }

export function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active || !canKeepAwake) return
    let lock: Lock | null = null
    let stopped = false
    const take = async () => {
      if (stopped || document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        lock = (await (navigator as Navigator & { wakeLock: { request(t: 'screen'): Promise<Lock> } }).wakeLock.request('screen')) as Lock
        if (stopped) lock.release().catch(() => {})
      } catch {
        lock = null // refused, e.g. Low Power Mode: the screen just times out as usual
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && take()
    take()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
      lock = null
    }
  }, [active])
}
