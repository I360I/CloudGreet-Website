'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Wand2, ArrowRight } from 'lucide-react'
import { Sidebar, SidebarSkeleton } from './Sidebar'
import { TopBar } from './TopBar'
import { ImpersonationBanner } from './ImpersonationBanner'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { OnboardingProvider } from './onboarding-context'

const PAGE_EASE = [0.22, 1, 0.36, 1] as const

export function DashShell({
 activeLabel,
 children,
}: {
 activeLabel: 'Overview' | 'Calls' | 'Appointments' | 'Settings' | 'Billing' | 'Setup'
 children: React.ReactNode
}) {
 const router = useRouter()
 const pathname = usePathname() || ''
 const [businessName, setBusinessName] = useState<string | null>(null)
 const [redirecting, setRedirecting] = useState(false)

 const [needsSetup, setNeedsSetup] = useState(false)

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
     setBusinessName(json.business.business_name || 'Account')
     setNeedsSetup(!json.business.onboarding_completed)
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
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user'); localStorage.removeItem('business'); localStorage.removeItem('token')
  router.replace('/login')
 }

 if (businessName === null || redirecting) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
    <SidebarSkeleton />
    <div className="flex-1" />
   </main>
  )
 }

 return (
  <OnboardingProvider value={{ needsSetup }}>
   <ImpersonationBanner />
   <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
    <Sidebar businessName={businessName} onSignOut={handleSignOut} activeLabel={activeLabel} />
    <div className="flex-1 min-w-0 pb-20 lg:pb-0">
     <TopBar />
     {needsSetup && activeLabel !== 'Setup' && <SetupBanner />}
     <motion.div
      key={activeLabel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: PAGE_EASE }}
     >
      {children}
     </motion.div>
    </div>
   </main>
  </OnboardingProvider>
 )
}

function SetupBanner() {
 return (
  <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5">
   <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
    <Wand2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
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
