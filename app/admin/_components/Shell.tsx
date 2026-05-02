'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AdminSidebar, AdminSidebarSkeleton, type AdminActiveLabel } from './Sidebar'
import { AdminTopBar } from './TopBar'

const PAGE_EASE = [0.22, 1, 0.36, 1] as const

export function AdminShell({
 activeLabel,
 children,
}: {
 activeLabel: AdminActiveLabel
 children: React.ReactNode
}) {
 const router = useRouter()
 const [adminEmail, setAdminEmail] = useState<string | null>(null)

 useEffect(() => {
  try {
   const raw = localStorage.getItem('user')
   if (raw) {
    const u = JSON.parse(raw)
    setAdminEmail(u?.email || 'Admin')
   } else {
    setAdminEmail('Admin')
   }
  } catch {
   setAdminEmail('Admin')
  }
 }, [])

 const handleSignOut = async () => {
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user')
  localStorage.removeItem('business')
  localStorage.removeItem('token')
  router.replace('/admin/login')
 }

 if (adminEmail === null) {
  return (
   <main className="min-h-screen bg-[#0a0a0c] text-gray-100 flex">
    <AdminSidebarSkeleton />
    <div className="flex-1" />
   </main>
  )
 }

 return (
  <main className="min-h-screen bg-[#0a0a0c] text-gray-100 flex">
   <AdminSidebar adminEmail={adminEmail} onSignOut={handleSignOut} activeLabel={activeLabel} />
   <div className="flex-1 min-w-0 pb-20 lg:pb-0">
    <AdminTopBar />
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
