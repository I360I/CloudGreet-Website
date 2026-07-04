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
    <main className={`${poppins.className} min-h-screen bg-gradient-to-br from-[#0b2f7a] via-[#123a8f] to-[#0a1a3d] text-gray-900 flex`}>
      <aside
        className="hidden lg:flex w-60 flex-col py-6 px-4 sticky top-0 h-screen shrink-0"
        style={{ backgroundImage: 'linear-gradient(168deg, #1d4ed8 2%, rgba(10,26,61,0.75) 110%)' }}
      >
        <div className="px-2 mb-8 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
            <span className="text-blue-700 text-sm font-bold leading-none">C</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">CloudGreet</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-200/70">Setter</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5">
          {NAV.map((item) => {
            const active = item.match(pathname) || item.label === activeLabel
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-blue-500/90 text-white font-semibold shadow-sm'
                    : 'text-blue-200/80 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon weight={active ? 'fill' : 'regular'} className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="pt-4 px-1 space-y-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-semibold uppercase shrink-0">
              {(name || '?').slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-blue-200/60">Signed in as</div>
              <div className="text-sm text-white truncate">{name || '...'}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-blue-200/70 hover:text-white transition-colors"
          >
            <SignOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around py-2 pb-3"
        style={{ backgroundImage: 'linear-gradient(90deg, #0a1a3d, #1d4ed8)' }}
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

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        {children}
      </div>

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
