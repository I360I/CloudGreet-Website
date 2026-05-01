'use client'

import { useEffect, useState } from 'react'
import {
 CreditCard, Calendar, AlertCircle, CheckCircle2, Loader2, ExternalLink,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'

type BillingData = {
 subscriptionStatus: string
 mrrCents: number
 currentPeriodStart: string | null
 currentPeriodEnd: string | null
 cancelAtPeriodEnd: boolean
 nextInvoiceDate: string | null
 nextInvoiceAmountCents: number
 portalUrl: string | null
}

const STATUS_TONE: Record<string, { dot: string; text: string; label: string }> = {
 active: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Active' },
 trialing: { dot: 'bg-sky-500', text: 'text-sky-700', label: 'Trialing' },
 past_due: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Past due' },
 canceled: { dot: 'bg-gray-400', text: 'text-gray-600', label: 'Canceled' },
 cancelled: { dot: 'bg-gray-400', text: 'text-gray-600', label: 'Canceled' },
 inactive: { dot: 'bg-gray-400', text: 'text-gray-600', label: 'Inactive' },
}

export default function BillingPage() {
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [billing, setBilling] = useState<BillingData | null>(null)
 const [openingPortal, setOpeningPortal] = useState(false)

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/client/billing')
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setBilling(json.billing)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load billing')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const openPortal = () => {
  if (!billing?.portalUrl) return
  setOpeningPortal(true)
  window.location.href = billing.portalUrl
 }

 return (
  <DashShell activeLabel="Billing">
   <section className="px-8 py-10">
    <div className="max-w-4xl">
     <div className="mb-8">
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Billing</h1>
      <p className="text-sm text-gray-500 mt-1">Subscription, invoices, and payment.</p>
     </div>

     {loading && (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
       <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
     )}

     {!loading && error && (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
       <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load billing</h3>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <button
         onClick={load}
         className="mt-3 inline-flex items-center gap-2 bg-gray-900 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
        >
         Retry
        </button>
       </div>
      </div>
     )}

     {!loading && billing && (
      <>
       <StatusCard billing={billing} openingPortal={openingPortal} onOpenPortal={openPortal} />

       <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <SummaryCard
         label="Monthly subscription"
         value={formatCurrency(billing.mrrCents)}
         hint="per month, flat — no per-booking fees"
         icon={CreditCard}
        />
        <SummaryCard
         label="Next invoice"
         value={billing.nextInvoiceAmountCents > 0 ? formatCurrency(billing.nextInvoiceAmountCents) : '—'}
         hint={billing.nextInvoiceDate ? formatDate(billing.nextInvoiceDate) : 'No upcoming invoice'}
         icon={Calendar}
        />
       </div>

       <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-3">
        <h2 className="text-sm font-medium text-gray-700 mb-3">How billing works</h2>
        <ul className="space-y-2 text-sm text-gray-600">
         <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>Flat monthly subscription. No per-booking fees, no per-minute charges.</span>
         </li>
         <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>Manage payment method, invoices, and cancellation through the Stripe portal.</span>
         </li>
         <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>Subscription changes take effect at the end of your current billing period.</span>
         </li>
        </ul>
       </div>
      </>
     )}
    </div>
   </section>
  </DashShell>
 )
}

function StatusCard({
 billing, openingPortal, onOpenPortal,
}: { billing: BillingData; openingPortal: boolean; onOpenPortal: () => void }) {
 const tone = STATUS_TONE[billing.subscriptionStatus] || STATUS_TONE.inactive
 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
     <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${tone.dot}`} />
      <span className={`text-sm font-medium ${tone.text}`}>
       {tone.label}{billing.cancelAtPeriodEnd && ' · cancels at period end'}
      </span>
     </div>
     <h2 className="text-xl font-medium text-gray-900 mt-2">Subscription</h2>
     {billing.currentPeriodStart && billing.currentPeriodEnd && (
      <p className="text-sm text-gray-500 mt-1">
       Current period: {formatDate(billing.currentPeriodStart)} – {formatDate(billing.currentPeriodEnd)}
      </p>
     )}
    </div>
    {billing.portalUrl ? (
     <button
      onClick={onOpenPortal} disabled={openingPortal}
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
     >
      {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
      Manage subscription
     </button>
    ) : (
     <span className="text-xs text-gray-400">Contact support to manage subscription</span>
    )}
   </div>
  </div>
 )
}

function SummaryCard({
 label, value, hint, icon: Icon,
}: { label: string; value: string; hint: string; icon: React.ElementType }) {
 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-2">
    <Icon className="w-4 h-4 text-sky-500" strokeWidth={1.75} />
    <h3 className="text-sm font-medium text-gray-700">{label}</h3>
   </div>
   <p className="text-2xl font-medium text-gray-900 leading-tight">{value}</p>
   <p className="text-xs text-gray-400 mt-1">{hint}</p>
  </div>
 )
}

function formatCurrency(cents: number) {
 return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string) {
 return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
