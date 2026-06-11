'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AdminSidebar, AdminSidebarSkeleton, type AdminActiveLabel } from './Sidebar'
import { AdminTopBar } from './TopBar'

const PAGE_EASE = [0.22, 1, 0.36, 1] as const

/* ------------------------------ Theme context ----------------------------- */

export type AdminTheme = 'dark' | 'light'

const THEME_KEY = 'cg-admin-theme'

const ThemeContext = createContext<{ theme: AdminTheme; toggleTheme: () => void }>({
 theme: 'dark',
 toggleTheme: () => {},
})

export function useAdminTheme() {
 return useContext(ThemeContext)
}

function readStoredTheme(): AdminTheme {
 if (typeof window === 'undefined') return 'dark'
 try {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'light' ? 'light' : 'dark'
 } catch {
  return 'dark'
 }
}

/* --------------------------------- Shell --------------------------------- */

export function AdminShell({
 activeLabel,
 children,
}: {
 activeLabel: AdminActiveLabel
 children: React.ReactNode
}) {
 const router = useRouter()
 const [adminEmail, setAdminEmail] = useState<string | null>(null)
 const [theme, setTheme] = useState<AdminTheme>(readStoredTheme)

 const toggleTheme = () => {
  setTheme((t) => {
   const next = t === 'dark' ? 'light' : 'dark'
   try { localStorage.setItem(THEME_KEY, next) } catch {}
   return next
  })
 }

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
   <main
    data-cg-theme={theme}
    className="min-h-screen text-gray-100 flex"
    style={{ backgroundColor: 'var(--cg-bg)' }}
   >
    <div className="cg-aurora" />
    <div className="cg-noise" />
    <AdminSidebarSkeleton />
    <div className="flex-1" />
   </main>
  )
 }

 return (
  <ThemeContext.Provider value={{ theme, toggleTheme }}>
   <main
    data-cg-theme={theme}
    className="min-h-screen text-gray-100 flex"
    style={{ backgroundColor: 'var(--cg-bg)' }}
   >
    {/* Ambient light + grain sit behind everything */}
    <div className="cg-aurora" />
    <div className="cg-noise" />

    <AdminSidebar adminEmail={adminEmail} onSignOut={handleSignOut} activeLabel={activeLabel} />
    <div className="flex-1 min-w-0 pb-20 lg:pb-0 relative z-[1]">
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
  </ThemeContext.Provider>
 )
}
