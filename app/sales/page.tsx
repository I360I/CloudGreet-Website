'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Phone, ArrowRight, AlertCircle } from 'lucide-react'

/**
 * Placeholder /sales landing for phase 2. Phase 3 will replace this
 * with the real rep portal (leads, closes, earnings).
 */
export default function SalesHome() {
 const router = useRouter()
 const [name, setName] = useState<string>('')
 const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const [meRes, conRes] = await Promise.all([
     fetch('/api/me/profile', { credentials: 'include' }),
     fetch('/api/sales/connect-onboarding', { credentials: 'include' }),
    ])
    const meJson = await meRes.json().catch(() => ({}))
    const conJson = await conRes.json().catch(() => ({}))
    if (cancelled) return
    if (meRes.status === 401) {
     router.replace('/login')
     return
    }
    if (meJson?.success) setName(meJson.profile?.name || meJson.profile?.first_name || meJson.profile?.email || '')
    setPayoutsEnabled(conJson?.ok ? !!conJson.payouts_enabled : false)
   } catch (e) {
    if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [router])

 if (loading) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
   </main>
  )
 }

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <section className="max-w-3xl mx-auto px-6 py-16 space-y-6">
    <header>
     <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
      sales rep dashboard
     </div>
     <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">
      Welcome{name ? `, ${name}` : ''}
     </h1>
    </header>

    {error && (
     <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
     </div>
    )}

    {payoutsEnabled === false && (
     <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
       <p className="text-sm font-medium text-amber-900">Bank not connected yet</p>
       <p className="text-xs text-amber-800 mt-1">
        Finish your Stripe Connect setup so Friday auto-payouts can deposit. Takes ~5 minutes.
       </p>
       <Link
        href="/sales/onboarding"
        className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-900 hover:text-amber-700"
       >
        Finish setup <ArrowRight className="w-3 h-3" />
       </Link>
      </div>
     </div>
    )}

    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
     <Phone className="w-8 h-8 text-sky-500 mx-auto mb-3" />
     <h2 className="text-lg font-medium text-gray-900 mb-2">Your portal goes here</h2>
     <p className="text-sm text-gray-500 max-w-md mx-auto">
      Lead list, close-submission form, and weekly earnings all show up here once we ship phase 3.
      For now: your account is set up, agreement signed, and (if you finished Stripe) bank connected.
     </p>
    </div>
   </section>
  </main>
 )
}
