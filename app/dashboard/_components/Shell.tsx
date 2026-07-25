'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MagicWand, ArrowRight } from '@phosphor-icons/react'
import { Sidebar, SidebarSkeleton } from './Sidebar'
import { TopBar } from './TopBar'
import { ImpersonationBanner } from './ImpersonationBanner'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useSessionGuard, clearClientAuthState } from '@/lib/auth/session-guard'
import { OnboardingProvider } from './onboarding-context'
import { navDirection } from './theme'

const APPLE_EASE = [0.32, 0.72, 0, 1] as const

// Module-level cache so tab-to-tab navigation renders the shell instantly
// (no skeleton flash) and the iOS page-swipe animation is actually visible
// on the content. Refreshed in the background on every mount.
let shellCache: { businessName: string; needsSetup: boolean } | null = null

export function DashShell({
 activeLabel,
 children,
}: {
 activeLabel: 'Overview' | 'Calls' | 'Conversations' | 'Bookings' | 'Settings' | 'Billing' | 'Setup'
 children: React.ReactNode
}) {
 const router = useRouter()
 const pathname = usePathname() || ''
 const [businessName, setBusinessName] = useState<string | null>(shellCache?.businessName ?? null)
 const [redirecting, setRedirecting] = useState(false)

 const [needsSetup, setNeedsSetup] = useState(shellCache?.needsSetup ?? false)

 // Detect cross-tab session swaps and identity mismatches. If another
 // user logged in via a sibling tab (shared workstation) or the JWT
 // identity no longer matches what the server returns, this hook
 // reloads / signs out before we render anything else.
 useSessionGuard({ expectedRole: 'owner' })

 // Source the business name from the API (which is JWT-scoped) rather
 // than localStorage. Reading from localStorage was a cross-tenant leak
 // vector: if a previous user had logged in on the same browser and
 // their entry wasn't fully cleared, the next signed-in user would see
 // the previous tenant's business name in the sidebar. Plus we also
 // need needsSetup, so a single fetch covers both.
 //
 // We do NOT force-redirect on 401/403 because doing so creates a
 // sign-in → API 401 → /login → sign-in loop whenever the API trips
 // on something other than missing-cookie. The middleware already
 // handles real unauthenticated access.
 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/onboarding/state')
    if (!res.ok) {
     if (!cancelled) setBusinessName('Account')
     return
    }
    const json = await res.json()
    if (cancelled) return
    if (json?.success && json.business) {
     const name = json.business.business_name || 'Account'
     const setup = !json.business.onboarding_completed
     shellCache = { businessName: name, needsSetup: setup }
     setBusinessName(name)
     setNeedsSetup(setup)
    } else {
     setBusinessName('Account')
    }
   } catch {
    if (!cancelled) setBusinessName('Account')
   }
  })()
  return () => { cancelled = true }
 }, [pathname, router])

 const handleSignOut = async () => {
  shellCache = null // never leak one tenant's name into the next session
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  clearClientAuthState()
  router.replace('/login')
 }

 if (businessName === null || redirecting) {
  return (
   <main className="dash-ios h-dvh flex overflow-hidden">
    <SidebarSkeleton />
    <div className="flex-1" />
   </main>
  )
 }

 return (
  <OnboardingProvider value={{ needsSetup }}>
   {/* Viewport-locked app frame: the banner and sidebar always fit on
       screen (Sign out never hides below the fold) and ONLY the content
       column scrolls - iPadOS style. */}
   <div className="dash-ios h-dvh flex flex-col">
    <ImpersonationBanner />
    <main className="flex-1 min-h-0 flex">
     <Sidebar businessName={businessName} onSignOut={handleSignOut} activeLabel={activeLabel} />
     <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      <TopBar />
      {needsSetup && activeLabel !== 'Setup' && <SetupBanner />}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0">
       {/* iOS page-swipe: the content slides on every tab change. The
           shell stays put (cached), so only the page moves. */}
       <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 30 * navDirection(activeLabel) }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: APPLE_EASE }}
       >
        {children}
       </motion.div>
      </div>
     </div>
    </main>
   </div>
  </OnboardingProvider>
 )
}

function SetupBanner() {
 return (
  <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5">
   <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
    <MagicWand className="w-4 h-4 text-amber-700 flex-shrink-0" />
    <span className="text-sm text-amber-900">
     <span className="font-medium">Demo data shown.</span> Finish setup to start taking real calls and bookings.
    </span>
    <Link
     href="/dashboard/onboarding"
     className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:text-amber-700 transition-colors"
    >
     Finish setup <ArrowRight className="w-3.5 h-3.5" />
    </Link>
   </div>
  </div>
 )
}
