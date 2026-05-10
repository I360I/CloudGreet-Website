'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CircleNotch } from '@phosphor-icons/react'

/**
 * Admin auth gate. Pages handle their own chrome via <AdminShell>; this
 * layout only enforces the admin role and routes unauth'd users to login.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname()
 const router = useRouter()
 const [checking, setChecking] = useState(true)
 const [authed, setAuthed] = useState(false)

 const isLoginPage = pathname === '/admin/login'

 useEffect(() => {
  if (isLoginPage) {
   setChecking(false)
   return
  }
  ;(async () => {
   try {
    const raw = localStorage.getItem('user')
    if (!raw) {
     router.replace('/admin/login')
     return
    }
    const u = JSON.parse(raw)
    if (!(u?.is_admin || u?.role === 'admin')) {
     router.replace('/admin/login')
     return
    }
    setAuthed(true)
   } catch {
    router.replace('/admin/login')
   } finally {
    setChecking(false)
   }
  })()
 }, [isLoginPage, router])

 if (isLoginPage) return <>{children}</>

 if (checking) {
  return (
   <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
    <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
   </div>
  )
 }

 if (!authed) return null

 return <>{children}</>
}
