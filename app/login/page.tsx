"use client"

import React, { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowUpRight, CheckCircle2, X } from "lucide-react"
import { setAuthToken } from '@/lib/auth/token-manager'

function LoginInner() {
 const search = useSearchParams()
 const justPaid = search?.get('paid') === '1'
 const [showPaidBanner, setShowPaidBanner] = useState(justPaid)
 useEffect(() => {
  if (!showPaidBanner) return
  const t = setTimeout(() => setShowPaidBanner(false), 8000)
  return () => clearTimeout(t)
 }, [showPaidBanner])

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
   await setAuthToken(result.data.token)
   localStorage.setItem('token', result.data.token)
   localStorage.setItem('user', JSON.stringify(result.data.user))
   if (result.data.business) {
    localStorage.setItem('business', JSON.stringify(result.data.business))
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
      {showPaidBanner && (
       <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 transition-all">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
         <div className="text-sm font-medium text-emerald-900">Payment received</div>
         <div className="text-xs text-emerald-800 mt-0.5">
          We just emailed your login + receipt. Sign in below to access your dashboard.
         </div>
        </div>
        <button
         onClick={() => setShowPaidBanner(false)}
         className="text-emerald-700 hover:text-emerald-900 flex-shrink-0"
         aria-label="Dismiss"
        >
         <X className="w-4 h-4" />
        </button>
       </div>
      )}

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
        <label htmlFor="password" className="text-sm text-gray-700 mb-2 block">
         Password
        </label>
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
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
