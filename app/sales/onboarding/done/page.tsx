'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export default function ConnectDonePage() {
 const router = useRouter()
 const [state, setState] = useState<'checking' | 'ready' | 'pending'>('checking')

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetch('/api/sales/connect-onboarding', { credentials: 'include' })
    if (cancelled) return
    if (res.status === 401) {
     // Cookie didn't survive the Stripe redirect - happens rarely
     // when sameSite/cross-site rules trip. Send them to login and
     // they'll land back on /sales after.
     router.replace('/login')
     return
    }
    const j = await res.json().catch(() => ({}))
    setState(j?.payouts_enabled ? 'ready' : 'pending')
    setTimeout(() => router.push('/sales'), 2000)
   } catch {
    if (!cancelled) {
     setState('pending')
     setTimeout(() => router.push('/sales'), 2000)
    }
   }
  })()
  return () => { cancelled = true }
 }, [router])

 return (
  <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6">
   <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center">
    {state === 'checking' && (
     <>
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
      <h1 className="text-lg font-medium text-gray-900 mb-1">Confirming with Stripe…</h1>
      <p className="text-sm text-gray-500">One sec.</p>
     </>
    )}
    {state === 'ready' && (
     <>
      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
      <h1 className="text-lg font-medium text-gray-900 mb-1">You&apos;re all set</h1>
      <p className="text-sm text-gray-500">
       Bank connected. Commissions will deposit every Friday.
      </p>
     </>
    )}
    {state === 'pending' && (
     <>
      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
      <h1 className="text-lg font-medium text-gray-900 mb-1">Stripe is still reviewing</h1>
      <p className="text-sm text-gray-500">
       This sometimes takes a few minutes. You can keep using your dashboard;
       we&apos;ll mark you ready as soon as Stripe approves.
      </p>
     </>
    )}
   </div>
  </main>
 )
}
