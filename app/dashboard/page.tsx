'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
 Phone, Calendar, Clock, TrendingUp, X, Play,
 Loader2, ChevronRight, LayoutDashboard, PhoneCall, CalendarCheck,
 Settings, CreditCard, LogOut, ArrowUpRight, ArrowDownRight,
 Search, Activity,
} from 'react-icons/md'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import {
 Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
 Tooltip, Filler, ArcElement,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, ArcElement)

const DEMO_NUMBER = '+1 (737) 937-0084'

type Call = {
 id: string; call_id: string; from_number: string; caller_name: string | null
 duration: number | null; created_at: string; status: string
 sentiment: string | null; summary: string | null
 transcript: string | null; recording_url: string | null; outcome: string | null
}
type Appt = {
 id: string; customer_name: string; customer_phone: string | null
 service_type: string | null; scheduled_date: string; start_time: string | null
 status: string | null; notes: string | null
}
type Overview = {
 business: { id: string; business_name: string }
 range: number
 kpis: {
  totalCalls: number; callsToday: number; avgDurationSec: number; bookedRate: number
  deltas: { totalCalls: number; callsYesterday: number; avgDurationSec: number; bookedRate: number }
  spark: number[]
 }
 outcomes: { booked: number; message: number; dropped: number }
 dailyVolume: { date: string; count: number }[]
 recentCalls: Call[]
 upcomingAppointments: Appt[]
}

type Range = 7 | 30 | 90
type CallFilter = 'all' | 'booked' | 'message' | 'dropped'

