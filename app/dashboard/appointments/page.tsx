'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock, Plus,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import { demoMonthDays, demoWeekDays } from '../_components/demo-data'
import {
 MonthGrid, BookingFormModal, AppointmentDrawer,
 type MonthDay,
} from '../_components/appointments'

const EASE = [0.22, 1, 0.36, 1] as const

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

function startOfMonth(d: Date) {
 return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isoDate(d: Date) {
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
 const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()))
 const [days, setDays] = useState<Day[] | null>(null)
 const [monthDays, setMonthDays] = useState<MonthDay[] | null>(null)
 const [services, setServices] = useState<string[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 const [createDate, setCreateDate] = useState<string | null>(null)
 const [openApptId, setOpenApptId] = useState<string | null>(null)
 const [refreshTick, setRefreshTick] = useState(0)
 const [needsSetup, setNeedsSetup] = useState(false)

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/onboarding/state')
    if (!res.ok) return
    const json = await res.json()
    if (!cancelled && json?.success && json.business) {
     setNeedsSetup(!json.business.onboarding_completed)
    }
   } catch { /* non-fatal */ }
  })()
  return () => { cancelled = true }
 }, [])

 const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

 useEffect(() => {
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/business/profile')
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.success) setServices(json.data?.services || [])
   } catch { /* non-fatal */ }
  })()
 }, [])

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
 }, [weekStart, refreshTick])

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const params = new URLSearchParams({
     view: 'month',
     startDate: monthStart.toISOString(),
     endDate: monthEnd.toISOString(),
    })
    const res = await fetchWithAuth(`/api/dashboard/calendar?${params.toString()}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) return
    if (!cancelled) setMonthDays(json.days || [])
   } catch { /* ignore — week view is the primary surface */ }
  })()
  return () => { cancelled = true }
 }, [monthStart, refreshTick])

 const refresh = useCallback(() => setRefreshTick((n) => n + 1), [])

 // Substitute demo data when onboarding is incomplete and no real data exists.
 const realWeek = days?.reduce((s, d) => s + d.count, 0) ?? 0
 const isWeekDemo = needsSetup && realWeek === 0 && !!days
 const displayDays = isWeekDemo ? demoWeekDays(weekStart) : days
 const totalThisWeek = displayDays?.reduce((s, d) => s + d.count, 0) ?? 0

 const realMonthCount = monthDays?.reduce((s, d) => s + d.appointments.length, 0) ?? 0
 const isMonthDemo = needsSetup && realMonthCount === 0 && !!monthDays
 const displayMonthDays = isMonthDemo ? demoMonthDays(monthStart) : monthDays

 return (
  <DashShell activeLabel="Appointments">
   <section className="px-8 py-10">
    <div className="max-w-7xl">
     <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="flex items-baseline gap-4">
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Appointments</h1>
       {totalThisWeek > 0 && <span className="text-sm text-gray-500 font-mono">{totalThisWeek} this week</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
       <button
        onClick={() => setCreateDate(isoDate(new Date()))}
        className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-all duration-300 ease-out"
       >
        <Plus className="w-3.5 h-3.5" /> New booking
       </button>
       <div className="flex items-center gap-1 ml-2">
        <button
         onClick={() => setWeekStart(addDays(weekStart, -7))}
         className="p-2 rounded-lg border border-gray-200 hover:bg-white transition-all duration-300 ease-out"
         aria-label="Previous week"
        >
         <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
         onClick={() => setWeekStart(startOfWeek(new Date()))}
         className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:bg-white text-gray-700 transition-all duration-300 ease-out"
        >
         Today
        </button>
        <button
         onClick={() => setWeekStart(addDays(weekStart, 7))}
         className="p-2 rounded-lg border border-gray-200 hover:bg-white transition-all duration-300 ease-out"
         aria-label="Next week"
        >
         <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
       </div>
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

     <AnimatePresence mode="wait">
      {!loading && !error && displayDays && (
       <motion.div
        key={displayDays[0]?.date || 'empty'}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="grid grid-cols-1 md:grid-cols-7 gap-2"
       >
        {displayDays.map((day, i) => (
         <motion.div
          key={day.date}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.03 * i }}
          onClick={() => setCreateDate(day.date)}
          className={`bg-white border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 ease-out hover:border-sky-300 ${
           day.appointments.length === 0 ? 'min-h-[112px]' : 'min-h-[180px]'
          } ${day.appointments.length > 0 ? 'max-h-[260px]' : ''} ${
           day.isToday ? 'border-sky-300 ring-1 ring-sky-200' : 'border-gray-200'
          }`}
         >
          <div className={`px-3 py-2.5 border-b border-gray-100 ${day.isToday ? 'bg-sky-50/60' : ''}`}>
           <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{day.dayName.slice(0, 3)}</span>
            <span className={`text-xs font-mono ${day.isToday ? 'text-sky-700 font-semibold' : 'text-gray-400'}`}>
             {day.count > 0 ? `${day.count}` : ''}
            </span>
           </div>
           <div className={`text-lg font-mono font-medium mt-0.5 ${day.isToday ? 'text-sky-700' : 'text-gray-900'}`}>
            {day.dayNumber}
           </div>
          </div>
          {day.appointments.length > 0 && (
           <div className="flex-1 px-2 py-2 space-y-1">
            {day.appointments.slice(0, 2).map((a, idx) => (
             <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE, delay: 0.03 * i + 0.04 * idx }}
              onClick={(e) => { e.stopPropagation(); setOpenApptId(a.id) }}
              className="bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-2 text-left hover:border-sky-300 hover:bg-sky-100/60 transition-all duration-300"
             >
              <div className="flex items-center gap-1 text-[10px] text-sky-700 font-mono mb-1">
               <Clock className="w-2.5 h-2.5" /> {a.time}
              </div>
              <div className="text-xs font-medium text-gray-900 truncate leading-tight">{a.customer}</div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{a.serviceType}</div>
             </motion.div>
            ))}
            {day.appointments.length > 2 && (
             <button
              onClick={(e) => {
               e.stopPropagation()
               // Open the third (next overflow) booking; users can advance via the drawer
               setOpenApptId(day.appointments[2].id)
              }}
              className="w-full text-[11px] font-medium text-sky-700 hover:text-sky-900 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors text-center"
             >
              + {day.appointments.length - 2} more
             </button>
            )}
           </div>
          )}
         </motion.div>
        ))}
       </motion.div>
      )}
     </AnimatePresence>

     {!loading && !error && displayDays && totalThisWeek === 0 && (
      <motion.p
       initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
       className="text-sm text-gray-500 mt-4"
      >
       No appointments this week.
      </motion.p>
     )}

     {/* Month grid */}
     <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
      className="mt-6"
     >
      <MonthGrid
       monthStart={monthStart}
       monthDays={displayMonthDays}
       onPrev={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
       onNext={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
       onToday={() => setMonthStart(startOfMonth(new Date()))}
       onPickDate={(iso) => setCreateDate(iso)}
       onPickAppt={(id) => setOpenApptId(id)}
      />
     </motion.div>
    </div>
   </section>

   <AnimatePresence>
    {createDate && (
     <BookingFormModal
      key={createDate}
      dateIso={createDate}
      services={services}
      onClose={() => setCreateDate(null)}
      onCreated={() => { setCreateDate(null); refresh() }}
     />
    )}
    {openApptId && (
     <AppointmentDrawer
      key={openApptId}
      apptId={openApptId}
      onClose={() => setOpenApptId(null)}
      onChanged={refresh}
     />
    )}
   </AnimatePresence>
  </DashShell>
 )
}
