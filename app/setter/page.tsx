'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  PhoneCall, PhoneIncoming, Target, CaretRight, ArrowUpRight, Coffee,
  CalendarCheck, TrendUp,
} from '@phosphor-icons/react'
import { SetterShell, SetterLoadingState } from './_components/SetterShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { NumberTicker, AnimatedCircularProgressBar, MiniSparkline, MiniBarChart } from '@/app/_shared/magic-ui'

const EASE = [0.22, 1, 0.36, 1] as const
// Blue-family-only palette (no purple/indigo) - #2563eb is the codebase's
// established light-mode brand blue (see --cg-spot light in globals.css).
const BAR_BLUE = '#bfdbfe'         // blue-200, resting bars
const BAR_BLUE_BOLD = '#2563eb'    // blue-600, highlighted (today) bar
const GAUGE_CYAN = '#0891b2'       // cyan-600, connect-rate gauge
const GAUGE_CYAN_TRACK = '#cffafe' // cyan-100
const GAUGE_TEAL = '#0d9488'       // teal-600, weekly-goal gauge
const GAUGE_TEAL_TRACK = '#ccfbf1' // teal-100
// v1 simplification: a fixed weekly target rather than an admin-configurable
// goal-setting feature (out of scope for this pass).
const WEEKLY_DEMO_GOAL = 5

type UpNextLead = { id: string; business_name: string | null; phone: string; status: string }

type Overview = {
  calls: {
    today: { attempts: number; connects: number; talk_seconds: number }
    week: { attempts: number; connects: number; talk_seconds: number }
  }
  leads: {
    total: number
    new: number
    interested: number
    dead_or_dnc: number
    demos_booked_today: number
    demos_booked_week: number
  }
  daily: { date: string; dials: number; connects: number; demos: number }[]
  up_next: UpNextLead[]
}

const fmtMinutes = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return `${m}m`
}

const fmtPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^1/, '')
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function CornerLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
      aria-label="Open"
    >
      <ArrowUpRight className="w-3.5 h-3.5" />
    </Link>
  )
}

