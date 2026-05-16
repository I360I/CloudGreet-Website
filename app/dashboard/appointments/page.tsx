'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleNotch, WarningCircle, Plus, Clock, CalendarBlank, ArrowRight } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import { demoMonthDays } from '../_components/demo-data'
import {
 MonthGrid, BookingFormModal, AppointmentDrawer,
 type MonthDay,
} from '../_components/appointments'

const EASE = [0.22, 1, 0.36, 1] as const

function startOfMonth(d: Date) {
 return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isoDate(d: Date) {
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string) {
 const d = new Date(iso)
 const h = d.getHours()
 const m = d.getMinutes()
 const ampm = h >= 12 ? 'pm' : 'am'
 const hh = h % 12 || 12
 return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtFullDate(iso: string) {
 const [y, mo, d] = iso.split('-').map((n) => parseInt(n, 10))
 const dt = new Date(y, mo - 1, d)
 return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function AppointmentsPage() {
 const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()))
 const [monthDays, setMonthDays] = useState<MonthDay[] | null>(null)
 const [services, setServices] = useState<string[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 const [selectedIso, setSelectedIso] = useState<string | null>(null)
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
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const params = new URLSearchParams({
     view: 'month',
     startDate: monthStart.toISOString(),
     endDate: monthEnd.toISOString(),
    })
    const res = await fetchWithAuth(`/api/dashboard/calendar?${params.toString()}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
    if (!cancelled) setMonthDays(json.days || [])
   } catch (e) {
    if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load calendar')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [monthStart, refreshTick])

 const refresh = useCallback(() => setRefreshTick((n) => n + 1), [])

 const realMonthCount = monthDays?.reduce((s, d) => s + d.appointments.length, 0) ?? 0
 const isMonthDemo = needsSetup && realMonthCount === 0 && !!monthDays
 const displayMonthDays = isMonthDemo ? demoMonthDays(monthStart) : monthDays

 // Day picked from grid: if it has appointments, just select it for the rail.
 // If it's empty, jump straight to the booking form.
 const handlePickDate = (iso: string) => {
  const day = displayMonthDays?.find((d) => d.date === iso)
  if (day && day.appointments.length > 0) {
   setSelectedIso(iso)
  } else {
   setCreateDate(iso)
  }
 }

 // Upcoming appointments, grouped by day. Each group has a date header
 // (Today / Tomorrow / Wed May 14) plus a list of bookings under it.
 // Cap to 8 events total so the rail stays one viewport tall.
 const upcomingGroups = useMemo(() => {
  if (!displayMonthDays) return [] as Array<{ date: string; label: string; items: Array<{ id: string; start: string; customer: string; service: string; isEmergency: boolean }> }>
  const now = Date.now()
  const all: Array<{ id: string; date: string; start: string; customer: string; service: string; isEmergency: boolean }> = []
  for (const day of displayMonthDays) {
   for (const a of day.appointments) {
    all.push({
     id: a.id, date: day.date, start: a.start_time,
     customer: a.customer_name, service: a.service_type,
     isEmergency: !!a.is_emergency,
    })
   }
  }
  const sorted = all
   .filter((a) => new Date(a.start).getTime() >= now - 60 * 60 * 1000)
   .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
   .slice(0, 8)

  const todayIso = (() => {
   const d = new Date()
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  const groupsMap = new Map<string, Array<{ id: string; start: string; customer: string; service: string; isEmergency: boolean }>>()
  for (const a of sorted) {
   const list = groupsMap.get(a.date) || []
   list.push({ id: a.id, start: a.start, customer: a.customer, service: a.service, isEmergency: a.isEmergency })
   groupsMap.set(a.date, list)
  }
  return Array.from(groupsMap.entries()).map(([date, items]) => {
   let label: string
   if (date === todayIso) label = 'Today'
   else if (date === tomorrowIso) label = 'Tomorrow'
   else {
    const [y, mo, d] = date.split('-').map((n) => parseInt(n, 10))
    label = new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
   }
   return { date, label, items }
  })
 }, [displayMonthDays])

 const selectedDay = selectedIso
  ? displayMonthDays?.find((d) => d.date === selectedIso) || null
  : null

 return (
  <DashShell activeLabel="Bookings">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Bookings</h1>
       <p className="text-sm text-gray-500 mt-1">
        Click a day to see what&apos;s on it. Click an empty day to book.
       </p>
      </div>
      <button
       onClick={() => setCreateDate(isoDate(new Date()))}
       className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out shadow-sm"
      >
       <Plus className="w-4 h-4" /> New booking
      </button>
     </div>

     {loading && !monthDays && (
      <div className="bg-white border border-gray-200 rounded-2xl p-16 flex items-center justify-center">
       <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
      </div>
     )}

     {!loading && error && (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
       <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
       <div>
        <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load calendar</h3>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
       </div>
      </div>
     )}

     {!error && (loading ? monthDays : true) && (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4">
       <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
       >
        <MonthGrid
         monthStart={monthStart}
         monthDays={displayMonthDays}
         selectedIso={selectedIso}
         onPrev={() => { setSelectedIso(null); setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)) }}
         onNext={() => { setSelectedIso(null); setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)) }}
         onToday={() => { setSelectedIso(null); setMonthStart(startOfMonth(new Date())) }}
         onPickDate={handlePickDate}
         onPickAppt={(id) => setOpenApptId(id)}
        />
       </motion.div>

       <div className="relative">
        <AnimatePresence mode="wait">
         {selectedDay ? (
          <motion.div
           key={`day-${selectedDay.date}`}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           transition={{ duration: 0.3, ease: EASE }}
           className="bg-white border border-gray-200 rounded-2xl overflow-hidden lg:sticky lg:top-6"
          >
           <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div>
             <div className="text-[10px] uppercase tracking-wider font-semibold text-sky-700 mb-0.5">
              Selected day
             </div>
             <h3 className="text-base font-medium text-gray-900">{fmtFullDate(selectedDay.date)}</h3>
             <p className="text-xs text-gray-500 mt-0.5">
              {selectedDay.appointments.length} booking{selectedDay.appointments.length === 1 ? '' : 's'}
             </p>
            </div>
            <button
             onClick={() => setSelectedIso(null)}
             className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
             Clear
            </button>
           </div>
           <ul className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
            {selectedDay.appointments
             .slice()
             .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
             .map((a, idx) => (
              <motion.li
               key={a.id}
               initial={{ opacity: 0, y: 4 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.25, ease: EASE, delay: idx * 0.03 }}
              >
               <button
                onClick={() => setOpenApptId(a.id)}
                className={`w-full text-left px-5 py-2.5 transition-colors flex items-center gap-3 group ${
                 a.is_emergency ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-sky-50/40'
                }`}
               >
                <div className="w-12 flex-shrink-0 text-right">
                 <div className={`text-sm font-mono font-medium leading-none ${a.is_emergency ? 'text-rose-700' : 'text-sky-700'}`}>
                  {fmtTime(a.start_time).replace(/\s.*/, '')}
                 </div>
                 <div className={`text-[9px] uppercase tracking-wider mt-0.5 ${a.is_emergency ? 'text-rose-400' : 'text-sky-400'}`}>
                  {fmtTime(a.start_time).split(' ')[1]}
                 </div>
                </div>
                <div className={`w-px h-7 flex-shrink-0 ${a.is_emergency ? 'bg-rose-200' : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-1.5 min-w-0">
                  {a.is_emergency && (
                   <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-[9px] font-medium text-rose-700 uppercase tracking-wider flex-shrink-0" aria-label="emergency">
                    🚨 Urgent
                   </span>
                  )}
                  <div className={`text-sm font-medium truncate leading-tight ${a.is_emergency ? 'text-rose-900' : 'text-gray-900'}`}>{a.customer_name}</div>
                 </div>
                 <div className={`text-xs truncate mt-0.5 ${a.is_emergency ? 'text-rose-700/80' : 'text-gray-500'}`}>{a.service_type || 'Service TBD'}</div>
                </div>
                <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ${
                 a.is_emergency ? 'text-rose-300 group-hover:text-rose-500' : 'text-gray-300 group-hover:text-sky-500'
                }`} />
               </button>
              </motion.li>
             ))}
           </ul>
           <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <button
             onClick={() => setCreateDate(selectedDay.date)}
             className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 py-1.5 rounded-md hover:bg-white transition-colors"
            >
             <Plus className="w-3.5 h-3.5" /> Add another booking
            </button>
           </div>
          </motion.div>
         ) : (
          <motion.div
           key="upcoming"
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -10 }}
           transition={{ duration: 0.3, ease: EASE }}
           className="bg-white border border-gray-200 rounded-2xl overflow-hidden lg:sticky lg:top-6"
          >
           <div className="px-5 py-4 border-b border-gray-100 flex items-baseline justify-between">
            <div>
             <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">
              Up next
             </div>
             <h3 className="text-base font-medium text-gray-900">Upcoming bookings</h3>
            </div>
            <span className="text-xs font-mono text-gray-400">
             {upcomingGroups.reduce((s, g) => s + g.items.length, 0)}
            </span>
           </div>
           {upcomingGroups.length === 0 ? (
            <div className="px-5 py-10 text-center">
             <CalendarBlank className="w-8 h-8 text-gray-300 mx-auto mb-2" />
             <p className="text-sm text-gray-500">No upcoming bookings.</p>
             <button
              onClick={() => setCreateDate(isoDate(new Date()))}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-800"
             >
              <Plus className="w-3.5 h-3.5" /> Add one
             </button>
            </div>
           ) : (
            <div className="max-h-[560px] overflow-y-auto">
             {upcomingGroups.map((g, gi) => (
              <div key={g.date}>
               <div className="px-5 pt-3 pb-1.5 sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-gray-500">
                 {g.label}
                </span>
                <span className="text-[10px] font-mono text-gray-400">{g.items.length}</span>
               </div>
               <ul>
                {g.items.map((a, idx) => (
                 <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE, delay: (gi * 0.04) + (idx * 0.02) }}
                 >
                  <button
                   onClick={() => setOpenApptId(a.id)}
                   className={`w-full text-left px-5 py-2.5 transition-colors flex items-center gap-3 group ${
                    a.isEmergency ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-sky-50/40'
                   }`}
                  >
                   <div className="w-12 flex-shrink-0 text-right">
                    <div className={`text-sm font-mono font-medium leading-none ${a.isEmergency ? 'text-rose-700' : 'text-sky-700'}`}>
                     {fmtTime(a.start).replace(/\s.*/, '')}
                    </div>
                    <div className={`text-[9px] uppercase tracking-wider mt-0.5 ${a.isEmergency ? 'text-rose-400' : 'text-sky-400'}`}>
                     {fmtTime(a.start).split(' ')[1]}
                    </div>
                   </div>
                   <div className={`w-px h-7 flex-shrink-0 ${a.isEmergency ? 'bg-rose-200' : 'bg-gray-200'}`} />
                   <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                     {a.isEmergency && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-[9px] font-medium text-rose-700 uppercase tracking-wider flex-shrink-0" aria-label="emergency">
                       🚨 Urgent
                      </span>
                     )}
                     <div className={`text-sm font-medium truncate leading-tight ${a.isEmergency ? 'text-rose-900' : 'text-gray-900'}`}>{a.customer}</div>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${a.isEmergency ? 'text-rose-700/80' : 'text-gray-500'}`}>{a.service || 'Service TBD'}</div>
                   </div>
                   <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ${
                    a.isEmergency ? 'text-rose-300 group-hover:text-rose-500' : 'text-gray-300 group-hover:text-sky-500'
                   }`} />
                  </button>
                 </motion.li>
                ))}
               </ul>
               {gi < upcomingGroups.length - 1 && <div className="mx-5 border-t border-gray-100" />}
              </div>
             ))}
            </div>
           )}
          </motion.div>
         )}
        </AnimatePresence>
       </div>
      </div>
     )}
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
