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
export function TopBar({ phone: phoneProp }: { phone?: string | null } = {}) {
 // `undefined` = not resolved yet (show neutral skeleton)
 // `null`      = resolved, no number provisioned (show amber warning)
 // `string`    = resolved, real number (show "listening on …")
 const [phone, setPhone] = useState<string | null | undefined>(phoneProp)

 // Re-resolve the phone whenever the route changes — that way navigating
 // between dashboard pages reflects any number that landed since first
 // mount, instead of caching the boot-time result forever.
 const pathname = usePathname() || ''

 useEffect(() => {
  if (phoneProp !== undefined) { setPhone(phoneProp); return }
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
     // Auth still warming up — retry up to 3 times.
     if (n < 3) return new Promise((r) => setTimeout(() => attempt(n + 1).then(r), 400))
     setPhone(null); return
    }
    if (!res.ok) {
     setPhone(null); return
    }
    const j = await res.json().catch(() => ({}))
    if (j?.phone) { setPhone(j.phone); return }
    // Got a successful response with no number. If we haven't checked
    // a few times yet, give the DB a beat and try again — this is the
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
  <div className="border-b border-black/5 bg-[#f6f5f1]/80 backdrop-blur-md sticky top-0 z-30">
   <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
    <div className="inline-flex items-center gap-2.5">
     {!resolved ? (
      // Neutral loading state — no warning, no false positive.
      <>
       <span className="w-2 h-2 rounded-full bg-gray-300" />
       <span className="text-xs font-mono text-gray-400 tracking-tight">
        connecting…
       </span>
      </>
     ) : display ? (
      <>
       <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-sky-500 animate-breathe" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
       </span>
       <span className="text-xs font-mono text-gray-600 tracking-tight">
        listening on{' '}
        <span className="text-gray-900">{display}</span>
        <span className="ml-0.5 text-sky-500 animate-blink">_</span>
       </span>
      </>
     ) : (
      <>
       <span className="w-2 h-2 rounded-full bg-amber-400" />
       <span className="text-xs font-mono text-amber-700 tracking-tight">
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
