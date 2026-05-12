"use client"

import React, { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeSlash, ArrowUpRight, X } from '@phosphor-icons/react'
import { setAuthToken } from '@/lib/auth/token-manager'

function LoginInner() {
 const search = useSearchParams()
 const justPaid = search?.get('paid') === '1'
 const [showPaidModal, setShowPaidModal] = useState(justPaid)
 useEffect(() => {
  if (!showPaidModal) return
  const t = setTimeout(() => setShowPaidModal(false), 5000)
  return () => clearTimeout(t)
 }, [showPaidModal])
 useEffect(() => {
  if (!showPaidModal) return
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPaidModal(false) }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [showPaidModal])

 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [showPassword, setShowPassword] = useState(false)
 const [isLoading, setIsLoading] = useState(false)
 const [error, setError] = useState('')

 const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError('')
  try {
   const res = await fetch('/api/auth/login-simple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
   })
   const result = await res.json().catch(() => ({}))
   if (!res.ok || !result.success) {
    setError(result.message || `Login failed (${res.status})`)
    return
   }
   // Scrub any prior-user blobs BEFORE writing the new ones. Otherwise
   // stale cg.session.* / business / user keys from a previous login on
   // the same browser persist and can show up in components that read
   // them before the API responds. (This is the shared-workstation
   // "wrong account showed up" defense.)
   const { clearClientAuthState } = await import('@/lib/auth/session-guard')
   clearClientAuthState()
   await setAuthToken(result.data.token)
   localStorage.setItem('token', result.data.token)
   localStorage.setItem('user', JSON.stringify(result.data.user))
   if (result.data.business) {
    localStorage.setItem('business', JSON.stringify(result.data.business))
   }
   if (result.data.user?.id) {
    localStorage.setItem('cg.session.uid', String(result.data.user.id))
   }
   // Route by role: sales reps land on /sales, admins on /admin,
   // owners on /dashboard. login-simple already resolves the role.
   const role = result.data.user?.role
   const dest = role === 'sales' ? '/sales' : role === 'admin' ? '/admin' : '/dashboard'
   window.location.href = dest
  } catch {
   setError('Login failed. Please try again.')
  } finally {
   setIsLoading(false)
  }
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   {/* Payment-success modal */}
   {showPaidModal && (
    <div
     className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/55 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
     onClick={() => setShowPaidModal(false)}
    >
     <div
      className="relative bg-white border border-gray-200 px-8 py-7 w-full max-w-md shadow-2xl shadow-black/25 animate-[popIn_0.28s_cubic-bezier(0.22,1,0.36,1)]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
     >
      <button
       onClick={() => setShowPaidModal(false)}
       className="absolute top-3.5 right-3.5 w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
       aria-label="Close"
      >
       <X className="w-4 h-4" />
      </button>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">
       Confirmed
      </div>
      <h2 className="text-xl font-medium tracking-tight text-gray-900 mb-1.5">
       Payment received.
      </h2>
      <p className="text-sm text-gray-600 leading-relaxed">
       Thanks for signing up. Sign in below to access your dashboard.
      </p>
     </div>
     <style jsx global>{`
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes popIn  {
       from { opacity: 0; transform: translateY(6px) scale(0.98) }
       to   { opacity: 1; transform: translateY(0)   scale(1)    }
      }
     `}</style>
    </div>
   )}

   {/* Nav */}
   <nav className="border-b border-black/5">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <Link href="/" className="flex items-center" aria-label="CloudGreet">
      <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
     </Link>
     <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
      ← Back home
     </Link>
    </div>
   </nav>

   {/* Login card */}
   <section className="px-6 pt-16 md:pt-24 pb-32">
    <div className="max-w-md mx-auto relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />

     <div className="relative bg-white border border-gray-200 rounded-[28px] p-8 md:p-10">
      <h1 className="font-display font-medium tracking-tight leading-[1.05] text-3xl md:text-4xl mb-2 text-gray-900">
       Welcome <span className="text-gray-400">back.</span>
      </h1>
      <p className="text-sm text-gray-500 mb-8">Sign in to your CloudGreet dashboard.</p>

      <form onSubmit={onSubmit} className="space-y-5">
       <div>
        <label htmlFor="email" className="text-sm text-gray-700 mb-2 block">
         Email
        </label>
        <input
         id="email"
         type="email"
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         required
         autoComplete="email"
         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
        />
       </div>

       <div>
        <div className="flex items-baseline justify-between mb-2">
         <label htmlFor="password" className="text-sm text-gray-700">
          Password
         </label>
         <Link
          href="/forgot-password"
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
         >
          Forgot password?
         </Link>
        </div>
        <div className="relative">
         <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
         />
         <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
         >
          {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
        </div>
       </div>

       {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-sm">
         {error}
        </div>
       )}

       <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
       >
        {isLoading ? 'Signing in…' : (
         <>
          Sign in
          <ArrowUpRight className="w-4 h-4" />
         </>
        )}
       </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
       Don&apos;t have an account?{' '}
       <Link href="/contact" className="text-gray-900 font-medium hover:underline">
        Book a demo
       </Link>
      </p>
     </div>
    </div>
   </section>
  </main>
 )
}

export default function LoginPage() {
 return (
  <Suspense fallback={null}>
   <LoginInner />
  </Suspense>
 )
}
