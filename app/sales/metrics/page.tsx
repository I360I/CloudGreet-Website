'use client'

/**
 * /sales/metrics - the rep's numbers in CloudGreet's own language:
 * cool paper canvas, white cards, CloudGreet blue as the accent and
 * the surface of the two feature tiles; green appears only where it
 * means winning (clients, won deals, upward deltas). The territory
 * tile holds the 3D map: states frost white with the rep's lead count
 * (hot/cold), thin arcs run home-to-demo (white) and home-to-client
 * (green), endpoints are crisp rimmed dots.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, animate, AnimatePresence } from 'framer-motion'
import { WarningCircle, ArrowUpRight, ArrowDownRight, MapTrifold } from '@phosphor-icons/react'
import { SalesShell } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import type { MapPoint, MapHome } from './_TerritoryMap'

const TerritoryMap = dynamic(() => import('./_TerritoryMap'), {
  ssr: false,
  loading: () => <div style={{ height: 440 }} />,
})

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

/* Palette - CloudGreet: cool paper, navy + brand blue, green = winning */
const CANVAS = '#F5F6F8'
const CARD = '#FFFFFF'
const LINE = '#E5E8EE'
const INK = '#1B2430'
const MUT = '#75808F'
const TRACK = '#EEF1F5'
const BRAND = '#2563EB'
const BRAND_DEEP = '#1D4ED8'
const ACCENT = BRAND
const SKY = '#BFDBFE'
const WIN = '#2E9E5B'
const RED = '#D14D32'

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
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format ? format(Math.round(v)) : String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, format])
  return <span ref={ref} className="tabular-nums" />
}

