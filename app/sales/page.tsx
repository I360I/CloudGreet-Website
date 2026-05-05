'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Phone, ArrowRight, WarningCircle, Trophy, CaretRight, Coffee,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from './_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type LeadCard = {
  lead_id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  follow_up_at: string | null
  status: string
}

type Deal = {
  id: string
  prospect_business_name: string
  agreed_monthly_cents: number
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  created_at: string
}

type Overview = {
  me: { name: string; payouts_enabled: boolean }
  todays: LeadCard[]
  overdue: LeadCard[]
  interested: LeadCard[]
  deals: Deal[]
  earnings: { owed_cents: number; mrr_cents: number }
}

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function nextFriday(): string {
  const d = new Date()
  const delta = (5 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SalesHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/overview')
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j?.success) setData(j)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) {
    return (
      <SalesShell activeLabel="Overview">
        <section className="max-w-3xl mx-auto px-6 py-10">
          <SalesLoadingState />
        </section>
      </SalesShell>
    )
  }

  // One prioritized call list: overdue first, then due today, then
  // anything marked interested/demo/proposal that doesn't already have
  // a follow-up scheduled.
  const seen = new Set<string>()
  const callList: Array<LeadCard & { reason: 'overdue' | 'today' | 'hot' }> = []
  for (const l of data.overdue) {
    if (seen.has(l.lead_id)) continue
    seen.add(l.lead_id)
    callList.push({ ...l, reason: 'overdue' })
  }
  for (const l of data.todays) {
    if (seen.has(l.lead_id)) continue
    seen.add(l.lead_id)
    callList.push({ ...l, reason: 'today' })
  }
  for (const l of data.interested) {
    if (seen.has(l.lead_id)) continue
    seen.add(l.lead_id)
    callList.push({ ...l, reason: 'hot' })
  }

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="overview" title={`Welcome, ${data.me.name}`} />

        {!data.me.payouts_enabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Bank not connected yet</p>
              <p className="text-xs text-amber-800 mt-1">
                Finish Stripe Connect so Friday auto-payouts can deposit.
              </p>
              <Link
                href="/sales/onboarding"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-900 hover:text-amber-700"
              >
                Finish setup <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Owed banner — biggest number on the page, the thing reps care about */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-gray-900 text-white rounded-2xl p-5 mb-5 shadow-lg shadow-gray-900/10"
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Owed · pays {nextFriday()}
              </div>
              <div className="text-3xl font-medium tabular-nums mt-1">
                {dollars(data.earnings.owed_cents)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                MRR {dollars(data.earnings.mrr_cents)} · auto-deposits via Stripe
              </div>
            </div>
            <Link
              href="/sales/earnings"
              className="text-xs text-gray-300 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 transition-colors"
            >
              Detail
            </Link>
          </div>
        </motion.div>

        {/* Call list — the actual workday */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5"
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Call list
              </div>
              <div className="text-sm font-medium text-gray-900">
                {callList.length === 0 ? 'No follow-ups today' : `${callList.length} to call`}
              </div>
            </div>
            <Link
              href="/sales/leads"
              className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
            >
              All leads <CaretRight className="w-3 h-3" />
            </Link>
          </div>

          {callList.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 mb-3">
                <Coffee weight="duotone" className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-700 font-medium">Inbox zero</p>
              <p className="text-xs text-gray-500 mt-0.5">Pick fresh leads or import a list to start.</p>
              <Link
                href="/sales/leads"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-700 hover:text-gray-900"
              >
                Open my leads <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {callList.slice(0, 12).map((l) => (
                <li
                  key={l.lead_id}
                  className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/sales/leads/${l.lead_id}`}
                      className="text-sm font-medium text-gray-900 hover:text-gray-700 truncate block"
                    >
                      {l.business_name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      {l.contact_name && <span>{l.contact_name}</span>}
                      {l.reason === 'overdue' && (
                        <span className="text-rose-600 font-medium">overdue</span>
                      )}
                      {l.reason === 'today' && l.follow_up_at && (
                        <span className="text-amber-700">{fmtTime(l.follow_up_at)}</span>
                      )}
                      {l.reason === 'hot' && (
                        <span className="text-emerald-700">{l.status.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                  </div>
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors flex-shrink-0"
                      aria-label="Call"
                    >
                      <Phone weight="bold" className="w-4 h-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Active deals — only if any. Small, just a heads-up. */}
        {data.deals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  In flight
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {data.deals.length} deal{data.deals.length === 1 ? '' : 's'} pending
                </div>
              </div>
              <Link
                href="/sales/closes"
                className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
              >
                All <CaretRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {data.deals.slice(0, 5).map((d) => (
                <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <Trophy weight="duotone" className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{d.prospect_business_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
                      {dollars(d.agreed_monthly_cents)}/mo
                      <span className="text-gray-300 mx-1.5">·</span>
                      {d.status === 'invoice_sent' ? 'invoice sent' : 'pending review'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
