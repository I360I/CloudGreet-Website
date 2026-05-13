'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CircleNotch, WarningCircle, MapPin, Phone, Envelope, FileText, Trash } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

/* ====================== MONTH GRID ====================== */

export type MonthDay = {
 date: string
 appointments: Array<{
  id: string
  customer_name: string
  service_type: string
  start_time: string
  end_time: string
  status: string
 }>
}

export function MonthGrid({
 monthStart, monthDays, selectedIso, onPrev, onNext, onToday, onPickDate, onPickAppt,
}: {
 monthStart: Date
 monthDays: MonthDay[] | null
 selectedIso: string | null
 onPrev: () => void
 onNext: () => void
 onToday: () => void
 onPickDate: (iso: string) => void
 onPickAppt: (id: string) => void
}) {
 const cells = buildMonthCells(monthStart, monthDays || [])
 const monthKey = `${monthStart.getFullYear()}-${monthStart.getMonth()}`
 const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
 const total = (monthDays || []).reduce((s, d) => s + d.appointments.length, 0)

 return (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
   <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
    <div className="flex items-baseline gap-3">
     <h2 className="text-base font-medium text-gray-900">{monthLabel}</h2>
     {total > 0 && (
      <span className="text-xs text-gray-500 font-mono">{total} booking{total === 1 ? '' : 's'}</span>
     )}
    </div>
    <div className="flex items-center gap-1">
     <NavBtn onClick={onPrev} label="Previous month">‹</NavBtn>
     <button
      onClick={onToday}
      className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 hover:bg-gray-100 transition-all duration-300 ease-out"
     >
      Today
     </button>
     <NavBtn onClick={onNext} label="Next month">›</NavBtn>
    </div>
   </div>

   <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/40">
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
     <div key={d} className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-gray-500">{d}</div>
    ))}
   </div>

   <AnimatePresence mode="wait">
    <motion.div
     key={monthKey}
     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
     transition={{ duration: 0.25, ease: EASE }}
     className="grid grid-cols-7"
    >
     {cells.map((cell, i) => {
      const isLastRow = i >= cells.length - 7
      const isSelected = cell.inMonth && selectedIso === cell.iso
      const hasAppts = cell.appointments.length > 0
      const row = Math.floor(i / 7)
      return (
       <motion.button
        key={cell.iso}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: row * 0.04 + (i % 7) * 0.008 }}
        onClick={() => cell.inMonth && onPickDate(cell.iso)}
        disabled={!cell.inMonth}
        className={`relative text-left min-h-[88px] sm:min-h-[112px] pt-7 sm:pt-8 px-1.5 sm:px-2.5 pb-2 border-r border-b border-gray-100 last:border-r-0 transition-all duration-300 ease-out ${
         isLastRow ? 'border-b-0' : ''
        } ${
         cell.inMonth
          ? hasAppts
           ? 'hover:bg-sky-50/70 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer'
           : 'hover:bg-gray-50 cursor-pointer'
          : 'bg-gray-50/40 cursor-default'
        } ${cell.isToday && !isSelected ? 'bg-sky-50/60' : ''} ${
         isSelected ? 'bg-sky-100/70 ring-2 ring-inset ring-sky-400' : ''
        }`}
       >
        {/* Day number is absolutely positioned at the top-left of every
            cell so it never shifts based on cell contents (today markers,
            count badges, chip width, anything). Count badge is absolutely
            positioned at the top-right for the same reason. */}
        <span
         className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2.5 text-[11px] sm:text-xs font-mono tabular-nums leading-none ${
          cell.isToday
           ? 'text-sky-700 font-semibold'
           : cell.inMonth ? 'text-gray-900' : 'text-gray-300'
         }`}
        >
         {cell.dayNumber}
        </span>
        {cell.isToday && (
         <span className="absolute top-[22px] sm:top-[26px] left-2 sm:left-3 block w-1 h-1 rounded-full bg-sky-600" />
        )}
        {hasAppts && (
         <span className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 text-[9px] sm:text-[10px] font-mono text-sky-700 bg-sky-100 px-1.5 rounded-full leading-[14px] sm:leading-[16px]">
          {cell.appointments.length}
         </span>
        )}
        {/* Mobile: collapsed dot row */}
        <div className="sm:hidden flex gap-0.5">
         {cell.appointments.slice(0, 4).map((a) => (
          <div key={a.id} className="w-1.5 h-1.5 rounded-full bg-sky-500" />
         ))}
        </div>
        {/* Desktop: appointment chips. Colored left bar + tight padding +
            customer name takes priority so truncation reads as a name,
            not "Anth..." with a time prefix. Time is right-aligned and
            tabular so consecutive rows line up. */}
        <div className="hidden sm:block space-y-1">
         {cell.appointments.slice(0, 3).map((a) => (
          <div
           key={a.id}
           onClick={(e) => { e.stopPropagation(); onPickAppt(a.id) }}
           className="group/chip flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 border-l-2 border-sky-400 rounded-r-md pl-1.5 pr-1 py-0.5 transition-all duration-200 overflow-hidden"
          >
           <span className="text-[10px] font-medium text-sky-900 truncate flex-1 min-w-0 leading-tight">
            {a.customer_name}
           </span>
           <span className="text-[9px] font-mono tabular-nums text-sky-600 flex-shrink-0">
            {fmtTime(a.start_time)}
           </span>
          </div>
         ))}
         {cell.appointments.length > 3 && (
          <div className="text-[10px] font-medium text-sky-700 px-1.5 leading-tight">
           +{cell.appointments.length - 3} more
          </div>
         )}
        </div>
       </motion.button>
      )
     })}
    </motion.div>
   </AnimatePresence>
  </div>
 )
}

function NavBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
 return (
  <button
   onClick={onClick}
   aria-label={label}
   className="w-7 h-7 rounded-md text-gray-600 hover:bg-gray-100 transition-all duration-300 ease-out flex items-center justify-center text-base"
  >
   {children}
  </button>
 )
}

function buildMonthCells(monthStart: Date, monthDays: MonthDay[]) {
 const apptsByDate = new Map<string, MonthDay['appointments']>()
 monthDays.forEach((d) => apptsByDate.set(d.date, d.appointments))

 const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
 const gridStart = new Date(firstOfMonth)
 gridStart.setDate(gridStart.getDate() - gridStart.getDay()) // back to Sunday

 const today = new Date()
 const todayIso = isoDate(today)

 const cells: Array<{
  iso: string; dayNumber: number; inMonth: boolean; isToday: boolean; appointments: MonthDay['appointments']
 }> = []

 for (let i = 0; i < 42; i++) {
  const d = new Date(gridStart)
  d.setDate(d.getDate() + i)
  const iso = isoDate(d)
  cells.push({
   iso,
   dayNumber: d.getDate(),
   inMonth: d.getMonth() === monthStart.getMonth(),
   isToday: iso === todayIso,
   appointments: apptsByDate.get(iso) || [],
  })
 }
 // Trim trailing empty rows so we don't always show 6 weeks
 while (cells.length > 35 && cells.slice(-7).every((c) => !c.inMonth)) {
  cells.splice(cells.length - 7, 7)
 }
 return cells
}

function isoDate(d: Date) {
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string) {
 const d = new Date(iso)
 return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ====================== BOOKING FORM ====================== */

export function BookingFormModal({
 dateIso, services, onClose, onCreated,
}: {
 dateIso: string
 services: string[]
 onClose: () => void
 onCreated: () => void
}) {
 const [name, setName] = useState('')
 const [phone, setPhone] = useState('')
 const [email, setEmail] = useState('')
 const [service, setService] = useState(services[0] || '')
 const [time, setTime] = useState('09:00')
 const [duration, setDuration] = useState(60)
 const [notes, setNotes] = useState('')
 const [address, setAddress] = useState('')
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitting(true); setError('')
  try {
   const [hh, mm] = time.split(':').map((n) => parseInt(n, 10))
   const [yy, mo, dd] = dateIso.split('-').map((n) => parseInt(n, 10))
   const start = new Date(yy, mo - 1, dd, hh, mm, 0, 0)
   const end = new Date(start.getTime() + duration * 60 * 1000)

   const res = await fetchWithAuth('/api/appointments/create', {
    method: 'POST',
    body: JSON.stringify({
     customer_name: name.trim(),
     customer_phone: phone.trim(),
     customer_email: email.trim() || undefined,
     service_type: service,
     scheduled_date: dateIso,
     start_time: start.toISOString(),
     end_time: end.toISOString(),
     duration,
     address: address.trim() || undefined,
     notes: notes.trim() || undefined,
    }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) {
    if (res.status === 409) throw new Error('That time slot is already booked.')
    if (json.errors) throw new Error(Object.values(json.errors).join(', '))
    throw new Error(json.error || `Failed (${res.status})`)
   }
   onCreated()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to book')
  } finally {
   setSubmitting(false)
  }
 }

 const dateLabel = new Date(dateIso + 'T12:00:00').toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
 })

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   transition={{ duration: 0.25, ease: EASE }}
   className="fixed inset-0 z-50 flex items-center justify-center px-4"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
   <motion.form
    onSubmit={submit}
    initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
    transition={{ duration: 0.35, ease: EASE }}
    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
   >
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
     <div>
      <div className="text-base font-semibold text-gray-900">New booking</div>
      <div className="text-xs text-gray-500 mt-0.5">{dateLabel}</div>
     </div>
     <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-all duration-300 ease-out">
      <X className="w-4 h-4 text-gray-500" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-4">
     <Field label="Customer name">
      <input
       type="text" required value={name} onChange={(e) => setName(e.target.value)}
       className="form-input"
      />
     </Field>
     <div className="grid grid-cols-2 gap-3">
      <Field label="Phone">
       <input
        type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 123-4567" className="form-input font-mono"
       />
      </Field>
      <Field label="Email (optional)">
       <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        className="form-input"
       />
      </Field>
     </div>

     <Field label="Service">
      {services.length > 0 ? (
       <select required value={service} onChange={(e) => setService(e.target.value)} className="form-input">
        {services.map((s) => <option key={s} value={s}>{s}</option>)}
       </select>
      ) : (
       <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        No services configured. Add them in Settings before booking.
       </p>
      )}
     </Field>

     <div className="grid grid-cols-2 gap-3">
      <Field label="Time">
       <input
        type="time" required value={time} onChange={(e) => setTime(e.target.value)}
        className="form-input font-mono"
       />
      </Field>
      <Field label="Duration (min)">
       <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="form-input font-mono">
        {[30, 45, 60, 90, 120, 180, 240].map((d) => <option key={d} value={d}>{d}</option>)}
       </select>
      </Field>
     </div>

     <Field label="Address (optional)">
      <input
       type="text" value={address} onChange={(e) => setAddress(e.target.value)}
       className="form-input"
      />
     </Field>

     <Field label="Notes (optional)">
      <textarea
       value={notes} onChange={(e) => setNotes(e.target.value)}
       rows={2} className="form-input resize-none"
      />
     </Field>

     {error && (
      <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2 text-sm flex items-start gap-2">
       <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <span>{error}</span>
      </div>
     )}
    </div>

    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
     <button
      type="button" onClick={onClose}
      className="px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out"
     >
      Cancel
     </button>
     <button
      type="submit" disabled={submitting || services.length === 0}
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-50"
     >
      {submitting && <CircleNotch className="w-4 h-4 animate-spin" />}
      {submitting ? 'Booking…' : 'Book appointment'}
     </button>
    </div>

    <style jsx>{`
     :global(.form-input) {
      width: 100%;
      padding: 10px 14px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      color: #111827;
      transition: border-color .25s ease;
     }
     :global(.form-input:focus) { outline: none; border-color: #111827; }
    `}</style>
   </motion.form>
  </motion.div>
 )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
 return (
  <div>
   <label className="block text-xs text-gray-600 mb-1.5 font-medium">{label}</label>
   {children}
  </div>
 )
}

/* ====================== APPOINTMENT DRAWER ====================== */

export type AppointmentDetail = {
 id: string
 customer_name: string
 customer_phone: string
 customer_email: string | null
 service_type: string
 scheduled_date: string
 start_time: string
 end_time: string
 duration: number
 status: string
 estimated_value: number | null
 address: string | null
 notes: string | null
 google_calendar_event_id: string | null
 created_at: string
}

const STATUS_TONE: Record<string, { dot: string; text: string; label: string }> = {
 scheduled: { dot: 'bg-sky-500', text: 'text-sky-700', label: 'Scheduled' },
 confirmed: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Confirmed' },
 completed: { dot: 'bg-gray-500', text: 'text-gray-700', label: 'Completed' },
 cancelled: { dot: 'bg-rose-400', text: 'text-rose-700', label: 'Cancelled' },
 no_show: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'No-show' },
}

export function AppointmentDrawer({
 apptId, onClose, onChanged,
}: {
 apptId: string
 onClose: () => void
 onChanged: () => void
}) {
 const [appt, setAppt] = useState<AppointmentDetail | null>(null)
 const [bookingCall, setBookingCall] = useState<{
  id: string
  retell_call_id: string | null
  recording_url: string | null
  transcript: string | null
  call_summary: string | null
  duration: number | null
 } | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const isDemoId = apptId.startsWith('demo-')

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setLoading(true); setError('')
   if (isDemoId) {
    // Synthesize a plausible appointment for demo IDs so the drawer
    // shows what real bookings will look like.
    if (!cancelled) setAppt(buildDemoDetail(apptId))
    setLoading(false)
    return
   }
   try {
    const res = await fetchWithAuth(`/api/appointments/${apptId}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
    if (!cancelled) {
     setAppt(json.appointment)
     setBookingCall(json.bookingCall || null)
    }
   } catch (e) {
    if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [apptId, isDemoId])

 const setStatus = async (status: 'cancelled' | 'confirmed' | 'completed') => {
  if (!appt) return
  if (isDemoId) {
   // Demo bookings live entirely client-side - just reflect the change.
   setAppt({ ...appt, status })
   return
  }
  setBusy(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/appointments/${appt.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setAppt({ ...appt, status })
   onChanged()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to update')
  } finally {
   setBusy(false)
  }
 }

 const tone = appt ? (STATUS_TONE[appt.status] || STATUS_TONE.scheduled) : STATUS_TONE.scheduled

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   transition={{ duration: 0.25, ease: EASE }}
   className="fixed inset-0 z-50 flex justify-end"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
   <motion.aside
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col"
   >
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
     <div className="text-sm font-semibold text-gray-900">Booking</div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-all duration-300 ease-out">
      <X className="w-4 h-4 text-gray-500" />
     </button>
    </div>

    {loading && (
     <div className="flex-1 flex items-center justify-center">
      <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
     </div>
    )}

    {!loading && error && !appt && (
     <div className="px-6 py-6 flex items-start gap-3">
      <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-700">{error}</p>
     </div>
    )}

    {!loading && appt && (
     <div className="px-6 py-5 space-y-5">
      <div>
       <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
        <span className={`text-xs font-medium ${tone.text}`}>{tone.label}</span>
       </div>
       <div className="text-2xl font-medium text-gray-900">{appt.customer_name}</div>
       <div className="text-sm text-gray-500 mt-1 font-mono">
        {fmtDateLong(appt.start_time)} · {fmtTime(appt.start_time)}–{fmtTime(appt.end_time)}
       </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
       <Row icon={Phone}><a href={`tel:${appt.customer_phone}`} className="font-mono text-gray-900 hover:underline">{appt.customer_phone}</a></Row>
       {appt.customer_email && (
        <Row icon={Envelope}><a href={`mailto:${appt.customer_email}`} className="text-gray-900 hover:underline">{appt.customer_email}</a></Row>
       )}
       <Row icon={null}><span className="text-gray-700">{appt.service_type} · {appt.duration}min</span></Row>
       {appt.address && <Row icon={MapPin}><span className="text-gray-700">{appt.address}</span></Row>}
       {appt.notes && (
        <Row icon={FileText}>
         <span className="text-gray-700 whitespace-pre-wrap">{appt.notes}</span>
        </Row>
       )}
       {appt.google_calendar_event_id && (
        <p className="text-xs text-gray-400 mt-3">Synced to Google Calendar</p>
       )}
      </div>

      {bookingCall && (
       <div className="border-t border-gray-100 pt-4">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Booking call</div>
        {bookingCall.call_summary && (
         <p className="text-sm text-gray-700 mb-3">{bookingCall.call_summary}</p>
        )}
        {bookingCall.recording_url && (
         <audio
          controls
          src={bookingCall.recording_url}
          className="w-full h-9 mb-3"
         />
        )}
        {bookingCall.transcript && (
         <details className="rounded-lg border border-gray-200 bg-gray-50/60">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 px-3 py-2">
           Show transcript
          </summary>
          <pre className="whitespace-pre-wrap text-xs text-gray-700 px-3 pb-3 pt-1 max-h-72 overflow-y-auto font-sans">
{bookingCall.transcript}
          </pre>
         </details>
        )}
        {!bookingCall.recording_url && !bookingCall.transcript && !bookingCall.call_summary && (
         <p className="text-xs text-gray-400">Call linked but recording + transcript not yet processed.</p>
        )}
       </div>
      )}

      {error && (
       <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}

      <div className="border-t border-gray-100 pt-4 flex items-center gap-2 flex-wrap">
       {appt.status === 'scheduled' && (
        <button
         onClick={() => setStatus('confirmed')}
         disabled={busy}
         className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all duration-300 ease-out disabled:opacity-50"
        >
         Mark confirmed
        </button>
       )}
       {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
        <button
         onClick={() => setStatus('completed')}
         disabled={busy}
         className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-all duration-300 ease-out disabled:opacity-50"
        >
         Mark completed
        </button>
       )}
       {appt.status !== 'cancelled' && appt.status !== 'completed' && (
        <button
         onClick={() => setStatus('cancelled')}
         disabled={busy}
         className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all duration-300 ease-out disabled:opacity-50 inline-flex items-center gap-1.5"
        >
         <Trash className="w-3 h-3" /> Cancel
        </button>
       )}
      </div>
     </div>
    )}
   </motion.aside>
  </motion.div>
 )
}

function Row({ icon: Icon, children }: { icon: React.ElementType | null; children: React.ReactNode }) {
 return (
  <div className="flex items-start gap-2.5">
   {Icon ? <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /> : <span className="w-4" />}
   <div className="flex-1">{children}</div>
  </div>
 )
}

function fmtDateLong(iso: string) {
 return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const DEMO_DETAILS: Record<string, Partial<AppointmentDetail>> = {
 'a1': { customer_name: 'Sarah Mitchell', customer_phone: '+15125551234', customer_email: 'sarah.mitchell@example.com', service_type: 'AC Tune-up', address: '1409 Bouldin Ave, Austin, TX', notes: 'Annual maintenance plan. Front of house, garage code 4421.' },
 'a2': { customer_name: 'Priya Shah', customer_phone: '+15125559912', customer_email: 'priya.shah@example.com', service_type: 'Emergency Repair', address: '88 Lakeway Dr, Austin, TX', notes: 'No AC, infant in house. High priority.' },
 'a3': { customer_name: 'Erika Long', customer_phone: '+15124446060', customer_email: null, service_type: 'Thermostat Install', address: '305 W 32nd St, Austin, TX', notes: 'Customer purchased their own Ecobee.' },
 'a4': { customer_name: 'Marcus Reed', customer_phone: '+15125557788', customer_email: 'marcus@reedconst.com', service_type: 'Estimate', address: '7700 Burnet Rd #340, Austin, TX', notes: 'Furnace replacement quote. Has PDF of current unit specs.' },
}

function buildDemoDetail(id: string): AppointmentDetail {
 const key = id.replace(/^demo-[wma]?-?/, '').replace(/^a/, '')
 const stub = DEMO_DETAILS[`a${key}`] || DEMO_DETAILS['a1']
 const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); start.setHours(14, 0, 0, 0)
 const end = new Date(start.getTime() + 60 * 60 * 1000)
 return {
  id,
  customer_name: stub.customer_name || 'Sample Customer',
  customer_phone: stub.customer_phone || '+15125550100',
  customer_email: stub.customer_email ?? null,
  service_type: stub.service_type || 'Service Visit',
  scheduled_date: start.toISOString().slice(0, 10),
  start_time: start.toISOString(),
  end_time: end.toISOString(),
  duration: 60,
  status: 'scheduled',
  estimated_value: null,
  address: stub.address ?? null,
  notes: stub.notes ?? null,
  google_calendar_event_id: null,
  created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
 }
}
