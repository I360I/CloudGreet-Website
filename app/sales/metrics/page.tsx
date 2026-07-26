'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, animate } from 'framer-motion'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { SalesShell } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import type { MapPoint, MapHome } from './_TerritoryMap'

const TerritoryMap = dynamic(() => import('./_TerritoryMap'), { ssr: false, loading: () => <div style={{ height: 380 }} /> })

const EASE = [0.22, 1, 0.36, 1] as const

type Metrics = {
  range: number
  activity: {
    dials: number; connects: number; connect_rate: number; conversations: number
    talk_seconds: number; no_answers: number; voicemails: number; avg_call_seconds: number
  }
  hours: Array<{ hour: number; dials: number; connects: number }>
  funnel: {
    statuses: Record<string, number>
    demos_set: number; demos_held: number; no_shows: number; won: number
    show_rate: number | null; win_rate: number | null
  }
  money: {
    earned_cents: number; owed_cents: number; avg_deal_cents: number; paid_closes: number
    series: Array<{ date: string; earned: number; cumulative: number }>
  }
  efficiency: { dials_per_demo: number | null; connects_per_demo: number | null; demos_per_100_dials: number | null }
  days: Array<{ date: string; dials: number; connects: number; rate: number; talk_seconds: number; demos: number; earned_cents: number }>
  map: { home: MapHome | null; points: MapPoint[]; states: Record<string, number> }
}

const dollars = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const mins = (s: number) => `${Math.floor(s / 3600) > 0 ? `${Math.floor(s / 3600)}h ` : ''}${Math.floor((s % 3600) / 60)}m`

/** Number that counts up on mount / value change. */
function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format ? format(Math.round(v)) : String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, format])
  return <span ref={ref} className="tabular-nums" />
}

const RANGES = [7, 30, 90] as const

