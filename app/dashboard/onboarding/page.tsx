'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle2, ExternalLink, Copy, Phone, Sparkles, Headphones } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
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

export default function OnboardingPage() {
 const router = useRouter()
 const [state, setState] = useState<State | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [step, setStep] = useState<Step>('calcom')

 const reload = async () => {
  try {
   const res = await fetchWithAuth('/api/onboarding/state')
   const json = await res.json()
   if (!res.ok || !json.success) throw new Error(json?.error || 'Failed')
   const b: State = json.business
   setState(b)
   if (b.onboarding_completed) setStep('done')
   else if (b.forwarding_verified_at) setStep('done')
   else if (b.calcom_connected) setStep('forwarding')
   else setStep('calcom')
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { reload() }, [])

 if (loading) {
  return (
   <DashShell activeLabel="Setup">
    <div className="flex-1 flex items-center justify-center py-32">
     <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
   </DashShell>
  )
 }

 if (error || !state) {
  return (
   <DashShell activeLabel="Setup">
    <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-2xl">
     <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-700">{error || 'Could not load onboarding'}</p>
     </div>
    </div>
   </DashShell>
  )
 }

 return (
  <DashShell activeLabel="Setup">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <Header step={step} />

     <AnimatePresence mode="wait">
      {step === 'calcom' && (
       <Panel key="calcom">
        <CalcomStep onConnected={reload} />
       </Panel>
      )}
      {step === 'forwarding' && (
       <Panel key="forwarding">
        <ForwardingStep
         retellNumber={state.phone_number || '(provisioning…)'}
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

function Header({ step }: { step: Step }) {
 const steps: { id: Step; label: string }[] = [
  { id: 'calcom', label: 'Calendar' },
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
    Stuck? Call or text us — we&apos;ll walk through it together.
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

function CalcomStep({ onConnected }: { onConnected: () => void }) {
 const [apiKey, setApiKey] = useState('')
 const [eventTypeId, setEventTypeId] = useState('')
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
 const [success, setSuccess] = useState<{ username: string | null; eventTypeTitle: string } | null>(null)

 const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitting(true); setError(''); setFieldErrors({})
  try {
   const res = await fetchWithAuth('/api/onboarding/calcom', {
    method: 'POST',
    body: JSON.stringify({ apiKey, eventTypeId: parseInt(eventTypeId, 10) }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) {
    if (json.errors) setFieldErrors(json.errors)
    throw new Error(json.error || 'Connect failed')
   }
   setSuccess({ username: json.account.username, eventTypeTitle: json.eventType.title })
   setTimeout(onConnected, 800)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
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
       Cal.com → Settings → API Keys <ExternalLink className="w-3 h-3" />
      </a> and click <span className="font-medium">+ Add</span>. Copy the key — it starts with <code className="font-mono text-xs bg-white border border-gray-200 px-1 rounded">cal_live_</code>.
     </li>
     <li>
      Open <a href="https://app.cal.com/event-types" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">
       Cal.com → Event Types <ExternalLink className="w-3 h-3" />
      </a>, click the event type you want CloudGreet to book into. The number at the end of the URL is your Event Type ID.
     </li>
     <li>
      No Cal.com yet? <a href="https://app.cal.com/signup" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">
       Sign up free <ExternalLink className="w-3 h-3" />
      </a>, connect your Google/Apple/Outlook calendar, create one event type, then come back.
     </li>
    </ol>
   </div>

   <form onSubmit={submit} className="px-6 py-5 space-y-4">
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Cal.com API key</label>
     <input
      type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)}
      placeholder="cal_live_…"
      className="form-input font-mono"
     />
     {fieldErrors.apiKey && <p className="text-xs text-red-600 mt-1">{fieldErrors.apiKey}</p>}
    </div>
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Event Type ID</label>
     <input
      type="text" required inputMode="numeric" value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder="123456"
      className="form-input font-mono"
     />
     {fieldErrors.eventTypeId && <p className="text-xs text-red-600 mt-1">{fieldErrors.eventTypeId}</p>}
    </div>

    {error && (
     <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2 text-sm flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
     </div>
    )}

    {success && (
     <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-2 text-sm flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>Connected as <strong>{success.username || 'Cal.com user'}</strong> · event: {success.eventTypeTitle}</span>
     </div>
    )}

    <div className="flex justify-end pt-1">
     <button
      type="submit" disabled={submitting || !!success}
      className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-50"
     >
      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
      {success ? 'Connected' : 'Validate & connect'}
     </button>
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
 retellNumber, saved, onSavedChoice, onTryVerify,
}: {
 retellNumber: string
 saved: { carrier: CarrierId | null; lineType: LineType | null; mode: ForwardingMode | null }
 onSavedChoice: () => void
 onTryVerify: () => void
}) {
 const [lineType, setLineType] = useState<LineType | null>(saved.lineType)
 const [carrier, setCarrier] = useState<CarrierId | null>(saved.carrier)
 const [mode, setMode] = useState<ForwardingMode>(saved.mode || 'missed_only')
 const [saving, setSaving] = useState(false)

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
     We&apos;ll show you the exact code to dial. Tap the button — your phone&apos;s dialer opens with the code already filled in.
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
        sub="Your phone never rings — every call hits the AI" />
      </div>
      {mode === 'always' && (
       <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
        Heads up — this forwards everyone (including family, your accountant, etc.) to the AI until you cancel it.
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
          Open {carrierGuide.name} portal <ExternalLink className="w-3.5 h-3.5" />
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
    <Sparkles className="w-4 h-4 text-sky-500" />
    <h2 className="text-xl font-medium text-gray-900">Make a test call</h2>
   </div>
   <p className="text-sm text-gray-500 mb-5">
    Grab a different phone — your spouse&apos;s, a friend&apos;s, anything other than your business line — and call your business number. Let it ring. Don&apos;t pick up.
   </p>

   <div className={`border rounded-xl px-4 py-4 transition-all duration-500 ease-out ${
    verified
     ? 'bg-emerald-50 border-emerald-200'
     : 'bg-gray-50 border-gray-200'
   }`}>
    <div className="flex items-center gap-3">
     {verified ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
     ) : (
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
     )}
     <div className="flex-1">
      <div className={`text-sm font-medium ${verified ? 'text-emerald-900' : 'text-gray-900'}`}>
       {verified ? 'Got it. Forwarding is live.' : 'Listening for your test call…'}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
       {verified
        ? 'Wrapping up — taking you to your dashboard.'
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
 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
   <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
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
  </div>
 )
}
