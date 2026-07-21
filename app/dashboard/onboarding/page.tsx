'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleNotch, WarningCircle, CheckCircle, ArrowSquareOut, Copy, Phone, Sparkle, Headphones } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import { ConflictCalendars } from '../_components/ConflictCalendars'
import {
 CARRIERS, LINE_TYPES, carriersForLineType, findCarrier,
 type CarrierId, type ForwardingMode, type LineType,
} from '@/lib/forwarding-codes'

const EASE = [0.22, 1, 0.36, 1] as const
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+1 (737) 937-0084'
const SUPPORT_PHONE_DIAL = SUPPORT_PHONE.replace(/[^0-9+]/g, '')

type State = {
 id: string
 business_name: string
 business_type: string | null
 phone_number: string | null
 services: string[] | null
 onboarding_step: string
 onboarding_completed: boolean
 calcom_connected: boolean
 cal_com_event_type_slug: string | null
 cal_com_username: string | null
 forwarding_carrier: CarrierId | null
 forwarding_line_type: LineType | null
 forwarding_mode: ForwardingMode | null
 forwarding_verified_at: string | null
}

type Step = 'calcom' | 'forwarding' | 'verify' | 'done'

// Verticals that don't book on Cal.com (restaurants use OpenTable / their own
// POS and just transfer or capture leads). They skip the calendar-connect step.
const NO_CALENDAR_TYPES = new Set(['restaurant'])
function isNoCalendarType(businessType: string | null | undefined): boolean {
 return NO_CALENDAR_TYPES.has((businessType || '').trim().toLowerCase())
}

