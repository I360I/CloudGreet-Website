'use client'

import { useSyncExternalStore, useCallback, useRef, useEffect } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'

/**
 * Dashboard theme store (iOS 26 concept branch).
 *
 * - Default is LIGHT. Dark is opt-in via the sidebar toggle.
 * - Persisted in localStorage (`cg.dash.theme`) so it survives refresh,
 *   sign-out/sign-in, and new tabs on the same browser.
 * - Applied as `data-dash-theme` on <html> so fixed/portaled surfaces
 *   (drawers, modals) theme correctly too. The attribute is only set
 *   while a dashboard page is mounted; dash-ios.css scopes all dark
 *   overrides under it, so the rest of the site is unaffected.
 *
 * Implemented as a module-level external store (useSyncExternalStore)
 * rather than context so the Overview page (which does not use
 * DashShell) can consume the same state with zero wiring.
 */

export type DashTheme = 'light' | 'dark'
const KEY = 'cg.dash.theme'

let current: DashTheme = 'light'
const listeners = new Set<() => void>()

function read(): DashTheme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch { return 'light' }
}

function apply(t: DashTheme) {
  try { document.documentElement.setAttribute('data-dash-theme', t) } catch {}
}

if (typeof window !== 'undefined') {
  current = read()
  apply(current)
}

export function setDashTheme(t: DashTheme) {
  current = t
  try { localStorage.setItem(KEY, t) } catch {}
  apply(t)
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useDashTheme(): [DashTheme, (t: DashTheme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as DashTheme)
  return [theme, setDashTheme]
}

/** Small Light/Dark segmented toggle for the sidebar footer. */
export function ThemeToggle() {
  const [theme, setTheme] = useDashTheme()
  const set = useCallback((t: DashTheme) => () => setTheme(t), [setTheme])
  return (
    <div className="ios-theme-seg" role="group" aria-label="Appearance">
      <button
        type="button"
        className={theme === 'light' ? 'on' : ''}
        onClick={set('light')}
        aria-pressed={theme === 'light'}
      >
        <Sun className="w-3.5 h-3.5" weight={theme === 'light' ? 'fill' : 'regular'} /> Light
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'on' : ''}
        onClick={set('dark')}
        aria-pressed={theme === 'dark'}
      >
        <Moon className="w-3.5 h-3.5" weight={theme === 'dark' ? 'fill' : 'regular'} /> Dark
      </button>
    </div>
  )
}

/* ---------------- Nav direction (iOS push/pop) ----------------
 * Tracks the last visited tab's position in the sidebar so page
 * transitions can slide from the correct side: moving DOWN the nav
 * pushes content up from below; moving UP slides it in from above.
 */
const NAV_ORDER = ['Overview', 'Calls', 'Conversations', 'Bookings', 'Settings', 'Billing', 'Setup']
let lastNavIndex = 0

/** Returns +1 (enter from below) or -1 (enter from above) and records the tab. */
export function navDirection(label: string): 1 | -1 {
  const idx = Math.max(0, NAV_ORDER.indexOf(label))
  const dir: 1 | -1 = idx >= lastNavIndex ? 1 : -1
  lastNavIndex = idx
  return dir
}

/* ---------------- Page swipe transition (exit + enter) ----------------
 * The App Router unmounts a page the moment navigation commits, so a
 * true "old page slides out, new page slides in" needs the exit to play
 * BEFORE the route push. Sidebar links call startPageTransition():
 *   1. every mounted page surface animates out (up or down by nav dir)
 *   2. after the exit beat we router.push()
 *   3. the incoming page mounts, sees it arrived mid-transition, and
 *      plays the enter from the opposite side, then clears the flag.
 */
type SwipeState = { dir: 1 | -1; exiting: boolean }
let swipe: SwipeState = { dir: 1, exiting: false }
const SWIPE_SERVER: SwipeState = { dir: 1, exiting: false }
const swipeListeners = new Set<() => void>()
function setSwipe(next: SwipeState) { swipe = next; swipeListeners.forEach((l) => l()) }
function subSwipe(cb: () => void) { swipeListeners.add(cb); return () => { swipeListeners.delete(cb) } }

const EXIT_MS = 200
let swipeBusy = false

export function startPageTransition(push: (href: string) => void, href: string, label: string) {
  if (swipeBusy) return
  swipeBusy = true
  const dir = navDirection(label)
  setSwipe({ dir, exiting: true })
  window.setTimeout(() => {
    push(href)
    // Failsafe: if the new page never mounts (e.g. push to same route),
    // clear the exit state so the UI can't get stuck faded out.
    window.setTimeout(() => { swipeBusy = false; if (swipe.exiting) setSwipe({ dir, exiting: false }) }, 900)
  }, EXIT_MS)
}

/** Motion props for a page surface: exit up/down, enter from the other side. */
export function usePageSwipe(): {
  initial: { opacity: number; y: number }
  animate: { opacity: number; y: number }
  transition: { duration: number; ease: readonly [number, number, number, number] }
} {
  const st = useSyncExternalStore(subSwipe, () => swipe, () => SWIPE_SERVER)
  // If this instance mounted while an exit was in flight, it IS the
  // incoming page: ignore the exiting flag and clear it once mounted.
  const arrivedMidTransition = useRef(swipe.exiting)
  useEffect(() => {
    if (arrivedMidTransition.current) {
      swipeBusy = false
      setSwipe({ dir: swipe.dir, exiting: false })
      arrivedMidTransition.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const exiting = st.exiting && !arrivedMidTransition.current
  return {
    initial: { opacity: 0, y: 34 * st.dir },
    animate: exiting ? { opacity: 0, y: -34 * st.dir } : { opacity: 1, y: 0 },
    transition: { duration: exiting ? 0.2 : 0.5, ease: [0.32, 0.72, 0, 1] as const },
  }
}
