'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Stripe redirects here when the rep's onboarding session expires
 * (AccountLinks live ~5 min). We just regenerate a fresh link and
 * bounce them back into Stripe to continue.
 */
export default function ConnectRefreshPage() {
 useEffect(() => {
  ;(async () => {
   try {
    const res = await fetch('/api/sales/connect-onboarding', {
     method: 'POST',
     credentials: 'include',
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j?.url) {
     window.location.href = j.url
     return
    }
   } catch { /* fall through */ }
   // Couldn't refresh - send them back to /sales so they can retry.
   window.location.href = '/sales'
  })()
 }, [])

 return (
  <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6">
   <div className="text-center">
    <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-3" />
    <p className="text-sm text-gray-600">Refreshing your Stripe link…</p>
   </div>
  </main>
 )
}
