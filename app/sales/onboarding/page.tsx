'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowUpRight, AlertCircle } from 'lucide-react'

export default function SalesOnboardingPage() {
 const router = useRouter()
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')

 const startOnboarding = async () => {
  setBusy(true); setError('')
  try {
   const res = await fetch('/api/sales/connect-onboarding', { method: 'POST', credentials: 'include' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success || !j.url) throw new Error(j?.error || 'Could not start Stripe onboarding')
   window.location.href = j.url
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
   setBusy(false)
  }
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <section className="max-w-xl mx-auto px-6 py-16">
    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
     CloudGreet · sales rep onboarding · 2 of 3
    </div>
    <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mb-2">
     Connect your bank
    </h1>
    <p className="text-sm text-gray-600 mb-8">
     Stripe handles your bank account verification (the same flow Uber drivers, DoorDash dashers,
     and Substack writers use). Takes about 5 minutes.
    </p>

    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
     <ul className="space-y-3 text-sm text-gray-700">
      <li className="flex items-start gap-3">
       <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
       <span>Verify your identity (SSN last 4, address)</span>
      </li>
      <li className="flex items-start gap-3">
       <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
       <span>Add your bank account (routing + account number)</span>
      </li>
      <li className="flex items-start gap-3">
       <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
       <span>Stripe redirects you back here when done</span>
      </li>
     </ul>

     <p className="text-xs text-gray-500">
      Your information goes to Stripe directly - CloudGreet never sees your full SSN
      or bank account number. At year-end Stripe auto-files your 1099-NEC.
     </p>

     {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-start gap-2">
       <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <span>{error}</span>
      </div>
     )}

     <button
      onClick={startOnboarding}
      disabled={busy}
      className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-40 inline-flex items-center justify-center gap-2"
     >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
      Continue to Stripe
     </button>

     <button
      onClick={() => router.push('/sales')}
      className="w-full text-xs text-gray-500 hover:text-gray-900 transition-colors"
     >
      Skip for now (you can do this later from your dashboard)
     </button>
    </div>
   </section>
  </main>
 )
}
