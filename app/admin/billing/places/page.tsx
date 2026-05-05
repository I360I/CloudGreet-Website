'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Loader2, AlertCircle, ArrowLeft, RefreshCw, ExternalLink,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel, PanelHeader } from '../../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

type SpendRange = {
  range: 'today' | 'mtd' | 'last_30d' | 'last_90d'
  start_iso: string
  end_iso: string
  list_cost_usd: number
  credit_usd: number
  net_cost_usd: number
  skus: Array<{
    sku_id: string
    sku_description: string
    list_cost_usd: number
    credit_usd: number
    net_cost_usd: number
    usage_amount: number
    usage_unit: string | null
  }>
}

type Dashboard = {
  success: boolean
  configured: boolean
  error?: string
  today?: SpendRange
  mtd?: SpendRange
  last_30d?: SpendRange
  last_90d?: SpendRange
  freshness_iso?: string | null
}

const dollars = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PlacesBillingPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState('')

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    setErr('')
    try {
      const res = await fetchWithAuth('/api/admin/billing/places')
      const j = await res.json().catch(() => ({}))
      setData(j)
      if (!j.success) setErr(j?.error || `Status ${res.status}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const ranges: Array<{ key: 'today' | 'mtd' | 'last_30d' | 'last_90d'; label: string; hint: string }> = [
    { key: 'today',    label: 'Today',     hint: 'UTC day so far' },
    { key: 'mtd',      label: 'MTD',       hint: 'this billing month' },
    { key: 'last_30d', label: 'Last 30d',  hint: 'rolling window' },
    { key: 'last_90d', label: 'Last 90d',  hint: 'rolling window' },
  ]

  return (
    <AdminShell activeLabel="Billing">
      <section className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="max-w-6xl space-y-6">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> back to billing
          </Link>

          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
                gcp · real-time
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
                Places API spend
              </h1>
              <p className="text-sm text-gray-400 mt-2 max-w-2xl">
                Pulled directly from the BigQuery billing export. These are post-credit
                numbers - same as what GCP will invoice. Detailed billing exports lag
                actual usage by ~6–12 hours.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-2 disabled:opacity-60"
              >
                {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </button>
              <a
                href="https://console.cloud.google.com/billing"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-2"
              >
                GCP Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </header>

          {data?.freshness_iso && (
            <div className="text-[11px] text-gray-500 font-mono">
              latest billing row: {new Date(data.freshness_iso).toLocaleString()}
            </div>
          )}

          {loading && !data ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : !data?.configured ? (
            <Panel>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">GCP billing export not configured</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Set <code className="font-mono text-xs bg-white/[0.04] px-1 rounded">GCP_BILLING_PROJECT_ID</code>,
                    <code className="font-mono text-xs bg-white/[0.04] px-1 rounded ml-1">GCP_BILLING_DATASET</code>,
                    and <code className="font-mono text-xs bg-white/[0.04] px-1 rounded">GCP_BILLING_SA_JSON</code> in
                    Vercel, then redeploy.
                  </p>
                </div>
              </div>
            </Panel>
          ) : err ? (
            <Panel>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">Couldn&apos;t query billing export</h3>
                  <p className="text-sm text-gray-400 mt-1.5 whitespace-pre-wrap">{err}</p>
                </div>
              </div>
            </Panel>
          ) : (
            <>
              <motion.div
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {ranges.map((r) => {
                  const v = data?.[r.key]
                  return (
                    <motion.div
                      key={r.key}
                      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                    >
                      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                        {r.label}
                      </div>
                      <div className="text-2xl font-medium text-white tabular-nums">
                        {v ? dollars(v.net_cost_usd) : '-'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1.5 flex flex-col gap-0.5">
                        <span>{r.hint}</span>
                        {v && v.credit_usd < 0 && (
                          <span className="text-emerald-400/80">
                            ↘ {dollars(Math.abs(v.credit_usd))} credits
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>

              <Panel padding="none">
                <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
                  <PanelHeader title="MTD breakdown by SKU" eyebrow="this billing month" />
                </div>
                {(data?.mtd?.skus.length ?? 0) === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">
                    No Places-API charges yet this month.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {data!.mtd!.skus.map((s) => (
                      <li key={s.sku_id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">{s.sku_description}</div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex flex-wrap gap-x-3">
                            <span>{s.sku_id}</span>
                            {s.usage_amount > 0 && (
                              <span>
                                {s.usage_amount.toLocaleString()} {s.usage_unit || 'units'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-white tabular-nums">
                            {dollars(Math.max(0, s.net_cost_usd))}
                          </div>
                          {s.credit_usd < 0 ? (
                            <div className="text-[11px] text-gray-500">
                              {dollars(s.list_cost_usd)} − {dollars(Math.abs(s.credit_usd))} credit
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500">{dollars(s.list_cost_usd)} list</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      </section>
    </AdminShell>
  )
}
