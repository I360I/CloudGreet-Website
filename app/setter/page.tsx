'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PhoneCall, PhoneIncoming, Target, CaretRight, Coffee, CalendarCheck } from '@phosphor-icons/react'
import { SetterShell, SetterLoadingState } from './_components/SetterShell'
import { SalesPageHeader } from '@/app/sales/_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { NumberTicker, AnimatedCircularProgressBar, MiniSparkline, MiniBarChart } from '@/app/_shared/magic-ui'

const EASE = [0.22, 1, 0.36, 1] as const
// Blue-family-only palette (no purple/indigo) - #2563eb is the codebase's
// established light-mode brand blue (see --cg-spot light in globals.css).
const BAR_BLUE = '#bfdbfe'        // blue-200, resting bars
const BAR_BLUE_BOLD = '#2563eb'   // blue-600, highlighted (today) bar
const GAUGE_CYAN = '#0891b2'      // cyan-600, connect-rate gauge
const GAUGE_CYAN_TRACK = '#cffafe' // cyan-100
const GAUGE_TEAL = '#0d9488'      // teal-600, weekly-goal gauge
const GAUGE_TEAL_TRACK = '#ccfbf1' // teal-100
// v1 simplification: a fixed weekly target rather than an admin-configurable
// goal-setting feature (out of scope for this pass).
const WEEKLY_DEMO_GOAL = 5

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
}

const fmtMinutes = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return `${m}m`
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
        <section className="max-w-3xl mx-auto px-6 py-10">
          <SetterLoadingState />
        </section>
      </SetterShell>
    )
  }

  // Each KPI card gets its own subtle blue-family tint (sky / blue /
  // cyan / teal) per the approved design - deliberately varied, none violet.
  const stats = [
    {
      label: 'Dials today', value: data.calls.today.attempts, icon: PhoneCall,
      card: 'bg-sky-50', badge: 'bg-sky-100 text-sky-600',
    },
    {
      label: 'Connects today', value: data.calls.today.connects, icon: PhoneIncoming,
      card: 'bg-blue-50', badge: 'bg-blue-100 text-blue-600',
    },
  ]
  const connectRate =
    data.calls.today.attempts > 0
      ? (data.calls.today.connects / data.calls.today.attempts) * 100
      : 0
  const weeklyGoalRate = Math.min(100, (data.leads.demos_booked_week / WEEKLY_DEMO_GOAL) * 100)
  const dayLabel = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })

  return (
    <SetterShell activeLabel="Overview">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="overview" title="Your day" />

        {/* Demos booked - the headline setter metric. The ONE fully
            saturated element on the page; everything else is a soft tint. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-2xl p-5 mb-5 shadow-lg shadow-blue-600/25"
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-blue-100/80">
                Demos booked this week
              </div>
              <div className="text-3xl font-semibold tabular-nums mt-1">
                <NumberTicker value={data.leads.demos_booked_week} />
              </div>
              <div className="text-xs text-blue-100/80 mt-1">
                <NumberTicker value={data.leads.demos_booked_today} /> today
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <CalendarCheck weight="duotone" className="w-5 h-5 text-white" />
            </div>
          </div>
          {/* Plain hex only - MiniSparkline derives its area fill via a
              hex-alpha suffix (`${color}22`), so rgba() strings break it. */}
          <MiniSparkline
            data={data.daily.map((d) => d.demos)}
            color="#ffffff"
            height={36}
            className="mt-3 -mx-1"
          />
        </motion.div>

        {/* Today's dial activity - four tinted KPI cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"
        >
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`${s.card} rounded-2xl p-4 shadow-sm`}>
                <div className={`w-8 h-8 rounded-full ${s.badge} flex items-center justify-center mb-2.5`}>
                  <Icon weight="duotone" className="w-4 h-4" />
                </div>
                <div className="text-xl font-semibold tabular-nums text-gray-900">
                  <NumberTicker value={s.value} />
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            )
          })}
          <div className="bg-cyan-50 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center">
            <AnimatedCircularProgressBar
              value={connectRate}
              size={56}
              strokeWidth={6}
              gaugePrimaryColor={GAUGE_CYAN}
              gaugeSecondaryColor={GAUGE_CYAN_TRACK}
            >
              <span className="text-xs font-semibold tabular-nums text-gray-900">
                {Math.round(connectRate)}%
              </span>
            </AnimatedCircularProgressBar>
            <div className="text-[11px] text-gray-500 mt-2 text-center">
              Connect rate · {fmtMinutes(data.calls.today.talk_seconds)} talk
            </div>
          </div>
          <div className="bg-teal-50 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center">
            <AnimatedCircularProgressBar
              value={weeklyGoalRate}
              size={56}
              strokeWidth={6}
              gaugePrimaryColor={GAUGE_TEAL}
              gaugeSecondaryColor={GAUGE_TEAL_TRACK}
            >
              <span className="text-xs font-semibold tabular-nums text-gray-900">
                {Math.round(weeklyGoalRate)}%
              </span>
            </AnimatedCircularProgressBar>
            <div className="text-[11px] text-gray-500 mt-2 text-center">
              Weekly goal · {data.leads.demos_booked_week}/{WEEKLY_DEMO_GOAL}
            </div>
          </div>
        </motion.div>

        {/* Lead pipeline snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Your leads
              </div>
              <div className="text-sm font-medium text-gray-900">
                {data.leads.total === 0 ? 'No leads yet' : `${data.leads.total} total`}
              </div>
            </div>
            <Link
              href="/setter/leads"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Open leads <CaretRight className="w-3 h-3" />
            </Link>
          </div>

          {data.leads.total === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 mb-3">
                <Coffee weight="duotone" className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-700 font-medium">Nothing to work yet</p>
              <p className="text-xs text-gray-500 mt-0.5">Scrape a fresh list to start dialing.</p>
              <Link
                href="/setter/leads/scrape"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Target weight="fill" className="w-3 h-3" /> Scrape leads
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Untouched</span>
                <span className="font-medium tabular-nums text-gray-900">{data.leads.new}</span>
              </li>
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Interested</span>
                <span className="font-medium tabular-nums text-emerald-700">{data.leads.interested}</span>
              </li>
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Dead / DNC</span>
                <span className="font-medium tabular-nums text-gray-400">{data.leads.dead_or_dnc}</span>
              </li>
            </ul>
          )}
        </motion.div>

        {/* Dial activity over the last 7 days - capsule bars, today bold */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
          className="bg-white rounded-2xl shadow-sm p-5 mt-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Dial activity
              </div>
              <div className="text-sm font-medium text-gray-900">Dials this week</div>
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
            height={170}
          />
        </motion.div>
      </section>
    </SetterShell>
  )
}
