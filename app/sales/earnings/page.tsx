'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { WarningCircle, ArrowRight } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

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
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  started_at: string
  commission_total_cents: number
  commission_owed_cents: number
}

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

function nextFriday(): string {
  const d = new Date()
  const delta = (5 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SalesEarningsPage() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
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
            {/* Owed — hero */}
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
              className="grid grid-cols-3 gap-3 mb-6"
            >
              <Stat label="MRR" value={dollars(totals?.mrr_cents ?? 0)} />
              <Stat label="Lifetime" value={dollars(totals?.lifetime_cents ?? 0)} />
              <Stat label="Paid out" value={dollars(totals?.paid_out_cents ?? 0)} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
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
                          <span className="tabular-nums">{dollars(c.monthly_cents)}/mo</span>
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
          </>
        )}
      </section>
    </SalesShell>
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
