'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  DollarSign,
  DownloadCloud,
  Loader2,
  ShieldAlert,
  Wallet
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

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
  bookingFeesCents: number
  creditsCents: number
  totalBilledCents: number
  openAlerts: BillingAlert[]
  pastDueInvoices: PastDueInvoice[]
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
  }, [showError])

  const stats = useMemo(() => {
    if (!summary) {
      return []
    }

    return [
      {
        label: 'Monthly recurring revenue',
        value: `$${(summary.mrrCents / 100).toFixed(2)}`,
        icon: DollarSign,
        description: 'Subscription charges captured in the last 30 days.'
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
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Browser APIs not available')
      }
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

  const openPortal = async () => {
    try {
      setPortalLoading(true)
      const response = await fetchWithAuth('/api/admin/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'portal' })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Unable to open portal')
      }
      window.open(data.url, '_blank', 'noopener')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open Stripe portal'
      showError('Portal unavailable', message)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-8">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Billing operations
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Revenue & reconciliation cockpit</h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Track subscription revenue, per-booking fees, and failed invoices without leaving the product. Stripe
              retries, dunning steps, and alerts are wired up for proactive retention.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <article key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</h2>
                      <stat.icon className="h-5 w-5 text-blue-300" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-300">{stat.description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <DownloadCloud className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Open Stripe portal
                </button>
              </div>
            </>
          )}
        </section>

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

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-6 shadow-2xl shadow-blue-900/10">
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
    </div>
  )
}


