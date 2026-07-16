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
import { SquaresFour, ListChecks, SignOut, CircleNotch, FileText, BookOpen, GearSix, ChatText } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useSessionGuard, clearClientAuthState } from '@/lib/auth/session-guard'
import { ImpersonationBanner } from '@/app/dashboard/_components/ImpersonationBanner'
import { useDialerSessionMaybe } from './DialerSessionProvider'
import { firaSans } from './fonts'

type ActiveLabel = 'Overview' | 'Leads' | 'Messages' | 'Scripts' | 'Knowledge' | 'Settings'

type NavItem = {
  label: ActiveLabel
  href: string
  icon: typeof SquaresFour
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { label: 'Overview',  href: '/setter',           icon: SquaresFour, match: (p) => p === '/setter' },
  { label: 'Leads',     href: '/setter/leads',     icon: ListChecks,  match: (p) => p.startsWith('/setter/leads') },
  { label: 'Messages',  href: '/setter/messages',  icon: ChatText,    match: (p) => p.startsWith('/setter/messages') },
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
  messagesUnread = 0,
  children,
}: {
  activeLabel: ActiveLabel
  pathname: string
  name: string | null
  onSignOut: () => void
  /** Unread inbound SMS count - renders a badge on the Messages nav item. */
  messagesUnread?: number
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
                <span className="flex-1">{item.label}</span>
                {item.label === 'Messages' && messagesUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-semibold px-1">
                    {messagesUnread > 99 ? '99+' : messagesUnread}
                  </span>
                )}
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
              className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg min-w-0 ${
                active ? 'text-white' : 'text-blue-200/60'
              }`}
            >
              <span className="relative">
                <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5" />
                {item.label === 'Messages' && messagesUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </span>
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
  /** Optional - nav highlighting falls back to pathname matching. */
  activeLabel?: ActiveLabel
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || '/setter'
  const [name, setName] = useState<string | null>(null)
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [needsAgreement, setNeedsAgreement] = useState(false)
  const session = useDialerSessionMaybe()
  const sessionRunning = session?.phase === 'running'

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
        // One-time agreement confirm: flashes until they accept.
        if (me?.profile) setNeedsAgreement(me.profile.role === 'setter' && !me.profile.agreement_accepted_at)
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [router])

  // Unread-texts badge: cheap count poll (partial-index-backed). Re-runs
  // on navigation too, so reading a thread on /setter/messages drains
  // the badge as soon as you move elsewhere.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const r = await fetchWithAuth('/api/sales/dialer/sms?unread_count=1')
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.success) setMessagesUnread(j.unread || 0)
      } catch { /* keep the last value */ }
    }
    void poll()
    const t = setInterval(poll, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [pathname])

  const signOut = async () => {
    try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
    clearClientAuthState()
    router.replace('/login')
  }

  return (
    <>
      <ImpersonationBanner />
      <SetterChrome activeLabel={activeLabel} pathname={pathname} name={name} onSignOut={signOut} messagesUnread={messagesUnread}>
        {children}
      </SetterChrome>
      {/* Floating panel spins up its OWN engine - keep it off while a
          cockpit session runs on the shared provider engine, or the two
          fight over window.cgDial and Telnyx sessions. */}
      {pathname.startsWith('/setter/leads') && !sessionRunning && <Dialer />}

      {/* Live session pill: the provider keeps dialing while the setter
          browses other tabs; this is the way back to the cockpit. */}
      {sessionRunning && !pathname.startsWith('/setter/dialer') && session && (
        <Link
          href="/setter/dialer"
          className="fixed bottom-20 lg:bottom-5 right-5 z-[90] inline-flex items-center gap-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold pl-3.5 pr-4 py-2.5 shadow-lg shadow-blue-600/30 transition-colors"
        >
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-white" />
          </span>
          Live session · {Math.min(session.engine.queueIndex + 1, session.engine.queue.length)} of {session.engine.queue.length}
        </Link>
      )}

      {needsAgreement && <SetterAgreementGate onDone={() => setNeedsAgreement(false)} />}
    </>
  )
}

/**
 * One-time agreement confirm. Blocks the app until the setter checks the
 * box + confirms; stamps custom_users.agreement_accepted_at so it never
 * shows again. Only appears for setters whose agreement_accepted_at is null.
 */
const SETTER_AGREEMENT = `You're joining CloudGreet as an independent contractor (1099), not an employee. You set your own hours - there are no required hours and no quotas.

How you're paid (commission only - no hourly, no base):
- $20 for every demo you set that the prospect actually shows up to.
- 40% of that client's first month if your demo turns into a paying client.

A demo only counts if it's real: a genuine decision-maker who actually attends. Fake, duplicate, or padded demos don't pay. If a client refunds their payment, the commission tied to it is reversed.

CloudGreet's leads, scripts, and client info are confidential - use them only for this work, and don't share them or take clients to a competitor. Either side can end this anytime; you keep everything you've already earned.`

function SetterAgreementGate({ onDone }: { onDone: () => void }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const confirm = async () => {
    if (!checked || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth('/api/setter/accept-agreement', { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || 'Could not save. Try again.'); return }
      onDone()
    } catch { setErr('Could not save. Try again.') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-[#E3EAF4]">
          <h2 className="text-lg font-semibold text-[#1E3A8A]">Before you start</h2>
          <p className="text-sm text-gray-500 mt-1">Quick contractor agreement. Read it, check the box, and you&apos;re in.</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {SETTER_AGREEMENT}
        </div>
        <div className="px-6 py-4 border-t border-[#E3EAF4] bg-[#F8FAFC]">
          <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-800">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#2563eb]"
            />
            <span>I have read and agree to these terms.</span>
          </label>
          {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
          <button
            onClick={confirm}
            disabled={!checked || busy}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-50 transition-colors"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : null}
            Agree &amp; continue
          </button>
        </div>
      </div>
    </div>
  )
}

export function SetterLoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <CircleNotch className="w-5 h-5 text-blue-600 animate-spin" />
    </div>
  )
}
