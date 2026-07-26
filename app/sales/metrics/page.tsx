'use client'

/**
 * /sales/metrics - the rep's mission control.
 *
 * Deliberately styled apart from the rest of the CRM: a dark, cinematic
 * command-center panel with a 3D territory map hero (demos in blue,
 * live clients in green, lead-density heat zones), cursor-spotlight
 * stat cards, animated charts and a sortable day-by-day ledger.
 * Everything is scoped inside the dark panel so the surrounding shell
 * stays untouched.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, animate, AnimatePresence } from 'framer-motion'
import { WarningCircle, CrosshairSimple } from '@phosphor-icons/react'
import { SalesShell } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import type { MapPoint, MapHome, HeatCell } from './_TerritoryMap'

const TerritoryMap = dynamic(() => import('./_TerritoryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[440px] flex items-center justify-center">
      <div className="mx-radar" />
    </div>
  ),
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
  map: { home: MapHome | null; points: MapPoint[]; heat: HeatCell[] }
}

const INK = '#EAF1FF'
const MUT = '#8FA3C8'
const MUT2 = '#5B6B8C'
const BLUE = '#3B9EFF'
const GREEN = '#30D158'
const PANEL = 'rgba(148, 178, 255, 0.045)'
const BORDER = 'rgba(140, 170, 255, 0.13)'

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

/** Glass card with a cursor-tracking spotlight + hover lift. */
function Spotlight({ children, className = '', glow = BLUE }: {
  children: React.ReactNode; className?: string; glow?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r || !ref.current) return
        ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`)
        ref.current.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={`mx-card relative rounded-2xl overflow-hidden ${className}`}
      style={{ background: PANEL, border: `1px solid ${BORDER}`, ['--glow' as any]: glow }}
    >
      {children}
    </motion.div>
  )
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

  // Highest-dial day in range: a personal record to chase.
  const bestDay = useMemo(() => {
    if (!data?.days?.length) return null
    const b = data.days.reduce((a, d) => (d.dials > a.dials ? d : a))
    return b.dials > 0 ? b : null
  }, [data])
  const bestDayLabel = bestDay
    ? new Date(bestDay.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const demoCount = data?.map.points.filter((p) => p.kind === 'demo').length ?? 0
  const clientCount = data?.map.points.filter((p) => p.kind === 'client').length ?? 0

  const th = (key: typeof sortKey, label: string, align = 'right') => (
    <th
      key={key}
      onClick={() => { if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(key); setSortDir(-1) } }}
      className={`px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-${align} transition-colors`}
      style={{ color: sortKey === key ? INK : MUT2 }}
    >
      {label}{sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  )

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <SalesShell activeLabel="Metrics">
      <style>{`
        .mx-card::before {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--glow) 11%, transparent), transparent 65%);
          opacity: 0; transition: opacity 0.35s ease; pointer-events: none;
        }
        .mx-card:hover::before { opacity: 1; }
        .mx-card:hover { border-color: rgba(140, 170, 255, 0.28) !important; }
        .mx-grid-bg {
          background-image:
            radial-gradient(ellipse 900px 480px at 18% -8%, rgba(59, 158, 255, 0.09), transparent),
            radial-gradient(ellipse 760px 420px at 88% 108%, rgba(48, 209, 88, 0.05), transparent),
            linear-gradient(rgba(140, 170, 255, 0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(140, 170, 255, 0.028) 1px, transparent 1px);
          background-size: 100% 100%, 100% 100%, 44px 44px, 44px 44px;
        }
        @keyframes mx-breathe { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.75); } }
        .mx-live-dot { animation: mx-breathe 2.2s ease-in-out infinite; }
        @keyframes mx-sheen { 0% { transform: translateX(-130%); } 60%, 100% { transform: translateX(230%); } }
        .mx-sheen { position: relative; overflow: hidden; }
        .mx-sheen::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 45%;
          background: linear-gradient(105deg, transparent, rgba(255,255,255,0.22), transparent);
          animation: mx-sheen 3.4s ease-in-out infinite;
        }
        .mx-radar { width: 44px; height: 44px; border-radius: 9999px; position: relative;
          border: 1px solid rgba(59, 158, 255, 0.3); }
        .mx-radar::before { content: ''; position: absolute; inset: -1px; border-radius: inherit;
          border: 1px solid rgba(59, 158, 255, 0.65); border-top-color: transparent; border-left-color: transparent;
          animation: mx-spin 0.9s linear infinite; }
        @keyframes mx-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .mx-sheen::after, .mx-live-dot { animation: none; }
        }
      `}</style>

      <section className="max-w-6xl mx-auto px-3 md:px-6 py-6">
        <div
          className="mx-grid-bg rounded-[28px] px-4 md:px-7 py-6 relative"
          style={{
            background: '#060A14',
            border: '1px solid rgba(140, 170, 255, 0.14)',
            boxShadow: '0 40px 90px -32px rgba(5, 12, 32, 0.85), inset 0 1px 0 rgba(190, 210, 255, 0.09)',
          }}
        >
          {/* ---- Header ---- */}
          <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="mx-live-dot w-1.5 h-1.5 rounded-full" style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: MUT }}>
                  Mission control · rolling {range} days
                </span>
              </div>
              <h1
                className="font-display text-[26px] md:text-[30px] font-semibold tracking-tight"
                style={{ color: INK, textShadow: '0 0 32px rgba(59, 158, 255, 0.35)' }}
              >
                Your territory
              </h1>
            </div>
            <div
              className="inline-flex relative rounded-full p-1"
              style={{ background: 'rgba(148, 178, 255, 0.07)', border: `1px solid ${BORDER}` }}
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="relative px-4 py-1.5 text-xs font-medium rounded-full"
                  style={{ color: range === r ? '#04101F' : MUT, fontWeight: range === r ? 700 : 500 }}
                >
                  {range === r && (
                    <motion.span
                      layoutId="metrics-range"
                      className="absolute inset-0 rounded-full"
                      style={{ background: BLUE, boxShadow: `0 0 18px ${BLUE}66` }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{r}d</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl p-3 text-sm flex items-start gap-2"
              style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.25)', color: '#FF9C9C' }}>
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {loading && !data ? (
            <div className="py-28 flex justify-center"><div className="mx-radar" /></div>
          ) : data && (
            <motion.div
              key={range}
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="space-y-4"
            >
              {/* ---- Territory map hero ---- */}
              <motion.div
                variants={{ hidden: { opacity: 0, scale: 0.985 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } } }}
                className="relative rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${BORDER}`, background: 'rgba(8, 13, 26, 0.5)' }}
              >
                <TerritoryMap points={data.map.points} home={data.map.home} heat={data.map.heat} height={440} />

                {/* explore hint */}
                <div className="absolute left-4 top-4 pointer-events-none">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: MUT2 }}>
                    Live territory view
                  </div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: 'rgba(91, 107, 140, 0.7)' }}>
                    drag to explore · scroll to zoom
                  </div>
                </div>

                {/* legend */}
                <div className="absolute left-4 bottom-4 flex flex-col gap-1.5 pointer-events-none">
                  {([
                    [BLUE, `${demoCount} demo${demoCount === 1 ? '' : 's'} on the map`],
                    [GREEN, `${clientCount} client${clientCount === 1 ? '' : 's'} you serve`],
                    ['#FF7A29', 'Hot zones · where your leads cluster'],
                  ] as const).map(([c, label]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                      <span className="text-[11px] font-mono" style={{ color: MUT }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* empty-territory overlay */}
                {data.map.points.length === 0 && (
                  <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
                    <div className="rounded-full px-4 py-2 flex items-center gap-2"
                      style={{ background: 'rgba(10, 16, 30, 0.8)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
                      <CrosshairSimple className="w-3.5 h-3.5" style={{ color: BLUE }} />
                      <span className="text-xs" style={{ color: MUT }}>Book a demo and it lights up here in blue. Close it and it turns green.</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ---- Core stat grid ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {([
                  ['Dials', <CountUp key="d" value={data.activity.dials} />, `${data.activity.no_answers} no-answer · ${data.activity.voicemails} vm`, BLUE],
                  ['Connects', <CountUp key="c" value={data.activity.connects} />, `${Math.round(data.activity.connect_rate * 100)}% connect rate`, BLUE],
                  ['Talk time', <span key="t" className="tabular-nums">{mins(data.activity.talk_seconds)}</span>, `${data.activity.conversations} real conversations`, BLUE],
                  ['Earned', <CountUp key="e" value={data.money.earned_cents} format={dollars} />, `${dollars(data.money.owed_cents)} owed now`, GREEN],
                ] as const).map(([label, val, sub, glow]) => (
                  <Spotlight key={label as string} glow={glow as string} className="p-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: MUT2 }}>{label}</div>
                    <div className="text-[30px] leading-none font-bold mt-2" style={{ color: INK, textShadow: `0 0 26px ${glow}40` }}>{val}</div>
                    <div className="text-[11px] mt-2 tabular-nums font-mono" style={{ color: MUT2 }}>{sub}</div>
                  </Spotlight>
                ))}
              </motion.div>

              {/* ---- Daily activity chart ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                <Spotlight className="p-5">
                  <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: MUT2 }}>Daily activity</div>
                    <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: MUT }}>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: BLUE }} /> dials</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: GREEN }} /> connects</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-end gap-[3px] h-36">
                      {data.days.map((d, i) => {
                        const max = Math.max(...data.days.map((x) => x.dials), 1)
                        const active = barTip?.i === i
                        return (
                          <div
                            key={d.date}
                            className="flex-1 relative h-full flex flex-col justify-end group"
                            onMouseEnter={(e) => {
                              const wrap = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                              const r = e.currentTarget.getBoundingClientRect()
                              setBarTip({ i, x: r.left - wrap.left + r.width / 2 })
                            }}
                            onMouseLeave={() => setBarTip(null)}
                          >
                            <motion.div
                              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                              transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * (0.35 / data.days.length) }}
                              style={{
                                height: `${Math.max(2, (d.dials / max) * 100)}%`,
                                background: active ? '#7CC0FF' : BLUE,
                                opacity: d.dials ? (active ? 1 : 0.75) : 0.12,
                                transformOrigin: 'bottom',
                                boxShadow: active && d.dials ? `0 0 16px ${BLUE}88` : 'none',
                                transition: 'background 0.15s, opacity 0.15s, box-shadow 0.15s',
                              }}
                              className="rounded-t-[3px] relative"
                            >
                              {d.connects > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 rounded-t-[3px]"
                                  style={{ height: `${(d.connects / Math.max(d.dials, 1)) * 100}%`, background: GREEN, opacity: active ? 1 : 0.9 }} />
                              )}
                            </motion.div>
                          </div>
                        )
                      })}
                    </div>
    {/* wrapper owns the centering transform; the inner motion.div only
        animates opacity/scale so framer never fights the positioning */}
                    <AnimatePresence>
                      {barTip && data.days[barTip.i] && (
                        <div
                          className="absolute pointer-events-none z-10"
                          style={{ left: Math.max(70, barTip.x), top: -8, transform: 'translate(-50%, -100%)' }}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.16 }}
                            className="rounded-lg px-3 py-2 whitespace-nowrap"
                            style={{
                              background: 'rgba(10, 16, 30, 0.92)',
                              border: `1px solid ${BORDER}`,
                              boxShadow: '0 14px 34px -12px rgba(0,0,0,0.8)',
                            }}
                          >
                            <div className="text-[11px] font-semibold" style={{ color: INK }}>{fmtDate(data.days[barTip.i].date)}</div>
                            <div className="text-[11px] font-mono mt-0.5" style={{ color: MUT }}>
                              <span style={{ color: BLUE }}>{data.days[barTip.i].dials} dials</span>
                              {' · '}
                              <span style={{ color: GREEN }}>{data.days[barTip.i].connects} connects</span>
                              {data.days[barTip.i].demos > 0 && <span> · {data.days[barTip.i].demos} demo{data.days[barTip.i].demos === 1 ? '' : 's'}</span>}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </Spotlight>
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* ---- Best call window ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                  <Spotlight className="p-5 h-full">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] mb-1" style={{ color: MUT2 }}>Best call window</div>
                    <div className="text-sm font-semibold mb-4" style={{ color: INK }}>
                      {bestHour
                        ? `${bestHour.hour % 12 === 0 ? 12 : bestHour.hour % 12}${bestHour.hour < 12 ? 'am' : 'pm'} connects best (${Math.round((bestHour.connects / bestHour.dials) * 100)}%)`
                        : 'Not enough dials yet'}
                    </div>
                    <div className="flex items-end gap-[2px] h-20">
                      {data.hours.filter((h) => h.hour >= 7 && h.hour <= 20).map((h) => {
                        const max = Math.max(...data.hours.map((x) => x.dials), 1)
                        const isBest = bestHour && h.hour === bestHour.hour
                        return (
                          <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title={`${h.hour}:00 - ${h.dials} dials, ${h.connects} connects`}>
                            <div className="w-full rounded-t-[3px] transition-all duration-150 group-hover:opacity-100"
                              style={{
                                height: `${Math.max(3, (h.dials / max) * 100)}%`,
                                background: isBest ? GREEN : BLUE,
                                opacity: h.dials ? (isBest ? 1 : 0.45) : 0.1,
                                boxShadow: isBest ? `0 0 14px ${GREEN}66` : 'none',
                              }} />
                            <span className="text-[8px] font-mono" style={{ color: MUT2 }}>{h.hour % 12 === 0 ? 12 : h.hour % 12}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Spotlight>
                </motion.div>

                {/* ---- Demo funnel ---- */}
                <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                  <Spotlight className="p-5 h-full" glow={GREEN}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] mb-4" style={{ color: MUT2 }}>Demo funnel · all time</div>
                    <div className="space-y-2.5">
                      {([
                        ['Demos set', data.funnel.demos_set + data.funnel.demos_held + data.funnel.no_shows, BLUE],
                        ['Held', data.funnel.demos_held, BLUE],
                        ['Won', data.funnel.won, GREEN],
                      ] as const).map(([label, val, color], i, arr) => {
                        const max = Math.max(Number(arr[0][1]), 1)
                        return (
                          <div key={label as string} className="flex items-center gap-3">
                            <span className="w-20 text-[11px] font-mono uppercase tracking-wide flex-shrink-0" style={{ color: MUT2 }}>{label}</span>
                            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'rgba(148, 178, 255, 0.07)' }}>
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${(Number(val) / max) * 100}%` }}
                                transition={{ duration: 0.7, ease: EASE, delay: 0.25 + i * 0.14 }}
                                className={`h-full rounded-md ${Number(val) > 0 ? 'mx-sheen' : ''}`}
                                style={{
                                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                                  boxShadow: Number(val) > 0 ? `0 0 14px ${color}44` : 'none',
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-sm font-bold tabular-nums" style={{ color: INK }}>{val}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3 text-[11px] tabular-nums font-mono" style={{ borderTop: `1px solid ${BORDER}`, color: MUT2 }}>
                      <span>Show rate <b style={{ color: INK }}>{data.funnel.show_rate !== null ? `${Math.round(data.funnel.show_rate * 100)}%` : '--'}</b></span>
                      <span>Win rate <b style={{ color: INK }}>{data.funnel.win_rate !== null ? `${Math.round(data.funnel.win_rate * 100)}%` : '--'}</b></span>
                      <span>No-shows <b style={{ color: INK }}>{data.funnel.no_shows}</b></span>
                    </div>
                  </Spotlight>
                </motion.div>
              </div>

              {/* ---- Efficiency strip ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
                className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {([
                  ['Dials / demo', data.efficiency.dials_per_demo ?? '--'],
                  ['Demos / 100 dials', data.efficiency.demos_per_100_dials ?? '--'],
                  ['Avg deal', data.money.avg_deal_cents ? `${dollars(data.money.avg_deal_cents)}/mo` : '--'],
                  ['Connects / demo', data.efficiency.connects_per_demo ?? '--'],
                  [bestDay ? `Best day · ${bestDayLabel}` : 'Best day', bestDay ? `${bestDay.dials} dials` : '--'],
                ] as const).map(([label, val]) => (
                  <Spotlight key={label as string} className="px-4 py-3.5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: MUT2 }}>{label}</div>
                    <div className="text-lg font-bold tabular-nums mt-1" style={{ color: INK }}>{val}</div>
                  </Spotlight>
                ))}
              </motion.div>

              {/* ---- Sortable daily table ---- */}
              <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
                className="rounded-2xl overflow-hidden"
                style={{ background: PANEL, border: `1px solid ${BORDER}` }}
              >
                <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: MUT2 }}>Day by day</div>
                  <button
                    onClick={() => setHideEmpty((v) => !v)}
                    className="text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors"
                    style={hideEmpty
                      ? { background: `${BLUE}1F`, color: BLUE, border: `1px solid ${BLUE}44` }
                      : { background: 'rgba(148, 178, 255, 0.07)', color: MUT, border: '1px solid transparent' }}
                  >
                    {hideEmpty ? 'Hiding empty days' : 'Showing all days'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
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
                          className="transition-colors"
                          style={{ borderTop: '1px solid rgba(140, 170, 255, 0.06)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59, 158, 255, 0.06)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: INK }}>{fmtDate(d.date)}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: d.dials ? INK : MUT2 }}>{d.dials || 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: d.connects ? GREEN : MUT2 }}>{d.connects || 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: MUT }}>{d.dials ? `${d.rate}%` : '--'}</td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: MUT }}>{d.talk_seconds ? mins(d.talk_seconds) : '--'}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: d.demos ? BLUE : MUT2 }}>{d.demos || 0}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: d.earned_cents ? INK : MUT2 }}>{d.earned_cents ? dollars(d.earned_cents) : '--'}</td>
                        </tr>
                      ))}
                      {sortedDays.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: MUT2 }}>No activity in this window yet. Start dialing and this fills in.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>
    </SalesShell>
  )
}