export default function DashboardPage() {
 const router = useRouter()
 const [data, setData] = useState<Overview | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [openCall, setOpenCall] = useState<Call | null>(null)
 const [range, setRange] = useState<Range>(30)
 const [callFilter, setCallFilter] = useState<CallFilter>('all')
 const [search, setSearch] = useState('')

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setLoading(true)
   try {
    const res = await fetchWithAuth(`/api/dashboard/overview?range=${range}`)
    if (cancelled) return
    if (res.status === 401) { router.replace('/login'); return }
    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Failed to load dashboard'); return }
    setData(json)
    setError('')
   } catch {
    if (!cancelled) setError('Network error')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [router, range])

 const filteredCalls = useMemo(() => {
  if (!data) return []
  let list = data.recentCalls
  if (callFilter !== 'all') list = list.filter((c) => tagOutcome(c) === callFilter)
  if (search.trim()) {
   const q = search.toLowerCase()
   list = list.filter((c) =>
    (c.caller_name || '').toLowerCase().includes(q) ||
    (c.from_number || '').toLowerCase().includes(q) ||
    (c.summary || '').toLowerCase().includes(q)
   )
  }
  return list
 }, [data, callFilter, search])

 const handleSignOut = async () => {
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user'); localStorage.removeItem('business'); localStorage.removeItem('token')
  router.replace('/login')
 }

 if (loading && !data) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
    <SidebarSkeleton />
    <div className="flex-1 px-8 py-10">
     <SkeletonHeader />
     <SkeletonGrid />
    </div>
   </main>
  )
 }

 if (error || !data) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6">
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
     <p className="text-gray-700 mb-4">{error || 'Dashboard unavailable'}</p>
     <button onClick={() => location.reload()} className="text-sm text-sky-600 hover:underline">Reload</button>
    </div>
   </main>
  )
 }

 const k = data.kpis
 const totalDelta = pctDelta(k.totalCalls, k.deltas.totalCalls)
 const dayDelta = absDelta(k.callsToday, k.deltas.callsYesterday)
 const durDelta = pctDelta(k.avgDurationSec, k.deltas.avgDurationSec)
 const bookedDelta = absDelta(k.bookedRate, k.deltas.bookedRate)

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900 flex">
   <Sidebar businessName={data.business.business_name} onSignOut={handleSignOut} />

   <div className="flex-1 min-w-0">
    <TopBar />

    <section className="px-8 py-10">
     <div className="max-w-7xl">
      {/* Header strip */}
      <motion.div
       initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
       className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
      >
       <div>
        <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">
         Overview
        </h1>
        <p className="text-sm text-gray-500 mt-1">
         {data.business.business_name} · last {data.range} days
        </p>
       </div>
       <RangeSelector range={range} onChange={setRange} />
      </motion.div>

      {/* KPI cards */}
      <motion.div
       initial="hidden" animate="show"
       variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
       className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
       <Kpi
        icon={Phone} label="Total calls" value={String(k.totalCalls)}
        delta={totalDelta} deltaLabel={`vs prior ${data.range}d`} spark={k.spark}
       />
       <Kpi
        icon={Activity} label="Calls today" value={String(k.callsToday)}
        delta={dayDelta} deltaLabel="vs yesterday" spark={k.spark.slice(-7)}
       />
       <Kpi
        icon={Clock} label="Avg duration" value={fmtDur(k.avgDurationSec)}
        delta={durDelta} deltaLabel={`vs prior ${data.range}d`}
       />
       <Kpi
        icon={CalendarCheck} label="Booked rate" value={`${k.bookedRate}%`}
        delta={bookedDelta} deltaLabel="pp" accent
       />
      </motion.div>

      {/* Charts row */}
      <motion.div
       initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
       className="grid lg:grid-cols-3 gap-3 mb-6"
      >
       <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
         <h3 className="text-sm font-medium text-gray-700">Daily call volume</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Last {data.range} days</p>
        <div className="h-56">
         {data.dailyVolume.some((d) => d.count > 0)
          ? <VolumeChart data={data.dailyVolume} />
          : <ChartEmpty />}
        </div>
       </div>
       <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Outcomes</h3>
        <p className="text-xs text-gray-400 mb-4">Of {data.kpis.totalCalls} call{data.kpis.totalCalls === 1 ? '' : 's'}</p>
        <div className="h-56 flex items-center justify-center">
         <OutcomesChart data={data.outcomes} />
        </div>
        <OutcomesLegend data={data.outcomes} />
       </div>
      </motion.div>

      {/* Calls + Appointments */}
      <motion.div
       initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
       className="grid md:grid-cols-2 gap-3"
      >
       <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col min-h-[440px]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
         <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
           <PhoneCall className="w-4 h-4 text-sky-500" /> Recent calls
          </h3>
          <span className="text-xs text-gray-400">{filteredCalls.length}</span>
         </div>
         <div className="flex items-center gap-2 flex-wrap">
          <FilterChip active={callFilter === 'all'} onClick={() => setCallFilter('all')}>All</FilterChip>
          <FilterChip active={callFilter === 'booked'} onClick={() => setCallFilter('booked')}>Booked</FilterChip>
          <FilterChip active={callFilter === 'message'} onClick={() => setCallFilter('message')}>Messages</FilterChip>
          <FilterChip active={callFilter === 'dropped'} onClick={() => setCallFilter('dropped')}>Dropped</FilterChip>
          <div className="ml-auto relative">
           <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           <input
            type="search" placeholder="Search…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 w-32 transition-colors"
           />
          </div>
         </div>
        </div>
        <div className="flex-1 overflow-y-auto">
         {filteredCalls.length === 0 ? (
          <CallsEmpty hasAnyData={data.recentCalls.length > 0} />
         ) : (
          <ul className="divide-y divide-gray-100">
           {filteredCalls.map((c) => (
            <li key={c.id}>
             <button
              onClick={() => setOpenCall(c)}
              className="w-full text-left px-6 py-3.5 hover:bg-gray-50/60 flex items-center gap-3 group transition-colors"
             >
              <OutcomeDot outcome={tagOutcome(c)} />
              <div className="flex-1 min-w-0">
               <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                 {c.caller_name || c.from_number || 'Unknown'}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">{relTime(c.created_at)}</span>
               </div>
               <div className="flex items-center gap-2 mt-0.5">
                <OutcomeBadge outcome={tagOutcome(c)} />
                <p className="text-xs text-gray-500 truncate">
                 {c.summary || `${fmtDur(c.duration || 0)}`}
                </p>
               </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
             </button>
            </li>
           ))}
          </ul>
         )}
        </div>
       </div>

       <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col min-h-[440px]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
         <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-500" /> Upcoming appointments
         </h3>
         <span className="text-xs text-gray-400">{data.upcomingAppointments.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
         {data.upcomingAppointments.length === 0 ? (
          <ApptsEmpty />
         ) : (
          <ul className="divide-y divide-gray-100">
           {data.upcomingAppointments.map((a) => (
            <li key={a.id} className="px-6 py-3.5 flex items-start gap-3">
             <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-sky-500" />
             <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
               <span className="text-sm font-medium text-gray-900 truncate">{a.customer_name}</span>
               <span className="text-xs text-gray-400 flex-shrink-0">{fmtDateTime(a.scheduled_date)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
               {a.service_type || 'Appointment'}{a.notes ? ` · ${a.notes}` : ''}
              </p>
             </div>
            </li>
           ))}
          </ul>
         )}
        </div>
       </div>
      </motion.div>
     </div>
    </section>
   </div>

   <AnimatePresence>
    {openCall && <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />}
   </AnimatePresence>
  </main>
 )
}

