'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  WarningCircle, ArrowRight, TrendUp,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const EASE = [0.22, 1, 0.36, 1] as const

type Totals = {
  lifetime_cents: number
  mrr_cents: number
  owed_cents: number
  paid_out_cents: number
}

type Customer = {
  business_id: string | null
  business_name: string
  monthly_cents: number
  setup_fee_cents: number
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  started_at: string
  commission_total_cents: number
  commission_owed_cents: number
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

type ChartPoint = {
  label: string
  iso: string
  week_cents: number
  cumulative_cents: number
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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [chart, setChart] = useState<ChartPoint[]>([])
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
          setCustomers(j.customers || [])
          setChart(j.chart || [])
          setPayouts(j.payouts || [])
          setPayoutsEnabled(!!j.payouts_enabled)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo(() => ({
    labels: chart.map((p) => p.label),
    datasets: [
      {
        label: 'Cumulative commission',
        data: chart.map((p) => p.cumulative_cents / 100),
        borderColor: '#0ea5e9',
        backgroundColor: (ctx: any) => {
          const c = ctx.chart.ctx
          const g = c.createLinearGradient(0, 0, 0, 280)
          g.addColorStop(0, 'rgba(14, 165, 233, 0.25)')
          g.addColorStop(1, 'rgba(14, 165, 233, 0)')
          return g
        },
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#0ea5e9',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  }), [chart])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 11, weight: 600 as any },
        bodyFont: { size: 13, weight: 600 as any },
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `${dollars(Math.round(ctx.parsed.y * 100))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          callback: (v: any) => `$${Number(v).toLocaleString()}`,
        },
        beginAtZero: true,
      },
    },
  }), [])

  return (
    <SalesShell activeLabel="Earnings">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="earnings" title="Commissions" />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!payoutsEnabled && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
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
          </motion.div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : (
          <>
            <motion.div
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
            >
              <Stat
                label="Owed"
                value={dollars(totals?.owed_cents ?? 0)}
                hint={`pays ${nextFriday().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                accent
              />
              <Stat label="MRR" value={dollars(totals?.mrr_cents ?? 0)} hint="active accounts" />
              <Stat label="Lifetime" value={dollars(totals?.lifetime_cents ?? 0)} />
              <Stat label="Paid out" value={dollars(totals?.paid_out_cents ?? 0)} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Last 12 weeks</div>
                  <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                    Cumulative commission
                    <TrendUp weight="bold" className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-medium text-gray-900 tabular-nums">
                    {dollars(totals?.lifetime_cents ?? 0)}
                  </div>
                  <div className="text-xs text-gray-500">total earned</div>
                </div>
              </div>
              <div className="h-[260px]">
                <Line data={chartData} options={chartOptions} />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Customers</div>
                  <div className="text-sm font-medium text-gray-900">
                    {customers.length} account{customers.length === 1 ? '' : 's'}
                  </div>
                </div>
                {customers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No active accounts yet. Submit a close to get one.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                    {customers.map((c) => (
                      <li key={c.business_id || c.business_name} className="px-5 py-3.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {c.business_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2.5">
                            <span className="tabular-nums">{dollars(c.monthly_cents)}/mo</span>
                            <span className="text-gray-300">·</span>
                            <span>since {fmtDate(c.started_at)}</span>
                            {c.status === 'invoice_sent' && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-amber-700">awaiting first payment</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 tabular-nums">
                            {dollars(c.commission_total_cents)}
                          </div>
                          {c.commission_owed_cents > 0 ? (
                            <div className="text-[10px] text-amber-700">
                              {dollars(c.commission_owed_cents)} owed
                            </div>
                          ) : c.commission_total_cents > 0 ? (
                            <div className="text-[10px] text-emerald-700">paid out</div>
                          ) : (
                            <div className="text-[10px] text-gray-400">no payments yet</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
              >
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
              </motion.div>
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
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
      className={`rounded-2xl border p-4 transition-shadow ${
        accent
          ? 'bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/10'
          : 'bg-white border-gray-200 hover:shadow-md hover:shadow-gray-900/5'
      }`}
    >
      <div className={`text-[10px] font-mono uppercase tracking-wider ${accent ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-2xl font-medium tabular-nums mt-1 ${accent ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {hint && (
        <div className={`text-xs mt-0.5 ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{hint}</div>
      )}
    </motion.div>
  )
}
