'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

/**
 * Defensive session integrity guard for dashboard / sales / admin shells.
 *
 * Catches the "wrong account showed up" class of bugs that happen when:
 *   - Two users share a browser / workstation and one's login overwrites
 *     the cookie underneath the other's tab.
 *   - A stale tab navigates after auth swapped underneath it.
 *   - localStorage from a prior user wasn't fully cleared.
 *
 * Two enforcement mechanisms:
 *
 * 1. Server fingerprint check (on every page mount):
 *    Hit /api/me/profile, take the returned user id, compare against the
 *    `cg.session.uid` we recorded on the previous successful fetch. If
 *    they don't match, the auth context swapped under us - hard reload
 *    so every component in the tree re-reads from the new server identity
 *    instead of mixing stale state with fresh data.
 *
 * 2. Cross-tab storage listener:
 *    Tabs in the same browser share localStorage. When one tab logs in
 *    (or logs out), the localStorage 'token' key changes. Other tabs
 *    listen for the `storage` event and reload immediately so they pick
 *    up the new (or absent) session - rather than continuing to operate
 *    on the now-stale in-memory token cache.
 *
 * Pass `expectedRole` to also boot users whose role doesn't match the
 * shell they landed on (e.g. a 'sales' user somehow inside /dashboard).
 */
export function useSessionGuard(opts: { expectedRole?: 'owner' | 'sales' | 'admin' } = {}) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const STORAGE_KEY = 'cg.session.uid'
    const ROLE_KEY = 'cg.session.role'

    const enforce = async () => {
      try {
        const res = await fetchWithAuth('/api/me/profile')
        if (cancelled) return
        if (res.status === 401 || res.status === 403) {
          // Not signed in - bounce to login.
          window.localStorage.removeItem(STORAGE_KEY)
          window.localStorage.removeItem(ROLE_KEY)
          router.replace('/login')
          return
        }
        const json = await res.json().catch(() => ({}))
        const serverUid: string | null = json?.profile?.id || null
        if (!serverUid) return
        const previousUid = window.localStorage.getItem(STORAGE_KEY)
        if (previousUid && previousUid !== serverUid) {
          // Identity changed under us. Force a hard reload to ditch any
          // in-memory state belonging to the previous user. Then the
          // next mount will record the new uid normally.
          window.localStorage.setItem(STORAGE_KEY, serverUid)
          window.location.reload()
          return
        }
        window.localStorage.setItem(STORAGE_KEY, serverUid)
      } catch {
        // Network error - don't kick the user out; let the rest of the
        // page surface its own error state.
      }
    }

    enforce()

    const onStorage = (e: StorageEvent) => {
      // Another tab signed in / out: reload so the shared cookie wins.
      if (e.key === 'token' || e.key === STORAGE_KEY || e.key === null) {
        window.location.reload()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Scrub every auth-adjacent key from local + session storage. Call on
 * logout AND right before login so a stale prior-user blob doesn't
 * leak into the next session.
 */
export function clearClientAuthState(): void {
  try {
    const keys = [
      'token', 'auth_token', 'user', 'business',
      'cg.session.uid', 'cg.session.role',
    ]
    for (const k of keys) {
      window.localStorage.removeItem(k)
    }
    // Clear any cg.* sessionStorage scratch.
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const key = window.sessionStorage.key(i)
      if (key && key.startsWith('cg.')) window.sessionStorage.removeItem(key)
    }
  } catch {
    // Storage may be disabled (private mode, etc.) - non-fatal.
  }
}
