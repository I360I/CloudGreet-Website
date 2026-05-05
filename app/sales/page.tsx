'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Phone, EnvelopeSimple, ArrowRight, WarningCircle, Sparkle, UploadSimple,
  Trophy, CurrencyDollar, ListChecks, Clock, Fire, ChatCircle, CaretRight,
  Coffee,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from './_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type LeadCard = {
  lead_id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  follow_up_at: string | null
  status: string
  assigned_at?: string | null
  last_touched_at?: string | null
}

type Deal = {
  id: string
  prospect_business_name: string
  agreed_monthly_cents: number
  agreed_setup_fee_cents: number | null
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  created_at: string
  business_id: string | null
}

type Overview = {
  me: { name: string; payouts_enabled: boolean }
  todays: LeadCard[]
  overdue: LeadCard[]
  interested: LeadCard[]
  stale: LeadCard[]
  pipeline: Record<string, number>
  deals: Deal[]
  earnings: { mtd_commission_cents: number; owed_cents: number; mrr_cents: number }
}

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatPhone = (p: string | null) => {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return p
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function SalesHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/overview')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (j?.success) setData(j)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) {
    return (
      <SalesShell activeLabel="Overview">
        <section className="max-w-6xl mx-auto px-6 py-10">
          <SalesLoadingState />
        </section>
      </SalesShell>
    )
  }

  const todaysCount = data.todays.length + data.overdue.length
  const interestedCount = data.interested.length
  const dealsTotal = data.deals.reduce((s, d) => s + d.agreed_monthly_cents, 0)

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-6xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="overview"
          title={`Welcome, ${data.me.name}`}
        />

        {!data.me.payouts_enabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Bank not connected yet</p>
              <p className="text-xs text-amber-800 mt-1">
                Finish your Stripe Connect setup so Friday auto-payouts can deposit.
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

        {/* Quick actions */}
        <motion.div
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6"
        >
          <QuickAction href="/sales/leads/scrape" icon={Sparkle} label="Scrape" accent="violet" />
          <QuickAction href="/sales/leads" icon={ListChecks} label="My leads" accent="sky" />
          <QuickAction href="/sales/closes/new" icon={Trophy} label="Submit close" accent="emerald" />
          <QuickAction href="/sales/earnings" icon={CurrencyDollar} label="Earnings" accent="amber" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Today's mission — primary column */}
          <div className="lg:col-span-2 space-y-5">
            <Section
              title={todaysCount > 0 ? "Today's mission" : 'Today is clear'}
              eyebrow={todaysCount > 0 ? `${todaysCount} to call` : 'no follow-ups due'}
              icon={Fire}
              accent="rose"
            >
              {todaysCount === 0 ? (
                <EmptyMessage
                  icon={Coffee}
                  title="No follow-ups scheduled for today."
                  hint="Pick fresh leads and start dialing."
                  cta={{ href: '/sales/leads', label: 'Open my leads' }}
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.overdue.map((l) => (
                    <LeadRow key={l.lead_id} lead={l} overdue />
                  ))}
                  {data.todays.map((l) => (
                    <LeadRow key={l.lead_id} lead={l} />
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Active deals"
              eyebrow={`${data.deals.length} in flight · ${dollars(dealsTotal)}/mo`}
              icon={Trophy}
              accent="emerald"
              right={
                <Link
                  href="/sales/closes"
                  className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                >
                  All <CaretRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.deals.length === 0 ? (
                <EmptyMessage
                  icon={Trophy}
                  title="No deals yet."
                  hint="Submit a close when you sign someone."
                  cta={{ href: '/sales/closes/new', label: 'Submit close' }}
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.deals.slice(0, 6).map((d) => (
                    <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                      <DealStatusDot status={d.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {d.prospect_business_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
                          {dollars(d.agreed_monthly_cents)}/mo
                          {d.agreed_setup_fee_cents
                            ? ` + ${dollars(d.agreed_setup_fee_cents)} setup`
                            : ''}
                          <span className="text-gray-300 mx-1.5">·</span>
                          {fmtDateShort(d.created_at)}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                        {d.status === 'invoice_sent' ? 'sent' : d.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {data.stale.length > 0 && (
              <Section
                title="Stale leads"
                eyebrow={`${data.stale.length} sitting >14 days`}
                icon={Clock}
                accent="amber"
                right={
                  <Link href="/sales/leads" className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
                    Work them <CaretRight className="w-3 h-3" />
                  </Link>
                }
              >
                <ul className="divide-y divide-gray-100">
                  {data.stale.slice(0, 5).map((l) => (
                    <LeadRow key={l.lead_id} lead={l} muted />
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/* Right column — interested + earnings */}
          <div className="space-y-5">
            <Section
              title="Hot prospects"
              eyebrow={`${interestedCount} need a push`}
              icon={Fire}
              accent="rose"
              compact
            >
              {interestedCount === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-gray-500">
                  Mark leads as <span className="font-mono">interested</span> after they bite — they show up here.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.interested.slice(0, 8).map((l) => (
                    <LeadRow key={l.lead_id} lead={l} compact />
                  ))}
                </ul>
              )}
            </Section>

            <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-lg shadow-gray-900/10">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                MTD earnings
              </div>
              <div className="text-2xl font-medium tabular-nums mt-1">
                {dollars(data.earnings.mtd_commission_cents)}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Owed</div>
                  <div className="text-base font-medium tabular-nums">
                    {dollars(data.earnings.owed_cents)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">MRR</div>
                  <div className="text-base font-medium tabular-nums">
                    {dollars(data.earnings.mrr_cents)}
                  </div>
                </div>
              </div>
              <Link
                href="/sales/earnings"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white mt-4 transition-colors"
              >
                Detail <CaretRight className="w-3 h-3" />
              </Link>
            </div>

            <Section
              title="Pipeline"
              eyebrow="status counts"
              icon={ListChecks}
              accent="sky"
              compact
            >
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {[
                  ['new', 'New'],
                  ['called', 'Called'],
                  ['voicemail', 'Voicemail'],
                  ['interested', 'Interested'],
                  ['demo_scheduled', 'Demo set'],
                  ['proposal_sent', 'Proposal'],
                ].map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between px-2 py-1 text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono tabular-nums text-gray-900">
                      {data.pipeline[k] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </section>
    </SalesShell>
  )
}

/* ---------------- helpers / sub-components ---------------- */

function QuickAction({
  href, icon: Icon, label, accent,
}: {
  href: string
  icon: any
  label: string
  accent: 'sky' | 'violet' | 'emerald' | 'amber'
}) {
  const colors = {
    sky: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  }[accent]
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
    >
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${colors}`}
      >
        <Icon weight="duotone" className="w-5 h-5" />
        {label}
      </Link>
    </motion.div>
  )
}

function Section({
  title, eyebrow, icon: Icon, accent, right, children, compact = false,
}: {
  title: string
  eyebrow: string
  icon: any
  accent: 'rose' | 'sky' | 'emerald' | 'amber' | 'violet'
  right?: React.ReactNode
  children: React.ReactNode
  compact?: boolean
}) {
  const tile = {
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className={`flex items-center justify-between gap-3 ${compact ? 'px-4 py-3' : 'px-5 py-4'} border-b border-gray-100`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${tile} flex-shrink-0`}>
            <Icon weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
              {eyebrow}
            </div>
            <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
          </div>
        </div>
        {right}
      </div>
      {children}
    </motion.div>
  )
}

function LeadRow({
  lead, overdue = false, muted = false, compact = false,
}: {
  lead: LeadCard
  overdue?: boolean
  muted?: boolean
  compact?: boolean
}) {
  return (
    <li className={`flex items-start gap-3 ${compact ? 'px-4 py-2.5' : 'px-5 py-3'} hover:bg-gray-50/60 transition-colors`}>
      <div className="flex-1 min-w-0">
        <Link
          href={`/sales/leads/${lead.lead_id}`}
          className="text-sm font-medium text-gray-900 hover:text-gray-700 truncate block"
        >
          {lead.business_name}
        </Link>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
          {lead.contact_name && <span>{lead.contact_name}</span>}
          {lead.follow_up_at && (
            <span className={overdue ? 'text-rose-600 font-medium' : 'text-gray-500'}>
              {overdue ? 'overdue' : fmtTime(lead.follow_up_at)}
            </span>
          )}
          {lead.status !== 'new' && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
              {lead.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors"
            aria-label="Call"
          >
            <Phone weight="bold" className="w-3.5 h-3.5" />
          </a>
        )}
        {!compact && lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors"
            aria-label="Email"
          >
            <EnvelopeSimple weight="bold" className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </li>
  )
}

function DealStatusDot({ status }: { status: Deal['status'] }) {
  const cls = {
    pending: 'bg-amber-400',
    invoice_sent: 'bg-sky-400',
    paid: 'bg-emerald-500',
    cancelled: 'bg-gray-300',
    rejected: 'bg-red-400',
  }[status]
  return <span className={`w-2 h-2 rounded-full ${cls} flex-shrink-0`} />
}

function EmptyMessage({
  icon: Icon, title, hint, cta,
}: {
  icon: any
  title: string
  hint: string
  cta?: { href: string; label: string }
}) {
  return (
    <div className="px-5 py-8 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 mb-3">
        <Icon weight="duotone" className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-700 font-medium">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          {cta.label} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
