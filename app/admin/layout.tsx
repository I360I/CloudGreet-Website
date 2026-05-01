'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MdOutlineAutorenew } from "react-icons/md"
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

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
    // Read user from localStorage (set on login). Cheap client check.
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
   <div className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
    <MdOutlineAutorenew className="w-5 h-5 text-gray-400 animate-spin" />
   </div>
  )
 }

 if (!authed) return null

 const handleSignOut = async () => {
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user')
  localStorage.removeItem('business')
  router.replace('/admin/login')
 }

 return (
  <div className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <nav className="sticky top-0 z-50 bg-[#f6f5f1]/80 backdrop-blur-md border-b border-black/5">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <Link href="/admin" className="flex items-center" aria-label="CloudGreet Admin">
      <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
      <span className="ml-3 text-xs font-medium text-gray-400 uppercase tracking-widest">Admin</span>
     </Link>
     <div className="flex items-center gap-6 text-sm">
      <Link href="/admin" className={`hover:text-gray-900 transition-colors ${pathname === '/admin' ? 'text-gray-900' : 'text-gray-600'}`}>Clients</Link>
      <button onClick={handleSignOut} className="text-gray-600 hover:text-gray-900 transition-colors">Sign out</button>
     </div>
    </div>
   </nav>
   {children}
  </div>
 )
}
