'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendUp, Info, ArrowsCounterClockwise, CircleNotch } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Inputs = {
  bookings_per_week: number
  close_rate: number
  closes_per_week: number
  avg_monthly_cents: number
  avg_setup_cents: number
  based_on: 'history' | 'defaults'
  history_weeks: number
}

type MonthlyEntry = {
  month: string
  new_closes: number
  setup_commission_cents: number
  recurring_commission_cents: number
  this_month_earnings_cents: number
  cumulative_mrr_book_cents: number
  total_earned_to_date_cents: number
}

type ForecastResponse = {
  inputs: Inputs
  history: {
    weeks_active: number
    paid_closes: number
    demos_set: number
    avg_monthly_cents: number
    avg_setup_cents: number
  }
  monthly: MonthlyEntry[]
}

/**
 * Revenue forecast panel for /sales/earnings.
 *
 * Pulls a rolling 8-week window of the rep's actual activity, projects
 * 12 months forward at 50% commission, and lets the rep override each
 * input (bookings/week, close rate, avg monthly $, avg setup $) to
 * model "what if I doubled my dial volume" scenarios.
 */
export function ForecastPanel() {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [overrides, setOverrides] = useState<{
    bookings_per_week?: number
    close_rate?: number
    avg_monthly?: number
    avg_setup?: number
  }>({})

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => { void load() }, 200)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides.bookings_per_week, overrides.close_rate, overrides.avg_monthly, overrides.avg_setup])

  const load = async () => {
    try {
      const qs = new URLSearchParams()
      if (overrides.bookings_per_week !== undefined) qs.set('bookings_per_week', String(overrides.bookings_per_week))
      if (overrides.close_rate !== undefined) qs.set('close_rate', String(overrides.close_rate))
      if (overrides.avg_monthly !== undefined) qs.set('avg_monthly', String(overrides.avg_monthly))
      if (overrides.avg_setup !== undefined) qs.set('avg_setup', String(overrides.avg_setup))
      const r = await fetchWithAuth(`/api/sales/forecast${qs.toString() ? `?${qs}` : ''}`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Forecast failed')
      } else {
        setError('')
        setData({ inputs: j.inputs, history: j.history, monthly: j.monthly })
      }
    } finally {
      setLoading(false)
    }
  }

  const reset = () => setOverrides({})

  const peakEarnings = useMemo(() => {
    if (!data) return 0
    return Math.max(...data.monthly.map((m) => m.this_month_earnings_cents))
  }, [data])

  const month12 = data?.monthly[data.monthly.length - 1]
  const month6 = data?.monthly[5]
  const yearTotal = data?.monthly.reduce((n, m) => n + m.this_month_earnings_cents, 0) ?? 0

  const usingOverrides = Object.values(overrides).some((v) => v !== undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6"
    >
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendUp weight="fill" className="w-4 h-4 text-emerald-600" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
              Forecast · 12 months
            </div>
            <div className="text-sm font-medium text-gray-900">
              The compound view
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="p-1 text-gray-400 hover:text-gray-700"
            aria-label="What does this forecast?"
            title="How is this calculated?"
          >
            <Info className="w-4 h-4" />
          </button>
          {usingOverrides && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] inline-flex items-center gap-1 text-gray-500 hover:text-gray-900"
            >
              <ArrowsCounterClockwise className="w-3 h-3" /> Reset to history
            </button>
          )}
        </div>
      </div>

      {showInfo && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-[12px] leading-relaxed text-gray-700">
          Pulls the last <strong>8 weeks</strong> of your activity:
          demos scheduled, paid closes, and the average monthly + setup
          $ on those closes. Projects forward at 50% commission, with
          MRR commission compounding month over month
          (last month&apos;s book + this month&apos;s new closes). Adjust
          any input below to model a faster ramp - the chart updates
          live. Active-rep math only; trailing decay isn&apos;t simulated
          here, your real earnings page already shows the actual tier.
        </div>
      )}

      {loading && !data ? (
        <div className="py-10 text-center text-sm text-gray-500">
          <CircleNotch className="w-4 h-4 animate-spin inline-block mr-2" />
          Crunching your numbers…
        </div>
      ) : error ? (
        <div className="px-5 py-4 text-sm text-rose-700 bg-rose-50">{error}</div>
      ) : data ? (
        <div className="p-5 space-y-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat
              label="In month 6"
              value={fmtMoney(month6?.this_month_earnings_cents ?? 0)}
              hint="That month's commission"
            />
            <Stat
              label="In month 12"
              value={fmtMoney(month12?.this_month_earnings_cents ?? 0)}
              hint="That month's commission"
              accent
            />
            <Stat
              label="12-month total"
              value={fmtMoney(yearTotal)}
              hint="Sum of every month"
            />
          </div>

          {/* Inputs */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
              Inputs · {data.inputs.based_on === 'history'
                ? `from your last ${data.inputs.history_weeks} weeks`
                : 'using defaults until you have more history'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NumberInput
                label="Demos / week"
                value={overrides.bookings_per_week ?? data.inputs.bookings_per_week}
                onChange={(n) => setOverrides({ ...overrides, bookings_per_week: n })}
                step={1}
              />
              <NumberInput
                label="Close rate %"
                value={Math.round((overrides.close_rate ?? data.inputs.close_rate) * 100)}
                onChange={(n) => setOverrides({ ...overrides, close_rate: n / 100 })}
                step={5}
                suffix="%"
              />
              <NumberInput
                label="Avg monthly $"
                value={(overrides.avg_monthly ?? (data.inputs.avg_monthly_cents / 100))}
                onChange={(n) => setOverrides({ ...overrides, avg_monthly: n })}
                step={50}
                prefix="$"
              />
              <NumberInput
                label="Avg setup $"
                value={(overrides.avg_setup ?? (data.inputs.avg_setup_cents / 100))}
                onChange={(n) => setOverrides({ ...overrides, avg_setup: n })}
                step={100}
                prefix="$"
              />
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Implied closes / week:{' '}
              <span className="font-mono text-gray-900">
                {round(
                  (overrides.bookings_per_week ?? data.inputs.bookings_per_week) *
                    (overrides.close_rate ?? data.inputs.close_rate),
                  2,
                )}
              </span>
            </div>
          </div>

          {/* Bar chart */}
          <Chart entries={data.monthly} peak={peakEarnings} />

          {/* Table footer */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-900">
              See month-by-month breakdown
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-1.5 pr-4">Month</th>
                    <th className="py-1.5 pr-4 text-right">New closes</th>
                    <th className="py-1.5 pr-4 text-right">Setup $</th>
                    <th className="py-1.5 pr-4 text-right">Recurring $</th>
                    <th className="py-1.5 pr-4 text-right">This month</th>
                    <th className="py-1.5 pr-4 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 tabular-nums">
                  {data.monthly.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">{m.month}</td>
                      <td className="py-1.5 pr-4 text-right">{m.new_closes}</td>
                      <td className="py-1.5 pr-4 text-right">{fmtMoney(m.setup_commission_cents)}</td>
                      <td className="py-1.5 pr-4 text-right">{fmtMoney(m.recurring_commission_cents)}</td>
                      <td className="py-1.5 pr-4 text-right font-medium">{fmtMoney(m.this_month_earnings_cents)}</td>
                      <td className="py-1.5 pr-4 text-right text-gray-500">{fmtMoney(m.total_earned_to_date_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ) : null}
    </motion.div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-xl font-medium tabular-nums mt-0.5 ${accent ? 'text-emerald-900' : 'text-gray-900'}`}>{value}</div>
      {hint && <div className="text-[10px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  )
}

function NumberInput({
  label, value, onChange, step = 1, prefix, suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
  prefix?: string
  suffix?: string
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
          className={`w-full bg-white border border-gray-200 rounded-lg py-1.5 text-sm tabular-nums focus:outline-none focus:border-gray-400 ${prefix ? 'pl-6' : 'pl-2.5'} ${suffix ? 'pr-6' : 'pr-2'}`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>
        )}
      </div>
    </label>
  )
}

function Chart({ entries, peak }: { entries: MonthlyEntry[]; peak: number }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
        Monthly earnings · compound view
      </div>
      <div className="flex items-end gap-1 h-28 border-b border-gray-200">
        {entries.map((m, i) => {
          const h = peak > 0 ? Math.max(2, (m.this_month_earnings_cents / peak) * 100) : 2
          const isLast = i === entries.length - 1
          return (
            // h-full + justify-end give the percentage-height bar a definite
            // parent to resolve against - without it the column is content-sized
            // (row is items-end) and every bar collapses to 0px, leaving the
            // chart blank even though the data is fine.
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
              <div
                className={`w-full rounded-t-sm transition-colors ${
                  isLast ? 'bg-emerald-600' : 'bg-emerald-200 group-hover:bg-emerald-400'
                }`}
                style={{ height: `${h}%` }}
              />
              <div className="hidden group-hover:block absolute -top-9 bg-gray-900 text-white text-[10px] font-mono px-1.5 py-1 rounded whitespace-nowrap z-10">
                {m.month}: {fmtMoney(m.this_month_earnings_cents)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1">
        {entries.map((m, i) => (
          <div key={i} className="flex-1 text-center truncate">{i % 2 === 0 ? m.month.slice(0, 3) : ''}</div>
        ))}
      </div>
    </div>
  )
}

function fmtMoney(cents: number): string {
  const n = Math.round(cents / 100)
  return `$${n.toLocaleString()}`
}

function round(n: number, digits = 0): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}
