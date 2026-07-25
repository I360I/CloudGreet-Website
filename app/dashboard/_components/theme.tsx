'use client'

import { useSyncExternalStore, useCallback } from 'react'
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