export default function OnboardingPage() {
 const router = useRouter()
 const [state, setState] = useState<State | null>(null)
 const [retellPhone, setRetellPhone] = useState<string | null | undefined>(undefined)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [step, setStep] = useState<Step>('calcom')

 const reload = async () => {
  try {
   const [stateRes, phoneRes] = await Promise.all([
    fetchWithAuth('/api/onboarding/state'),
    fetchWithAuth('/api/dashboard/phone'),
   ])
   const json = await stateRes.json()
   if (!stateRes.ok || !json.success) throw new Error(json?.error || 'Failed')
   const b: State = json.business
   setState(b)
   const phoneJson = await phoneRes.json().catch(() => ({}))
   setRetellPhone(typeof phoneJson?.phone === 'string' && phoneJson.phone ? phoneJson.phone : null)
   // Restaurants (and any non-calendar vertical) don't connect Cal.com -
   // they book on their own system / OpenTable / transfer. Don't gate their
   // onboarding on calcom_connected (they'd be stuck on step 1 forever).
   // They still get a trimmed first step for the transfer + notification
   // numbers, then continue to forwarding. Use a functional update so a
   // reload triggered by a later step never bounces them backward.
   const noCal = isNoCalendarType(b.business_type)
   setStep((prev) => {
    if (b.onboarding_completed || b.forwarding_verified_at) return 'done'
    if (noCal) return (prev === 'forwarding' || prev === 'verify') ? prev : 'calcom'
    if (b.calcom_connected) return 'forwarding'
    return 'calcom'
   })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { reload() }, [])

 // Poll for the Retell phone number while we're stuck on the forwarding
 // step without one. Without this, the spinner spins forever even after
 // the admin provisions the number - the user has to hard-refresh. Cap
 // at 2 minutes so we don't hammer the API for a stuck account.
 const [pollExpired, setPollExpired] = useState(false)
 useEffect(() => {
  if (step !== 'forwarding' || retellPhone) return
  const startedAt = Date.now()
  setPollExpired(false)
  const interval = setInterval(() => {
   if (Date.now() - startedAt > 2 * 60 * 1000) {
    setPollExpired(true)
    clearInterval(interval)
    return
   }
   reload()
  }, 15000)
  return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [step, retellPhone])

 if (loading) {
  return (
   <DashShell activeLabel="Setup">
    <div className="flex-1 flex items-center justify-center py-32">
     <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
    </div>
   </DashShell>
  )
 }

 if (error || !state) {
  return (
   <DashShell activeLabel="Setup">
    <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-2xl">
     <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
      <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-700">{error || 'Could not load onboarding'}</p>
     </div>
    </div>
   </DashShell>
  )
 }

 const noCalendar = isNoCalendarType(state.business_type)

 return (
  <DashShell activeLabel="Setup">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <Header step={step} noCalendar={noCalendar} />

     <AnimatePresence mode="wait">
      {step === 'calcom' && (
       <Panel key="calcom">
        <CalcomStep
         onConnected={reload}
         noCalendar={noCalendar}
         onContinue={() => setStep('forwarding')}
        />
       </Panel>
      )}
      {step === 'forwarding' && (
       <Panel key="forwarding">
        <ForwardingStep
         retellNumber={retellPhone || null}
         pollExpired={pollExpired}
         saved={{
          carrier: state.forwarding_carrier,
          lineType: state.forwarding_line_type,
          mode: state.forwarding_mode,
         }}
         onSavedChoice={reload}
         onTryVerify={() => setStep('verify')}
        />
       </Panel>
      )}
      {step === 'verify' && (
       <Panel key="verify">
        <VerifyStep
         onVerified={reload}
         onBack={() => setStep('forwarding')}
        />
       </Panel>
      )}
      {step === 'done' && (
       <Panel key="done">
        <DoneStep onGo={() => router.push('/dashboard')} />
       </Panel>
      )}
     </AnimatePresence>

     <StuckBanner step={step} />
    </div>
   </section>
  </DashShell>
 )
}

/* --------------------------------- shell --------------------------------- */

function Header({ step, noCalendar }: { step: Step; noCalendar?: boolean }) {
 const steps: { id: Step; label: string }[] = [
  { id: 'calcom', label: noCalendar ? 'Details' : 'Calendar' },
  { id: 'forwarding', label: 'Forwarding' },
  { id: 'verify', label: 'Verify' },
 ]
 const idx = step === 'done' ? 3 : steps.findIndex((s) => s.id === step)
 return (
  <div className="mb-8">
   <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Get set up</h1>
   <div className="mt-6 flex items-center gap-3 text-xs">
    {steps.map((s, i) => {
     const done = i < idx
     const active = i === idx
     return (
      <div key={s.id} className="flex items-center gap-3">
       <div className={`flex items-center gap-2 transition-all duration-300 ease-out ${
        active ? 'text-gray-900 font-medium' : done ? 'text-sky-700' : 'text-gray-400'
       }`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
         done ? 'bg-sky-500 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
        }`}>{done ? '✓' : i + 1}</span>
        {s.label}
       </div>
       {i < steps.length - 1 && <span className="w-6 h-px bg-gray-300" />}
      </div>
     )
    })}
   </div>
  </div>
 )
}

function Panel({ children }: { children: React.ReactNode }) {
 return (
  <motion.div
   initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
   transition={{ duration: 0.4, ease: EASE }}
  >
   {children}
  </motion.div>
 )
}

function StuckBanner({ step }: { step: Step }) {
 if (step === 'done') return null
 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
   className="mt-6 bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3"
  >
   <Headphones className="w-4 h-4 text-sky-500 flex-shrink-0" />
   <div className="text-sm text-gray-700 flex-1">
    Stuck? Call or text us - we&apos;ll walk through it together.
   </div>
   <a
    href={`tel:${SUPPORT_PHONE_DIAL}`}
    className="font-mono text-sm text-gray-900 hover:text-sky-600 transition-colors"
   >
    {SUPPORT_PHONE}
   </a>
  </motion.div>
 )
}

/* ------------------------------ Cal.com step ----------------------------- */

function CalcomStep({ onConnected, noCalendar, onContinue }: { onConnected: () => void; noCalendar?: boolean; onContinue?: () => void }) {
 type EventTypeOption = { id: number; title: string; slug: string; lengthInMinutes: number }
 const [apiKey, setApiKey] = useState('')
 const [eventTypeId, setEventTypeId] = useState<number | null>(null)
 const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeOption[] | null>(null)
 const [debugTrace, setDebugTrace] = useState<string[] | null>(null)
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
 const [success, setSuccess] = useState<{ username: string | null; eventTypeTitle: string } | null>(null)
 // Emergency event type picker - optional, only shown after primary
 // is set AND the contractor has more than one event type in Cal.com.
 // Collapsed behind a toggle (default off) since most contractors won't
 // need a separate emergency dispatch event type on day one.
 const [emergencyEnabled, setEmergencyEnabled] = useState(false)
 const [emergencyEventTypeId, setEmergencyEventTypeId] = useState<number | null>(null)
 const [emergencyTitle, setEmergencyTitle] = useState('')
 const [emergencyTitleSaving, setEmergencyTitleSaving] = useState(false)
 const [emergencyTitleSaved, setEmergencyTitleSaved] = useState(false)
 const [emergency24x7, setEmergency24x7] = useState(false)
 const [emergencySaving, setEmergencySaving] = useState(false)
 const [emergencyErr, setEmergencyErr] = useState('')

 // Inline event-type customization: lets the contractor (or rep during
 // the demo) rename the event and lock its meeting location BEFORE
 // wiring it up - so they never have to leave the onboarding flow to
 // hop into Cal.com's settings.
 const [newTitle, setNewTitle] = useState('')
 const [newLengthInMinutes, setNewLengthInMinutes] = useState<number | ''>('')
 const [newMinNoticeHours, setNewMinNoticeHours] = useState<number | ''>('')
 const [locationPreset, setLocationPreset] = useState<'attendee_address' | 'attendee_phone' | 'google_meet' | 'zoom' | 'cal_video'>('attendee_address')
 const [showOtherLocations, setShowOtherLocations] = useState(false)
 const [fixedAddress, setFixedAddress] = useState('')
 const [locationLink, setLocationLink] = useState('')

 // Booking-notification number: capture right after Cal.com saves so the
 // SMS confirmation actually lands on the owner's phone during the demo
 // test call. Pre-fills from whatever's already on file.
 const [notifyPhone, setNotifyPhone] = useState('')
 const [notifySaved, setNotifySaved] = useState(false)
 const [notifySaving, setNotifySaving] = useState(false)
 const [notifyErr, setNotifyErr] = useState('')

 // Transfer-call destination - what number the AI dials when a caller
 // asks for the owner. Stored as escalation_phone, exposed here as
 // transfer_phone. Independent from the booking-SMS phone so contractors
 // can have alerts go to one cell and live calls go to another (or to
 // a shared business line).
 const [transferPhone, setTransferPhone] = useState('')
 const [transferSaved, setTransferSaved] = useState(false)
 const [transferSaving, setTransferSaving] = useState(false)
 const [transferErr, setTransferErr] = useState('')

 // Service hours: freeform text the contractor types in their own
 // words, e.g. "Mon-Fri 4am-11pm, weekends 6am-12am". Used by the
 // agent to answer when-are-you-open questions and to set expectations
 // on quotes. Separate from Cal.com availability (which controls
 // actual bookable slots) because callers ask about hours outside of
 // just booking.
 const [serviceHours, setServiceHours] = useState('')
 const [serviceHoursSaved, setServiceHoursSaved] = useState(false)
 const [serviceHoursSaving, setServiceHoursSaving] = useState(false)
 const [serviceHoursErr, setServiceHoursErr] = useState('')

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const r = await fetchWithAuth('/api/dashboard/notifications')
    const j = await r.json().catch(() => ({}))
    if (cancelled) return
    if (j?.notifications_phone) {
     setNotifyPhone(j.notifications_phone)
     setNotifySaved(true)
    }
    if (j?.transfer_phone) {
     setTransferPhone(j.transfer_phone)
     setTransferSaved(true)
    }
    if (j?.service_hours) {
     setServiceHours(j.service_hours)
     setServiceHoursSaved(true)
    }
   } catch { /* non-fatal */ }
  })()
  return () => { cancelled = true }
 }, [])

 const saveNotifyPhone = async () => {
  const v = notifyPhone.trim()
  if (!v) { setNotifyErr('Enter a US number first.'); return }
  setNotifySaving(true); setNotifyErr('')
  try {
   const r = await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notifications_phone: v }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setNotifyErr(j?.error || `Failed (${r.status})`)
    return
   }
   setNotifySaved(true)
  } catch (e) {
   setNotifyErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setNotifySaving(false)
  }
 }

 const saveTransferPhone = async () => {
  const v = transferPhone.trim()
  if (!v) { setTransferErr('Enter a US number first.'); return }
  setTransferSaving(true); setTransferErr('')
  try {
   const r = await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transfer_phone: v }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setTransferErr(j?.error || `Failed (${r.status})`)
    return
   }
   setTransferSaved(true)
  } catch (e) {
   setTransferErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setTransferSaving(false)
  }
 }

 const saveServiceHours = async () => {
  setServiceHoursSaving(true); setServiceHoursErr('')
  try {
   const r = await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ service_hours: serviceHours.trim() }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setServiceHoursErr(j?.error || `Failed (${r.status})`)
    return
   }
   setServiceHoursSaved(true)
  } catch (e) {
   setServiceHoursErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setServiceHoursSaving(false)
  }
 }

 const fetchEventTypes = async (e?: React.FormEvent) => {
  if (e) e.preventDefault()
  setSubmitting(true); setError(''); setFieldErrors({})
  try {
   // First call sends API key only - server lists event types and we
   // pick from the dropdown. This avoids the "guess the numeric ID"
   // friction in the original flow.
   const res = await fetchWithAuth('/api/onboarding/calcom', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
   })
   const json = await res.json().catch(() => ({}))
   if (json.needsEventType && Array.isArray(json.eventTypes)) {
    setEventTypeOptions(json.eventTypes)
    if (json.errors) setFieldErrors(json.errors)
    if (json.eventTypes.length === 0) {
     setError('No event types returned. See trace below - paste it to support if it looks wrong.')
     setDebugTrace(Array.isArray(json.debug) ? json.debug : null)
    } else {
     setDebugTrace(null)
    }
    return
   }
   if (!res.ok || !json.success) {
    if (json.errors) setFieldErrors(json.errors)
    throw new Error(json.error || 'Connect failed')
   }
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
 }

 const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (eventTypeId == null) { setError('Pick an event type first'); return }
  setSubmitting(true); setError(''); setFieldErrors({})
  try {
   const res = await fetchWithAuth('/api/onboarding/calcom', {
    method: 'POST',
    body: JSON.stringify({ apiKey, eventTypeId }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) {
    if (json.errors) setFieldErrors(json.errors)
    throw new Error(json.error || 'Connect failed')
   }

   // Apply rename + meeting-location override now, before advancing.
   // Best-effort: if Cal.com rejects (e.g. the location type isn't
   // installed for that user), we still let onboarding proceed and
   // surface the issue via the settings editor later.
   const editBody: any = { locationPreset }
   if (newTitle.trim()) editBody.title = newTitle.trim()
   if (typeof newLengthInMinutes === 'number' && newLengthInMinutes >= 5 && newLengthInMinutes <= 480) {
    editBody.lengthInMinutes = newLengthInMinutes
   }
   if (typeof newMinNoticeHours === 'number' && newMinNoticeHours >= 0 && newMinNoticeHours <= 168) {
    editBody.minimumBookingNotice = Math.round(newMinNoticeHours * 60)
   }
   if (locationPreset === 'attendee_address' && fixedAddress.trim()) {
    editBody.locationAddress = fixedAddress.trim()
   }
   if ((locationPreset === 'google_meet' || locationPreset === 'zoom') && locationLink.trim()) {
    editBody.locationLink = locationLink.trim()
   }
   try {
    await fetchWithAuth('/api/dashboard/calcom/event-type', {
     method: 'PATCH',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify(editBody),
    })
   } catch { /* non-fatal */ }

   setSuccess({
    username: json.account.username,
    eventTypeTitle: newTitle.trim() || json.eventType.title,
   })
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
 }

 // Restaurants (and other non-calendar verticals) skip Cal.com entirely -
 // they don't book onto a calendar, they transfer live orders / person
 // requests and capture catering as a lead. Show only the two numbers that
 // matter (transfer + alert) plus optional hours, then continue.
 if (noCalendar) {
  return (
   <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <div className="px-6 pt-6 pb-2">
     <h2 className="text-xl font-medium text-gray-900">A few details</h2>
     <p className="text-sm text-gray-500 mt-1">
      No calendar to connect - your AI host transfers live orders and requests, and texts you catering leads. Just tell us where those should go.
     </p>
    </div>

    <div className="px-6 py-5 space-y-4">
     <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-900 mb-1">Transfer calls to</div>
      <div className="text-xs text-gray-600 mb-3">
       When a caller wants a person - a live order, a complaint, someone asking for staff - the AI transfers the call to this number. Use the line you actually want ringing.
      </div>
      <div className="flex flex-wrap items-center gap-2">
       <input
        type="tel"
        value={transferPhone}
        onChange={(e) => { setTransferPhone(e.target.value); setTransferSaved(false); setTransferErr('') }}
        placeholder="+1 555 123 4567"
        className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900"
       />
       <button
        type="button"
        onClick={saveTransferPhone}
        disabled={transferSaving || !transferPhone.trim()}
        className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
       >
        {transferSaving ? 'Saving…' : transferSaved ? 'Saved ✓' : 'Save'}
       </button>
      </div>
      {transferErr && <div className="mt-2 text-xs text-rose-700">{transferErr}</div>}
     </div>

     <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-900 mb-1">Where should we text catering &amp; lead alerts?</div>
      <div className="text-xs text-gray-600 mb-3">
       When the AI captures a catering or large-party request, we text a summary to this number so your team can call them back. Set it now so the alert from the test call lands on the right phone.
      </div>
      <div className="flex flex-wrap items-center gap-2">
       <input
        type="tel"
        value={notifyPhone}
        onChange={(e) => { setNotifyPhone(e.target.value); setNotifySaved(false); setNotifyErr('') }}
        placeholder="+1 555 123 4567"
        className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900"
       />
       <button
        type="button"
        onClick={saveNotifyPhone}
        disabled={notifySaving || !notifyPhone.trim()}
        className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
       >
        {notifySaving ? 'Saving…' : notifySaved ? 'Saved ✓' : 'Save'}
       </button>
      </div>
      {notifyErr && <div className="mt-2 text-xs text-rose-700">{notifyErr}</div>}
     </div>

     <div className="flex justify-end pt-1">
      <button
       type="button"
       onClick={() => onContinue?.()}
       className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
      >
       Continue to call forwarding →
      </button>
     </div>
    </div>
   </div>
  )
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
   <div className="px-6 pt-6 pb-2">
    <h2 className="text-xl font-medium text-gray-900">Connect your Cal.com</h2>
    <p className="text-sm text-gray-500 mt-1">
     Bookings made by your AI receptionist will land on whatever calendar you connect inside Cal.com.
    </p>
   </div>

   <div className="px-6 py-4 bg-gray-50/40 border-y border-gray-100">
    <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-3">How to find these</h3>
    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
     <li>
      Open <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">
       Cal.com → Settings → API Keys <ArrowSquareOut className="w-3 h-3" />
      </a> and click <span className="font-medium">+ Add</span>. Copy the key - it starts with <code className="font-mono text-xs bg-white border border-gray-200 px-1 rounded">cal_live_</code>.
     </li>
     <li>
      Make sure you have at least one event type at <a href="https://app.cal.com/event-types" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">
       Cal.com → Event Types <ArrowSquareOut className="w-3 h-3" />
      </a> (we&apos;ll list them for you below).
     </li>
     <li>
      No Cal.com yet? <a href="https://app.cal.com/signup" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">
       Sign up free <ArrowSquareOut className="w-3 h-3" />
      </a>, connect your Google/Apple/Outlook calendar, create one event type, then come back.
     </li>
    </ol>
   </div>

   <form onSubmit={eventTypeOptions ? submit : fetchEventTypes} className="px-6 py-5 space-y-4">
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Cal.com API key</label>
     <input
      type="password" required value={apiKey}
      onChange={(e) => { setApiKey(e.target.value); setEventTypeOptions(null); setEventTypeId(null) }}
      placeholder="cal_live_…"
      className="form-input font-mono"
      disabled={!!success}
     />
     {fieldErrors.apiKey && <p className="text-xs text-red-600 mt-1">{fieldErrors.apiKey}</p>}
    </div>
    {eventTypeOptions && eventTypeOptions.length > 0 && (
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">Event type</label>
      <div className="space-y-1.5">
       {eventTypeOptions.map((et) => (
        <label
         key={et.id}
         className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors ${
          eventTypeId === et.id ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300 bg-white'
         }`}
        >
         <input
          type="radio" name="eventType" checked={eventTypeId === et.id}
          onChange={() => setEventTypeId(et.id)}
          className="text-sky-600"
         />
         <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{et.title}</div>
          <div className="text-xs text-gray-500 font-mono">/{et.slug} · {et.lengthInMinutes}min · id {et.id}</div>
         </div>
        </label>
       ))}
      </div>
      {fieldErrors.eventTypeId && <p className="text-xs text-red-600 mt-1">{fieldErrors.eventTypeId}</p>}
     </div>
    )}

    {eventTypeId != null && !success && (
     <div className="space-y-3 pt-1">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_140px] gap-3">
       <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Rename event (optional)</label>
        <input
         value={newTitle}
         onChange={(e) => setNewTitle(e.target.value)}
         placeholder="e.g. AC Service Call"
         className="form-input"
        />
       </div>
       <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration (min)</label>
        <input
         type="number"
         min={5}
         max={480}
         value={newLengthInMinutes}
         onChange={(e) => {
          // Don't clamp inside onChange or "15" becomes "55" - the 1
          // hits the min and snaps up to 5 before the 5 ever arrives.
          // Allow any number through; enforce bounds on blur instead.
          const v = e.target.value
          if (v === '') return setNewLengthInMinutes('')
          const n = Number(v)
          if (!Number.isFinite(n)) return
          setNewLengthInMinutes(Math.min(480, n))
         }}
         onBlur={() => {
          if (typeof newLengthInMinutes === 'number' && newLengthInMinutes > 0 && newLengthInMinutes < 5) {
           setNewLengthInMinutes(5)
          }
         }}
         placeholder={eventTypeOptions?.find((et) => et.id === eventTypeId)?.lengthInMinutes?.toString() || '60'}
         className="form-input"
        />
       </div>
       <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5" title="Lead-time the AI has to leave before offering a slot. Set to 0 for same-hour booking. Cal.com's default is often 2 hours - if the AI is refusing same-day bookings, lower this.">Min notice (hrs)</label>
        <input
         type="number"
         min={0}
         max={168}
         value={newMinNoticeHours}
         onChange={(e) => {
          // Same pattern: don't clamp mid-typing. Min is 0 here so the
          // original code didn't bite, but kept consistent for the
          // upper bound.
          const v = e.target.value
          if (v === '') return setNewMinNoticeHours('')
          const n = Number(v)
          if (!Number.isFinite(n)) return
          setNewMinNoticeHours(Math.min(168, n))
         }}
         onBlur={() => {
          if (typeof newMinNoticeHours === 'number' && newMinNoticeHours < 0) {
           setNewMinNoticeHours(0)
          }
         }}
         placeholder="2"
         className="form-input"
        />
       </div>
      </div>

      <div>
       <label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting location</label>
       <button
        type="button"
        onClick={() => setLocationPreset('attendee_address')}
        className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-colors ${
         locationPreset === 'attendee_address'
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
        }`}
       >
        <div className="font-semibold">In person — customer&apos;s address</div>
        <div className={`text-xs mt-0.5 ${locationPreset === 'attendee_address' ? 'text-white/70' : 'text-gray-500'}`}>
         Best for HVAC, roofing, plumbing, electrical. The AI collects the address at booking.
        </div>
       </button>

       {!showOtherLocations ? (
        <button
         type="button"
         onClick={() => setShowOtherLocations(true)}
         className="mt-2 text-xs text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
        >
         Need a video call or phone instead? Show other formats →
        </button>
       ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
         {([
          { value: 'attendee_phone', label: 'Customer phone (we call them)' },
          { value: 'google_meet', label: 'Google Meet (video link)' },
          { value: 'zoom', label: 'Zoom (video link)' },
          { value: 'cal_video', label: 'Cal Video' },
         ] as const).map((opt) => (
          <button
           key={opt.value}
           type="button"
           onClick={() => setLocationPreset(opt.value)}
           className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
            locationPreset === opt.value
             ? 'border-gray-900 bg-gray-900 text-white'
             : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
           }`}
          >
           {opt.label}
          </button>
         ))}
        </div>
       )}
      </div>

      {locationPreset === 'attendee_address' && (
       <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Fixed address (optional)</label>
        <input
         value={fixedAddress}
         onChange={(e) => setFixedAddress(e.target.value)}
         placeholder="Leave blank to ask the customer at booking"
         className="form-input"
        />
       </div>
      )}

      {(locationPreset === 'google_meet' || locationPreset === 'zoom') && (
       <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
         {locationPreset === 'google_meet' ? 'Google Meet link' : 'Zoom link'}
        </label>
        <input
         type="url"
         value={locationLink}
         onChange={(e) => setLocationLink(e.target.value)}
         placeholder={locationPreset === 'google_meet' ? 'https://meet.google.com/abc-defg-hij' : 'https://zoom.us/j/0123456789'}
         className="form-input font-mono"
        />
       </div>
      )}
     </div>
    )}

    {error && (
     <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2 text-sm flex items-start gap-2">
      <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
     </div>
    )}

    {debugTrace && debugTrace.length > 0 && (
     <details className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
      <summary className="cursor-pointer text-gray-700 font-medium">Cal.com trace ({debugTrace.length} attempts)</summary>
      <ul className="mt-2 space-y-1 font-mono text-gray-600">
       {debugTrace.map((line, i) => <li key={i}>· {line}</li>)}
      </ul>
     </details>
    )}

    {success && (
     <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-3 text-sm space-y-3">
      <div className="flex items-start gap-2">
       <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <div>Connected as <strong>{success.username || 'Cal.com user'}</strong> · event: {success.eventTypeTitle}</div>
      </div>

      <div className="border-t border-emerald-200 pt-3">
       <div className="text-sm font-medium text-gray-900 mb-1">Conflict calendars</div>
       <div className="text-xs text-gray-600 mb-3">
        Which calendars should we check so the AI never books over something you&apos;re already busy with?
       </div>
       <ConflictCalendars />
      </div>

      <div className="border-t border-emerald-200 pt-3">
       <div className="text-sm font-medium text-gray-900 mb-1">Transfer calls to</div>
       <div className="text-xs text-gray-600 mb-3">
        When a caller asks for the owner, the AI warm-transfers the live call to this number. Use the cell or office line you actually want ringing.
       </div>
       <div className="flex flex-wrap items-center gap-2">
        <input
         type="tel"
         value={transferPhone}
         onChange={(e) => { setTransferPhone(e.target.value); setTransferSaved(false); setTransferErr('') }}
         placeholder="+1 555 123 4567"
         className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900"
        />
        <button
         type="button"
         onClick={saveTransferPhone}
         disabled={transferSaving || !transferPhone.trim()}
         className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
         {transferSaving ? 'Saving…' : transferSaved ? 'Saved ✓' : 'Save'}
        </button>
       </div>
       {transferErr && <div className="mt-2 text-xs text-rose-700">{transferErr}</div>}
      </div>

      <div className="border-t border-emerald-200 pt-3">
       <div className="text-sm font-medium text-gray-900 mb-1">Where should we text booking alerts?</div>
       <div className="text-xs text-gray-600 mb-3">
        The owner&apos;s cell. As soon as the AI books a job, we text a summary to this number. Set it now so the booking SMS from the test call lands on the right phone.
       </div>
       <div className="flex flex-wrap items-center gap-2">
        <input
         type="tel"
         value={notifyPhone}
         onChange={(e) => { setNotifyPhone(e.target.value); setNotifySaved(false); setNotifyErr('') }}
         placeholder="+1 555 123 4567"
         className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900"
        />
        <button
         type="button"
         onClick={saveNotifyPhone}
         disabled={notifySaving || !notifyPhone.trim()}
         className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
         {notifySaving ? 'Saving…' : notifySaved ? 'Saved ✓' : 'Save'}
        </button>
       </div>
       {notifyErr && <div className="mt-2 text-xs text-rose-700">{notifyErr}</div>}
      </div>

      {/* Emergency dispatch event type - collapsed by default. Most
          contractors won't set this up on day one; flipping the switch
          expands the picker + rename so the AI can route true
          emergencies (gas leak, no AC with kids, flooding) onto a
          separate Cal.com event type with its own colour and
          availability. */}
      {eventTypeOptions && eventTypeOptions.filter((et) => et.id !== eventTypeId).length > 0 && (
       <div className="border-t border-emerald-200 pt-3">
        <div className="flex items-center justify-between gap-3">
         <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">Emergency dispatch event type <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 ml-1">optional</span></div>
          <div className="text-xs text-gray-600 mt-0.5">
           Route true emergencies onto a dedicated Cal.com event type with its own colour, hours, and reminders.
          </div>
         </div>
         <button
          type="button"
          role="checkbox"
          aria-checked={emergencyEnabled}
          aria-label={emergencyEnabled ? 'Disable emergency dispatch event type' : 'Enable emergency dispatch event type'}
          onClick={async () => {
           const next = !emergencyEnabled
           setEmergencyEnabled(next)
           if (!next && emergencyEventTypeId) {
            // Toggling off clears the saved emergency type so we don't
            // silently route to a hidden setting.
            setEmergencySaving(true); setEmergencyErr('')
            try {
             await fetchWithAuth('/api/dashboard/calcom/event-type', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ emergency_event_type_id: null }),
             })
             setEmergencyEventTypeId(null)
             setEmergencyTitle('')
            } finally {
             setEmergencySaving(false)
            }
           }
          }}
          className={`flex-shrink-0 h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${
           emergencyEnabled
            ? 'bg-rose-500 border-rose-500'
            : 'bg-transparent border-gray-300 hover:border-gray-400'
          }`}
         >
          {emergencyEnabled && (
           <span className="block h-2 w-2 rounded-full bg-white" />
          )}
         </button>
        </div>

        <AnimatePresence initial={false}>
         {emergencyEnabled && (
          <motion.div
           key="emergency-body"
           initial={{ opacity: 0, height: 0 }}
           animate={{ opacity: 1, height: 'auto' }}
           exit={{ opacity: 0, height: 0 }}
           transition={{ duration: 0.25, ease: EASE }}
           className="overflow-hidden"
          >
           <label className="mt-3 flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
            <input
             type="checkbox"
             checked={emergency24x7}
             onChange={(e) => setEmergency24x7(e.target.checked)}
             className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400"
            />
            <span>
             <span className="font-medium text-gray-900">Available 24/7</span>
             {' '}— attach an always-on schedule to this event type when you pick it, so emergencies can land at 3am. Cal.com will treat this event type independently of your normal hours.
            </span>
           </label>

           <div className="mt-3 space-y-1.5">
            {eventTypeOptions
             .filter((et) => et.id !== eventTypeId)
             .map((et) => (
              <button
               key={et.id}
               type="button"
               onClick={async () => {
                setEmergencySaving(true); setEmergencyErr('')
                try {
                 const r = await fetchWithAuth('/api/dashboard/calcom/event-type', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                   emergency_event_type_id: et.id,
                   available_24_7: emergency24x7,
                  }),
                 })
                 const j = await r.json().catch(() => ({}))
                 if (!r.ok || !j?.success) {
                  setEmergencyErr(j?.error || `Save failed (${r.status})`)
                  return
                 }
                 setEmergencyEventTypeId(et.id)
                 setEmergencyTitle(et.title)
                 // Auto-set location on the emergency event type to
                 // in-person at the customer's address. Emergencies
                 // are physical dispatch by definition - we don't
                 // want the AI booking a Zoom call for a gas leak.
                 // Best-effort; surface failure but don't block.
                 try {
                  await fetchWithAuth('/api/dashboard/calcom/event-type', {
                   method: 'PATCH',
                   headers: { 'content-type': 'application/json' },
                   body: JSON.stringify({
                    target: 'emergency',
                    locationPreset: 'attendee_address',
                   }),
                  })
                 } catch { /* non-fatal */ }
                } finally {
                 setEmergencySaving(false)
                }
               }}
               disabled={emergencySaving}
               className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                emergencyEventTypeId === et.id
                 ? 'border-rose-400 bg-rose-50 text-rose-900'
                 : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
               } disabled:opacity-60`}
              >
               <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                 <div className="text-sm font-medium truncate">{et.title}</div>
                 <div className="text-[11px] text-gray-500 mt-0.5">{et.slug} · {et.lengthInMinutes} min</div>
                </div>
                {emergencyEventTypeId === et.id && (
                 <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 flex-shrink-0">🚨 emergency</span>
                )}
               </div>
              </button>
             ))}
           </div>

           {emergencyEventTypeId && (
            <div className="mt-3 space-y-2">
             <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rename emergency event (optional)</label>
              <div className="flex flex-wrap items-center gap-2">
               <input
                value={emergencyTitle}
                onChange={(e) => { setEmergencyTitle(e.target.value); setEmergencyTitleSaved(false) }}
                placeholder="e.g. Emergency Dispatch"
                className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
               />
               <button
                type="button"
                onClick={async () => {
                 const t = emergencyTitle.trim()
                 if (!t) return
                 setEmergencyTitleSaving(true); setEmergencyErr('')
                 try {
                  const r = await fetchWithAuth('/api/dashboard/calcom/event-type', {
                   method: 'PATCH',
                   headers: { 'content-type': 'application/json' },
                   body: JSON.stringify({ target: 'emergency', title: t }),
                  })
                  const j = await r.json().catch(() => ({}))
                  if (!r.ok || !j?.success) {
                   setEmergencyErr(j?.error || `Rename failed (${r.status})`)
                  } else {
                   setEmergencyTitleSaved(true)
                  }
                 } finally {
                  setEmergencyTitleSaving(false)
                 }
                }}
                disabled={emergencyTitleSaving || !emergencyTitle.trim()}
                className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
               >
                {emergencyTitleSaving ? 'Saving…' : emergencyTitleSaved ? 'Renamed ✓' : 'Rename'}
               </button>
              </div>
             </div>
            </div>
           )}

           {emergencyErr && <div className="mt-2 text-xs text-rose-700">{emergencyErr}</div>}
          </motion.div>
         )}
        </AnimatePresence>
       </div>
      )}
     </div>
    )}

    <div className="flex justify-end pt-1">
     {success ? (
      <button
       type="button"
       onClick={onConnected}
       disabled={!notifySaved}
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-50"
      >
       {notifySaved ? 'Continue to forwarding' : 'Save notify number to continue'}
      </button>
     ) : (
      <button
       type="submit"
       disabled={submitting || (!!eventTypeOptions && eventTypeOptions.length > 0 && eventTypeId == null)}
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-50"
      >
       {submitting && <CircleNotch className="w-4 h-4 animate-spin" />}
       {eventTypeOptions ? 'Connect this event type' : 'Load my event types'}
      </button>
     )}
    </div>

    <style jsx>{`
     :global(.form-input) {
      width: 100%; padding: 10px 14px; background: white;
      border: 1px solid #e5e7eb; border-radius: 10px;
      font-size: 14px; color: #111827; transition: border-color .25s ease;
     }
     :global(.form-input:focus) { outline: none; border-color: #111827; }
    `}</style>
   </form>
  </div>
 )
}

/* ----------------------------- Forwarding step --------------------------- */

function ForwardingStep({
 retellNumber, pollExpired, saved, onSavedChoice, onTryVerify,
}: {
 retellNumber: string | null
 pollExpired?: boolean
 saved: { carrier: CarrierId | null; lineType: LineType | null; mode: ForwardingMode | null }
 onSavedChoice: () => void
 onTryVerify: () => void
}) {
 const [lineType, setLineType] = useState<LineType | null>(saved.lineType)
 const [carrier, setCarrier] = useState<CarrierId | null>(saved.carrier)
 const [mode, setMode] = useState<ForwardingMode>(saved.mode || 'missed_only')
 const [saving, setSaving] = useState(false)

 if (!retellNumber) {
  // Single calm message regardless of how long it's been. Previous
  // version flipped to a "this is taking longer than usual" panic
  // panel after a few minutes, which is wrong - agents can take up
  // to a day to build and test, and implying urgency just makes
  // contractors anxious and ping support. No spinner either; nothing
  // is "loading" on this screen, the team is working in the
  // background.
  return (
   <div className="bg-white border border-gray-200 rounded-2xl p-6">
    <div className="flex items-center gap-2 mb-1">
     <Sparkle className="w-4 h-4 text-amber-500" />
     <h2 className="text-xl font-medium text-gray-900">Your agent is being built</h2>
    </div>
    <p className="text-sm text-gray-500 mt-1">
     Our team is building and testing your AI receptionist. We&apos;ll connect it to your dedicated phone number once it&apos;s ready - your forwarding code will appear here automatically and you can finish setup then. No action needed right now.
    </p>
    <p className="text-sm text-gray-500 mt-3">
     Most agents are ready within a business day. Feel free to close this tab - we&apos;ll email you the moment it&apos;s live.
    </p>
    <div className="mt-5">
     <a
      href="mailto:support@cloudgreet.com?subject=Onboarding%20question"
      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline"
     >
      Questions? Email support.
     </a>
    </div>
   </div>
  )
 }

 const carrierGuide = findCarrier(carrier || undefined)
 const carriers = lineType ? carriersForLineType(lineType) : []
 const instructions = carrierGuide ? carrierGuide.instructions(retellNumber, mode) : []

 const persist = async () => {
  if (!lineType || !carrier) return
  setSaving(true)
  try {
   await fetchWithAuth('/api/onboarding/forwarding', {
    method: 'POST',
    body: JSON.stringify({ lineType, carrier, mode }),
   })
   onSavedChoice()
  } finally {
   setSaving(false)
  }
 }

 useEffect(() => {
  if (lineType && carrier && mode) {
   const t = setTimeout(persist, 250)
   return () => clearTimeout(t)
  }
 }, [lineType, carrier, mode])

 return (
  <div className="space-y-4">
   <div className="bg-white border border-gray-200 rounded-2xl p-6">
    <div className="flex items-center gap-2 mb-1">
     <Phone className="w-4 h-4 text-sky-500" />
     <h2 className="text-xl font-medium text-gray-900">Forward your business line</h2>
    </div>
    <p className="text-sm text-gray-500 mb-4">
     We&apos;ll show you the exact code to dial. Tap the button - your phone&apos;s dialer opens with the code already filled in.
    </p>

    <div className="bg-sky-50/60 border border-sky-100 rounded-xl px-4 py-3 flex items-center gap-3">
     <span className="text-xs font-mono text-sky-700 uppercase tracking-wider">Forward to</span>
     <span className="font-mono text-sm text-gray-900">{retellNumber}</span>
     <button
      onClick={() => navigator.clipboard?.writeText(retellNumber)}
      className="ml-auto text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 transition-colors"
     >
      <Copy className="w-3 h-3" /> Copy
     </button>
    </div>
   </div>

   <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-2">1. Where does your business number live?</label>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {LINE_TYPES.map((lt) => (
       <button
        key={lt.id}
        onClick={() => { setLineType(lt.id); setCarrier(null) }}
        className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out ${
         lineType === lt.id
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 hover:border-gray-400'
        }`}
       >
        <div className="text-sm font-medium text-gray-900">{lt.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{lt.description}</div>
       </button>
      ))}
     </div>
    </div>

    {lineType && (
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">2. Who&apos;s your provider?</label>
      <select
       value={carrier || ''} onChange={(e) => setCarrier((e.target.value || null) as CarrierId | null)}
       className="form-input"
      >
       <option value="" disabled>Choose a provider…</option>
       {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
     </div>
    )}

    {lineType && carrier && (
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">3. When should the AI take over?</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
       <ModeBtn active={mode === 'missed_only'} onClick={() => setMode('missed_only')}
        title="Only when I miss it"
        sub="Your phone rings first; AI catches what you don't" />
       <ModeBtn active={mode === 'always'} onClick={() => setMode('always')}
        title="Always send to AI"
        sub="Your phone never rings - every call hits the AI" />
      </div>
      {mode === 'always' && (
       <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
        Heads up - this forwards everyone (including family, your accountant, etc.) to the AI until you cancel it.
       </p>
      )}
     </div>
    )}
   </div>

   <AnimatePresence>
    {carrierGuide && (
     <motion.div
      key={`${carrier}-${mode}`}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.35, ease: EASE }}
     >
      {carrierGuide.manualNote ? (
       <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Set up forwarding in {carrierGuide.name}</h3>
        <p className="text-sm text-gray-700">{carrierGuide.manualNote}</p>
        {carrierGuide.portalUrl && (
         <a
          href={carrierGuide.portalUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
         >
          Open {carrierGuide.name} portal <ArrowSquareOut className="w-3.5 h-3.5" />
         </a>
        )}
       </div>
      ) : (
       <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-900">
         From your {carrierGuide.name} phone, tap each:
        </h3>
        {instructions.map((ins, i) => (
         <DialButton key={i} instruction={ins} />
        ))}
        {instructions[0]?.note && (
         <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {instructions[0].note}
         </p>
        )}
        {instructions.length > 0 && (
         <p className="text-xs text-gray-500">
          To cancel later, dial <code className="font-mono bg-gray-100 px-1.5 rounded">
           {instructions[0].cancelString}
          </code>{instructions.length > 1 && instructions[1].cancelString !== instructions[0].cancelString && (
           <> and <code className="font-mono bg-gray-100 px-1.5 rounded">{instructions[1].cancelString}</code></>
          )}.
         </p>
        )}
       </div>
      )}
     </motion.div>
    )}
   </AnimatePresence>

   {lineType && carrier && (
    <div className="flex justify-end">
     <button
      onClick={onTryVerify}
      disabled={saving}
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-50"
     >
      Verify with a test call
     </button>
    </div>
   )}

   <style jsx>{`
    :global(.form-input) {
     width: 100%; padding: 10px 14px; background: white;
     border: 1px solid #e5e7eb; border-radius: 10px;
     font-size: 14px; color: #111827; transition: border-color .25s ease;
    }
    :global(.form-input:focus) { outline: none; border-color: #111827; }
   `}</style>
  </div>
 )
}

