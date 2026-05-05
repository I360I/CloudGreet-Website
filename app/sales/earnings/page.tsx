'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Totals = {
  lifetime_cents: number
  mtd_cents: number
  owed_cents: number
  paid_out_cents: number
}

type LedgerRow = {
  id: string
  source_type: 'mrr' | 'setup_fee'
  gross_paid_cents: number
  commission_cents: number
  earned_at: string
  paid: boolean
  business_name: string | null
}

type Payout = {
  id: string
  amount_cents: number
  period_start: string
  period_end: string
  status: 'pending' | 'transferred' | 'failed' | 'reversed'
  transferred_at: string | null
  failure_reason: string | null
}

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()

function nextFriday(from = new Date()): Date {
  const d = new Date(from)
  const day = d.getDay()
  const delta = (5 - day + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  d.setHours(9, 0, 0, 0)
  return d
}

export default function SalesEarningsPage() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [payoutsEnabled, setPayoutsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/earnings')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(j?.error || 'Failed to load earnings')
        } else {
          setTotals(j.totals)
          setLedger(j.ledger || [])
          setPayouts(j.payouts || [])
          setPayoutsEnabled(!!j.payouts_enabled)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SalesShell activeLabel="Earnings">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="earnings" title="Commissions" />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!payoutsEnabled && !loading && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Bank not connected — payouts are paused
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Commissions still accrue, but Friday transfers skip you until Stripe Connect is finished.
              </p>
              <Link
                href="/sales/onboarding"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-900 hover:text-amber-700"
              >
                Finish setup <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Stat label="Owed" value={dollars(totals?.owed_cents ?? 0)} hint={`pays ${nextFriday().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} accent />
              <Stat label="MTD" value={dollars(totals?.mtd_cents ?? 0)} />
              <Stat label="Lifetime" value={dollars(totals?.lifetime_cents ?? 0)} />
              <Stat label="Paid out" value={dollars(totals?.paid_out_cents ?? 0)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Recent commissions</div>
                  <div className="text-sm font-medium text-gray-900">{ledger.length} entries</div>
                </div>
                {ledger.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No commissions yet. Once a client pays an invoice, your 50% lands here.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                    {ledger.slice(0, 50).map((r) => (
                      <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {r.business_name || '—'}
                          </div>
                          <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                            <span>{r.source_type === 'mrr' ? 'Monthly' : 'Setup fee'}</span>
                            <span className="text-gray-300">·</span>
                            <span>{fmtDate(r.earned_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 tabular-nums">
                            {dollars(r.commission_cents)}
                          </div>
                          <div className="text-[10px] mt-0.5 inline-flex items-center gap-1">
                            {r.paid ? (
                              <span className="text-emerald-700 inline-flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="text-amber-700 inline-flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> Owed
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Payout history</div>
                  <div className="text-sm font-medium text-gray-900">{payouts.length} transfers</div>
                </div>
                {payouts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No payouts yet. Friday is payday.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                    {payouts.map((p) => (
                      <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 tabular-nums">
                            {dollars(p.amount_cents)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {fmtDate(p.period_start)} → {fmtDate(p.period_end)}
                          </div>
                          {p.failure_reason && (
                            <div className="text-xs text-red-600 mt-0.5">{p.failure_reason}</div>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-wider rounded-full border px-2 py-0.5 ${
                          p.status === 'transferred' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : p.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : p.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {p.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </SalesShell>
  )
}

function Stat({
  label, value, hint, accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200'}`}>
      <div className={`text-[10px] font-mono uppercase tracking-wider ${accent ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-2xl font-medium tabular-nums mt-1 ${accent ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {hint && (
        <div className={`text-xs mt-0.5 ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{hint}</div>
      )}
    </div>
  )
}
