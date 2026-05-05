'use client'

import { useEffect, useMemo, useState } from 'react'
import {
 AlertTriangle,
 ArrowRight,
 ArrowUpRight,
 CreditCard,
 DollarSign,
 DownloadCloud,
 Loader2,
 ShieldAlert,
 Sparkles,
 TrendingUp,
 Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'

type BillingAlert = {
 id: string
 invoiceId: string | null
 alertType: string
 message: string
 createdAt: string
}

type PastDueInvoice = {
 invoiceId: string
 amountDueCents: number
 dueDate: string | null
}

type BillingSummary = {
 mrrCents: number
 paidMrrCents?: number
 trialingMrrCents?: number
 pastDueMrrCents?: number
 paidCount?: number
 trialingCount?: number
 pastDueCount?: number
 bookingFeesCents: number
 creditsCents: number
 totalBilledCents: number
 openAlerts: BillingAlert[]
 pastDueInvoices: PastDueInvoice[]
 source?: 'stripe-live' | 'ledger'
 nextInvoice?: {
 servicePeriodEnd: string | null
 estimatedTotalCents: number
 }
}

export default function BillingDashboardPage() {
 const { showError, showSuccess } = useToast()
 const [loading, setLoading] = useState(true)
 const [retrying, setRetrying] = useState<string | null>(null)
 const [portalLoading, setPortalLoading] = useState(false)
 const [summary, setSummary] = useState<BillingSummary | null>(null)

 const fetchSummary = async () => {
 try {
 setLoading(true)
 const response = await fetchWithAuth('/api/admin/billing/reconciliation')
 
 if (!response.ok) {
 let errorData
 try {
 errorData = await response.json()
 } catch {
 errorData = {}
 }
 throw new Error(errorData?.error || `Failed to load billing summary (${response.status})`)
 }

 let data
 try {
 data = await response.json()
 } catch (jsonError) {
 throw new Error('Invalid response from server')
 }

 if (!data.success) {
 throw new Error(data?.error || 'Failed to load billing summary')
 }
 setSummary(data.summary as BillingSummary)
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Failed to load billing summary'
 showError('Billing dashboard unavailable', message)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 fetchSummary()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 const stats = useMemo(() => {
 if (!summary) {
 return []
 }

 const trialBlurb =
  summary.trialingCount && summary.trialingCount > 0
   ? `Includes $${((summary.trialingMrrCents ?? 0) / 100).toFixed(0)} from ${summary.trialingCount} trial${summary.trialingCount === 1 ? '' : 's'}`
   : null
 const mrrDescription =
  summary.source === 'stripe-live'
   ? `Live from Stripe - active + trialing + past_due. ${summary.paidCount ?? 0} paid${trialBlurb ? `. ${trialBlurb}` : ''}.`
   : 'Subscription charges captured in the last 30 days.'

 return [
 {
 label: 'Monthly recurring revenue',
 value: `$${(summary.mrrCents / 100).toFixed(2)}`,
 icon: DollarSign,
 description: mrrDescription,
 },
 {
 label: 'Per-booking fees',
 value: `$${(summary.bookingFeesCents / 100).toFixed(2)}`,
 icon: CreditCard,
 description: 'Usage-based fees generated from AI appointments.'
 },
 {
 label: 'Credits & adjustments',
 value: `$${(summary.creditsCents / 100).toFixed(2)}`,
 icon: Wallet,
 description: 'Manual credits or adjustments applied this period.'
 },
 {
 label: 'Total billed (30 days)',
 value: `$${(summary.totalBilledCents / 100).toFixed(2)}`,
 icon: ShieldAlert,
 description: 'Aggregate ledger value across all billing sources.'
 }
 ]
 }, [summary])

 const retryInvoice = async (invoiceId: string) => {
 try {
 setRetrying(invoiceId)
 const response = await fetchWithAuth('/api/admin/billing/reconciliation', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ invoiceId })
 })
 const data = await response.json()
 if (!response.ok || !data.success) {
 throw new Error(data?.error || 'Retry failed')
 }
 showSuccess('Invoice retried', 'Stripe is attempting the payment again.')
 await fetchSummary()
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Retry failed'
 showError('Unable to retry invoice', message)
 } finally {
 setRetrying(null)
 }
 }

 const downloadCsv = async () => {
 try {
 const response = await fetchWithAuth('/api/admin/billing/reconciliation/export')
 if (!response.ok) {
 throw new Error('Unable to export CSV')
 }
 const blob = await response.blob()
 const url = window.URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = 'billing-summary.csv'
 document.body.appendChild(link)
 link.click()
 link.remove()
 window.URL.revokeObjectURL(url)
 showSuccess('Export ready', 'Billing summary downloaded.')
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Export failed'
 showError('Export failed', message)
 }
 }

 // The previous button hit a per-tenant customer portal endpoint, which
 // requires a businessId that admins don't carry. Going straight to the
 // Stripe dashboard is what the operator actually wants.
 const openStripeDashboard = () => {
  window.open('https://dashboard.stripe.com/subscriptions', '_blank', 'noopener')
 }

 const mrrCents = summary?.mrrCents ?? 0
 const animatedMrrDollars = useCountUp(Math.floor(mrrCents / 100), 1100)
 const paidCount = summary?.paidCount ?? 0
 const trialingCount = summary?.trialingCount ?? 0
 const pastDueCount = summary?.pastDueCount ?? 0
 const totalCount = paidCount + trialingCount + pastDueCount
 const paidMrrCents = summary?.paidMrrCents ?? 0
 const trialingMrrCents = summary?.trialingMrrCents ?? 0
 const pastDueMrrCents = summary?.pastDueMrrCents ?? 0

 const mrrDollars = Math.floor(mrrCents / 100)
 const mrrCentsRemainder = mrrCents % 100

 // Next milestone - keeps the climb visible. Steps up by $500 once we
 // pass $1k, then $1k once we pass $5k.
 const milestone = mrrDollars < 500 ? 500
  : mrrDollars < 1000 ? 1000
  : mrrDollars < 2500 ? 2500
  : mrrDollars < 5000 ? 5000
  : Math.ceil((mrrDollars + 1) / 1000) * 1000
 const milestoneDelta = milestone - mrrDollars

 return (
 <AdminShell activeLabel="Billing">
 <section className="px-4 lg:px-8 py-6 lg:py-10">
 <div className="max-w-7xl space-y-6">
 <header className="flex items-end justify-between gap-4 flex-wrap">
 <div className="space-y-2">
 <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
 billing operations
 </div>
 <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
 Revenue
 </h1>
 </div>
 <Link
 href="/admin/billing/places"
 className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-2 transition-colors"
 >
 Places API spend →
 </Link>
 </header>

 {loading ? (
 <section className="rounded-3xl border border-white/10 bg-black/40 p-12 flex items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
 </section>
 ) : (
 <>
 {/* Hero - the trophy */}
 <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-black/40 to-emerald-950/30 p-8 lg:p-12 shadow-2xl shadow-blue-900/20">
  {/* glow */}
  <div className="absolute -top-32 -right-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
  <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

  <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
   <div className="flex-1 min-w-0">
    <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-300/80 mb-3">
     <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-breathe" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
     </span>
     monthly recurring revenue · live from stripe
    </div>
    <div className="flex items-baseline gap-2 flex-wrap">
     <span className="font-display text-6xl md:text-8xl font-medium tracking-tight text-white tabular-nums leading-none">
      ${animatedMrrDollars.toLocaleString()}
     </span>
     <span className="font-display text-2xl md:text-3xl font-medium tracking-tight text-gray-500 tabular-nums">
      .{String(mrrCentsRemainder).padStart(2, '0')}
     </span>
     <span className="text-sm text-gray-500 ml-2">/mo</span>
    </div>
    <div className="mt-4 flex items-center gap-4 flex-wrap text-sm">
     <span className="text-gray-300">
      <span className="font-mono text-white">{totalCount}</span> active client{totalCount === 1 ? '' : 's'}
     </span>
     {milestoneDelta > 0 && (
      <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
       <TrendingUp className="w-3.5 h-3.5" />
       <span className="font-mono">${milestoneDelta.toLocaleString()}</span> to ${milestone.toLocaleString()}/mo
      </span>
     )}
    </div>
   </div>

   {/* Breakdown pills */}
   <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:min-w-[260px]">
    <BreakdownPill
     label="Paid"
     count={paidCount}
     amountCents={paidMrrCents}
     tone="emerald"
    />
    <BreakdownPill
     label="Trialing"
     count={trialingCount}
     amountCents={trialingMrrCents}
     tone="sky"
    />
    {pastDueCount > 0 && (
     <BreakdownPill
      label="Past due"
      count={pastDueCount}
      amountCents={pastDueMrrCents}
      tone="amber"
     />
    )}
   </div>
  </div>

  <div className="relative mt-8 flex flex-wrap items-center gap-3">
   <button
    type="button"
    onClick={openStripeDashboard}
    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] hover:bg-white/[0.12] hover:border-white/25 px-4 py-2 text-sm font-medium text-white transition-all duration-300"
   >
    <ArrowUpRight className="h-4 w-4" />
    Open Stripe dashboard
   </button>
   <button
    type="button"
    onClick={downloadCsv}
    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm font-medium text-gray-300 transition-all duration-300"
   >
    <DownloadCloud className="h-4 w-4" />
    Export CSV
   </button>
  </div>
 </section>

 {/* Secondary metrics - the numbers that actually matter at this stage */}
 <section className="grid gap-3 sm:grid-cols-3">
  <SecondaryStat
   label="Annualized run rate"
   value={`$${(mrrCents * 12 / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
   hint="MRR × 12 - what this pace earns over a year"
   icon={TrendingUp}
   delay={0}
  />
  <SecondaryStat
   label="Avg per client"
   value={totalCount > 0 ? `$${Math.round(mrrCents / totalCount / 100).toLocaleString()}` : '-'}
   hint={`Across ${totalCount} active client${totalCount === 1 ? '' : 's'}`}
   icon={DollarSign}
   delay={0.05}
  />
  <SecondaryStat
   label="Conversion potential"
   value={trialingCount > 0 ? `+$${Math.round(trialingMrrCents / 100).toLocaleString()}` : '-'}
   hint={trialingCount > 0
    ? `If all ${trialingCount} trial${trialingCount === 1 ? '' : 's'} convert to paid`
    : 'No trials right now'}
   icon={Sparkles}
   delay={0.1}
  />
 </section>
 </>
 )}

 <section className="grid gap-6 lg:grid-cols-2">
 <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold text-white">Past-due invoices</h2>
 <p className="text-sm text-slate-300">
 We retry payments instantly; you can trigger a manual retry or resend the pay link.
 </p>
 </div>
 </div>

 <div className="mt-4 space-y-4">
 {summary?.pastDueInvoices?.length ? (
 summary.pastDueInvoices.map((invoice) => (
 <div key={invoice.invoiceId} className="flex flex-col gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/10 p-4">
 <div className="flex items-center justify-between text-sm text-rose-100">
 <span className="font-semibold">Invoice {invoice.invoiceId}</span>
 <AlertTriangle className="h-4 w-4" />
 </div>
 <p className="text-sm text-rose-50">
 Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleString() : 'unknown'}
 </p>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => retryInvoice(invoice.invoiceId)}
 disabled={retrying === invoice.invoiceId}
 className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {retrying === invoice.invoiceId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
 Retry payment
 </button>
 <button
 type="button"
 onClick={async () => {
 try {
 const response = await fetchWithAuth('/api/admin/billing/portal', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ action: 'resend_invoice', invoiceId: invoice.invoiceId })
 })
 const data = await response.json()
 if (!response.ok || !data.success) {
 throw new Error(data?.error || 'Unable to resend invoice')
 }
 showSuccess('Pay link sent', 'Stripe resent the payment email to the customer.')
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Unable to resend invoice'
 showError('Resend failed', message)
 }
 }}
 className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
 >
 Resend pay link
 </button>
 </div>
 </div>
 ))
 ) : (
 <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
 No past-due invoices right now. Stripe webhooks will automatically surface alerts here when something
 needs attention.
 </div>
 )}
 </div>
 </article>

 <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold text-white">Open billing alerts</h2>
 <p className="text-sm text-slate-300">
 Alerts come from Stripe webhooks and ledger validation. Resolve them after actioning to keep ops clean.
 </p>
 </div>
 </div>

 <div className="mt-4 space-y-4">
 {summary?.openAlerts?.length ? (
 summary.openAlerts.map((alert) => (
 <div key={alert.id} className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
 <p className="font-semibold uppercase tracking-[0.2em]">{alert.alertType.replace(/_/g, ' ')}</p>
 <p className="mt-2 text-amber-50">{alert.message}</p>
 <p className="mt-2 text-xs text-amber-200">
 Logged {new Date(alert.createdAt).toLocaleString()} · Invoice {alert.invoiceId ?? 'n/a'}
 </p>
 </div>
 ))
 ) : (
 <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
 No unresolved alerts. Keep an eye on this panel during launches and renewals.
 </div>
 )}
 </div>
 </article>
 </section>

 <section className="rounded-3xl border border-white/10 from-white/5 via-white/0 to-white/10 p-6 shadow-2xl shadow-blue-900/10">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <h2 className="text-xl font-semibold text-white">Need to adjust billing settings?</h2>
 <p className="text-sm text-slate-300">
 Configure Stripe keys, Telnyx usage, and other integration credentials from the owner settings hub.
 </p>
 </div>
 <Link
 href="/admin/settings"
 className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
 >
 Open settings
 <ArrowRight className="h-4 w-4" />
 </Link>
 </div>
 </section>
 </div>
 </section>
 </AdminShell>
 )
}

/**
 * Counts up to `target` over `durationMs`, easing out so the headline
 * MRR animates in instead of just snapping. Re-targets if the value
 * changes (e.g., new sub lands while the page is open).
 */
function useCountUp(target: number, durationMs: number): number {
 const [value, setValue] = useState(0)
 useEffect(() => {
  if (target === 0) { setValue(0); return }
  const start = performance.now()
  const startValue = 0
  let raf = 0
  const tick = (now: number) => {
   const t = Math.min(1, (now - start) / durationMs)
   const eased = 1 - Math.pow(1 - t, 3)
   setValue(Math.round(startValue + (target - startValue) * eased))
   if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
 }, [target, durationMs])
 return value
}

function BreakdownPill({
 label, count, amountCents, tone,
}: {
 label: string
 count: number
 amountCents: number
 tone: 'emerald' | 'sky' | 'amber'
}) {
 const toneClasses = {
  emerald: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200',
  sky: 'border-sky-400/20 bg-sky-400/5 text-sky-200',
  amber: 'border-amber-400/20 bg-amber-400/5 text-amber-200',
 }[tone]
 const dotClass = {
  emerald: 'bg-emerald-400',
  sky: 'bg-sky-400',
  amber: 'bg-amber-400',
 }[tone]
 return (
  <div className={`flex items-center justify-between gap-4 rounded-xl border ${toneClasses} px-3.5 py-2.5`}>
   <div className="flex items-center gap-2 min-w-0">
    <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
    <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">{label}</span>
    <span className="text-xs tabular-nums opacity-70">· {count}</span>
   </div>
   <span className="text-sm font-mono tabular-nums">
    ${(amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
   </span>
  </div>
 )
}

function SecondaryStat({
 label, value, hint, icon: Icon, delay = 0,
}: {
 label: string
 value: string
 hint: string
 icon: React.ElementType
 delay?: number
}) {
 return (
  <div
   className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] p-5 transition-all duration-500 ease-out"
   style={{
    animation: `riseIn 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
   }}
  >
   <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
    <Icon className="w-3.5 h-3.5" />
    {label}
   </div>
   <div className="text-2xl font-medium text-white tabular-nums">
    {value}
   </div>
   <div className="text-xs text-gray-500 mt-1">{hint}</div>
   <style jsx>{`
    @keyframes riseIn {
     from { opacity: 0; transform: translateY(6px); }
     to { opacity: 1; transform: translateY(0); }
    }
   `}</style>
  </div>
 )
}
