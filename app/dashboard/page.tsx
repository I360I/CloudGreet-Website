'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
 Phone, Calendar, Clock, TrendingUp, X, Play, Loader2, ChevronRight,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import {
 Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
 Tooltip, Filler, ArcElement,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, ArcElement)

type Call = {
 id: string
 call_id: string
 from_number: string
 caller_name: string | null
 duration: number | null
 created_at: string
 status: string
 sentiment: string | null
 summary: string | null
 transcript: string | null
 recording_url: string | null
 outcome: string | null
}

type Appt = {
 id: string
 customer_name: string
 customer_phone: string | null
 service_type: string | null
 scheduled_date: string
 start_time: string | null
 status: string | null
 notes: string | null
}

type Overview = {
 business: { id: string; business_name: string }
 kpis: { totalCalls: number; callsToday: number; avgDurationSec: number; bookedRate: number }
 outcomes: { booked: number; message: number; dropped: number }
 dailyVolume: { date: string; count: number }[]
 recentCalls: Call[]
 upcomingAppointments: Appt[]
}

export default function DashboardPage() {
 const router = useRouter()
 const [data, setData] = useState<Overview | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [openCall, setOpenCall] = useState<Call | null>(null)

 useEffect(() => {
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/dashboard/overview')
    if (res.status === 401) { router.replace('/login'); return }
    const json = await res.json()
    if (!res.ok) {
     setError(json.error || 'Failed to load dashboard')
     return
    }
    setData(json)
   } catch (err) {
    setError('Network error')
   } finally {
    setLoading(false)
   }
  })()
 }, [router])

 const handleSignOut = async () => {
  try { await fetch('/api/auth/clear-token', { method: 'POST' }) } catch {}
  localStorage.removeItem('user')
  localStorage.removeItem('business')
  localStorage.removeItem('token')
  router.replace('/login')
 }

 if (loading) {
  return (
   <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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

 return (
  <main className="min-h-screen bg-[#f6f5f1] text-gray-900">
   <Nav businessName={data.business.business_name} onSignOut={handleSignOut} />

   <section className="px-6 pt-10 pb-32">
    <div className="max-w-7xl mx-auto">
     <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mb-1">
      {data.business.business_name}
     </h1>
     <p className="text-sm text-gray-500 mb-8">Last 30 days</p>

     {/* KPI cards */}
     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <Kpi icon={Phone} label="Total calls" value={String(data.kpis.totalCalls)} />
      <Kpi icon={Clock} label="Calls today" value={String(data.kpis.callsToday)} />
      <Kpi icon={TrendingUp} label="Avg duration" value={fmtDur(data.kpis.avgDurationSec)} />
      <Kpi icon={Calendar} label="Booked rate" value={`${data.kpis.bookedRate}%`} accent />
     </div>

     {/* Charts row */}
     <div className="grid lg:grid-cols-3 gap-3 mb-8">
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
       <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Daily call volume</h3>
        <span className="text-xs text-gray-400">Last 30 days</span>
       </div>
       <div className="h-56">
        <VolumeChart data={data.dailyVolume} />
       </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
       <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Outcomes</h3>
       </div>
       <div className="h-56 flex items-center justify-center">
        <OutcomesChart data={data.outcomes} />
       </div>
      </div>
     </div>

     {/* Calls + Appointments */}
     <div className="grid md:grid-cols-2 gap-3">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
       <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
         <Phone className="w-4 h-4 text-sky-500" /> Recent calls
        </h3>
        <span className="text-xs text-gray-400">{data.recentCalls.length}</span>
       </div>
       {data.recentCalls.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-400">No calls yet.</div>
       ) : (
        <ul className="divide-y divide-gray-100">
         {data.recentCalls.map((c) => (
          <li key={c.id}>
           <button
            onClick={() => setOpenCall(c)}
            className="w-full text-left px-6 py-3.5 hover:bg-gray-50/60 flex items-center gap-3"
           >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${outcomeColor(c.outcome, c.status)}`} />
            <div className="flex-1 min-w-0">
             <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
               {c.caller_name || c.from_number || 'Unknown'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{relTime(c.created_at)}</span>
             </div>
             <p className="text-xs text-gray-500 mt-0.5 truncate">
              {c.summary || c.outcome || `${fmtDur(c.duration || 0)} call`}
             </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
           </button>
          </li>
         ))}
        </ul>
       )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
       <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
         <Calendar className="w-4 h-4 text-sky-500" /> Upcoming appointments
        </h3>
        <span className="text-xs text-gray-400">{data.upcomingAppointments.length}</span>
       </div>
       {data.upcomingAppointments.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-400">Nothing scheduled.</div>
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
    </div>
   </section>

   {openCall && <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />}
  </main>
 )
}

/* ---------- Subcomponents ---------- */

function Nav({ businessName, onSignOut }: { businessName: string; onSignOut: () => void }) {
 return (
  <nav className="sticky top-0 z-40 bg-[#f6f5f1]/85 backdrop-blur-md border-b border-black/5">
   <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <Link href="/dashboard" className="flex items-center" aria-label="CloudGreet">
     <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={160} height={48} priority className="h-9 w-auto" />
    </Link>
    <div className="hidden sm:flex items-center gap-6 text-sm">
     <span className="text-gray-500 truncate max-w-xs">{businessName}</span>
     <Link href="/dashboard/billing" className="text-gray-600 hover:text-gray-900 transition-colors">Billing</Link>
     <button onClick={onSignOut} className="text-gray-600 hover:text-gray-900 transition-colors">Sign out</button>
    </div>
   </div>
  </nav>
 )
}

function Kpi({
 icon: Icon, label, value, accent = false,
}: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
 return (
  <div className={`bg-white border ${accent ? 'border-sky-200' : 'border-gray-200'} rounded-2xl p-5`}>
   <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    {label}
   </div>
   <div className={`font-display text-3xl md:text-4xl font-medium tracking-tight ${accent ? 'text-sky-600' : 'text-gray-900'}`}>
    {value}
   </div>
  </div>
 )
}

function VolumeChart({ data }: { data: { date: string; count: number }[] }) {
 const labels = data.map((d) => d.date.slice(5))
 const counts = data.map((d) => d.count)
 const cfg = useMemo(() => ({
  labels,
  datasets: [{
   data: counts,
   borderColor: '#0ea5e9',
   backgroundColor: 'rgba(14, 165, 233, 0.08)',
   borderWidth: 2,
   tension: 0.35,
   fill: true,
   pointRadius: 0,
   pointHoverRadius: 4,
   pointHoverBackgroundColor: '#0ea5e9',
  }],
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }), [data])
 const opts = useMemo(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { tooltip: { intersect: false, mode: 'index' as const } },
  scales: {
   x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af', maxTicksLimit: 8 } },
   y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 }, color: '#9ca3af', stepSize: 1 }, beginAtZero: true },
  },
 }), [])
 return <Line data={cfg} options={opts} />
}

function OutcomesChart({ data }: { data: { booked: number; message: number; dropped: number } }) {
 const total = data.booked + data.message + data.dropped
 if (total === 0) return <p className="text-sm text-gray-400">No data yet.</p>
 const cfg = {
  labels: ['Booked', 'Message', 'Dropped'],
  datasets: [{
   data: [data.booked, data.message, data.dropped],
   backgroundColor: ['#0ea5e9', '#cbd5e1', '#fda4af'],
   borderWidth: 0,
  }],
 }
 const opts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: { tooltip: { enabled: true } },
 } as const
 return (
  <div className="w-full h-full flex items-center justify-center">
   <div className="w-44 h-44 relative">
    <Doughnut data={cfg} options={opts} />
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
     <span className="font-display text-2xl font-medium text-gray-900">{Math.round((data.booked / total) * 100)}%</span>
     <span className="text-xs text-gray-500">booked</span>
    </div>
   </div>
  </div>
 )
}

function CallDrawer({ call, onClose }: { call: Call; onClose: () => void }) {
 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 return (
  <div className="fixed inset-0 z-50 flex justify-end">
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
   <aside className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col">
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
     {call.outcome && (
      <Tag color={call.outcome.toLowerCase().includes('book') ? 'sky' : 'gray'}>{call.outcome}</Tag>
     )}
     {call.sentiment && <Tag color="gray">{call.sentiment}</Tag>}

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
   </aside>
  </div>
 )
}

function Tag({ children, color }: { children: React.ReactNode; color: 'sky' | 'gray' }) {
 const cls = color === 'sky' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-700'
 return <span className={`inline-block text-xs px-2.5 py-1 rounded-full mr-2 ${cls}`}>{children}</span>
}

/* ---------- Helpers ---------- */

function fmtDur(sec: number): string {
 if (!sec) return '0s'
 const m = Math.floor(sec / 60)
 const s = sec % 60
 return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function relTime(iso: string): string {
 const d = new Date(iso)
 const diffMs = Date.now() - d.getTime()
 const min = Math.floor(diffMs / 60000)
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
 const now = new Date()
 const sameYear = d.getFullYear() === now.getFullYear()
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  ...(sameYear ? {} : { year: 'numeric' }),
  hour: 'numeric', minute: '2-digit',
 })
}

function outcomeColor(outcome: string | null, status: string): string {
 const o = (outcome || '').toLowerCase()
 if (o.includes('book') || o.includes('appoint')) return 'bg-sky-500'
 if (status === 'failed') return 'bg-red-400'
 return 'bg-gray-300'
}