export default function MetricsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'dials' | 'connects' | 'rate' | 'talk_seconds' | 'demos' | 'earned_cents'>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [hideEmpty, setHideEmpty] = useState(true)

  useEffect(() => {
    let dead = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const r = await fetchWithAuth(`/api/sales/metrics?range=${range}`)
        const j = await r.json().catch(() => ({}))
        if (dead) return
        if (!r.ok) { setError(j?.error || `Failed (${r.status})`); return }
        setData(j)
      } catch { if (!dead) setError('Failed to load metrics') }
      finally { if (!dead) setLoading(false) }
    })()
    return () => { dead = true }
  }, [range])

  const sortedDays = useMemo(() => {
    if (!data) return []
    const rows = hideEmpty ? data.days.filter((d) => d.dials > 0 || d.demos > 0 || d.earned_cents > 0) : data.days
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir
    })
  }, [data, sortKey, sortDir, hideEmpty])

  const bestHour = useMemo(() => {
    if (!data) return null
    const active = data.hours.filter((h) => h.dials >= 5)
    if (active.length === 0) return null
    return active.reduce((best, h) =>
      (h.connects / h.dials) > (best.connects / best.dials) ? h : best)
  }, [data])

  // Highest-dial day in range: a personal record to chase.
  const bestDay = useMemo(() => {
    if (!data?.days?.length) return null
    const b = data.days.reduce((a, d) => (d.dials > a.dials ? d : a))
    return b.dials > 0 ? b : null
  }, [data])
  const bestDayLabel = bestDay
    ? new Date(bestDay.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const th = (key: typeof sortKey, label: string, align = 'right') => (
    <th
      onClick={() => { if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(key); setSortDir(-1) } }}
      className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-${align} ${sortKey === key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
    >
      {label}{sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  )

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <SalesShell activeLabel="Metrics">
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-[28px] font-semibold tracking-tight text-gray-900">Metrics</h1>
            <p className="text-xs mt-1 font-mono uppercase tracking-wider" style={{ color: 'var(--dmut)' }}>
              your numbers · rolling {range} days
            </p>
          </div>
          <div className="crm-seg-track inline-flex relative">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="relative px-3.5 py-1.5 text-xs font-medium"
                style={{ color: range === r ? 'var(--dink)' : 'var(--dmut)', fontWeight: range === r ? 600 : 500 }}
              >
                {range === r && (
                  <motion.span layoutId="metrics-range" className="crm-seg-thumb absolute inset-0"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                )}
                <span className="relative z-10">{r}d</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {loading && !data ? (
          <div className="py-24 flex justify-center"><CircleNotch className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : data && (
          <motion.div
            key={range}
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
            className="space-y-4"
          >
            {/* ---- Core stat grid ---- */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                ['Dials', <CountUp key="d" value={data.activity.dials} />, `${data.activity.no_answers} no-answer · ${data.activity.voicemails} vm`],
                ['Connects', <CountUp key="c" value={data.activity.connects} />, `${Math.round(data.activity.connect_rate * 100)}% connect rate`],
                ['Talk time', <span key="t" className="tabular-nums">{mins(data.activity.talk_seconds)}</span>, `${data.activity.conversations} real conversations`],
                ['Earned', <CountUp key="e" value={data.money.earned_cents} format={dollars} />, `${dollars(data.money.owed_cents)} owed now`],
              ] as const).map(([label, val, sub]) => (
                <div key={label as string} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--dmut)' }}>{label}</div>
                  <div className="text-[28px] leading-none font-bold text-gray-900 mt-2">{val}</div>
                  <div className="text-[11px] mt-2 tabular-nums" style={{ color: 'var(--dmut2)' }}>{sub}</div>
                </div>
              ))}
            </motion.div>

            {/* ---- Daily activity chart ---- */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--dmut)' }}>Daily activity</div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--dmut)' }}>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: 'var(--dblue)' }} /> dials</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: 'var(--dgreen)' }} /> connects</span>
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-32">
                {data.days.map((d, i) => {
                  const max = Math.max(...data.days.map((x) => x.dials), 1)
                  return (
                    <div key={d.date} className="flex-1 relative h-full flex flex-col justify-end group" title={`${fmtDate(d.date)}: ${d.dials} dials, ${d.connects} connects`}>
                      <motion.div
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * (0.35 / data.days.length) }}
                        style={{ height: `${Math.max(2, (d.dials / max) * 100)}%`, background: 'var(--dblue)', opacity: d.dials ? 0.85 : 0.15, transformOrigin: 'bottom' }}
                        className="rounded-t-[3px] relative"
                      >
                        {d.connects > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-[3px]"
                            style={{ height: `${(d.connects / Math.max(d.dials, 1)) * 100}%`, background: 'var(--dgreen)' }} />
                        )}
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* ---- Best call window ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--dmut)' }}>Best call window</div>
                <div className="text-sm font-semibold text-gray-900 mb-4">
                  {bestHour
                    ? `${bestHour.hour % 12 === 0 ? 12 : bestHour.hour % 12}${bestHour.hour < 12 ? 'am' : 'pm'} connects best (${Math.round((bestHour.connects / bestHour.dials) * 100)}%)`
                    : 'Not enough dials yet'}
                </div>
                <div className="flex items-end gap-[2px] h-20">
                  {data.hours.filter((h) => h.hour >= 7 && h.hour <= 20).map((h) => {
                    const max = Math.max(...data.hours.map((x) => x.dials), 1)
                    const isBest = bestHour && h.hour === bestHour.hour
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${h.hour}:00 - ${h.dials} dials, ${h.connects} connects`}>
                        <div className="w-full rounded-t-[3px]"
                          style={{ height: `${Math.max(3, (h.dials / max) * 100)}%`, background: isBest ? 'var(--dgreen)' : 'var(--dblue)', opacity: h.dials ? (isBest ? 1 : 0.55) : 0.12 }} />
                        <span className="text-[8px] font-mono" style={{ color: 'var(--dmut2)' }}>{h.hour % 12 === 0 ? 12 : h.hour % 12}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* ---- Demo funnel ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--dmut)' }}>Demo funnel · all time</div>
                <div className="space-y-2.5">
                  {([
                    ['Demos set', data.funnel.demos_set + data.funnel.demos_held + data.funnel.no_shows, 'var(--dblue)'],
                    ['Held', data.funnel.demos_held, 'var(--dblue)'],
                    ['Won', data.funnel.won, 'var(--dgreen)'],
                  ] as const).map(([label, val, color], i, arr) => {
                    const max = Math.max(Number(arr[0][1]), 1)
                    return (
                      <div key={label as string} className="flex items-center gap-3">
                        <span className="w-20 text-[11px] font-mono uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--dmut)' }}>{label}</span>
                        <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'var(--dseg)' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(Number(val) / max) * 100}%` }}
                            transition={{ duration: 0.6, ease: EASE, delay: 0.2 + i * 0.12 }}
                            className="h-full rounded-md" style={{ background: color as string, opacity: 0.85 }} />
                        </div>
                        <span className="w-8 text-right text-sm font-bold tabular-nums text-gray-900">{val}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] tabular-nums" style={{ color: 'var(--dmut)' }}>
                  <span>Show rate <b className="text-gray-900">{data.funnel.show_rate !== null ? `${Math.round(data.funnel.show_rate * 100)}%` : '--'}</b></span>
                  <span>Win rate <b className="text-gray-900">{data.funnel.win_rate !== null ? `${Math.round(data.funnel.win_rate * 100)}%` : '--'}</b></span>
                  <span>No-shows <b className="text-gray-900">{data.funnel.no_shows}</b></span>
                </div>
              </motion.div>
            </div>

            {/* ---- Efficiency + SMS + money strip ---- */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {([
                ['Dials / demo', data.efficiency.dials_per_demo ?? '--'],
                ['Demos / 100 dials', data.efficiency.demos_per_100_dials ?? '--'],
                ['Avg deal', data.money.avg_deal_cents ? `${dollars(data.money.avg_deal_cents)}/mo` : '--'],
                ['Connects / demo', data.efficiency.connects_per_demo ?? '--'],
                [bestDay ? `Best day · ${bestDayLabel}` : 'Best day', bestDay ? `${bestDay.dials} dials` : '--'],
              ] as const).map(([label, val]) => (
                // Labels can run two lines ("Demos / 100 dials") - reserve the
                // height so every tile's number sits on the same baseline, and
                // never let a value wrap mid-figure.
                <div key={label as string} className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.1em] leading-4 min-h-[32px]" style={{ color: 'var(--dmut)' }}>{label}</div>
                  <div className="text-lg font-bold tabular-nums text-gray-900 whitespace-nowrap">{val}</div>
                </div>
              ))}
            </motion.div>

            {/* ---- Territory map - flat on the page background ---- */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="pt-4">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1 px-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--dmut)' }}>Your territory</div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--dmut)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--dblue)' }} />
                    {data.map.points.filter((p) => p.kind === 'demo').length} demos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--dgreen)' }} />
                    {data.map.points.filter((p) => p.kind === 'client').length} clients
                  </span>
                  <span>shaded = your leads</span>
                </div>
              </div>
              <div className="max-w-4xl mx-auto">
                <TerritoryMap points={data.map.points} home={data.map.home} density={data.map.states} />
              </div>
              {data.map.points.length === 0 && (
                <p className="text-center text-xs -mt-6 relative z-10" style={{ color: 'var(--dmut2)' }}>
                  Book a demo and it appears here in blue. Close it and it turns green.
                </p>
              )}
            </motion.div>
            {/* ---- Sortable daily table ---- */}
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--dmut)' }}>Day by day</div>
                <button
                  onClick={() => setHideEmpty((v) => !v)}
                  className="text-[11px] font-medium rounded-full px-2.5 py-1"
                  style={hideEmpty ? { background: 'var(--dblue-tint)', color: 'var(--dblue)' } : { background: 'var(--dseg)', color: 'var(--dmut)' }}
                >
                  {hideEmpty ? 'Hiding empty days' : 'Showing all days'}
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white" style={{ boxShadow: 'inset 0 -1px 0 var(--dline)' }}>
                    <tr>
                      {th('date', 'Date', 'left')}
                      {th('dials', 'Dials')}
                      {th('connects', 'Connects')}
                      {th('rate', 'Rate')}
                      {th('talk_seconds', 'Talk')}
                      {th('demos', 'Demos')}
                      {th('earned_cents', 'Earned')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedDays.map((d) => (
                      <tr key={d.date} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{fmtDate(d.date)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">{d.dials || <span className="text-gray-300">0</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: d.connects ? 'var(--dgreen-deep)' : undefined }}>{d.connects || <span className="text-gray-300">0</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{d.dials ? `${d.rate}%` : '--'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{d.talk_seconds ? mins(d.talk_seconds) : '--'}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: d.demos ? 'var(--dblue)' : undefined }}>{d.demos || <span className="text-gray-300">0</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">{d.earned_cents ? dollars(d.earned_cents) : <span className="text-gray-300">--</span>}</td>
                      </tr>
                    ))}
                    {sortedDays.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No activity in this window yet. Start dialing and this fills in.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
