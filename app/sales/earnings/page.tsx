'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WarningCircle, ArrowRight, TrendUp, Receipt, ArrowSquareOut, CircleNotch,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const EASE = [0.22, 1, 0.36, 1] as const

type Totals = {
  lifetime_cents: number
  mrr_cents: number
  owed_cents: number
  paid_out_cents: number
  ytd_paid_cents: number
  tax_year: number
}

type Customer = {
  business_id: string | null
  business_name: string
  monthly_cents: number
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  subscription_status: string | null
  account_status: string | null
  started_at: string
  commission_total_cents: number
  commission_owed_cents: number
}

type ChartPoint = {
  label: string
  iso: string
  mrr_cents: number
  earned_cents: number
  cumulative_cents: number
}

type ChartTab = 'mrr' | 'lifetime' | 'both'

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()

function ageLabel(iso: string): string {
  const start = new Date(iso)
  const now = new Date()
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (months < 1) {
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000))
    if (days <= 0) return 'new'
    return `${days}d`
  }
  return months === 1 ? '1 mo' : `${months} mo`
}

async function openStripeDashboard(setBusy: (b: boolean) => void) {
  setBusy(true)
  try {
    const { fetchWithAuth } = await import('@/lib/auth/fetch-with-auth')
    const res = await fetchWithAuth('/api/sales/stripe-dashboard', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    if (j?.url) {
      window.open(j.url, '_blank', 'noopener,noreferrer')
    } else {
      alert(j?.error || 'Could not open Stripe dashboard')
    }
  } finally {
    setBusy(false)
  }
}

function nextFriday(): string {
  const d = new Date()
  const delta = (5 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SalesEarningsPage() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [chartTab, setChartTab] = useState<ChartTab>('both')
  const [payoutsEnabled, setPayoutsEnabled] = useState(true)
  const [hasConnectAccount, setHasConnectAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openingDashboard, setOpeningDashboard] = useState(false)

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
          setPayoutsEnabled(!!j.payouts_enabled)
          setHasConnectAccount(!!j.has_connect_account)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SalesShell activeLabel="Earnings">
      <section className="max-w-3xl mx-auto px-6 py-10">
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
                Bank not connected - payouts are paused
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
            {/* Owed - hero */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="bg-gray-900 text-white rounded-2xl p-6 mb-4 shadow-lg shadow-gray-900/10"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Owed · pays {nextFriday()}
              </div>
              <div className="text-4xl font-medium tabular-nums mt-2">
                {dollars(totals?.owed_cents ?? 0)}
              </div>
            </motion.div>

            {/* Three smaller numbers */}
            <motion.div
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-3 gap-3 mb-4"
            >
              <Stat label="MRR" value={dollars(totals?.mrr_cents ?? 0)} />
              <Stat label="Lifetime" value={dollars(totals?.lifetime_cents ?? 0)} />
              <Stat label="Paid out" value={dollars(totals?.paid_out_cents ?? 0)} />
            </motion.div>

            <ChartCard
              chart={chart}
              tab={chartTab}
              onTabChange={setChartTab}
              lifetimeCents={totals?.lifetime_cents ?? 0}
              mrrCents={totals?.mrr_cents ?? 0}
            />

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6"
            >
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  Your customers
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {customers.length} account{customers.length === 1 ? '' : 's'}
                </div>
              </div>
              {customers.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No accounts yet. Submit a close to get one.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <li
                      key={c.business_id || c.business_name}
                      className="px-5 py-3.5 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {c.business_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2.5">
                          {c.subscription_status === 'trialing' || c.subscription_status === 'trial' ? (
                            <>
                              <span className="tabular-nums line-through text-gray-400">{dollars(c.monthly_cents)}/mo</span>
                              <span className="text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-1.5 py-0.5">
                                trial
                              </span>
                            </>
                          ) : (
                            <span className="tabular-nums">{dollars(c.monthly_cents)}/mo</span>
                          )}
                          <span className="text-gray-300">·</span>
                          <span>since {fmtDate(c.started_at)}</span>
                          <span className="text-[10px] font-mono uppercase tracking-wider bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 tabular-nums">
                            {ageLabel(c.started_at)}
                          </span>
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

            {/* Taxes - what's coming at year-end */}
            <TaxCard
              ytdPaidCents={totals?.ytd_paid_cents ?? 0}
              taxYear={totals?.tax_year ?? new Date().getFullYear()}
              hasConnectAccount={hasConnectAccount}
              opening={openingDashboard}
              onOpenStripe={() => openStripeDashboard(setOpeningDashboard)}
            />
          </>
        )}
      </section>
    </SalesShell>
  )
}

function TaxCard({
  ytdPaidCents, taxYear, hasConnectAccount, opening, onOpenStripe,
}: {
  ytdPaidCents: number
  taxYear: number
  hasConnectAccount: boolean
  opening: boolean
  onOpenStripe: () => void
}) {
  const ytd = `$${(ytdPaidCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const threshold = 60_000 // $600 in cents
  const overThreshold = ytdPaidCents >= threshold
  const remainingToThreshold = Math.max(0, threshold - ytdPaidCents)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mt-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Receipt weight="duotone" className="w-5 h-5 text-amber-500" />
        <div className="text-sm font-medium text-gray-900">Taxes · {taxYear}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Paid out this year
          </div>
          <div className="text-2xl font-medium text-gray-900 tabular-nums mt-1">{ytd}</div>
          <div className="text-xs text-gray-500 mt-1">
            Sum of every Friday transfer in {taxYear}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            1099-NEC
          </div>
          {overThreshold ? (
            <>
              <div className="text-sm font-medium text-emerald-700 mt-1">Will be filed</div>
              <div className="text-xs text-gray-500 mt-1">
                Stripe issues + files your 1099 by Jan&nbsp;31, {taxYear + 1}.
                You&apos;ll get it by mail or in your Stripe Express dashboard.
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-900 mt-1">
                Need {`$${(remainingToThreshold / 100).toFixed(2)}`} more
              </div>
              <div className="text-xs text-gray-500 mt-1">
                IRS requires a 1099-NEC for contractors paid $600+ per year. Stripe
                will issue + file yours automatically once you cross.
              </div>
            </>
          )}
        </div>
      </div>

      {hasConnectAccount ? (
        <button
          onClick={onOpenStripe}
          disabled={opening}
          className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
        >
          {opening
            ? <CircleNotch className="w-4 h-4 animate-spin" />
            : <ArrowSquareOut className="w-4 h-4" />}
          Open Stripe dashboard
        </button>
      ) : (
        <Link
          href="/sales/onboarding"
          className="inline-flex items-center gap-2 text-sm border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg px-3.5 py-2 transition-colors"
        >
          Connect Stripe to enable payouts <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
      <p className="text-[11px] text-gray-500 mt-3">
        Your Stripe Express dashboard has the full breakdown of every transfer plus
        any tax forms once issued.
      </p>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
      className="bg-white border border-gray-200 rounded-2xl p-4"
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="text-xl font-medium text-gray-900 tabular-nums mt-1">
        {value}
      </div>
    </motion.div>
  )
}

const TABS: Array<{ key: ChartTab; label: string; hint: string }> = [
  { key: 'mrr',      label: 'MRR',      hint: 'month-over-month' },
  { key: 'lifetime', label: 'Lifetime', hint: 'cumulative commission' },
  { key: 'both',     label: 'Both',     hint: 'overlay' },
]

const COLORS = {
  mrr:      { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.18)' },     // emerald
  lifetime: { stroke: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.18)' },     // sky
}

function ChartCard({
  chart, tab, onTabChange, lifetimeCents, mrrCents,
}: {
  chart: ChartPoint[]
  tab: ChartTab
  onTabChange: (t: ChartTab) => void
  lifetimeCents: number
  mrrCents: number
}) {
  const labels = useMemo(() => chart.map((p) => p.label), [chart])

  const data = useMemo(() => {
    const datasets: any[] = []
    const showMrr = tab === 'mrr' || tab === 'both'
    const showLifetime = tab === 'lifetime' || tab === 'both'

    if (showMrr) {
      datasets.push({
        label: 'MRR',
        data: chart.map((p) => p.mrr_cents / 100),
        borderColor: COLORS.mrr.stroke,
        backgroundColor: tab === 'mrr'
          ? (ctx: any) => {
              const c = ctx.chart.ctx
              const g = c.createLinearGradient(0, 0, 0, 280)
              g.addColorStop(0, COLORS.mrr.fill)
              g.addColorStop(1, 'rgba(16, 185, 129, 0)')
              return g
            }
          : 'transparent',
        fill: tab === 'mrr',
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: COLORS.mrr.stroke,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      })
    }
    if (showLifetime) {
      datasets.push({
        label: 'Lifetime',
        data: chart.map((p) => p.cumulative_cents / 100),
        borderColor: COLORS.lifetime.stroke,
        backgroundColor: tab === 'lifetime'
          ? (ctx: any) => {
              const c = ctx.chart.ctx
              const g = c.createLinearGradient(0, 0, 0, 280)
              g.addColorStop(0, COLORS.lifetime.fill)
              g.addColorStop(1, 'rgba(14, 165, 233, 0)')
              return g
            }
          : 'transparent',
        fill: tab === 'lifetime',
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: COLORS.lifetime.stroke,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      })
    }
    return { labels, datasets }
  }, [labels, chart, tab])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: tab === 'both', position: 'top' as const, align: 'end' as const, labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 11, weight: 600 as any },
        bodyFont: { size: 13, weight: 600 as any },
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: $${Math.round(ctx.parsed.y).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
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
  }), [tab])

  const headlineLabel = tab === 'mrr' ? 'MRR right now' : tab === 'lifetime' ? 'Lifetime earned' : 'Trend'
  const headlineValue = tab === 'mrr'
    ? `$${(mrrCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : tab === 'lifetime'
    ? `$${(lifetimeCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"
    >
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Last 12 months
          </div>
          <div className="text-base font-medium text-gray-900 inline-flex items-center gap-1.5">
            {headlineLabel}
            <TrendUp weight="bold" className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <div className="text-right">
          {headlineValue && (
            <div className="text-2xl font-medium text-gray-900 tabular-nums">{headlineValue}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                active
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${
                t.key === 'mrr' ? 'bg-emerald-500'
                : t.key === 'lifetime' ? 'bg-sky-500'
                : 'bg-gradient-to-r from-emerald-500 to-sky-500'
              }`} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="h-[260px]">
        <Line data={data} options={options} />
      </div>
    </motion.div>
  )
}