/* ====================== SIDEBAR ====================== */

function Sidebar({ businessName, onSignOut }: { businessName: string; onSignOut: () => void }) {
 const items: { icon: React.ElementType; label: string; href: string; active?: boolean }[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', active: true },
  { icon: PhoneCall, label: 'Calls', href: '/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/dashboard' },
  { icon: Settings, label: 'Settings', href: '/dashboard' },
  { icon: CreditCard, label: 'Billing', href: '/dashboard/billing' },
 ]
 return (
  <aside className="hidden lg:flex w-60 flex-col bg-white/40 border-r border-black/5 sticky top-0 h-screen">
   <div className="px-5 py-5">
    <Link href="/dashboard" className="flex items-center" aria-label="CloudGreet">
     <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={140} height={40} priority className="h-7 w-auto" />
    </Link>
   </div>

   <nav className="px-3 flex-1">
    {items.map((item) => (
     <Link key={item.label} href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
       item.active
        ? 'bg-gray-900 text-white'
        : 'text-gray-600 hover:text-gray-900 hover:bg-black/[.04]'
      }`}
     >
      <item.icon className="w-4 h-4" strokeWidth={1.75} />
      {item.label}
     </Link>
    ))}
   </nav>

   <div className="px-3 pb-5 border-t border-black/5 pt-4 mt-4">
    <div className="px-3 mb-3">
     <div className="text-xs text-gray-500 mb-1">Signed in as</div>
     <div className="text-sm font-medium text-gray-900 truncate">{businessName}</div>
    </div>
    <button onClick={onSignOut}
     className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-black/[.04] transition-colors"
    >
     <LogOut className="w-4 h-4" strokeWidth={1.75} /> Sign out
    </button>
   </div>
  </aside>
 )
}

function SidebarSkeleton() {
 return (
  <aside className="hidden lg:block w-60 border-r border-black/5 sticky top-0 h-screen">
   <div className="p-5"><div className="h-7 w-32 bg-gray-200/70 rounded animate-pulse" /></div>
   <div className="px-5 space-y-2.5">
    {[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-gray-200/50 rounded animate-pulse" />)}
   </div>
  </aside>
 )
}

/* ====================== TOP BAR with live status ====================== */

function TopBar() {
 return (
  <div className="border-b border-black/5 bg-[#f6f5f1]/80 backdrop-blur-md sticky top-0 z-30">
   <div className="px-8 py-3 flex items-center justify-between">
    <LiveStatusPill />
    <div className="text-xs text-gray-500">Demo line: <span className="font-mono text-gray-700">{DEMO_NUMBER}</span></div>
   </div>
  </div>
 )
}

function LiveStatusPill() {
 return (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100">
   <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
   </span>
   <span className="text-xs font-medium text-sky-700">AI agent online</span>
  </div>
 )
}

/* ====================== RANGE SELECTOR ====================== */

function RangeSelector({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
 const opts: Range[] = [7, 30, 90]
 return (
  <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5">
   {opts.map((r) => (
    <button
     key={r}
     onClick={() => onChange(r)}
     className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      range === r ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
     }`}
    >
     {r}d
    </button>
   ))}
  </div>
 )
}

