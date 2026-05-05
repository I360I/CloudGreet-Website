'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CaretRight, Robot, Phone, CircleNotch, Trophy, WarningCircle,
} from '@phosphor-icons/react'
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
}

const dollars = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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
              Agent editing isn&apos;t fully on yet. Tell Anthony to run{' '}
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
        ) : clients.length === 0 ? (
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
              {clients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/sales/clients/${c.id}`}
                    className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {c.business_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2.5">
                        <span className="tabular-nums">{dollars(c.monthly_price_cents)}/mo</span>
                        {c.business_type && <><span className="text-gray-300">·</span><span>{c.business_type}</span></>}
                        {c.subscription_status && <><span className="text-gray-300">·</span><span className={c.subscription_status === 'active' || c.subscription_status === 'trialing' ? 'text-emerald-700' : 'text-amber-700'}>{c.subscription_status}</span></>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex flex-col items-end">
                      <span className="inline-flex items-center gap-1">
                        <Robot weight={c.retell_agent_id ? 'duotone' : 'regular'} className={`w-3.5 h-3.5 ${c.retell_agent_id ? 'text-violet-500' : 'text-gray-400'}`} />
                        {c.retell_agent_id ? 'Agent live' : 'No agent'}
                      </span>
                      {c.edge_case_count > 0 && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
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
