'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, WarningCircle, ListChecks, Trophy, CurrencyDollar, Sparkle,
  Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from './_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Summary = {
  my_leads: number
  pending_closes: number
  mrr_cents: number
  owed_cents: number
}

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function SalesHome() {
  const [name, setName] = useState<string>('')
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [meRes, conRes, leadsRes, closesRes, earningsRes] = await Promise.all([
          fetchWithAuth('/api/me/profile'),
          fetchWithAuth('/api/sales/connect-onboarding'),
          fetchWithAuth('/api/sales/leads'),
          fetchWithAuth('/api/sales/closes'),
          fetchWithAuth('/api/sales/earnings'),
        ])
        if (cancelled) return
        const me = await meRes.json().catch(() => ({}))
        const con = await conRes.json().catch(() => ({}))
        const leads = await leadsRes.json().catch(() => ({}))
        const closes = await closesRes.json().catch(() => ({}))
        const earnings = await earningsRes.json().catch(() => ({}))
        setName(me?.profile?.name || me?.profile?.first_name || me?.profile?.email || '')
        setPayoutsEnabled(con?.ok ? !!con.payouts_enabled : false)
        setSummary({
          my_leads: (leads?.leads || []).length,
          pending_closes: (closes?.closes || []).filter((c: any) => c.status === 'pending').length,
          mrr_cents: earnings?.totals?.mrr_cents ?? 0,
          owed_cents: earnings?.totals?.owed_cents ?? 0,
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="overview"
          title={name ? `Welcome, ${name}` : 'Welcome'}
        />

        {payoutsEnabled === false && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
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

        {loading ? (
          <SalesLoadingState />
        ) : (
          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card
              href="/sales/leads"
              icon={ListChecks}
              eyebrow="Leads"
              value={String(summary?.my_leads ?? 0)}
              hint="in your pipeline"
              accent="sky"
            />
            <Card
              href="/sales/leads/scrape"
              icon={Sparkle}
              eyebrow="Scrape"
              value="Run"
              hint="pull new leads"
              accent="violet"
            />
            <Card
              href="/sales/closes"
              icon={Trophy}
              eyebrow="Closes"
              value={String(summary?.pending_closes ?? 0)}
              hint="awaiting review"
              accent="emerald"
            />
            <Card
              href="/sales/earnings"
              icon={CurrencyDollar}
              eyebrow="MRR"
              value={dollars(summary?.mrr_cents ?? 0)}
              hint={`${dollars(summary?.owed_cents ?? 0)} owed Fri`}
              accent="amber"
            />
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}

function Card({
  href, icon: Icon, eyebrow, value, hint, accent,
}: {
  href: string
  icon: PhosphorIcon
  eyebrow: string
  value: string
  hint: string
  accent: 'sky' | 'violet' | 'emerald' | 'amber'
}) {
  const accentBg = {
    sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
    violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  }[accent]
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
    >
      <Link
        href={href}
        className="group block bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-900/5 hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 transition-colors ${accentBg}`}>
          <Icon weight="duotone" className="w-5 h-5" />
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{eyebrow}</div>
        <div className="text-2xl font-medium text-gray-900 tabular-nums mt-0.5">
          {value}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{hint}</div>
      </Link>
    </motion.div>
  )
}
