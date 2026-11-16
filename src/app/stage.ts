import { useSyncExternalStore } from 'react'

/** Whether the full-screen "now playing" view is open. Desktop only: phones and tablets already put the song first. */
let open = false
const subs = new Set<() => void>()
const set = (v: boolean) => {
  if (v === open) return
  open = v
  subs.forEach((f) => f())
}

export const canStage = () => window.matchMedia('(min-width: 1180px) and (pointer: fine)').matches
export const stage = {
  open: () => canStage() && set(true),
  close: () => set(false),
  toggle: () => (open ? set(false) : stage.open()),
}
export const useStage = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => open,
  )