/** Honest half-over-half delta chip (needs >= 14 days of window). */
function Delta({ now, before }: { now: number; before: number }) {
  // No baseline = no percentage. A fabricated "+100%" reads as noise.
  if (before === 0) return null
  const pct = Math.round(((now - before) / before) * 100)
  const up = pct >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{ background: up ? '#E4F3EA' : '#FBEAE5', color: up ? WIN : RED }}
      title="vs the first half of this window"
    >
      {up ? <ArrowUpRight weight="bold" className="w-3 h-3" /> : <ArrowDownRight weight="bold" className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

const cardStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  borderRadius: 20,
  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
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
  const [barTip, setBarTip] = useState<{ i: number; x: number } | null>(null)

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

  // Highest-dial day in range: a record to beat.
  const bestDay = useMemo(() => {
    if (!data?.days?.length) return null
    const b = data.days.reduce((a, d) => (d.dials > a.dials ? d : a))
    return b.dials > 0 ? b : null
  }, [data])
  const bestDayLabel = bestDay
    ? new Date(bestDay.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  // Honest momentum: second half of the window vs the first half.
  const halves = useMemo(() => {
    if (!data || data.days.length < 14) return null
    const mid = Math.floor(data.days.length / 2)
    const sum = (rows: typeof data.days, k: 'dials' | 'earned_cents') => rows.reduce((s, d) => s + d[k], 0)
    return {
      dialsNow: sum(data.days.slice(mid), 'dials'),
      dialsBefore: sum(data.days.slice(0, mid), 'dials'),
      earnedNow: sum(data.days.slice(mid), 'earned_cents'),
      earnedBefore: sum(data.days.slice(0, mid), 'earned_cents'),
    }
  }, [data])

  const demoCount = data?.map.points.filter((p) => p.kind === 'demo').length ?? 0
  const clientCount = data?.map.points.filter((p) => p.kind === 'client').length ?? 0

  const th = (key: typeof sortKey, label: string, align = 'right') => (
    <th
      key={key}
      onClick={() => { if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(key); setSortDir(-1) } }}
      className={`px-3 py-2.5 text-[11px] font-medium cursor-pointer select-none whitespace-nowrap text-${align}`}
      style={{ color: sortKey === key ? INK : MUT }}
    >
      {label}{sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  )

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Donut: where the dials went. Angles from fractions of total dials.
  const donut = useMemo(() => {
    if (!data || data.activity.dials === 0) return null
    const total = data.activity.dials
    const segs = [
      { label: 'Connected', n: data.activity.connects, color: BRAND },
      { label: 'Voicemail', n: data.activity.voicemails, color: '#93C5FD' },
      { label: 'No answer', n: data.activity.no_answers, color: '#E2E8F0' },
    ]
    const other = total - segs.reduce((s, x) => s + x.n, 0)
    if (other / total >= 0.03) segs.push({ label: 'Other', n: other, color: '#C6CEDA' })
    let acc = 0
    return segs.filter((s) => s.n / total >= 0.03).map((s) => {
      const f = s.n / total
      const seg = { ...s, f, start: acc }
      acc += f
      return seg
    })
  }, [data])

  return (
    <SalesShell activeLabel="Metrics">
      <section className="min-h-full" style={{ background: CANVAS }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-7">

          {/* ---- Header ---- */}
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="font-display text-[26px] md:text-[30px] font-semibold tracking-tight" style={{ color: INK }}>
                Metrics
              </h1>
              <p className="text-[13px] mt-1" style={{ color: MUT }}>
                How you&apos;re selling over the last {range} days
              </p>
            </div>
            <div className="inline-flex rounded-full p-1" style={{ background: '#E8EAEF' }}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="relative px-4 py-1.5 text-[13px] rounded-full"
                  style={{ color: range === r ? '#FDFDF7' : MUT, fontWeight: range === r ? 600 : 500 }}
                >
                  {range === r && (
                    <motion.span
                      layoutId="metrics-range"
                      className="absolute inset-0 rounded-full"
                      style={{ background: BRAND }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{r} days</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl p-3 text-sm flex items-start gap-2"
              style={{ background: '#F9E7E1', border: '1px solid #EFC9BD', color: RED }}>
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {loading && !data ? (
            <div className="py-28 flex justify-center">
              <div className="w-9 h-9 rounded-full animate-spin"
                style={{ border: `2px solid ${LINE}`, borderTopColor: BRAND }} />
            </div>
          ) : data && (
            <motion.div
              key={range}
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
              className="grid grid-cols-12 gap-4"
            >
              {/* ================= LEFT (main) ================= */}
              <div className="col-span-12 lg:col-span-8 space-y-4">

                {/* ---- Big pair: dials + earned ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="grid sm:grid-cols-2 gap-4">
                  <div className="p-6" style={cardStyle}>
                    <div className="flex items-center justify-between h-6">
                      <span className="text-[13px] font-medium" style={{ color: MUT }}>Dials</span>
                      {halves && <Delta now={halves.dialsNow} before={halves.dialsBefore} />}
                    </div>
                    <div className="text-[40px] leading-tight font-semibold tracking-tight mt-2" style={{ color: INK }}>
                      <CountUp value={data.activity.dials} />
                    </div>
                    <div className="text-[12px] mt-1 tabular-nums" style={{ color: MUT }}>
                      {data.activity.connects} connected · {Math.round(data.activity.connect_rate * 100)}% rate · {mins(data.activity.talk_seconds)} talked
                    </div>
                  </div>
                  <div className="p-6" style={cardStyle}>
                    <div className="flex items-center justify-between h-6">
                      <span className="text-[13px] font-medium" style={{ color: MUT }}>Earned</span>
                      {halves && <Delta now={halves.earnedNow} before={halves.earnedBefore} />}
                    </div>
                    <div className="text-[40px] leading-tight font-semibold tracking-tight mt-2" style={{ color: INK }}>
                      <CountUp value={data.money.earned_cents} format={dollars} />
                    </div>
                    <div className="text-[12px] mt-1 tabular-nums" style={{ color: MUT }}>
                      {dollars(data.money.owed_cents)} owed now · avg deal {data.money.avg_deal_cents ? `${dollars(data.money.avg_deal_cents)}/mo` : '--'}
                    </div>
                  </div>
                </motion.div>

                {/* ---- Territory tile (the one dark moment) ---- */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 14, scale: 0.99 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } }}
                  className="relative overflow-hidden"
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(150deg, #3B76F6 0%, ${BRAND} 45%, ${BRAND_DEEP} 100%)`,
                    boxShadow: '0 24px 48px -22px rgba(29, 78, 216, 0.45)',
                  }}
                >
                  <div className="flex items-start justify-between px-6 pt-5 relative z-10 pointer-events-none">
                    <div>
                      <div className="text-[15px] font-semibold" style={{ color: '#FFFFFF' }}>Your territory</div>
                      <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        drag to explore · hover anything
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {([
                        ['#FFFFFF', `${demoCount} demo${demoCount === 1 ? '' : 's'} booked`],
                        ['#4ADE80', `${clientCount} client${clientCount === 1 ? '' : 's'} live`],
                        ['rgba(255,255,255,0.45)', 'brighter states = more of your leads'],
                      ] as const).map(([c, label]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="-mt-10">
                    <TerritoryMap points={data.map.points} home={data.map.home} density={data.map.states} height={420} />
                  </div>

                  {data.map.points.length === 0 && (
                    <div className="absolute inset-x-0 bottom-5 flex justify-center pointer-events-none">
                      <div className="rounded-full px-4 py-2 flex items-center gap-2"
                        style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                        <MapTrifold className="w-3.5 h-3.5" style={{ color: BRAND }} />
                        <span className="text-[12px] font-medium" style={{ color: BRAND }}>
                          Book a demo and it appears here in blue. Close it and it turns green.
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* ---- Daily activity ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="p-6" style={cardStyle}>
                  <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
                    <span className="text-[13px] font-medium" style={{ color: MUT }}>Daily activity</span>
                    <div className="flex items-center gap-4 text-[12px]" style={{ color: MUT }}>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: BRAND }} /> dials</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: SKY }} /> connects</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-end gap-[4px] h-36">
                      {data.days.map((d, i) => {
                        const max = Math.max(...data.days.map((x) => x.dials), 1)
                        const active = barTip?.i === i
                        return (
                          <div
                            key={d.date}
                            className="flex-1 relative h-full flex flex-col justify-end"
                            onMouseEnter={(e) => {
                              const wrap = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                              const r = e.currentTarget.getBoundingClientRect()
                              setBarTip({ i, x: r.left - wrap.left + r.width / 2 })
                            }}
                            onMouseLeave={() => setBarTip(null)}
                          >
                            <motion.div
                              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                              transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * (0.3 / data.days.length) }}
                              className="rounded-t-[5px] relative"
                              style={{
                                height: `${Math.max(2.5, (d.dials / max) * 100)}%`,
                                background: d.dials ? (active ? BRAND_DEEP : BRAND) : TRACK,
                                transformOrigin: 'bottom',
                                transition: 'background 0.15s',
                              }}
                            >
                              {d.connects > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 rounded-t-[5px]"
                                  style={{ height: `${(d.connects / Math.max(d.dials, 1)) * 100}%`, background: SKY }} />
                              )}
                            </motion.div>
                          </div>
                        )
                      })}
                    </div>
                    <AnimatePresence>
                      {barTip && data.days[barTip.i] && (
                        <div
                          className="absolute pointer-events-none z-10"
                          style={{ left: Math.max(70, barTip.x), top: -6, transform: 'translate(-50%, -100%)' }}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-xl px-3.5 py-2.5 whitespace-nowrap"
                            style={{ background: BRAND_DEEP, boxShadow: '0 14px 30px -12px rgba(29, 78, 216, 0.45)' }}
                          >
                            <div className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>{fmtDate(data.days[barTip.i].date)}</div>
                            <div className="text-[12px] mt-0.5 tabular-nums" style={{ color: 'rgba(255,255,255,0.75)' }}>
                              {data.days[barTip.i].dials} dials · <span style={{ color: SKY }}>{data.days[barTip.i].connects} connects</span>
                              {data.days[barTip.i].demos > 0 && <> · {data.days[barTip.i].demos} demo{data.days[barTip.i].demos === 1 ? '' : 's'}</>}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* ---- Day by day ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="overflow-hidden" style={cardStyle}>
                  <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${LINE}` }}>
                    <span className="text-[13px] font-medium" style={{ color: MUT }}>Day by day</span>
                    <button
                      onClick={() => setHideEmpty((v) => !v)}
                      className="text-[12px] font-medium rounded-full px-3 py-1"
                      style={hideEmpty
                        ? { background: '#E7EEFB', color: ACCENT }
                        : { background: TRACK, color: MUT }}
                    >
                      {hideEmpty ? 'Hiding empty days' : 'Showing all days'}
                    </button>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10" style={{ background: CARD, boxShadow: `inset 0 -1px 0 ${LINE}` }}>
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
                      <tbody>
                        {sortedDays.map((d) => (
                          <tr
                            key={d.date}
                            className="transition-colors hover:bg-[#F6F8FB]"
                            style={{ borderTop: `1px solid #EFF2F6` }}
                          >
                            <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: INK }}>{fmtDate(d.date)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: d.dials ? INK : '#C2C9D2' }}>{d.dials || 0}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium" style={{ color: d.connects ? ACCENT : '#C2C9D2' }}>{d.connects || 0}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: MUT }}>{d.dials ? `${d.rate}%` : '--'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: MUT }}>{d.talk_seconds ? mins(d.talk_seconds) : '--'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: d.demos ? BRAND : '#C2C9D2' }}>{d.demos || 0}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: d.earned_cents ? INK : '#C2C9D2' }}>{d.earned_cents ? dollars(d.earned_cents) : '--'}</td>
                          </tr>
                        ))}
                        {sortedDays.length === 0 && (
                          <tr><td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: MUT }}>No activity in this window yet. Start dialing and this fills in.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>

              {/* ================= RIGHT (rail) ================= */}
              <div className="col-span-12 lg:col-span-4 space-y-4">

                {/* ---- Where dials go (donut) ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="p-6" style={cardStyle}>
                  <span className="text-[13px] font-medium" style={{ color: MUT }}>Where your dials go</span>
                  {donut ? (
                    <>
                      <div className="relative w-[172px] h-[172px] mx-auto my-5">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                          {donut.map((s) => {
                            const R = 48, CIRC = 2 * Math.PI * R
                            return (
                              <motion.circle
                                key={s.label}
                                cx="60" cy="60" r={R} fill="none"
                                stroke={s.color} strokeWidth="13" strokeLinecap="round"
                                initial={{ strokeDasharray: `0 ${CIRC}` }}
                                animate={{ strokeDasharray: `${Math.max(s.f * CIRC - 2.5, 1)} ${CIRC}` }}
                                transition={{ duration: 0.9, ease: EASE, delay: 0.25 + s.start * 0.6 }}
                                strokeDashoffset={-s.start * CIRC}
                              />
                            )
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-[26px] font-semibold tabular-nums leading-none" style={{ color: INK }}>
                            <CountUp value={data.activity.dials} />
                          </div>
                          <div className="text-[11px] mt-1" style={{ color: MUT }}>dials</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {donut.map((s) => (
                          <div key={s.label} className="flex items-center justify-between text-[13px]">
                            <span className="inline-flex items-center gap-2" style={{ color: MUT }}>
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            <span className="tabular-nums font-medium" style={{ color: INK }}>
                              {s.n} <span className="font-normal" style={{ color: '#B6BEC9' }}>· {Math.round(s.f * 100)}%</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] mt-3" style={{ color: MUT }}>No dials in this window yet.</p>
                  )}
                </motion.div>

                {/* ---- Demo funnel ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="p-6" style={cardStyle}>
                  <span className="text-[13px] font-medium" style={{ color: MUT }}>Demo funnel · all time</span>
                  <div className="space-y-3 mt-4">
                    {([
                      ['Set', data.funnel.demos_set + data.funnel.demos_held + data.funnel.no_shows, BRAND],
                      ['Held', data.funnel.demos_held, '#93C5FD'],
                      ['Won', data.funnel.won, WIN],
                    ] as const).map(([label, val, color], i, arr) => {
                      const max = Math.max(Number(arr[0][1]), 1)
                      return (
                        <div key={label as string} className="flex items-center gap-3">
                          <span className="w-9 text-[12px] flex-shrink-0" style={{ color: MUT }}>{label}</span>
                          <div className="flex-1 h-[22px] rounded-full overflow-hidden" style={{ background: TRACK }}>
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${Math.max((Number(val) / max) * 100, Number(val) > 0 ? 9 : 0)}%` }}
                              transition={{ duration: 0.7, ease: EASE, delay: 0.3 + i * 0.14 }}
                              className="h-full rounded-full"
                              style={{ background: color as string }}
                            />
                          </div>
                          <span className="w-7 text-right text-[14px] font-semibold tabular-nums" style={{ color: INK }}>{val}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-4 text-[12px] tabular-nums" style={{ borderTop: `1px solid ${LINE}`, color: MUT }}>
                    <span>Show rate <b style={{ color: INK }}>{data.funnel.show_rate !== null ? `${Math.round(data.funnel.show_rate * 100)}%` : '--'}</b></span>
                    <span>Win rate <b style={{ color: INK }}>{data.funnel.win_rate !== null ? `${Math.round(data.funnel.win_rate * 100)}%` : '--'}</b></span>
                    <span>No-shows <b style={{ color: RED }}>{data.funnel.no_shows}</b></span>
                  </div>
                </motion.div>

                {/* ---- Best call window ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="p-6" style={cardStyle}>
                  <span className="text-[13px] font-medium" style={{ color: MUT }}>Best call window</span>
                  <div className="text-[15px] font-semibold mt-1 mb-4" style={{ color: INK }}>
                    {bestHour
                      ? <>Around {bestHour.hour % 12 === 0 ? 12 : bestHour.hour % 12}{bestHour.hour < 12 ? 'am' : 'pm'} <span className="font-normal" style={{ color: MUT }}>· {Math.round((bestHour.connects / bestHour.dials) * 100)}% pick up</span></>
                      : 'Not enough dials yet'}
                  </div>
                  <div className="flex items-end gap-[3px] h-16">
                    {data.hours.filter((h) => h.hour >= 7 && h.hour <= 20).map((h) => {
                      const max = Math.max(...data.hours.map((x) => x.dials), 1)
                      const isBest = bestHour && h.hour === bestHour.hour
                      return (
                        <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${h.hour}:00 - ${h.dials} dials, ${h.connects} connects`}>
                          <div className="w-full rounded-t-[4px]"
                            style={{
                              height: `${Math.max(4, (h.dials / max) * 100)}%`,
                              background: isBest ? ACCENT : (h.dials ? '#D7DEE8' : TRACK),
                            }} />
                          <span className="text-[9px] tabular-nums" style={{ color: isBest ? ACCENT : '#B6BEC9', fontWeight: isBest ? 700 : 400 }}>
                            {h.hour % 12 === 0 ? 12 : h.hour % 12}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                {/* ---- Pace ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="p-6" style={cardStyle}>
                  <span className="text-[13px] font-medium" style={{ color: MUT }}>Your pace</span>
                  <div className="mt-3 space-y-2.5">
                    {([
                      ['Dials per demo', data.efficiency.dials_per_demo ?? '--'],
                      ['Connects per demo', data.efficiency.connects_per_demo ?? '--'],
                      ['Demos per 100 dials', data.efficiency.demos_per_100_dials ?? '--'],
                      ['Real conversations', data.activity.conversations],
                      ['Avg connected call', data.activity.avg_call_seconds ? `${Math.floor(data.activity.avg_call_seconds / 60)}m ${data.activity.avg_call_seconds % 60}s` : '--'],
                    ] as const).map(([label, val]) => (
                      <div key={label as string} className="flex items-center justify-between text-[13px]">
                        <span style={{ color: MUT }}>{label}</span>
                        <span className="tabular-nums font-semibold" style={{ color: INK }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* ---- Record to beat (forest accent card) ---- */}
                {bestDay && (
                  <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
                    className="p-6 relative overflow-hidden"
                    style={{ borderRadius: 20, background: `linear-gradient(150deg, #3B76F6 0%, ${BRAND} 45%, ${BRAND_DEEP} 100%)`, boxShadow: '0 20px 40px -20px rgba(29, 78, 216, 0.5)' }}>
                    <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Record to beat</span>
                    <div className="text-[34px] font-semibold tracking-tight mt-1 leading-none" style={{ color: '#FFFFFF' }}>
                      {bestDay.dials} dials
                    </div>
                    <div className="text-[12px] mt-2" style={{ color: 'rgba(255,255,255,0.78)' }}>
                      Your biggest day this window, set {bestDayLabel}. One more dial today beats it.
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </SalesShell>
  )
}
