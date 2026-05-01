'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar, SidebarSkeleton } from './Sidebar'

const DEMO_NUMBER = '+1 (737) 937-0084'

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
    <div className="border-b border-black/5 bg-[#f6f5f1]/80 backdrop-blur-md sticky top-0 z-30">
     <div className="px-8 py-3 flex items-center justify-between">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100">
       <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
       </span>
       <span className="text-xs font-medium text-sky-700">AI agent online</span>
      </div>
      <div className="text-xs text-gray-500">Demo line: <span className="font-mono text-gray-700">{DEMO_NUMBER}</span></div>
     </div>
    </div>
    {children}
   </div>
  </main>
 )
}
