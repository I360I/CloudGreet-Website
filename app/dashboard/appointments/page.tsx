'use client'

import { useEffect, useMemo, useState } from 'react'
import {
 Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'

type Appt = {
 id: string
 time: string
 customer: string
 serviceType: string
}

type Day = {
 date: string
 dayName: string
 dayNumber: number
 isToday: boolean
 appointments: Appt[]
 count: number
}

function startOfWeek(d: Date) {
 const out = new Date(d)
 out.setDate(out.getDate() - out.getDay())
 out.setHours(0, 0, 0, 0)
 return out
}

function addDays(d: Date, n: number) {
 const out = new Date(d)
 out.setDate(out.getDate() + n)
 return out
}

function fmtRange(start: Date, end: Date) {
 const sameMonth = start.getMonth() === end.getMonth()
 const sameYear = start.getFullYear() === end.getFullYear()
 const monthFmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' })
 if (sameMonth) {
  return `${monthFmt(start)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
 }
 if (sameYear) {
  return `${monthFmt(start)} ${start.getDate()} – ${monthFmt(end)} ${end.getDate()}, ${end.getFullYear()}`
 }
 return `${monthFmt(start)} ${start.getDate()}, ${start.getFullYear()} – ${monthFmt(end)} ${end.getDate()}, ${end.getFullYear()}`
}

export default function AppointmentsPage() {
 const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
 const [days, setDays] = useState<Day[] | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setLoading(true); setError('')
   try {
    const params = new URLSearchParams({
     startDate: weekStart.toISOString(),
     endDate: addDays(weekStart, 6).toISOString(),
    })
    const res = await fetchWithAuth(`/api/dashboard/week-calendar?${params.toString()}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
    if (!cancelled) setDays(json.days || [])
   } catch (e) {
    if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load calendar')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [weekStart])

 const totalThisWeek = days?.reduce((s, d) => s + d.count, 0) ?? 0

 return (
  <DashShell activeLabel="Appointments">
   <section className="px-8 py-10">
    <div className="max-w-7xl">
     <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Appointments</h1>
       <p className="text-sm text-gray-500 mt-1">
        {totalThisWeek > 0 ? `${totalThisWeek} this week` : 'Bookings made by your AI agent.'}
       </p>
      </div>
      <div className="flex items-center gap-2">
       <button
        onClick={() => setWeekStart(addDays(weekStart, -7))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-white transition-colors"
        aria-label="Previous week"
       >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
       </button>
       <button
        onClick={() => setWeekStart(startOfWeek(new Date()))}
        className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-white text-gray-700 transition-colors"
       >
        Today
       </button>
       <button
        onClick={() => setWeekStart(addDays(weekStart, 7))}
        className="p-2 rounded-lg border border-gray-200 hover:bg-white transition-colors"
        aria-label="Next week"
       >
        <ChevronRight className="w-4 h-4 text-gray-600" />
       </button>
       <span className="ml-2 text-sm text-gray-700 font-medium">{fmtRange(weekStart, weekEnd)}</span>
      </div>
     </div>

     {loading && (
      <div className="bg-white border border-gray-200 rounded-2xl p-16 flex items-center justify-center">
       <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
     )}

     {!loading && error && (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
       <div>
        <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load calendar</h3>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
       </div>
      </div>
     )}

     {!loading && !error && days && (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
       {days.map((day) => (
        <div
         key={day.date}
         className={`bg-white border rounded-2xl overflow-hidden flex flex-col min-h-[280px] ${
          day.isToday ? 'border-sky-300 ring-1 ring-sky-200' : 'border-gray-200'
         }`}
        >
         <div className={`px-3 py-2.5 border-b border-gray-100 ${day.isToday ? 'bg-sky-50/60' : ''}`}>
          <div className="flex items-baseline justify-between gap-2">
           <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{day.dayName.slice(0, 3)}</span>
           <span className={`text-xs ${day.isToday ? 'text-sky-700 font-semibold' : 'text-gray-400'}`}>
            {day.count > 0 ? `${day.count}` : ''}
           </span>
          </div>
          <div className={`text-lg font-medium mt-0.5 ${day.isToday ? 'text-sky-700' : 'text-gray-900'}`}>
           {day.dayNumber}
          </div>
         </div>
         <div className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {day.appointments.length === 0 ? (
           <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-gray-300">—</span>
           </div>
          ) : (
           day.appointments.map((a) => (
            <div
             key={a.id}
             className="bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-2 text-left hover:border-sky-200 transition-colors"
            >
             <div className="flex items-center gap-1 text-[10px] text-sky-700 font-mono mb-1">
              <Clock className="w-2.5 h-2.5" /> {a.time}
             </div>
             <div className="text-xs font-medium text-gray-900 truncate leading-tight">{a.customer}</div>
             <div className="text-[10px] text-gray-500 truncate mt-0.5">{a.serviceType}</div>
            </div>
           ))
          )}
         </div>
        </div>
       ))}
      </div>
     )}

     {!loading && !error && days && totalThisWeek === 0 && (
      <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-8 text-center">
       <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4">
        <CalendarIcon className="w-4 h-4 text-sky-500" />
       </div>
       <p className="text-sm font-medium text-gray-900 mb-1">No appointments this week.</p>
       <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
        Your AI agent books appointments automatically as it handles calls.
       </p>
      </div>
     )}
    </div>
   </section>
  </DashShell>
 )
}
