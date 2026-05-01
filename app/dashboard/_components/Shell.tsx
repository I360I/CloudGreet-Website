'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sidebar, SidebarSkeleton } from './Sidebar'
import { TopBar } from './TopBar'

const PAGE_EASE = [0.22, 1, 0.36, 1] as const

export function DashShell({
 activeLabel,
 children,
}: {
 activeLabel: 'Overview' | 'Calls' | 'Appointments' | 'Settings' | 'Billing'
 children: React.ReactNode
}) {
 const router = useRouter()
 const [businessName, setBusinessName] = useState<string | null>(null)

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

 const handleSignOut = async () => {
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user'); localStorage.removeItem('business'); localStorage.removeItem('token')
  router.replace('/login')
 }

 if (businessName === null) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
    <SidebarSkeleton />
    <div className="flex-1" />
   </main>
  )
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
   <Sidebar businessName={businessName} onSignOut={handleSignOut} activeLabel={activeLabel} />
   <div className="flex-1 min-w-0">
    <TopBar />
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
 )
}
