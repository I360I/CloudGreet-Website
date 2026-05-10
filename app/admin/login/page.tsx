'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeSlash, ArrowUpRight } from '@phosphor-icons/react'
import { setAuthToken } from '@/lib/auth/token-manager'

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

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <nav className="border-b border-black/5">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <Link href="/" className="flex items-center" aria-label="CloudGreet">
      <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
      <span className="ml-3 text-xs font-medium text-gray-400 uppercase tracking-widest">Admin</span>
     </Link>
     <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">← Back home</Link>
    </div>
   </nav>

   <section className="px-6 pt-16 md:pt-24 pb-32">
    <div className="max-w-md mx-auto relative">
     <div className="absolute -inset-8 bg-sky-100/40 blur-3xl rounded-3xl pointer-events-none -z-0" />
     <div className="relative bg-white border border-gray-200 rounded-[28px] p-8 md:p-10">
      <h1 className="font-display font-medium tracking-tight leading-[1.05] text-3xl md:text-4xl mb-2 text-gray-900">
       Admin <span className="text-gray-400">sign in.</span>
      </h1>
      <p className="text-sm text-gray-500 mb-8">Restricted area.</p>

      <form onSubmit={onSubmit} className="space-y-5">
       <div>
        <label htmlFor="email" className="text-sm text-gray-700 mb-2 block">Email</label>
        <input
         id="email" type="email" required autoComplete="email"
         value={email} onChange={(e) => setEmail(e.target.value)}
         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
        />
       </div>
       <div>
        <label htmlFor="password" className="text-sm text-gray-700 mb-2 block">Password</label>
        <div className="relative">
         <input
          id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 pr-11 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
         />
         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
          {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </button>
        </div>
       </div>

       {error && <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-sm">{error}</div>}

       <button type="submit" disabled={isLoading} className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
        {isLoading ? 'Signing in…' : (<>Sign in<ArrowUpRight className="w-4 h-4" /></>)}
       </button>
      </form>
     </div>
    </div>
   </section>
  </main>
 )
}
