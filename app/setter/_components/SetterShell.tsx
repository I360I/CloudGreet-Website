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
import { SquaresFour, ListChecks, SignOut, CircleNotch, FileText, BookOpen, GearSix } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useSessionGuard, clearClientAuthState } from '@/lib/auth/session-guard'
import { ImpersonationBanner } from '@/app/dashboard/_components/ImpersonationBanner'
import { firaSans } from './fonts'

type ActiveLabel = 'Overview' | 'Leads' | 'Scripts' | 'Knowledge' | 'Settings'

type NavItem = {
  label: ActiveLabel
  href: string
  icon: typeof SquaresFour
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { label: 'Overview',  href: '/setter',           icon: SquaresFour, match: (p) => p === '/setter' },
  { label: 'Leads',     href: '/setter/leads',     icon: ListChecks,  match: (p) => p.startsWith('/setter/leads') },
  { label: 'Scripts',   href: '/setter/scripts',   icon: FileText,    match: (p) => p.startsWith('/setter/scripts') },
  { label: 'Knowledge', href: '/setter/knowledge', icon: BookOpen,    match: (p) => p.startsWith('/setter/knowledge') },
  { label: 'Settings',  href: '/setter/settings',  icon: GearSix,     match: (p) => p.startsWith('/setter/settings') },
]

// Sidebar gradient - the ONLY dark-blue surface; the content canvas is
// near-white (#F8FAFC). Tokens from the v5 design spec.
const SIDEBAR_GRADIENT = 'linear-gradient(170deg, #1E3A8A 0%, #0B1B3F 100%)'

/**
 * Pure presentational chrome: white canvas + dark navy sidebar + mobile
 * bottom nav. No hooks with redirects, so the /setter/preview screenshot
 * route can render it without a session. SetterShell wraps this with the
 * real auth/session behavior.
 */
export function SetterChrome({
  activeLabel,
  pathname,
  name,
  onSignOut,
  children,
}: {
  activeLabel: ActiveLabel
  pathname: string
  name: string | null
  onSignOut: () => void
  children: React.ReactNode
}) {
  return (
    <main className={`${firaSans.className} min-h-screen bg-[#F8FAFC] text-slate-800 lg:flex`}>
      {/* Stretches with the content column (flex default), so the dark
          panel always runs the full page height. Inner wrapper is sticky
          so the nav stays in view on long pages. */}
      <aside
        className="hidden lg:block w-52 shrink-0"
        style={{ backgroundImage: SIDEBAR_GRADIENT }}
      >
        <div className="sticky top-0 h-screen flex flex-col py-8 px-3">
        <div className="flex flex-col items-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cloudgreet-logo-white.png" alt="CloudGreet" className="w-24 h-auto object-contain" />
        </div>
        <nav className="flex-1 space-y-2">
          {NAV.map((item) => {
            const active = item.match(pathname) || item.label === activeLabel
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-200/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="pt-4 border-t border-white/10">
          {name && (
            <div className="px-3 pb-2 text-[11px] text-blue-200/60 truncate">{name}</div>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-blue-200/70 hover:bg-white/[0.08] hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <SignOut className="w-5 h-5 shrink-0" /> Sign out
          </button>
        </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around py-2 pb-3"
        style={{ backgroundImage: SIDEBAR_GRADIENT }}
      >
        {NAV.map((item) => {
          const active = item.match(pathname) || item.label === activeLabel
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg ${
                active ? 'text-white' : 'text-blue-200/60'
              }`}
            >
              <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </main>
  )
}

/**
 * Shell for the setter dashboard - a trimmed copy of SalesShell rather
 * than a parameterized fork, since the two chrome sets genuinely diverge
 * (no Stripe Connect payouts banner, no settings link - setters aren't
 * paid via commission, so none of that applies).
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
      <SetterChrome activeLabel={activeLabel} pathname={pathname} name={name} onSignOut={signOut}>
        {children}
      </SetterChrome>
      {pathname.startsWith('/setter/leads') && <Dialer />}
    </>
  )
}

export function SetterLoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <CircleNotch className="w-5 h-5 text-blue-600 animate-spin" />
    </div>
  )
}
