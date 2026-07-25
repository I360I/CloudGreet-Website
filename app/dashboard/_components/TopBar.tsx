'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

/**
 * Dashboard top bar shows "listening on <number>" with the actual Retell
 * number provisioned for the signed-in business. If no phone prop is
 * passed, the bar fetches it itself so it works on every dashboard page.
 * When no number is provisioned yet, the bar says so plainly instead of
 * leaking a hardcoded demo number.
 */
// Module cache: the number almost never changes, so remounts (every tab
// switch) render the capsule instantly instead of flashing "connecting…".
let phoneCache: string | null | undefined = undefined

export function TopBar({ phone: phoneProp }: { phone?: string | null } = {}) {
 // `undefined` = not resolved yet (show neutral skeleton)
 // `null`      = resolved, no number provisioned (show amber warning)
 // `string`    = resolved, real number (show "listening on …")
 const [phone, setPhone] = useState<string | null | undefined>(phoneProp ?? phoneCache)

 // Re-resolve the phone whenever the route changes - that way navigating
 // between dashboard pages reflects any number that landed since first
 // mount, instead of caching the boot-time result forever.
 const pathname = usePathname() || ''

 useEffect(() => {
  if (phoneProp !== undefined) { if (typeof phoneProp === 'string') phoneCache = phoneProp; setPhone(phoneProp ?? phoneCache); return }
  let cancelled = false

  // Retry on null: the first fetch right after sign-in races with the
  // token cookie / JWT setup; sometimes /api/dashboard/phone responds
  // with `null` (no row visible yet) before the auth context settles.
  // We retry a few times before locking in the empty state, so the
  // amber "no number provisioned" warning doesn't get stuck on
  // someone who's actually wired up.
  const attempt = async (n: number): Promise<void> => {
   try {
    const res = await fetchWithAuth('/api/dashboard/phone')
    if (cancelled) return
    if (res.status === 401) {
     // Auth still warming up - retry up to 3 times.
     if (n < 3) return new Promise((r) => setTimeout(() => attempt(n + 1).then(r), 400))
     setPhone(null); return
    }
    if (!res.ok) {
     setPhone(null); return
    }
    const j = await res.json().catch(() => ({}))
    if (j?.phone) { phoneCache = j.phone; setPhone(j.phone); return }
    // Got a successful response with no number. If we haven't checked
    // a few times yet, give the DB a beat and try again - this is the
    // window where admin just saved the number elsewhere.
    if (n < 2) return new Promise((r) => setTimeout(() => attempt(n + 1).then(r), 600))
    setPhone(null)
   } catch {
    if (n < 2) return new Promise((r) => setTimeout(() => attempt(n + 1).then(r), 600))
    if (!cancelled) setPhone(null)
   }
  }

  attempt(0)
  return () => { cancelled = true }
 }, [phoneProp, pathname])

 const display = typeof phone === 'string' && phone ? formatPhone(phone) : null
 const resolved = phone !== undefined

 return (
  <div className="ios-topbar sticky top-0 z-30">
   <div className="px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 flex-wrap">
    <div className="ios-live">
     {!resolved ? (
      // Neutral loading state - no warning, no false positive.
      <>
       <span className="w-2 h-2 rounded-full bg-gray-300" />
       <span className="text-xs font-mono tracking-tight" style={{ color: 'var(--dmut)' }}>
        connecting…
       </span>
      </>
     ) : display ? (
      <>
       <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full animate-breathe" style={{ background: 'var(--dgreen)' }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--dgreen)' }} />
       </span>
       <span className="text-xs tracking-tight" style={{ color: 'var(--dmut)' }}>
        AI listening on{' '}
        <span className="font-mono font-medium" style={{ color: 'var(--dink)' }}>{display}</span>
       </span>
      </>
     ) : (
      <>
       <span className="w-2 h-2 rounded-full" style={{ background: 'var(--dorange)' }} />
       <span className="text-xs font-mono tracking-tight" style={{ color: 'var(--dorange-deep)' }}>
        no Retell number provisioned · finish onboarding to go live
       </span>
      </>
     )}
    </div>
   </div>
  </div>
 )
}

function formatPhone(raw: string): string {
 const digits = raw.replace(/[^0-9]/g, '')
 if (digits.length === 11 && digits.startsWith('1')) {
  return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
 }
 if (digits.length === 10) {
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
 }
 return raw
}