function ModeBtn({ active, onClick, title, sub }: {
 active: boolean; onClick: () => void; title: string; sub: string
}) {
 return (
  <button
   onClick={onClick}
   className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out ${
    active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
   }`}
  >
   <div className="text-sm font-medium text-gray-900">{title}</div>
   <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
  </button>
 )
}

function DialButton({ instruction }: { instruction: { label: string; dialString: string } }) {
 const tel = `tel:${encodeURIComponent(instruction.dialString)}`
 return (
  <a
   href={tel}
   className="block bg-sky-50 border border-sky-200 rounded-xl px-4 py-4 hover:bg-sky-100 hover:border-sky-300 transition-all duration-300 ease-out group"
  >
   <div className="text-xs uppercase tracking-wider text-sky-700 font-semibold mb-1">{instruction.label}</div>
   <div className="flex items-center justify-between">
    <span className="font-mono text-2xl text-gray-900 tracking-tight">{instruction.dialString}</span>
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 group-hover:translate-x-0.5 transition-transform duration-300">
     <Phone className="w-4 h-4" /> Tap to dial
    </span>
   </div>
  </a>
 )
}

/* -------------------------------- Verify --------------------------------- */

function VerifyStep({ onVerified, onBack }: { onVerified: () => void; onBack: () => void }) {
 const [since] = useState(() => new Date().toISOString())
 const [polling, setPolling] = useState(true)
 const [verified, setVerified] = useState(false)
 const [tries, setTries] = useState(0)

 useEffect(() => {
  if (!polling) return
  const id = setInterval(async () => {
   try {
    const res = await fetchWithAuth(`/api/onboarding/forwarding?since=${encodeURIComponent(since)}`)
    const json = await res.json().catch(() => ({}))
    setTries((t) => t + 1)
    if (json?.verified) {
     setVerified(true); setPolling(false)
     setTimeout(onVerified, 1200)
    }
   } catch { /* keep trying */ }
  }, 4000)
  return () => clearInterval(id)
 }, [polling, since, onVerified])

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-1">
    <Sparkle className="w-4 h-4 text-sky-500" />
    <h2 className="text-xl font-medium text-gray-900">Make a test call</h2>
   </div>
   <p className="text-sm text-gray-500 mb-5">
    Grab a different phone - your spouse&apos;s, a friend&apos;s, anything other than your business line - and call your business number. Let it ring. Don&apos;t pick up.
   </p>

   <div className={`border rounded-xl px-4 py-4 transition-all duration-500 ease-out ${
    verified
     ? 'bg-emerald-50 border-emerald-200'
     : 'bg-gray-50 border-gray-200'
   }`}>
    <div className="flex items-center gap-3">
     {verified ? (
      <CheckCircle className="w-5 h-5 text-emerald-600" />
     ) : (
      <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
     )}
     <div className="flex-1">
      <div className={`text-sm font-medium ${verified ? 'text-emerald-900' : 'text-gray-900'}`}>
       {verified ? 'Got it. Forwarding is live.' : 'Listening for your test call…'}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
       {verified
        ? 'Wrapping up - taking you to your dashboard.'
        : `Checking every 4 seconds. ${tries} checks so far.`}
      </div>
     </div>
    </div>
   </div>

   {!verified && tries > 8 && (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
     Still no call. Make sure you didn&apos;t pick up, and that you dialed the forwarding code(s) on the right phone. You can also tap the support link below.
    </div>
   )}

   {!verified && (
    <div className="mt-4">
     <button
      onClick={async () => {
       try {
        const res = await fetchWithAuth('/api/onboarding/forwarding/override', { method: 'POST' })
        if (!res.ok) throw new Error(await res.text())
        setVerified(true); setPolling(false)
        setTimeout(onVerified, 800)
       } catch { /* swallow */ }
      }}
      className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
     >
      Skip verification (override)
     </button>
    </div>
   )}

   <div className="mt-5 flex items-center justify-between">
    <button
     onClick={onBack}
     className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
    >
     ← back
    </button>
    {!verified && (
     <button
      onClick={() => { setPolling(false); setTimeout(() => setPolling(true), 100) }}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
     >
      Reset timer
     </button>
    )}
   </div>
  </div>
 )
}

/* --------------------------------- Done --------------------------------- */

function DoneStep({ onGo }: { onGo: () => void }) {
 const [restarting, setRestarting] = useState(false)
 const [err, setErr] = useState('')

 const restart = async () => {
  if (restarting) return
  if (!window.confirm('Restart setup? This clears your calendar connection, forwarding number, and SMS templates so you can redo the steps. Your call history and bookings are kept.')) return
  setRestarting(true)
  setErr('')
  try {
   const r = await fetchWithAuth('/api/me/onboarding/restart', { method: 'POST' })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j.success) throw new Error(j?.error || 'Restart failed')
   if (typeof window !== 'undefined') window.location.reload()
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Restart failed')
   setRestarting(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
   <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
    <CheckCircle className="w-6 h-6 text-emerald-600" />
   </div>
   <h2 className="text-2xl font-medium text-gray-900">You&apos;re live.</h2>
   <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
    Your AI receptionist is answering missed calls and booking jobs straight into your Cal.com.
   </p>
   <button
    onClick={onGo}
    className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out"
   >
    Go to dashboard
   </button>
   <div className="mt-3">
    <button
     onClick={restart}
     disabled={restarting}
     className="inline-flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out"
    >
     {restarting ? 'Restarting…' : 'Restart setup'}
    </button>
   </div>
   {err && (
    <p className="mt-3 text-xs text-rose-600">{err}</p>
   )}
  </div>
 )
}
