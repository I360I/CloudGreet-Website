'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Wand2, ArrowRight } from 'lucide-react'
import { Sidebar, SidebarSkeleton } from './Sidebar'
import { TopBar } from './TopBar'
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

 useEffect(() => {
  try {
   const raw = localStorage.getItem('business')
   if (raw) {
    const b = JSON.parse(raw)
    setBusinessName(b.business_name || b.name || 'Account')
   } else {
    setBusinessName('Account')
   }
  } catch {
   setBusinessName('Account')
  }
 }, [])

 const [needsSetup, setNeedsSetup] = useState(false)

 // Probe onboarding state. We do NOT force-redirect — contractors can look
 // around in demo mode while incomplete. We just surface a banner via
 // needsSetup. 401/403 still mean "stale token, send to /login."
 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/onboarding/state')
    if (res.status === 401 || res.status === 403) {
     try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
     localStorage.removeItem('user'); localStorage.removeItem('business'); localStorage.removeItem('token')
     if (!cancelled) router.replace('/login')
     return
    }
    if (!res.ok) return
    const json = await res.json()
    if (!json?.success || !json.business || cancelled) return
    setNeedsSetup(!json.business.onboarding_completed)
   } catch { /* non-fatal */ }
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
