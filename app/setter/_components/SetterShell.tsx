'use client'

import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { Poppins } from 'next/font/google'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Dialer uses @telnyx/webrtc which calls into `window` / `WebSocket` /
// `MediaStream` at module load. Keep it client-only or Next.js SSR
// will crash building these pages. Reused verbatim from the sales side -
// it has no role logic baked in, it just calls the (now role-widened)
// /api/sales/dialer/* endpoints.
const Dialer = dynamicImport(
  () => import('@/app/sales/_components/Dialer').then((m) => ({ default: m.Dialer })),
  { ssr: false },
)
import { SquaresFour, ListChecks, SignOut, CircleNotch } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useSessionGuard, clearClientAuthState } from '@/lib/auth/session-guard'
import { ImpersonationBanner } from '@/app/dashboard/_components/ImpersonationBanner'

// Reference template (Figma "Sales Dashboard" community file) uses
// Poppins throughout - matching it here rather than the site's default
// Geist, since typeface is a big part of that design's identity.
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

type ActiveLabel = 'Overview' | 'Leads'

type NavItem = {
  label: ActiveLabel
  href: string
  icon: typeof SquaresFour
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { label: 'Overview', href: '/setter',       icon: SquaresFour, match: (p) => p === '/setter' },
  { label: 'Leads',    href: '/setter/leads', icon: ListChecks,  match: (p) => p.startsWith('/setter/leads') },
]

/**
 * Shell for the setter dashboard - a trimmed copy of SalesShell rather than
 * a parameterized fork, since the two chrome sets genuinely diverge (no
 * Stripe Connect payouts banner, no settings link - setters aren't paid
 * via commission, so none of that applies).
 *
 * Sidebar styling adapted from a Figma "Sales Dashboard" community
 * template (dark gradient panel, pill active-state) - recolored to
 * CloudGreet blue (source used purple/violet).
 */
export function SetterShell({
  activeLabel,
  children,
}: {
  activeLabel: ActiveLabel
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || '/setter'
  const [name, setName] = useState<string | null>(null)

  // Defense against shared-browser session swaps + cross-tab identity
  // contamination - reloads / kicks to login on mismatch.
  useSessionGuard({ expectedRole: 'setter' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetchWithAuth('/api/me/profile')
        if (cancelled) return
        if (meRes.status === 401) { router.replace('/login'); return }
        const me = await meRes.json().catch(() => ({}))
        setName(me?.profile?.name || me?.profile?.first_name || me?.profile?.email || 'Setter')
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [router])

  const signOut = async () => {
    try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
    clearClientAuthState()
    router.replace('/login')
  }

  return (
    <>
    <ImpersonationBanner />
    {/* Full-viewport gradient backdrop, matching the reference's outer
        canvas (blurred purple-to-charcoal blobs, recolored to blue) -
        the dashboard itself is a big floating rounded card on top of it,
        exactly like the source template, not full-bleed content. */}
    <main className={`${poppins.className} min-h-screen bg-gradient-to-br from-[#1d4ed8] via-[#15317a] to-[#0a1330] text-gray-900 p-3 sm:p-6 lg:p-10`}>
      <div className="max-w-[1500px] mx-auto rounded-[32px] sm:rounded-[48px] bg-white/[0.06] backdrop-blur-2xl border border-white/20 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] overflow-hidden flex min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-5rem)]">
        <aside
          className="hidden lg:flex w-40 flex-col py-8 px-3 shrink-0"
          style={{ backgroundImage: 'linear-gradient(168deg, #1d4ed8 2%, rgba(10,19,48,0.75) 110%)' }}
        >
          <div className="flex flex-col items-center gap-2 mb-10">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <span className="text-blue-700 text-lg font-bold leading-none">C</span>
            </div>
            <div className="text-[10px] font-bold tracking-wide text-center">
              <span className="text-white">CloudGreet</span>
            </div>
          </div>
          <nav className="flex-1 space-y-3">
            {NAV.map((item) => {
              const active = item.match(pathname) || item.label === activeLabel
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${
                    active
                      ? 'bg-[#3b5fd6] text-white font-bold shadow-sm'
                      : 'text-blue-200/70 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="pt-4 space-y-3 border-t border-white/10 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-semibold uppercase shrink-0">
              {(name || '?').slice(0, 1)}
            </div>
            <button
              onClick={signOut}
              className="flex flex-col items-center gap-1 text-[10px] text-blue-200/70 hover:text-white transition-colors"
            >
              <SignOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 pb-24 lg:pb-0 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around py-2 pb-3"
        style={{ backgroundImage: 'linear-gradient(90deg, #0a1330, #1d4ed8)' }}
      >
        {NAV.map((item) => {
          const active = item.match(pathname) || item.label === activeLabel
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg ${
                active ? 'text-white' : 'text-blue-200/60'
              }`}
            >
              <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {pathname.startsWith('/setter/leads') && <Dialer />}
    </main>
    </>
  )
}

export function SetterLoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <CircleNotch className="w-5 h-5 text-white/70 animate-spin" />
    </div>
  )
}
