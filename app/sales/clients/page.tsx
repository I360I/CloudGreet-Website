'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CaretRight, Robot, Phone, CircleNotch, Trophy, WarningCircle, CalendarBlank, CheckCircle } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Client = {
  id: string
  business_name: string
  business_type: string | null
  phone_number: string | null
  monthly_price_cents: number | null
  setup_fee_cents: number | null
  subscription_status: string | null
  account_status: string | null
  retell_agent_id: string | null
  edge_case_count: number
  created_at: string
  calcom_connected?: boolean | null
  cal_com_username?: string | null
  website?: string | null
  address?: string | null
}

function subscriptionPill(status: string | null) {
  if (!status) return null
  const s = status.toLowerCase()
  if (s === 'trialing' || s === 'trial') return { label: 'non-paying', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
  if (s === 'active') return { label: 'active', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
  if (s === 'past_due') return { label: 'past due', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  if (s === 'canceled' || s === 'cancelled') return { label: 'cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  if (s === 'pending') return { label: 'pending', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
}

const dollars = (cents: number | null | undefined) =>
  cents == null ? '-' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function SalesClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [migration, setMigration] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/clients')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setErr(j?.error || 'Failed to load clients')
        else {
          setClients(j.clients || [])
          setMigration(j.migration_needed || null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Only actually-paying accounts are "clients". Everyone else (pending,
  // trialing, inactive, unsigned externally-linked businesses) is a prospect
  // and lives on the Prospects tab - not here.
  const PAYING = new Set(['active', 'past_due'])
  const payingClients = clients.filter(
    (c) => PAYING.has((c.subscription_status || '').toLowerCase()),
  )

  return (
    <SalesShell activeLabel="Clients">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="clients"
          title="Your accounts"
        />

        {migration && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 text-amber-600" />
            <span>
              Agent editing isn&apos;t fully on yet. Ask admin to run{' '}
              <code className="font-mono text-xs bg-amber-100 px-1 rounded">sql/{migration}.sql</code>{' '}
              in Supabase.
            </span>
          </div>
        )}

        {err && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : payingClients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <Trophy weight="duotone" className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500">
              No clients yet. Once a prospect pays a payment link, they show up here
              and you can tweak their AI agent.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <ul className="divide-y divide-gray-100">
              {payingClients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/sales/clients/${c.id}`}
                    className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {c.business_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2.5">
                        {(() => {
                          const onTrial =
                            c.subscription_status === 'trialing' ||
                            c.subscription_status === 'trial'
                          const priceLabel = c.monthly_price_cents != null
                            ? `${dollars(c.monthly_price_cents)}/mo`
                            : '-/mo'
                          if (onTrial && c.monthly_price_cents != null) {
                            return (
                              <span className="tabular-nums line-through text-gray-400">
                                {priceLabel}
                              </span>
                            )
                          }
                          return <span className="tabular-nums">{priceLabel}</span>
                        })()}
                        {c.business_type && <><span className="text-gray-300">·</span><span>{c.business_type}</span></>}
                        {c.website && (
                          <>
                            <span className="text-gray-300">·</span>
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-600 hover:text-sky-800 truncate max-w-[180px]"
                              title={c.website}
                            >
                              {c.website.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          </>
                        )}
                        {(() => {
                          const sub = subscriptionPill(c.subscription_status)
                          return sub ? (
                            <span className={`text-[10px] font-mono uppercase tracking-wider rounded-full border px-1.5 py-0.5 ${sub.cls}`}>
                              {sub.label}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex flex-col items-end gap-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Robot weight={c.retell_agent_id ? 'duotone' : 'regular'} className={`w-3.5 h-3.5 ${c.retell_agent_id ? 'text-violet-500' : 'text-gray-400'}`} />
                        {c.retell_agent_id ? 'Agent live' : 'No agent'}
                      </span>
                      {c.calcom_connected && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CalendarBlank weight="duotone" className="w-3.5 h-3.5" />
                          Cal connected
                        </span>
                      )}
                      {c.edge_case_count > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {c.edge_case_count} rule{c.edge_case_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
