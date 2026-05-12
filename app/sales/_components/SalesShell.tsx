'use client'

import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Dialer uses @telnyx/webrtc which calls into `window` / `WebSocket` /
// `MediaStream` at module load. Keep it client-only or Next.js SSR
// will crash building these pages.
const Dialer = dynamicImport(
  () => import('./Dialer').then((m) => ({ default: m.Dialer })),
  { ssr: false },
)
import { SquaresFour, ListChecks, Trophy, CurrencyDollar, SignOut, CircleNotch, Gear, Users, GraduationCap, BookOpen, Icon as PhosphorIcon } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useSessionGuard, clearClientAuthState } from '@/lib/auth/session-guard'
import { NotificationsBell } from '@/components/NotificationsBell'

type ActiveLabel = 'Overview' | 'Leads' | 'Closes' | 'Clients' | 'Earnings' | 'Onboarding' | 'Playbook'

type NavItem = {
  label: ActiveLabel
  href: string
  icon: PhosphorIcon
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { label: 'Overview', href: '/sales',          icon: SquaresFour,   match: (p) => p === '/sales' },
  { label: 'Leads',    href: '/sales/leads',    icon: ListChecks,    match: (p) => p.startsWith('/sales/leads') },
  { label: 'Closes',   href: '/sales/closes',   icon: Trophy,        match: (p) => p.startsWith('/sales/closes') },
  { label: 'Clients',  href: '/sales/clients',  icon: Users,         match: (p) => p.startsWith('/sales/clients') },
  { label: 'Earnings', href: '/sales/earnings', icon: CurrencyDollar, match: (p) => p.startsWith('/sales/earnings') },
  { label: 'Playbook',  href: '/sales/playbook',  icon: BookOpen,       match: (p) => p.startsWith('/sales/playbook') },
  // Onboarding tab hidden from the sidebar - the underlying /sales/onboarding
  // route still works (banner CTAs link to it for Stripe Connect / quiz),
  // but reps shouldn't have a top-level entry to a page that's mostly
  // training-video-shaped right now. Re-add when videos ship.
  // { label: 'Onboarding', href: '/sales/onboarding', icon: GraduationCap, match: (p) => p.startsWith('/sales/onboarding') },
]

export function SalesShell({
  activeLabel,
  children,
}: {
  activeLabel: ActiveLabel
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || '/sales'
  const [name, setName] = useState<string | null>(null)
  const [payoutsReady, setPayoutsReady] = useState<boolean | null>(null)

  // Defense against shared-browser session swaps + cross-tab identity
  // contamination - reloads / kicks to login on mismatch.
  useSessionGuard({ expectedRole: 'sales' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [meRes, conRes] = await Promise.all([
          fetchWithAuth('/api/me/profile'),
          fetchWithAuth('/api/sales/connect-onboarding'),
        ])
        if (cancelled) return
        if (meRes.status === 401) { router.replace('/login'); return }
        const me = await meRes.json().catch(() => ({}))
        setName(me?.profile?.name || me?.profile?.first_name || me?.profile?.email || 'Rep')
        const con = await conRes.json().catch(() => ({}))
        setPayoutsReady(con?.ok ? !!con.payouts_enabled : false)
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
    <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
      <aside className="hidden lg:flex w-60 border-r border-black/5 flex-col py-6 px-4 sticky top-0 h-screen bg-white/40 backdrop-blur-sm">
        <div className="px-2 mb-8 flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">CloudGreet</div>
            <div className="text-sm font-medium text-gray-900 mt-0.5">Sales rep</div>
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
          {payoutsReady === false && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const r = await fetch('/api/sales/connect-onboarding', { method: 'POST', credentials: 'include' })
                  const j = await r.json().catch(() => ({}))
                  if (r.ok && j?.success && j.url) window.location.href = j.url
                  else alert(j?.error || 'Could not start Stripe onboarding')
                } catch {
                  alert('Could not start Stripe onboarding')
                }
              }}
              className="block w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-700">Action needed</div>
              <div className="text-xs text-amber-900 mt-0.5">Connect bank to receive payouts</div>
            </button>
          )}
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/sales/settings"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Gear className="w-3.5 h-3.5" /> Settings
            </Link>
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

      {pathname.startsWith('/sales/leads') && <Dialer />}
    </main>
  )
}

export function SalesPageHeader({
  title, eyebrow, action,
}: {
  title: string
  eyebrow?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap mb-8">
      <div>
        {eyebrow && (
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function SalesLoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <CircleNotch className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  )
}
