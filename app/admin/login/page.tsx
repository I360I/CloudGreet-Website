'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeSlash, ArrowUpRight, CircleNotch, ArrowLeft } from '@phosphor-icons/react'
import { setAuthToken } from '@/lib/auth/token-manager'

const EASE = [0.22, 1, 0.36, 1] as const

export default function AdminLoginPage() {
 const router = useRouter()
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
    setError(result.message || 'Login failed')
    return
   }
   const u = result.data?.user
   if (!(u?.is_admin || u?.role === 'admin')) {
    setError('This account is not an admin.')
    return
   }
   await setAuthToken(result.data.token)
   localStorage.setItem('token', result.data.token)
   localStorage.setItem('user', JSON.stringify(u))
   router.replace('/admin')
  } catch {
   setError('Login failed. Please try again.')
  } finally {
   setIsLoading(false)
  }
 }

 const inputClass =
  'w-full px-4 py-3 bg-black/30 border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none focus:border-sky-400/50 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(56,189,248,0.12)] transition-all text-sm'

 return (
  <main
   data-cg-theme="dark"
   className="min-h-[100dvh] text-gray-100 flex flex-col"
   style={{ backgroundColor: 'var(--cg-bg)' }}
  >
   <div className="cg-aurora" />
   <div className="cg-noise" />

   <div className="relative z-[1] px-6 py-5">
    <Link
     href="/"
     className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
    >
     <ArrowLeft className="w-4 h-4" /> Back home
    </Link>
   </div>

   <section className="relative z-[1] flex-1 flex items-center justify-center px-6 pb-16">
    <motion.div
     initial={{ opacity: 0, y: 14 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.6, ease: EASE }}
     className="w-full max-w-[420px]"
    >
     <div className="cg-card-hero rounded-2xl p-8 md:p-10">
      <div className="flex flex-col items-center text-center mb-8">
       <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-2xl scale-125" />
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-b from-sky-400/25 to-indigo-500/10 border border-white/10 flex items-end justify-center">
         <Image
          src="/chat-agent-pose.png"
          alt=""
          width={52}
          height={74}
          priority
          className="w-[46px] h-auto translate-y-1.5"
         />
        </div>
       </div>
       <Image
        src="/cloudgreet-logo-white.png"
        alt="CloudGreet"
        width={150}
        height={42}
        priority
        className="h-7 w-auto mb-3"
       />
       <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
        Admin console
       </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
       <div>
        <label htmlFor="email" className="text-xs font-medium text-gray-400 mb-2 block">Email</label>
        <input
         id="email" type="email" required autoComplete="email"
         value={email} onChange={(e) => setEmail(e.target.value)}
         className={inputClass}
        />
       </div>
       <div>
        <div className="flex items-baseline justify-between mb-2">
         <label htmlFor="password" className="text-xs font-medium text-gray-400">Password</label>
         <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-sky-300 transition-colors">
          Forgot password?
         </Link>
        </div>
        <div className="relative">
         <input
          id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} pr-11`}
         />
         <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
         >
          {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
        </div>
       </div>

       {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3 text-sm">
         {error}
        </div>
       )}

       <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-b from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out disabled:opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-10px_rgba(56,189,248,0.65)] hover:-translate-y-px active:translate-y-0"
       >
        {isLoading
         ? (<><CircleNotch className="w-4 h-4 animate-spin" /> Signing in…</>)
         : (<>Sign in <ArrowUpRight className="w-4 h-4" /></>)}
       </button>
      </form>
     </div>

     <p className="text-center text-[11px] font-mono text-gray-600 mt-6">
      Restricted area. Authorized team members only.
     </p>
    </motion.div>
   </section>
  </main>
 )
}
