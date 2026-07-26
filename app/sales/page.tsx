'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Phone, ArrowRight, WarningCircle, Trophy, CaretRight, Coffee, CalendarBlank, PhoneCall, CircleNotch } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from './_components/SalesShell'
import { DecayBanner } from './_components/DecayBanner'
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
  demo_agent_status?: 'pending' | 'building' | 'ready' | 'skipped' | null
  demo_agent_test_phone?: string | null
}

type CalBooking = {
  id: string | number
  uid: string | null
  title: string
  start_iso: string
  end_iso: string
  status: string
  attendees: Array<{ name: string | null; email: string | null }>
}

type Activity = {
  today: { dials: number; connects: number; talk_seconds: number; last_call_at: string | null }
  week: { dials: number; connects: number; connect_rate: number; talk_seconds: number }
  series: Array<{ date: string; dials: number; connects: number }>
}
type Funnel = {
  leads_total: number; contacted: number; interested: number
  demos_set: number; demos_held: number; no_shows: number; won: number
  show_rate: number | null; win_rate: number | null
}
type Goal = { target: number; this_week: number; on_pace: boolean; daily_dial_goal?: number | null }

type Overview = {
  me: { name: string; payouts_enabled: boolean; cal_connected?: boolean }
  activity?: Activity
  funnel?: Funnel
  goal?: Goal
  prospects?: { count: number; monthly_cents: number }
  todays: LeadCard[]
  overdue: LeadCard[]
  interested: LeadCard[]
  deals: Deal[]
  earnings: { owed_cents: number; mrr_cents: number }
  cal_bookings?: CalBooking[]
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
  // Goal editor modal - the rep owns their own targets.
  const [editGoals, setEditGoals] = useState(false)
  const [gDemo, setGDemo] = useState('')
  const [gDial, setGDial] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalErr, setGoalErr] = useState('')

  const saveGoals = async () => {
    setSavingGoals(true); setGoalErr('')
    try {
      const res = await fetchWithAuth('/api/sales/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(gDemo !== '' ? { weekly_demo_goal: Number(gDemo) } : {}),
          ...(gDial !== '' ? { daily_dial_goal: Number(gDial) } : {}),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setGoalErr(j?.error || 'Failed to save'); return }
      const ov = await fetchWithAuth('/api/sales/overview')
      const oj = await ov.json().catch(() => ({}))
      if (oj?.success) setData(oj)
      setEditGoals(false)
    } catch {
      setGoalErr('Failed to save')
    } finally {
      setSavingGoals(false)
    }
  }


  // Initial load + lightweight polling so admin-side flips (demo agent
  // building / ready, customization status) reflect on the rep's
  // dashboard within ~20s without a manual refresh. Pauses while the
  // tab is backgrounded; refetches immediately on refocus.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/sales/overview')
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j?.success) setData(j)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const start = () => {
      stop()
      timer = setInterval(() => { void load() }, 20_000)
    }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { void load(); start() }
      else { stop() }
    }

    void load()
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') start()
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      cancelled = true
      stop()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [])

  if (loading || !data) {
    return (
      <SalesShell activeLabel="Overview">
        <section className="max-w-5xl mx-auto px-6 py-8">
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

  // Filter cal bookings to today only - anything tomorrow+ shows in
  // a separate "Upcoming demos" section so today's view stays tight.
  const calToday = (data.cal_bookings || []).filter((b) => {
    const start = new Date(b.start_iso)
    const today = new Date()
    return start.getFullYear() === today.getFullYear() &&
      start.getMonth() === today.getMonth() &&
      start.getDate() === today.getDate()
  })
  const calLater = (data.cal_bookings || []).filter((b) => !calToday.includes(b))

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <h1 className="font-display text-2xl md:text-[28px] font-semibold tracking-tight text-gray-900">
            Welcome, {data.me.name}
          </h1>
          <span className="text-xs" style={{ color: 'var(--dmut)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

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
              <button
                onClick={async () => {
                  try {
                    const r = await fetch('/api/sales/connect-onboarding', { method: 'POST', credentials: 'include' })
                    const j = await r.json().catch(() => ({}))
                    if (r.ok && j?.success && j.url) {
                      window.location.href = j.url
                    } else {
                      alert(j?.error || 'Could not start Stripe onboarding')
                    }
                  } catch {
                    alert('Could not start Stripe onboarding')
                  }
                }}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-900 hover:text-amber-700"
              >
                Connect bank <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Decay status - puts the 25%/transfer countdown in front of the rep
            every time they open the dashboard, so it's never a surprise. */}
        <div className="mb-5">
          <DecayBanner />
        </div>

        {/* Owed banner - biggest number on the page, the thing reps care about */}
        {/* Command-center stat strip: money, workload, demos, pipeline. */}
        <motion.div
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5"
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(150deg, #3FA0FF 0%, #007AFF 55%, #0063D1 100%)', boxShadow: '0 8px 24px rgba(0,122,255,.35), inset 0 1px 0 rgba(255,255,255,.25)' }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">Owed to you</div>
            <div className="text-[26px] leading-none font-bold tabular-nums mt-2">{dollars(data.earnings.owed_cents)}</div>
            <Link href="/sales/earnings" className="inline-flex mt-2.5 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white/20 hover:bg-white/30 transition-colors tabular-nums">
              Pays {nextFriday()} →
            </Link>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--dmut)' }}>Due today</div>
            <div className="text-[26px] leading-none font-bold tabular-nums text-gray-900 mt-2">{data.overdue.length + data.todays.length}</div>
            <div className="text-[11px] mt-2.5" style={{ color: data.overdue.length > 0 ? '#DC2626' : 'var(--dmut2)' }}>
              {data.overdue.length > 0 ? `${data.overdue.length} overdue` : 'nothing overdue'}
            </div>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--dmut)' }}>Demos today</div>
            <div className="text-[26px] leading-none font-bold tabular-nums text-gray-900 mt-2">{calToday.length}</div>
            <div className="text-[11px] mt-2.5 tabular-nums" style={{ color: 'var(--dmut2)' }}>
              {calToday.length > 0
                ? `next at ${fmtTime(calToday[0].start_iso)}`
                : data.me.cal_connected === false
                  ? <Link href="/sales/settings" className="hover:underline" style={{ color: 'var(--dblue)' }}>Connect Cal.com →</Link>
                  : 'none scheduled'}
            </div>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--dmut)' }}>Pipeline</div>
            <div className="text-[26px] leading-none font-bold tabular-nums text-gray-900 mt-2">{data.prospects?.count ?? data.deals.length}</div>
            <div className="text-[11px] mt-2.5 tabular-nums" style={{ color: 'var(--dmut2)' }}>
              {(data.prospects?.count ?? 0) > 0
                ? (data.prospects!.monthly_cents > 0 ? `${dollars(data.prospects!.monthly_cents)}/mo on the table` : 'demos in motion')
                : 'submit a close'}
            </div>
          </motion.div>
        </motion.div>

        {/* My numbers: the rep's own activity - dials, connects, talk
            time, 7-day trend, weekly demo goal pace. Data always existed
            in rep_calls; now the rep can finally see it. */}
        {data.activity && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.03 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-4 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">My numbers</div>
                <div className="text-sm font-medium text-gray-900">Today &amp; last 7 days</div>
              </div>
              {data.goal && (
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: data.goal.this_week >= data.goal.target
                          ? 'var(--dgreen)'
                          : data.goal.on_pace ? 'var(--dblue)' : 'var(--dorange)',
                      }}
                    />
                    Demos this week
                    <span className="font-semibold tabular-nums text-gray-900">{data.goal.this_week}/{data.goal.target}</span>
                    <span className="text-gray-400">
                      {data.goal.this_week >= data.goal.target ? 'goal hit' : data.goal.on_pace ? 'on pace' : 'behind pace'}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      setGDemo(String(data.goal!.target))
                      setGDial(data.goal!.daily_dial_goal ? String(data.goal!.daily_dial_goal) : '')
                      setGoalErr(''); setEditGoals(true)
                    }}
                    className="text-[11px] font-medium text-gray-400 hover:text-gray-700 hover:underline underline-offset-2 transition-colors"
                    title="Edit your goals"
                  >
                    Edit goals
                  </button>
                </div>
              )}
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--dmut)' }}>Dials today</div>
                <div className="text-[24px] leading-none font-bold tabular-nums text-gray-900 mt-1.5">
                  {data.activity.today.dials}
                  {data.goal?.daily_dial_goal ? (
                    <span className="text-sm font-semibold" style={{ color: data.activity.today.dials >= data.goal.daily_dial_goal ? 'var(--dgreen-deep)' : 'var(--dmut2, #94A3B8)' }}>
                      /{data.goal.daily_dial_goal}
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--dmut)' }}>Connects</div>
                <div className="text-[24px] leading-none font-bold tabular-nums text-gray-900 mt-1.5">{data.activity.today.connects}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--dmut)' }}>Talk time</div>
                <div className="text-[24px] leading-none font-bold tabular-nums text-gray-900 mt-1.5">
                  {Math.floor(data.activity.today.talk_seconds / 60)}<span className="text-sm font-semibold text-gray-400">m</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--dmut)' }}>Connect rate 7d</div>
                <div className="text-[24px] leading-none font-bold tabular-nums text-gray-900 mt-1.5">
                  {Math.round(data.activity.week.connect_rate * 100)}<span className="text-sm font-semibold text-gray-400">%</span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1.5" style={{ color: 'var(--dmut)' }}>7-day dials</div>
                <div className="flex items-end gap-1 h-10">
                  {data.activity.series.map((d) => {
                    const max = Math.max(...data.activity!.series.map((x) => x.dials), 1)
                    return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end gap-px" title={`${d.date}: ${d.dials} dials · ${d.connects} connects`}>
                        <div className="rounded-sm" style={{ height: `${Math.max(6, (d.dials / max) * 100)}%`, background: d.dials > 0 ? 'var(--dblue)' : 'var(--dseg)', opacity: d.dials > 0 ? 0.85 : 1 }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {data.funnel && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap text-[12px]">
                {([
                  ['Leads', data.funnel.leads_total],
                  ['Contacted', data.funnel.contacted],
                  ['Interested', data.funnel.interested],
                  ['Demos set', data.funnel.demos_set],
                  ['Held', data.funnel.demos_held],
                  ['Won', data.funnel.won],
                ] as const).map(([label, val], i, arr) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold tabular-nums text-gray-900">{val}</span>
                      <span style={{ color: 'var(--dmut)' }}>{label}</span>
                    </span>
                    {i < arr.length - 1 && <CaretRight className="w-3 h-3 text-gray-300" />}
                  </span>
                ))}
                <span className="ml-auto flex items-center gap-3">
                  {data.funnel.show_rate !== null && (
                    <span style={{ color: 'var(--dmut)' }}>Show rate <b className="tabular-nums text-gray-900">{Math.round(data.funnel.show_rate * 100)}%</b></span>
                  )}
                  {data.funnel.win_rate !== null && (
                    <span style={{ color: 'var(--dmut)' }}>Win rate <b className="tabular-nums text-gray-900">{Math.round(data.funnel.win_rate * 100)}%</b></span>
                  )}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Workday grid: call queue is the job (left); demos + pipeline
            keep score (right). */}
        <div className="grid lg:grid-cols-5 gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Today&apos;s calls
              </div>
              <div className="text-sm font-medium text-gray-900">
                {callList.length === 0 ? 'No follow-ups due' : `${callList.length} to call`}
              </div>
            </div>
            <Link
              href="/sales/leads?powerdial=1"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: 'var(--dblue)' }}
            >
              <PhoneCall weight="fill" className="w-3.5 h-3.5" /> Power dial
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
                      onClick={(e) => {
                        // In-browser dialer first (same behavior as the
                        // leads list); tel: only as the mobile fallback.
                        if (typeof window !== 'undefined' && (window as any).cgDial && l.phone) {
                          e.preventDefault()
                          ;(window as any).cgDial(l.phone, l.lead_id)
                        }
                      }}
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

        <div className="lg:col-span-2 space-y-4">
        {/* Demos: today first, then upcoming. */}
        {(calToday.length > 0 || calLater.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.08 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >
            {calToday.length > 0 && (
              <ul className="divide-y divide-gray-100 border-b border-gray-100">
                {calToday.map((b) => (
                  <CalRow key={b.id} booking={b} />
                ))}
              </ul>
            )}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  Upcoming demos
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {calLater.length} on your calendar
                </div>
              </div>
              <a
                href="https://app.cal.com/bookings/upcoming"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
              >
                Cal.com <CaretRight className="w-3 h-3" />
              </a>
            </div>
            <ul className="divide-y divide-gray-100">
              {calLater.slice(0, 8).map((b) => <CalRow key={b.id} booking={b} />)}
            </ul>
          </motion.div>
        )}

        {/* Active deals - only if any. Small, just a heads-up. */}
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
                    {d.demo_agent_status === 'building' && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
                        Demo agent building
                      </div>
                    )}
                    {d.demo_agent_status === 'ready' && d.demo_agent_test_phone && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        Demo ready · <span className="font-mono">{d.demo_agent_test_phone}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        </div>
        </div>

        {/* Goal editor - the rep sets their own weekly demo + daily dial targets */}
        {editGoals && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.4)' }}
            onClick={() => { if (!savingGoals) setEditGoals(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Goals</div>
              <h2 className="text-base font-semibold text-gray-900 mt-0.5 mb-4">Set your targets</h2>
              <label className="block text-xs font-medium text-gray-600 mb-1">Demos per week</label>
              <input
                type="number" min={1} max={50} value={gDemo}
                onChange={(e) => setGDemo(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-gray-400"
              />
              <label className="block text-xs font-medium text-gray-600 mb-1">Dials per day</label>
              <input
                type="number" min={5} max={500} value={gDial}
                onChange={(e) => setGDial(e.target.value)}
                placeholder="e.g. 50"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Pros run 50 to 80 dials a day. Demos count when they&apos;re on the calendar for this week.
              </p>
              {goalErr && <p className="text-xs text-red-600 mt-2">{goalErr}</p>}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setEditGoals(false)}
                  disabled={savingGoals}
                  className="text-sm text-gray-600 hover:text-gray-900 rounded-lg px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveGoals}
                  disabled={savingGoals}
                  className="inline-flex items-center gap-1.5 text-sm text-white rounded-lg px-4 py-2 disabled:opacity-60"
                  style={{ background: 'var(--dblue)' }}
                >
                  {savingGoals && <CircleNotch className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>
    </SalesShell>
  )
}

function CalRow({ booking }: { booking: CalBooking }) {
  const start = new Date(booking.start_iso)
  const today = new Date()
  const isToday = start.toDateString() === today.toDateString()
  const time = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const dateLabel = isToday
    ? time
    : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`
  const attendee = booking.attendees[0]
  const display = attendee?.name || attendee?.email || booking.title
  const calUrl = booking.uid
    ? `https://app.cal.com/booking/${booking.uid}`
    : 'https://app.cal.com/bookings/upcoming'
  return (
    <li>
      <a
        href={calUrl}
        target="_blank"
        rel="noreferrer"
        className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors"
        title="Open this booking in Cal.com"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 inline-flex items-center justify-center flex-shrink-0">
          <CalendarBlank weight="duotone" className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{display}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
            <span>{booking.title}</span>
            {attendee?.email && display !== attendee.email && (
              <>
                <span className="text-gray-300">·</span>
                <span>{attendee.email}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-xs text-violet-700 font-medium flex-shrink-0">{dateLabel}</span>
      </a>
    </li>
  )
}