export default function SetterHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/setter/overview')
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j?.success) setData(j)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) {
    return (
      <SetterShell activeLabel="Overview">
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <SetterLoadingState />
        </section>
      </SetterShell>
    )
  }

  const connectRate =
    data.calls.today.attempts > 0
      ? (data.calls.today.connects / data.calls.today.attempts) * 100
      : 0
  const weeklyGoalRate = Math.min(100, (data.leads.demos_booked_week / WEEKLY_DEMO_GOAL) * 100)
  const dayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })

  const statusPill: Record<string, string> = {
    new: 'bg-sky-100 text-sky-700',
    interested: 'bg-emerald-100 text-emerald-700',
  }
  const statusLabel: Record<string, string> = { new: 'New', interested: 'Interested' }

  return (
    <SetterShell activeLabel="Overview">
      <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-1">Overview</div>
            <h1 className="font-display text-3xl md:text-[34px] font-semibold tracking-tight text-gray-900">
              Your day
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/setter/leads/scrape"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-xl px-3.5 py-2 shadow-sm"
            >
              <Target weight="fill" className="w-3.5 h-3.5" /> Scrape leads
            </Link>
            <Link
              href="/setter/leads"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-3.5 py-2 shadow-sm shadow-blue-600/25"
            >
              <PhoneCall weight="fill" className="w-3.5 h-3.5" /> Start dialing
            </Link>
          </div>
        </div>

        {/* Row 1 - four equal KPI tiles. The hero metric is simply the
            first tile made bold, not a separate oversized banner - this
            is how the real reference dashboards compose a "hero" number. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
        >
          <div className="relative bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-2xl p-5 shadow-lg shadow-blue-600/25 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center mb-3">
              <CalendarCheck weight="duotone" className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-[28px] leading-none font-semibold tabular-nums">
              <NumberTicker value={data.leads.demos_booked_week} />
            </div>
            <div className="text-xs text-blue-100/90 mt-2">
              Demos booked this week · <NumberTicker value={data.leads.demos_booked_today} /> today
            </div>
            <MiniSparkline
              data={data.daily.map((d) => d.demos)}
              color="#ffffff"
              height={28}
              className="mt-3 -mx-1"
            />
          </div>

          <div className="relative bg-sky-50 rounded-2xl p-5 shadow-sm">
            <CornerLink href="/setter/leads" />
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
              <PhoneCall weight="duotone" className="w-4 h-4" />
            </div>
            <div className="text-[28px] leading-none font-semibold tabular-nums text-gray-900">
              <NumberTicker value={data.calls.today.attempts} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Dials today</div>
          </div>

          <div className="relative bg-blue-50 rounded-2xl p-5 shadow-sm">
            <CornerLink href="/setter/leads" />
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <PhoneIncoming weight="duotone" className="w-4 h-4" />
            </div>
            <div className="text-[28px] leading-none font-semibold tabular-nums text-gray-900">
              <NumberTicker value={data.calls.today.connects} />
            </div>
            <div className="text-xs text-gray-500 mt-2">Connects today</div>
          </div>

          <div className="bg-cyan-50 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <AnimatedCircularProgressBar
              value={connectRate}
              size={64}
              strokeWidth={6}
              gaugePrimaryColor={GAUGE_CYAN}
              gaugeSecondaryColor={GAUGE_CYAN_TRACK}
            >
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {Math.round(connectRate)}%
              </span>
            </AnimatedCircularProgressBar>
            <div>
              <div className="text-sm font-semibold text-gray-900">Connect rate</div>
              <div className="text-xs text-gray-500 mt-0.5">{fmtMinutes(data.calls.today.talk_seconds)} talk today</div>
            </div>
          </div>
        </motion.div>

        {/* Row 2 - wide chart card + weekly-goal spotlight card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Dial activity</div>
                <div className="text-base font-semibold text-gray-900">Dials this week</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2 h-2 rounded-full bg-blue-600" aria-hidden /> Today
              </div>
            </div>
            <MiniBarChart
              labels={data.daily.map((d) => dayLabel(d.date))}
              data={data.daily.map((d) => d.dials)}
              color={BAR_BLUE}
              highlightColor={BAR_BLUE_BOLD}
              height={200}
            />
          </div>

          <div className="bg-teal-50 rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-teal-700/60 mb-3 self-start">
              Weekly goal
            </div>
            <AnimatedCircularProgressBar
              value={weeklyGoalRate}
              size={112}
              strokeWidth={10}
              gaugePrimaryColor={GAUGE_TEAL}
              gaugeSecondaryColor={GAUGE_TEAL_TRACK}
            >
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {Math.round(weeklyGoalRate)}%
              </span>
            </AnimatedCircularProgressBar>
            <div className="text-sm font-medium text-gray-900 mt-4">
              {data.leads.demos_booked_week} of {WEEKLY_DEMO_GOAL} demos
            </div>
            <div className="text-xs text-gray-500 mt-1">booked this week</div>
          </div>
        </motion.div>

        {/* Row 3 - up-next call list + pipeline breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Call priority</div>
                <div className="text-base font-semibold text-gray-900">Up next</div>
              </div>
              <TrendUp weight="fill" className="w-4 h-4 text-blue-600" />
            </div>
            {data.up_next.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 mb-3">
                  <Coffee weight="duotone" className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-700 font-medium">Nothing queued up</p>
                <p className="text-xs text-gray-500 mt-0.5">Scrape a fresh list to start dialing.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.up_next.map((lead) => (
                  <li key={lead.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                        {(lead.business_name || '?').slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {lead.business_name || 'Unnamed lead'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{fmtPhone(lead.phone)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusPill[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[lead.status] || lead.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => (window as any).cgDial?.(lead.phone, lead.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        aria-label={`Call ${lead.business_name || lead.phone}`}
                      >
                        <PhoneCall weight="fill" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Your leads</div>
                <div className="text-base font-semibold text-gray-900">
                  {data.leads.total === 0 ? 'No leads yet' : `${data.leads.total} total`}
                </div>
              </div>
              <Link
                href="/setter/leads"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 shrink-0"
              >
                Open <CaretRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              <li className="px-5 py-3.5 flex items-center justify-between text-sm">
                <span className="text-gray-600">Untouched</span>
                <span className="font-medium tabular-nums text-gray-900">{data.leads.new}</span>
              </li>
              <li className="px-5 py-3.5 flex items-center justify-between text-sm">
                <span className="text-gray-600">Interested</span>
                <span className="font-medium tabular-nums text-emerald-700">{data.leads.interested}</span>
              </li>
              <li className="px-5 py-3.5 flex items-center justify-between text-sm">
                <span className="text-gray-600">Dead / DNC</span>
                <span className="font-medium tabular-nums text-gray-400">{data.leads.dead_or_dnc}</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </section>
    </SetterShell>
  )
}