/* ====================== KPI CARD with sparkline + delta ====================== */

function Kpi({
 icon: Icon, label, value, delta, deltaLabel, spark, accent = false,
}: {
 icon: React.ElementType; label: string; value: string
 delta: number; deltaLabel: string; spark?: number[]; accent?: boolean
}) {
 const isUp = delta > 0
 const isFlat = delta === 0
 return (
  <motion.div
   variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
   className={`bg-white border ${accent ? 'border-sky-200' : 'border-gray-200'} rounded-2xl p-5 relative overflow-hidden`}
  >
   <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    {label}
   </div>
   <div className="flex items-baseline gap-2 mb-1">
    <div className={`font-display text-3xl md:text-4xl font-medium tracking-tight ${accent ? 'text-sky-600' : 'text-gray-900'}`}>
     {value}
    </div>
   </div>
   <div className="flex items-center justify-between">
    <div className="flex items-center gap-1 text-xs">
     {isFlat ? (
      <span className="text-gray-400">— {deltaLabel}</span>
     ) : (
      <>
       <span className={`inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(delta).toLocaleString()}{deltaLabel === 'pp' ? 'pp' : ''}
       </span>
       <span className="text-gray-400">{deltaLabel === 'pp' ? '' : deltaLabel}</span>
      </>
     )}
    </div>
    {spark && spark.length > 1 && <Sparkline data={spark} accent={accent} />}
   </div>
  </motion.div>
 )
}

function Sparkline({ data, accent = false }: { data: number[]; accent?: boolean }) {
 const max = Math.max(...data, 1)
 const w = 60, h = 18
 const pts = data.map((v, i) => {
  const x = (i / (data.length - 1)) * w
  const y = h - (v / max) * h
  return `${x.toFixed(1)},${y.toFixed(1)}`
 }).join(' ')
 return (
  <svg width={w} height={h} className="overflow-visible">
   <polyline
    fill="none" stroke={accent ? '#0ea5e9' : '#9ca3af'} strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" points={pts}
   />
  </svg>
 )
}

/* ====================== CHARTS ====================== */

function VolumeChart({ data }: { data: { date: string; count: number }[] }) {
 const labels = data.map((d) => d.date.slice(5))
 const counts = data.map((d) => d.count)
 const cfg = useMemo(() => ({
  labels,
  datasets: [{
   data: counts, borderColor: '#0ea5e9',
   backgroundColor: 'rgba(14, 165, 233, 0.08)',
   borderWidth: 2, tension: 0.35, fill: true,
   pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#0ea5e9',
  }],
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }), [data])
 const opts = useMemo(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { tooltip: { intersect: false, mode: 'index' as const, displayColors: false } },
  scales: {
   x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af', maxTicksLimit: 8 } },
   y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 }, color: '#9ca3af', stepSize: 1 }, beginAtZero: true },
  },
 }), [])
 return <Line data={cfg} options={opts} />
}

function ChartEmpty() {
 return (
  <div className="h-full flex flex-col items-center justify-center text-center">
   <p className="text-sm text-gray-500 mb-1">No call activity yet.</p>
   <p className="text-xs text-gray-400">Calls will populate once your AI receptionist starts answering.</p>
  </div>
 )
}

function OutcomesChart({ data }: { data: { booked: number; message: number; dropped: number } }) {
 const total = data.booked + data.message + data.dropped
 if (total === 0) {
  return (
   <div className="text-center">
    <p className="text-sm text-gray-500">No data yet.</p>
   </div>
  )
 }
 const cfg = {
  labels: ['Booked', 'Message', 'Dropped'],
  datasets: [{
   data: [data.booked, data.message, data.dropped],
   backgroundColor: ['#0ea5e9', '#cbd5e1', '#fda4af'], borderWidth: 0,
  }],
 }
 const opts = { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { tooltip: { enabled: true } } } as const
 return (
  <div className="w-44 h-44 relative">
   <Doughnut data={cfg} options={opts} />
   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <span className="font-display text-3xl font-medium text-gray-900">{Math.round((data.booked / total) * 100)}%</span>
    <span className="text-xs text-gray-500">booked</span>
   </div>
  </div>
 )
}

function OutcomesLegend({ data }: { data: { booked: number; message: number; dropped: number } }) {
 const total = data.booked + data.message + data.dropped
 if (total === 0) return null
 const items = [
  { label: 'Booked', count: data.booked, color: '#0ea5e9' },
  { label: 'Message', count: data.message, color: '#cbd5e1' },
  { label: 'Dropped', count: data.dropped, color: '#fda4af' },
 ]
 return (
  <div className="mt-4 space-y-1.5">
   {items.map((i) => (
    <div key={i.label} className="flex items-center justify-between text-xs">
     <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
      <span className="text-gray-600">{i.label}</span>
     </div>
     <span className="text-gray-900 font-medium">{i.count}</span>
    </div>
   ))}
  </div>
 )
}

/* ====================== FILTER CHIP ====================== */

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
 return (
  <button
   onClick={onClick}
   className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
    active ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
   }`}
  >
   {children}
  </button>
 )
}

/* ====================== OUTCOME TAGS ====================== */

function OutcomeDot({ outcome }: { outcome: 'booked' | 'message' | 'dropped' }) {
 const cls = outcome === 'booked' ? 'bg-sky-500' : outcome === 'dropped' ? 'bg-rose-300' : 'bg-gray-300'
 return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

function OutcomeBadge({ outcome }: { outcome: 'booked' | 'message' | 'dropped' }) {
 const map = {
  booked: 'bg-sky-50 text-sky-700',
  message: 'bg-gray-100 text-gray-600',
  dropped: 'bg-rose-50 text-rose-700',
 } as const
 return (
  <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${map[outcome]}`}>
   {outcome}
  </span>
 )
}

/* ====================== EMPTY STATES ====================== */

function CallsEmpty({ hasAnyData }: { hasAnyData: boolean }) {
 if (hasAnyData) {
  return (
   <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
    <p className="text-sm text-gray-500">No matches.</p>
    <p className="text-xs text-gray-400 mt-1">Try a different filter or search term.</p>
   </div>
  )
 }
 return (
  <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
   <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
    <Phone className="w-4 h-4 text-sky-500" />
   </div>
   <p className="text-sm font-medium text-gray-900 mb-1">No calls yet.</p>
   <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-4">
    Calls will appear here as soon as your AI agent answers them. Want to test it?
   </p>
   <a
    href={`tel:${DEMO_NUMBER.replace(/[^0-9+]/g, '')}`}
    className="inline-flex items-center gap-2 text-xs font-medium text-gray-900 bg-gray-50 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
   >
    <Phone className="w-3 h-3" /> Call your AI: <span className="font-mono">{DEMO_NUMBER}</span>
   </a>
  </div>
 )
}

function ApptsEmpty() {
 return (
  <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
   <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
    <Calendar className="w-4 h-4 text-sky-500" />
   </div>
   <p className="text-sm font-medium text-gray-900 mb-1">No appointments yet.</p>
   <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
    Your AI agent will book appointments here automatically as it handles calls.
   </p>
  </div>
 )
}

/* ====================== CALL DRAWER ====================== */

function CallDrawer({ call, onClose }: { call: Call; onClose: () => void }) {
 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   className="fixed inset-0 z-50 flex justify-end"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
   <motion.aside
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col"
   >
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
     <div>
      <div className="text-sm font-semibold text-gray-900">{call.caller_name || call.from_number || 'Unknown caller'}</div>
      <div className="text-xs text-gray-500">{fmtDateTime(call.created_at)} · {fmtDur(call.duration || 0)}</div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100">
      <X className="w-4 h-4 text-gray-500" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div className="flex flex-wrap gap-1.5">
      <OutcomeBadge outcome={tagOutcome(call)} />
      {call.sentiment && <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{call.sentiment}</span>}
     </div>

     {call.recording_url && (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
       <div className="flex items-center gap-2 mb-2">
        <Play className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Recording</span>
       </div>
       <audio controls src={call.recording_url} className="w-full">
        Your browser does not support audio playback.
       </audio>
      </div>
     )}

     {call.summary && (
      <div>
       <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Summary</h4>
       <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
      </div>
     )}

     {call.transcript ? (
      <div>
       <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Transcript</h4>
       <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">
        {call.transcript}
       </div>
      </div>
     ) : (
      <p className="text-xs text-gray-400">No transcript available for this call.</p>
     )}
    </div>
   </motion.aside>
  </motion.div>
 )
}

/* ====================== SKELETONS ====================== */

function SkeletonHeader() {
 return (
  <div className="mb-8">
   <div className="h-8 w-48 bg-gray-200/70 rounded animate-pulse mb-2" />
   <div className="h-4 w-64 bg-gray-200/50 rounded animate-pulse" />
  </div>
 )
}
function SkeletonGrid() {
 return (
  <>
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    {[...Array(4)].map((_, i) => (
     <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 h-28 animate-pulse" />
    ))}
   </div>
   <div className="grid lg:grid-cols-3 gap-3 mb-6">
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 h-72 animate-pulse" />
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-72 animate-pulse" />
   </div>
   <div className="grid md:grid-cols-2 gap-3">
    <div className="bg-white border border-gray-200 rounded-2xl h-96 animate-pulse" />
    <div className="bg-white border border-gray-200 rounded-2xl h-96 animate-pulse" />
   </div>
  </>
 )
}

/* ====================== HELPERS ====================== */

function tagOutcome(c: Call): 'booked' | 'message' | 'dropped' {
 const o = (c.outcome || '').toLowerCase()
 if (o.includes('book') || o.includes('appoint')) return 'booked'
 if (o.includes('message') || o.includes('voicemail')) return 'message'
 if (c.status === 'failed' || (c.duration ?? 0) < 5) return 'dropped'
 return 'message'
}

function fmtDur(sec: number): string {
 if (!sec) return '0s'
 const m = Math.floor(sec / 60)
 const s = sec % 60
 return m > 0 ? `${m}m ${s}s` : `${s}s`
}
function relTime(iso: string): string {
 const d = new Date(iso)
 const min = Math.floor((Date.now() - d.getTime()) / 60000)
 if (min < 1) return 'just now'
 if (min < 60) return `${min}m ago`
 const hr = Math.floor(min / 60)
 if (hr < 24) return `${hr}h ago`
 const days = Math.floor(hr / 24)
 if (days < 7) return `${days}d ago`
 return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtDateTime(iso: string): string {
 const d = new Date(iso)
 const sameYear = d.getFullYear() === new Date().getFullYear()
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  ...(sameYear ? {} : { year: 'numeric' }),
  hour: 'numeric', minute: '2-digit',
 })
}
function pctDelta(current: number, prior: number): number {
 if (prior === 0) return current === 0 ? 0 : 100
 return Math.round(((current - prior) / prior) * 100)
}
function absDelta(current: number, prior: number): number {
 return current - prior
}
