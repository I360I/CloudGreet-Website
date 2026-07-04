'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  PhoneCall, PhoneIncoming, Target, CaretRight, Coffee,
  TrendUp, CalendarCheck,
} from '@phosphor-icons/react'
import { SetterShell, SetterLoadingState } from './_components/SetterShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { NotificationsBell } from '@/components/NotificationsBell'
import {
  NumberTicker, AnimatedCircularProgressBar, MiniBarChart, DualLineChart,
} from '@/app/_shared/magic-ui'

const EASE = [0.22, 1, 0.36, 1] as const
// Blue-family palette, adapted from the reference template's purple
// (no purple anywhere here - #2563eb is CloudGreet's established brand
// blue, already used as --cg-spot's light-mode value elsewhere).
const BLUE = '#2563eb'
const BLUE_LIGHT = '#bfdbfe'
const CYAN = '#0891b2'

type UpNextLead = { id: string; business_name: string | null; phone: string; status: string }
type WeeklyGoal = {
  target: number
  met_this_week: boolean
  streak_weeks: number
  bonus_earned: boolean
  bonus_amount: number
  streak_target: number
}

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
  weekly_goal: WeeklyGoal
}

const fmtPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^1/, '')
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Small pill matching the reference's "This week" / "Jul 2022" period tags. */
function PeriodTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium text-gray-500 border border-gray-200 rounded px-2 py-1 whitespace-nowrap">
      {children}
    </span>
  )
}

export default function SetterHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [ovRes, meRes] = await Promise.all([
          fetchWithAuth('/api/setter/overview'),
          fetchWithAuth('/api/me/profile'),
        ])
        const ov = await ovRes.json().catch(() => ({}))
        if (!cancelled && ov?.success) setData(ov)
        const me = await meRes.json().catch(() => ({}))
        if (!cancelled) {
          setFirstName(me?.profile?.first_name || me?.profile?.name?.split(' ')?.[0] || null)
        }
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
  const weeklyGoalRate = Math.min(100, (data.leads.demos_booked_week / data.weekly_goal.target) * 100)
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
        {/* Header - greeting + search-row equivalent (real actions
            instead of a decorative search bar), matching the reference's
            "Welcome Jess!" header treatment. */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
          <div>
            <h1 className="text-3xl md:text-[40px] font-semibold tracking-tight text-white leading-tight">
              {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
            </h1>
            <p className="text-sm text-blue-100/80 mt-1">Here's your setter dashboard for today.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/setter/leads/scrape"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-3.5 py-2 transition-colors"
            >
              <Target weight="fill" className="w-3.5 h-3.5" /> Scrape leads
            </Link>
            <Link
              href="/setter/leads"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 rounded-xl px-3.5 py-2 shadow-sm transition-colors"
            >
              <PhoneCall weight="fill" className="w-3.5 h-3.5" /> Start dialing
            </Link>
            <div className="ml-1 rounded-full bg-white/10 border border-white/15 w-9 h-9 flex items-center justify-center">
              <NotificationsBell basePath="/api/sales/notifications" theme="dark" />
            </div>
          </div>
        </div>

        {/* Row 1 - hero (Revenue-card equivalent: demos booked, dual
            trend lines) + two stacked icon-circle stat cards, matching
            the reference's Revenue / Onboarding+Profits composition. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-[32px] leading-none font-semibold text-gray-900 tabular-nums">
                  <NumberTicker value={data.leads.demos_booked_week} />
                </div>
                <div className="text-sm font-medium text-blue-600 mt-1.5">Demos booked this week</div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Dials
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Demos
                </span>
                <PeriodTag>This week</PeriodTag>
              </div>
            </div>
            <DualLineChart
              labels={data.daily.map((d) => dayLabel(d.date))}
              seriesA={data.daily.map((d) => d.dials)}
              seriesB={data.daily.map((d) => d.demos)}
              colorA={BLUE}
              colorB={CYAN}
              height={180}
              className="mt-4"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 flex-1 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <PhoneCall weight="duotone" className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-blue-600">Dials today</div>
                <div className="text-2xl font-semibold tabular-nums text-gray-900">
                  <NumberTicker value={data.calls.today.attempts} />
                </div>
              </div>
              <PeriodTag>Today</PeriodTag>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 flex-1 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                <PhoneIncoming weight="duotone" className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-blue-600">Connects today</div>
                <div className="text-2xl font-semibold tabular-nums text-gray-900">
                  <NumberTicker value={data.calls.today.connects} />
                </div>
              </div>
              <PeriodTag>Today</PeriodTag>
            </div>
          </div>
        </motion.div>

        {/* Row 2 - donut (Cars Sold equivalent) + bar chart (Vendor
            Activity equivalent) + tilted reminder card (Upcoming QBR
            equivalent, repurposed for the weekly-goal bonus streak). */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
        >
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-900">Connect rate</div>
              <PeriodTag>Today</PeriodTag>
            </div>
            <div className="flex items-center justify-center gap-6">
              <AnimatedCircularProgressBar
                value={connectRate}
                size={140}
                strokeWidth={14}
                gaugePrimaryColor={BLUE}
                gaugeSecondaryColor="#e0f2fe"
              >
                <span className="text-2xl font-semibold tabular-nums text-gray-900">
                  {Math.round(connectRate)}%
                </span>
              </AnimatedCircularProgressBar>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <div className="text-[11px] text-gray-500">Connected</div>
                    <div className="text-sm font-semibold text-gray-900 tabular-nums">{data.calls.today.connects}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-200 shrink-0" />
                  <div>
                    <div className="text-[11px] text-gray-500">No answer</div>
                    <div className="text-sm font-semibold text-gray-900 tabular-nums">
                      {Math.max(0, data.calls.today.attempts - data.calls.today.connects)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-900">Dials this week</div>
              <PeriodTag>This week</PeriodTag>
            </div>
            <MiniBarChart
              labels={data.daily.map((d) => dayLabel(d.date))}
              data={data.daily.map((d) => d.dials)}
              color={BLUE_LIGHT}
              highlightColor={BLUE}
              height={190}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 -rotate-2 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck weight="duotone" className="w-5 h-5 text-blue-600" />
              <div className="text-sm font-semibold text-gray-900">Weekly goal</div>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              {data.leads.demos_booked_week} of {data.weekly_goal.target} demos this week
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: data.weekly_goal.streak_target }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-semibold ${
                    i < data.weekly_goal.streak_weeks
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-gray-500 mb-4">
              {data.weekly_goal.bonus_earned
                ? `🎉 $${data.weekly_goal.bonus_amount} bonus earned!`
                : `${data.weekly_goal.streak_weeks}/${data.weekly_goal.streak_target} weeks straight · $${data.weekly_goal.bonus_amount} bonus at ${data.weekly_goal.streak_target}`}
            </div>
            <Link
              href="/setter/leads"
              className="mt-auto inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full px-4 py-2.5 transition-colors"
            >
              <PhoneCall weight="fill" className="w-3.5 h-3.5" /> Keep dialing
            </Link>
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
