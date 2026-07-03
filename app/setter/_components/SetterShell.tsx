'use client'

import Link from 'next/link'
import dynamicImport from 'next/dynamic'
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
import { NotificationsBell } from '@/components/NotificationsBell'
import { ImpersonationBanner } from '@/app/dashboard/_components/ImpersonationBanner'

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
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
      <aside className="hidden lg:flex w-60 border-r border-black/5 flex-col py-6 px-4 sticky top-0 h-screen bg-white/40 backdrop-blur-sm">
        <div className="px-2 mb-8 flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">CloudGreet</div>
            <div className="text-sm font-medium text-gray-900 mt-0.5">Setter</div>
          </div>
          <NotificationsBell basePath="/api/sales/notifications" align="left" />
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.match(pathname) || item.label === activeLabel
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-200/60 hover:text-gray-900'
                }`}
              >
                <Icon weight={active ? 'fill' : 'regular'} className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-black/5 pt-4 px-2 space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Signed in as</div>
            <div className="text-sm text-gray-700 truncate mt-0.5">{name || '...'}</div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <SignOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/5 flex justify-around py-2 pb-3">
        {NAV.map((item) => {
          const active = item.match(pathname) || item.label === activeLabel
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg ${
                active ? 'text-gray-900' : 'text-gray-400'
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
      <CircleNotch className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  )
}
