'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleNotch, FloppyDisk, WarningCircle, CheckCircle, Key, Eye, EyeSlash, Play, Robot, Gauge, CalendarBlank, ArrowsClockwise, Plug, Trash, ArrowSquareOut, Phone, Copy, CaretDown } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import {
 LINE_TYPES, carriersForLineType, findCarrier,
 type CarrierId, type ForwardingMode, type LineType,
} from '@/lib/forwarding-codes'

type Profile = {
 businessName: string
 businessType: string
 services: string[]
 phoneNumber: string
 email: string
 address: string
 city: string
 state: string
 zipCode: string
 website: string | null
 greetingMessage: string
 voiceId: string | null
 voiceSpeed: number | null
 retellAgentId?: string | null
 forwardingCarrier?: string | null
 forwardingLineType?: string | null
 forwardingMode?: string | null
 forwardingVerifiedAt?: string | null
}

type AgentState = {
 linked: boolean
 reason?: string
 agentId?: string
 llmId?: string | null
 agentName?: string | null
 voiceId?: string | null
 voiceName?: string | null
 voiceMeta?: string | null
 voiceSpeed?: number | null
 beginMessage?: string | null
 boundNumbers?: string[]
 responseEngineType?: string | null
}

export default function SettingsPage() {
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [profile, setProfile] = useState<Profile | null>(null)
 const [agentState, setAgentState] = useState<AgentState | null>(null)

 const reload = async (opts: { delay?: number } = {}) => {
  // Optional small delay so Retell's read-after-write is consistent -
  // without it, an immediate post-save fetch sometimes returns the
  // pre-publish state for a few hundred ms.
  if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay))
  try {
   const stamp = Date.now()
   const [pRes, aRes] = await Promise.all([
    fetchWithAuth('/api/business/profile'),
    fetchWithAuth(`/api/dashboard/agent-state?t=${stamp}`),
   ])
   const pJson = await pRes.json()
   if (!pRes.ok || !pJson.success) throw new Error(pJson.message || 'Failed to load profile')
   setProfile(pJson.data)
   const aJson = await aRes.json().catch(() => ({}))
   if (aRes.ok && aJson.success) setAgentState(aJson)
   else setAgentState({ linked: false, reason: aJson?.error || 'Could not read live agent state' })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load profile')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { reload() }, [])

 return (
  <DashShell activeLabel="Settings">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <div className="mb-8">
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Settings</h1>
     </div>

     {loading && (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
       <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
      </div>
     )}

     {!loading && error && !profile && (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
       <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
       <div>
        <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load profile</h3>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
       </div>
      </div>
     )}

     {!loading && profile && (
      <SettingsGroups
       agentState={agentState}
       profile={profile}
       reload={reload}
      />
     )}
    </div>
   </section>
  </DashShell>
 )
}

/* ----------------------------- shared ----------------------------- */

const ACCORDION_EASE = [0.22, 1, 0.36, 1] as const

type SettingRow = {
 key: string
 label: string
 subtitle?: string
 icon: React.ElementType
 render: () => React.ReactNode
}

function SettingsGroups({
 agentState, profile, reload,
}: {
 agentState: AgentState | null
 profile: Profile
 reload: (opts?: { delay?: number }) => void
}) {
 const [openKey, setOpenKey] = useState<string | null>(null)

 const groups: Array<{ title: string; subtitle: string; rows: SettingRow[] }> = [
  {
   title: 'Customize AI',
   subtitle: 'Voice, greeting, speed and what the AI says about the business.',
   rows: [
    { key: 'name', label: 'Business name', subtitle: 'How the AI refers to your business on every call.', icon: Robot, render: () => <NameSection profile={profile} onSaved={reload} /> },
    { key: 'greeting', label: 'AI greeting', subtitle: 'The first line callers hear.', icon: Robot, render: () => <GreetingSection profile={profile} state={agentState} onSaved={reload} /> },
    { key: 'voice', label: 'AI voice', subtitle: 'Pick the voice and tone.', icon: Play, render: () => <VoiceSection profile={profile} state={agentState} onSaved={reload} /> },
    { key: 'speed', label: 'Speech speed', subtitle: 'Faster, slower, natural.', icon: Gauge, render: () => <SpeedSection profile={profile} state={agentState} onSaved={reload} /> },
    { key: 'owner', label: 'Call transfer destination', subtitle: 'Who the AI hands off to when a caller asks for the owner.', icon: Phone, render: () => <OwnerNameSection /> },
   ],
  },
  {
   title: 'SMS settings',
   subtitle: 'Texts the AI sends after a call.',
   rows: [
    { key: 'notifications', label: 'Booking notifications', subtitle: 'Where booking summary texts get sent.', icon: CheckCircle, render: () => <BookingNotificationsSection /> },
    { key: 'reviews', label: 'Review requests', subtitle: 'Auto-text customers a review link after the job.', icon: CheckCircle, render: () => <ReviewRequestsSection /> },
   ],
  },
  {
   title: 'Calendar & forwarding',
   subtitle: 'Where calls land and where bookings go.',
   rows: [
    { key: 'calcom', label: 'Cal.com calendar', subtitle: 'Connect, change event type, re-sync.', icon: CalendarBlank, render: () => <CalendarConnectionSection /> },
    { key: 'emergency_event', label: 'Emergency event type', subtitle: 'Pick a Cal.com event type for urgent bookings.', icon: CalendarBlank, render: () => <EmergencyEventTypeSection /> },
    { key: 'forwarding', label: 'Call forwarding', subtitle: 'How your existing line points to CloudGreet.', icon: Phone, render: () => <ForwardingSection profile={profile} onSaved={reload} /> },
   ],
  },
  {
   title: 'Account',
   subtitle: 'Your CloudGreet login.',
   rows: [
    { key: 'password', label: 'Change password', subtitle: 'Update your login password.', icon: Key, render: () => <PasswordSection /> },
   ],
  },
 ]

 return (
  <div className="space-y-4">
   <LiveAgentBanner state={agentState} />
   {groups.map((g) => (
    <div key={g.title}>
     <div className="mb-2 px-1">
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500">{g.title}</div>
      <p className="text-xs text-gray-400 mt-0.5">{g.subtitle}</p>
     </div>
     <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {g.rows.map((s, i) => {
       const isOpen = openKey === s.key
       const Icon = s.icon
       return (
        <div key={s.key} className={i > 0 ? 'border-t border-gray-100' : ''}>
         <button
          onClick={() => setOpenKey(isOpen ? null : s.key)}
          className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50/60 transition-colors"
         >
          <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
           <Icon className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
           <h2 className="text-sm font-medium text-gray-900 truncate">{s.label}</h2>
           {s.subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{s.subtitle}</p>}
          </div>
          <CaretDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
         </button>
         <AnimatePresence initial={false}>
          {isOpen && (
           <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: ACCORDION_EASE }}
            className="overflow-hidden"
           >
            <div className="px-3 sm:px-4 pb-4 pt-1">
             {s.render()}
            </div>
           </motion.div>
          )}
         </AnimatePresence>
        </div>
       )
      })}
     </div>
    </div>
   ))}
  </div>
 )
}

async function patchBusiness(updates: Record<string, any>) {
 // Server scopes by JWT - no need to send businessId from the client.
 const res = await fetchWithAuth('/api/businesses/update', {
  method: 'PATCH',
  body: JSON.stringify(updates),
 })
 const json = await res.json().catch(() => ({}))
 if (!res.ok || !json.success) throw new Error(json?.error || `Save failed (${res.status})`)
 return json
}

function SavedHint() {
 return (
  <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1.5">
   <CheckCircle className="w-3.5 h-3.5" /> Saved. AI agent updated automatically.
  </p>
 )
}

function ErrorHint({ message }: { message: string }) {
 return <p className="text-xs text-red-600 mt-3">{message}</p>
}

function SaveButton({ disabled, saving, onClick, label = 'Save' }: {
 disabled: boolean; saving: boolean; onClick: () => void; label?: string
}) {
 return (
  <button
   onClick={onClick} disabled={disabled || saving}
   className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
  >
   {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
   {label}
  </button>
 )
}

/* ------------------------------ Name ------------------------------ */

function NameSection({ profile, onSaved }: { profile: Profile; onSaved: (opts?: { delay?: number }) => void }) {
 const [value, setValue] = useState(profile.businessName)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 const dirty = value.trim() !== profile.businessName && value.trim().length > 0

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   await patchBusiness({ business_name: value.trim() })
   try {
    const b = JSON.parse(localStorage.getItem('business') || '{}')
    b.business_name = value.trim()
    localStorage.setItem('business', JSON.stringify(b))
   } catch {}
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   onSaved()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-4">Business name</h2>
   <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    <input
     type="text" value={value} onChange={(e) => setValue(e.target.value)}
     className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors text-sm"
    />
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ---------------------------- Greeting ---------------------------- */

function LiveAgentBanner({ state }: { state: AgentState | null }) {
 if (!state) return null
 if (!state.linked) {
  return (
   <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
    <WarningCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
     <p className="text-sm font-medium text-amber-900">No live AI agent linked yet</p>
     <p className="text-xs text-amber-800 mt-0.5">
      {state.reason || 'Saved settings won\'t reach the agent until an admin links it.'}
     </p>
    </div>
   </div>
  )
 }
 const noPhone = !state.boundNumbers || state.boundNumbers.length === 0
 return (
  <div className={`rounded-2xl p-4 ${noPhone ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
   <div className="flex items-start gap-3">
    <div className={`w-2 h-2 rounded-full mt-1.5 ${noPhone ? 'bg-amber-500' : 'bg-emerald-500'}`} />
    <div className="flex-1 text-xs">
     <div className={`font-medium ${noPhone ? 'text-amber-900' : 'text-emerald-900'}`}>
      {noPhone
       ? 'Agent linked, but no phone number routes to it yet'
       : `Live · answers calls on ${(state.boundNumbers || []).join(', ')}`}
     </div>
     <div className={`mt-1 font-mono ${noPhone ? 'text-amber-800/80' : 'text-emerald-800/80'}`}>
      {state.agentId}
     </div>
    </div>
   </div>
  </div>
 )
}

function CurrentLine({ label, value }: { label: string; value: string | null | undefined }) {
 return (
  <div className="text-[11px] font-mono text-gray-500 mt-2">
   <span className="uppercase tracking-wider">{label}:</span>{' '}
   <span className="text-gray-700">{value || '-'}</span>
  </div>
 )
}

function GreetingSection({ profile, state, onSaved }: { profile: Profile; state: AgentState | null; onSaved: (opts?: { delay?: number }) => void }) {
 // Initialize from the live Retell value when available - that's the
 // ground truth. Falling back to the DB greeting only if Retell has
 // nothing yet. Without this the textarea stays empty even when Retell
 // has a real greeting set, and a clean save sends '' which Retell
 // interprets as 'flip to dynamic mode'.
 const initialGreeting = state?.beginMessage ?? profile.greetingMessage ?? ''
 const [value, setValue] = useState(initialGreeting)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 // Re-sync when profile or live state changes (e.g. after a reload).
 useEffect(() => { setValue(state?.beginMessage ?? profile.greetingMessage ?? '') },
  [profile.greetingMessage, state?.beginMessage])

 const dirty = value !== initialGreeting && value.trim().length > 0

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const r = await patchBusiness({ greeting_message: value, greeting: value })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   if (r.agentSyncError) {
    setError(`Saved, but the agent didn't sync: ${r.agentSyncError}`)
   }
   onSaved({ delay: 800 })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 const placeholder = `Hi, thanks for calling ${profile.businessName}. This is the virtual receptionist. How can I help today?`

 const liveBegin = state?.beginMessage ?? null

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-1">AI greeting</h2>
   <p className="text-xs text-gray-500 mb-4">First thing your AI says when answering a call.</p>
   <textarea
    value={value} onChange={(e) => setValue(e.target.value)}
    placeholder={placeholder} rows={3}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors text-sm resize-none"
   />
   {state?.linked && <CurrentLine label="Currently saying" value={liveBegin} />}
   <div className="flex justify-end mt-3">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ------------------------------ Voice ----------------------------- */

type Voice = {
 voice_id: string
 voice_name: string
 provider: string | null
 accent: string | null
 gender: string | null
 preview_audio_url: string | null
}

function VoiceSection({ profile, state, onSaved }: { profile: Profile; state: AgentState | null; onSaved: (opts?: { delay?: number }) => void }) {
 const [voices, setVoices] = useState<Voice[]>([])
 const [voicesError, setVoicesError] = useState('')
 const [voicesLoading, setVoicesLoading] = useState(true)
 const [value, setValue] = useState<string | null>(profile.voiceId)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 useEffect(() => { setValue(profile.voiceId) }, [profile.voiceId])
 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setVoicesLoading(true); setVoicesError('')
   try {
    const res = await fetchWithAuth('/api/dashboard/retell/voices')
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.success) throw new Error(j?.error || `Failed (${res.status})`)
    if (!cancelled) setVoices(j.voices || [])
   } catch (e) {
    if (!cancelled) setVoicesError(e instanceof Error ? e.message : 'Failed to load voices')
   } finally {
    if (!cancelled) setVoicesLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [])

 const dirty = (value || null) !== (profile.voiceId || null)
 const selected = voices.find((v) => v.voice_id === value)

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const r = await patchBusiness({ voice_id: value || null })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   if (r.agentSyncError) setError(`Saved, but Retell didn\'t sync: ${r.agentSyncError}`)
   onSaved({ delay: 800 })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-1">
    <Robot className="w-4 h-4 text-sky-500" />
    <h2 className="text-sm font-medium text-gray-700">AI voice</h2>
   </div>
   <p className="text-xs text-gray-500 mb-4">
    Pick what your AI sounds like. Tap any voice to preview before saving.
   </p>

   {voicesError ? (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-xs">
     Couldn&apos;t load voices: {voicesError}
    </div>
   ) : voicesLoading ? (
    <div className="flex items-center gap-2 text-xs text-gray-400">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading voices…
    </div>
   ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
     <button
      type="button"
      onClick={() => setValue(null)}
      className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out ${
       value === null
        ? 'border-gray-900 bg-gray-50'
        : 'border-gray-200 hover:border-gray-400'
      }`}
     >
      <div className="text-sm font-medium text-gray-900">Currently selected</div>
      <div className="text-xs text-gray-500 mt-0.5">
       {state?.voiceName
        ? `${state.voiceName}${state.voiceMeta ? ` · ${state.voiceMeta}` : ''}`
        : 'Auto-picked from your business type.'}
      </div>
     </button>
     {voices.map((v) => (
      <VoiceCard
       key={v.voice_id}
       voice={v}
       selected={value === v.voice_id}
       onSelect={() => setValue(v.voice_id)}
      />
     ))}
    </div>
   )}

   {state?.linked && (
    <CurrentLine
     label="Currently using"
     value={state.voiceName ? `${state.voiceName}${state.voiceMeta ? ` · ${state.voiceMeta}` : ''}` : null}
    />
   )}

   <div className="flex justify-end mt-4">
    <SaveButton
     disabled={!dirty} saving={saving} onClick={onSave}
     label={profile.retellAgentId ? 'Save & push to agent' : 'Save'}
    />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

function VoiceCard({
 voice, selected, onSelect,
}: { voice: Voice; selected: boolean; onSelect: () => void }) {
 const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null)
 const [playing, setPlaying] = useState(false)
 const [error, setError] = useState(false)

 const hasPreview = !!voice.preview_audio_url

 const togglePreview = (e: React.MouseEvent) => {
  e.stopPropagation()
  e.preventDefault()
  if (!audio || !hasPreview) return
  if (playing) {
   audio.pause(); audio.currentTime = 0; setPlaying(false); return
  }
  setError(false)
  audio.src = voice.preview_audio_url!
  audio.onended = () => setPlaying(false)
  audio.onerror = () => { setPlaying(false); setError(true) }
  audio.play().then(() => setPlaying(true)).catch(() => { setPlaying(false); setError(true) })
 }

 useEffect(() => () => { if (audio) { audio.pause(); audio.src = '' } }, [audio])

 // Inline pixel sizes for the play button so a missing Tailwind class
 // (or a flex parent collapsing it) can't render it as an unstyled
 // empty circle. Always show the affordance even when there's no
 // preview - just disable it - so the row looks the same shape as
 // the others.
 const playBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  border: 'none',
  cursor: hasPreview ? 'pointer' : 'not-allowed',
  backgroundColor: playing ? '#0ea5e9' : (hasPreview ? '#f3f4f6' : '#f9fafb'),
  color: playing ? '#ffffff' : (hasPreview ? '#374151' : '#9ca3af'),
  transition: 'background-color 150ms ease',
 }

 return (
  <div
   onClick={onSelect}
   className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out cursor-pointer flex items-center gap-3 ${
    selected
     ? 'border-gray-900 bg-gray-50'
     : 'border-gray-200 hover:border-gray-400 bg-white'
   }`}
  >
   <button
    type="button"
    onClick={togglePreview}
    disabled={!hasPreview}
    title={hasPreview ? (playing ? 'Stop preview' : 'Play preview') : 'No audio preview for this voice'}
    aria-label={hasPreview ? (playing ? 'Stop preview' : 'Play preview') : 'No preview available'}
    style={playBtnStyle}
   >
    <Play size={14} weight={playing ? 'fill' : 'regular'} />
   </button>
   <div className="flex-1 min-w-0">
    <div className="text-sm font-medium text-gray-900 truncate">{voice.voice_name}</div>
    <div className="text-[10px] text-gray-500 mt-0.5 font-mono uppercase tracking-wider truncate">
     {[voice.gender, voice.accent, voice.provider].filter(Boolean).join(' · ') || 'voice'}
     {!hasPreview && <span className="text-gray-400 normal-case"> · no preview</span>}
     {error && <span className="text-rose-500 normal-case"> · preview failed</span>}
    </div>
   </div>
  </div>
 )
}

/* ------------------------------ Speed ----------------------------- */

const SPEED_PRESETS: { value: number; label: string }[] = [
 { value: 0.8, label: 'Slower' },
 { value: 1.0, label: 'Normal' },
 { value: 1.2, label: 'Faster' },
]

function SpeedSection({ profile, state, onSaved }: { profile: Profile; state: AgentState | null; onSaved: (opts?: { delay?: number }) => void }) {
 // Initialize from Retell's live voice_speed when available (it's the
 // ground truth). Falling back to the DB value only if Retell has
 // nothing yet. Without this the slider snaps to 1.0 on every load.
 const initial = state?.voiceSpeed ?? profile.voiceSpeed ?? 1.0
 const [value, setValue] = useState<number>(initial)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 useEffect(() => {
  const live = state?.voiceSpeed ?? profile.voiceSpeed ?? 1.0
  setValue(live)
 }, [profile.voiceSpeed, state?.voiceSpeed])

 const dirty = Math.abs(value - initial) > 0.001

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const r = await patchBusiness({ voice_speed: value })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   if (r.agentSyncError) setError(`Saved, but Retell didn\'t sync: ${r.agentSyncError}`)
   onSaved({ delay: 800 })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-1">
    <Gauge className="w-4 h-4 text-sky-500" />
    <h2 className="text-sm font-medium text-gray-700">Speech speed</h2>
   </div>
   <p className="text-xs text-gray-500 mb-4">
    How fast the AI talks. 1.0 is Retell&apos;s default - drop it for older callers, raise it for impatient ones.
   </p>

   <div className="flex items-center gap-4">
    <input
     type="range" min={0.5} max={2.0} step={0.05}
     value={value}
     onChange={(e) => setValue(parseFloat(e.target.value))}
     className="flex-1 accent-gray-900"
    />
    <div className="text-2xl font-medium text-gray-900 tabular-nums w-16 text-right">
     {value.toFixed(2)}×
    </div>
   </div>

   {state?.linked && (
    <CurrentLine
     label="Currently set to"
     value={typeof state.voiceSpeed === 'number' ? `${state.voiceSpeed.toFixed(2)}×` : null}
    />
   )}

   <div className="flex gap-2 mt-3">
    {SPEED_PRESETS.map((p) => (
     <button
      key={p.value} type="button"
      onClick={() => setValue(p.value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
       Math.abs(value - p.value) < 0.005
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
     >
      {p.label} · {p.value.toFixed(1)}×
     </button>
    ))}
   </div>

   <div className="flex justify-end mt-4">
    <SaveButton
     disabled={!dirty} saving={saving} onClick={onSave}
     label={profile.retellAgentId ? 'Save & push to agent' : 'Save'}
    />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ---------------------------- Read-only --------------------------- */

function OwnerNameSection() {
 const [first, setFirst] = useState('')
 const [last, setLast] = useState('')
 const [phone, setPhone] = useState('')
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)
 const [initial, setInitial] = useState({ first: '', last: '', phone: '' })

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    // Name comes from the user profile, but the transfer phone is
    // read straight from businesses.escalation_phone (via the
    // notifications endpoint) - that's the field Retell's transfer_call
    // destination is actually wired to, so it stays the source of truth.
    // Reading from profile.phone here let the settings page drift out
    // of sync with Retell whenever onboarding set escalation_phone
    // directly without touching the profile row.
    const [profileRes, notifRes] = await Promise.all([
     fetchWithAuth('/api/me/profile'),
     fetchWithAuth('/api/dashboard/notifications'),
    ])
    const profileJson = await profileRes.json().catch(() => ({}))
    const notifJson = await notifRes.json().catch(() => ({}))
    if (cancelled) return
    const p = profileJson?.profile || {}
    const nameParts = (p.name || '').split(/\s+/).filter(Boolean)
    const f = p.first_name || nameParts[0] || ''
    const l = p.last_name || nameParts.slice(1).join(' ') || ''
    const ph = (notifJson?.transfer_phone as string) || ''
    setFirst(f); setLast(l); setPhone(ph)
    setInitial({ first: f, last: l, phone: ph })
   } catch { /* non-fatal */ }
   finally { if (!cancelled) setLoading(false) }
  })()
  return () => { cancelled = true }
 }, [])

 const dirty = first !== initial.first || last !== initial.last || phone !== initial.phone

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const nameChanged = first.trim() !== initial.first || last.trim() !== initial.last
   const phoneChanged = phone.trim() !== initial.phone

   if (nameChanged) {
    const res = await fetchWithAuth('/api/me/profile', {
     method: 'PATCH',
     body: JSON.stringify({
      first_name: first.trim(),
      last_name: last.trim(),
     }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
   }

   let toolsError: string | null = null
   if (phoneChanged) {
    const res = await fetchWithAuth('/api/dashboard/notifications', {
     method: 'PATCH',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ transfer_phone: phone.trim() || null }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
    toolsError = j?.toolsError || null
   }

   setInitial({ first: first.trim(), last: last.trim(), phone: phone.trim() })
   if (toolsError) {
    setError(`Saved, but couldn't sync to the agent: ${toolsError}`)
   } else {
    setSavedFlag(true)
    setTimeout(() => setSavedFlag(false), 2500)
   }
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-1">Call transfer destination</h2>
   <p className="text-xs text-gray-500 mb-4">
    When a caller asks to speak with the owner, the AI will say your name and transfer the call to this phone number. Use the cell or office line you actually want calls forwarded to.
   </p>
   {loading ? (
    <div className="flex items-center gap-2 text-xs text-gray-400">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading…
    </div>
   ) : (
    <>
     <label className="block text-[11px] font-medium text-gray-600 mb-1.5">Your name (what the AI calls you)</label>
     <div className="grid sm:grid-cols-2 gap-3">
      <input
       type="text" value={first} onChange={(e) => setFirst(e.target.value)}
       placeholder="First name"
       className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
      />
      <input
       type="text" value={last} onChange={(e) => setLast(e.target.value)}
       placeholder="Last name"
       className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
      />
     </div>
     <label className="block text-[11px] font-medium text-gray-600 mt-4 mb-1.5">
      Transfer phone number
     </label>
     <input
      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
      placeholder="+1 555 555 1212"
      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
     />
     <p className="text-[11px] text-gray-500 mt-1.5">
      Where the AI sends calls when the caller asks for you. Test it after saving — call your business number and ask the AI to transfer you.
     </p>
     <div className="flex justify-end mt-4">
      <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
     </div>
     {savedFlag && <SavedHint />}
     {error && <ErrorHint message={error} />}
    </>
   )}
  </div>
 )
}

function PasswordSection() {
 const [current, setCurrent] = useState('')
 const [next, setNext] = useState('')
 const [confirm, setConfirm] = useState('')
 const [showCurrent, setShowCurrent] = useState(false)
 const [showNext, setShowNext] = useState(false)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [saved, setSaved] = useState(false)

 const reset = () => {
  setCurrent(''); setNext(''); setConfirm(''); setError(''); setSaved(false)
 }

 const onSave = async () => {
  setSaving(true); setError(''); setSaved(false)
  try {
   if (next.length < 8) throw new Error('New password must be at least 8 characters')
   if (next !== confirm) throw new Error('New passwords don\'t match')
   const res = await fetchWithAuth('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: current, newPassword: next }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || 'Failed to change password')
   setSaved(true)
   setCurrent(''); setNext(''); setConfirm('')
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setSaving(false)
  }
 }

 const canSave = current.length > 0 && next.length >= 8 && next === confirm

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-1">
    <Key className="w-4 h-4 text-sky-500" />
    <h2 className="text-base font-medium text-gray-900">Change password</h2>
   </div>
   <p className="text-sm text-gray-500 mb-4">
    You&apos;ll stay signed in on this device. Other sessions keep working until they expire.
   </p>

   <div className="space-y-3">
    <PasswordField
     label="Current password" value={current} onChange={setCurrent}
     show={showCurrent} onToggle={() => setShowCurrent((v) => !v)}
    />
    <PasswordField
     label="New password" value={next} onChange={setNext}
     show={showNext} onToggle={() => setShowNext((v) => !v)}
     hint={next.length > 0 && next.length < 8 ? `${8 - next.length} more characters` : undefined}
    />
    <PasswordField
     label="Confirm new password" value={confirm} onChange={setConfirm}
     show={showNext} onToggle={() => setShowNext((v) => !v)}
     hint={confirm.length > 0 && next !== confirm ? 'Doesn\'t match' : undefined}
     hintTone={confirm.length > 0 && next !== confirm ? 'error' : 'neutral'}
    />
   </div>

   <div className="mt-4 flex items-center gap-3">
    <SaveButton
     disabled={!canSave} saving={saving}
     onClick={onSave} label="Update password"
    />
    {(current || next || confirm) && !saving && (
     <button
      onClick={reset}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
     >
      Clear
     </button>
    )}
   </div>

   {saved && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

function PasswordField({
 label, value, onChange, show, onToggle, hint, hintTone = 'neutral',
}: {
 label: string
 value: string
 onChange: (v: string) => void
 show: boolean
 onToggle: () => void
 hint?: string
 hintTone?: 'neutral' | 'error'
}) {
 return (
  <div>
   <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
   <div className="relative">
    <input
     type={show ? 'text' : 'password'}
     value={value}
     onChange={(e) => onChange(e.target.value)}
     autoComplete="new-password"
     className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 transition-colors focus:outline-none focus:border-gray-900 pr-10"
    />
    <button
     type="button"
     onClick={onToggle}
     tabIndex={-1}
     className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
     aria-label={show ? 'Hide password' : 'Show password'}
    >
     {show ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
   </div>
   {hint && (
    <p className={`text-[11px] mt-1 ${hintTone === 'error' ? 'text-red-600' : 'text-gray-500'}`}>{hint}</p>
   )}
  </div>
 )
}

const BUSINESS_TYPES = [
 'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting',
 'Landscaping', 'Cleaning', 'Pest control', 'Handyman', 'General',
] as const

function ProfileSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
 const [businessType, setBusinessType] = useState(profile.businessType || '')
 const [phone, setPhone] = useState(profile.phoneNumber || '')
 const [website, setWebsite] = useState(profile.website || '')
 const [address, setAddress] = useState(profile.address || '')
 const [city, setCity] = useState(profile.city || '')
 const [state, setState] = useState(profile.state || '')
 const [zipCode, setZipCode] = useState(profile.zipCode || '')
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 useEffect(() => {
  setBusinessType(profile.businessType || '')
  setPhone(profile.phoneNumber || '')
  setWebsite(profile.website || '')
  setAddress(profile.address || '')
  setCity(profile.city || '')
  setState(profile.state || '')
  setZipCode(profile.zipCode || '')
 }, [profile])

 const dirty =
  businessType !== (profile.businessType || '') ||
  phone !== (profile.phoneNumber || '') ||
  website !== (profile.website || '') ||
  address !== (profile.address || '') ||
  city !== (profile.city || '') ||
  state !== (profile.state || '') ||
  zipCode !== (profile.zipCode || '')

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   await patchBusiness({
    business_type: businessType.trim(),
    phone_number: phone.trim() || null,
    website: website.trim() || null,
    address: address.trim() || null,
    city: city.trim() || null,
    state: state.trim() || null,
    zip_code: zipCode.trim() || null,
   })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   onSaved()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900 transition-colors'

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-1">Profile</h2>
   <p className="text-xs text-gray-500 mb-4">
    The basics about your business. The AI uses this when callers ask where you&apos;re located, what you do, or how to reach you outside CloudGreet.
   </p>

   <div className="grid sm:grid-cols-2 gap-3">
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Business type</label>
     <select
      value={businessType}
      onChange={(e) => setBusinessType(e.target.value)}
      className={inputCls}
     >
      <option value="">Pick one…</option>
      {BUSINESS_TYPES.map((t) => (
       <option key={t} value={t}>{t}</option>
      ))}
      {/* keep an existing custom value selectable */}
      {businessType && !BUSINESS_TYPES.includes(businessType as any) && (
       <option value={businessType}>{businessType}</option>
      )}
     </select>
    </div>
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
     <input
      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
      placeholder="+1 (555) 123-4567" className={`${inputCls} font-mono`}
     />
    </div>
    <div className="sm:col-span-2">
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Website</label>
     <input
      type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
      placeholder="https://yourbusiness.com" className={inputCls}
     />
    </div>
    <div className="sm:col-span-2">
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Street address</label>
     <input
      type="text" value={address} onChange={(e) => setAddress(e.target.value)}
      placeholder="123 Main St" className={inputCls}
     />
    </div>
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">City</label>
     <input
      type="text" value={city} onChange={(e) => setCity(e.target.value)}
      className={inputCls}
     />
    </div>
    <div className="grid grid-cols-2 gap-3">
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">State</label>
      <input
       type="text" value={state} onChange={(e) => setState(e.target.value)}
       placeholder="TX" maxLength={2} className={`${inputCls} uppercase`}
      />
     </div>
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">ZIP</label>
      <input
       type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)}
       placeholder="78701" className={`${inputCls} font-mono`}
      />
     </div>
    </div>
   </div>

   <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
    <div>
     <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
     <div className="text-sm text-gray-700">{profile.email || '-'}</div>
    </div>
   </div>

   <div className="flex justify-end mt-5">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
   <p className="text-[11px] text-gray-400 mt-4">
    Email is locked here - contact support to change it (we verify the new address before switching).
   </p>
  </div>
 )
}

/* ------------------- Booking notification SMS ------------------- */
/**
 * Settings panel for the booking-notification SMS - the text that
 * fires the moment the AI books a job. Editable phone + template,
 * live preview, "Send test" button so contractors can verify the
 * wiring before the first real booking.
 */
function BookingNotificationsSection() {
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [testing, setTesting] = useState(false)
 const [testingEmergency, setTestingEmergency] = useState(false)
 const [phone, setPhone] = useState('')
 const [template, setTemplate] = useState('')
 const [emergencyTemplate, setEmergencyTemplate] = useState('')
 const [businessName, setBusinessName] = useState('')
 const [defaultTemplate, setDefaultTemplate] = useState('')
 const [defaultEmergencyTemplate, setDefaultEmergencyTemplate] = useState('')
 const [maxLen, setMaxLen] = useState(320)
 const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const VARS: { name: string; description: string; sample: string }[] = [
  { name: 'name',     description: "caller's name",         sample: 'John Smith' },
  { name: 'phone',    description: "caller's phone",        sample: '+1 (555) 123-4567' },
  { name: 'time',     description: 'booking date/time', sample: 'Tue Jul 8, 2:00 PM' },
  { name: 'service',  description: 'what they booked',      sample: 'AC repair' },
  { name: 'address',  description: 'service address',       sample: '123 Main St' },
  { name: 'business', description: "the business's name",   sample: 'Mike\'s HVAC' },
 ]

 const load = async () => {
  setLoading(true)
  try {
   const r = await fetchWithAuth('/api/dashboard/notifications')
   const j = await r.json().catch(() => ({}))
   if (r.ok && j?.success) {
    setPhone(j.notifications_phone || '')
    setTemplate(j.booking_sms_template || j.default_template || '')
    setEmergencyTemplate(j.booking_sms_template_emergency || j.default_emergency_template || '')
    setDefaultTemplate(j.default_template || '')
    setDefaultEmergencyTemplate(j.default_emergency_template || '')
    setBusinessName(j.business_name || '')
    setMaxLen(j.template_max_length || 320)
   }
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const save = async () => {
  setSaving(true); setFlash(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     notifications_phone: phone,
     booking_sms_template: template,
     booking_sms_template_emergency: emergencyTemplate,
    }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Save failed' })
   } else {
    setFlash({ tone: 'ok', text: 'Saved' })
   }
  } finally {
   setSaving(false)
   setTimeout(() => setFlash(null), 2400)
  }
 }

 const sendTest = async (emergency: boolean = false) => {
  if (emergency) setTestingEmergency(true); else setTesting(true)
  setFlash(null)
  try {
   // Save first so the test uses the latest template + phone.
   await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     notifications_phone: phone,
     booking_sms_template: template,
     booking_sms_template_emergency: emergencyTemplate,
    }),
   })
   const r = await fetchWithAuth('/api/dashboard/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     template: emergency ? emergencyTemplate : template,
     emergency,
    }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Test send failed' })
   } else {
    setFlash({ tone: 'ok', text: `${emergency ? 'Emergency test' : 'Test'} sent to ${j.sent_to}` })
   }
  } finally {
   if (emergency) setTestingEmergency(false); else setTesting(false)
   setTimeout(() => setFlash(null), 5000)
  }
 }

 const reset = () => setTemplate(defaultTemplate)
 const resetEmergency = () => setEmergencyTemplate(defaultEmergencyTemplate)

 const preview = renderPreview(template || defaultTemplate, businessName)
 const emergencyPreview = renderPreview(emergencyTemplate || defaultEmergencyTemplate, businessName)

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="mb-4">
    <h2 className="text-lg font-medium text-gray-900">Booking notifications</h2>
    <p className="text-sm text-gray-500 mt-1">
     Get a text the second the AI books a job. One message per booking,
     sent to whichever phone you list below.
    </p>
   </div>

   {loading ? (
    <div className="py-8 text-center text-sm text-gray-500">
     <CircleNotch className="w-4 h-4 animate-spin inline mr-1.5" /> Loading…
    </div>
   ) : (
    <div className="space-y-4">
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
       Notify this number
      </label>
      <input
       type="tel"
       value={phone}
       onChange={(e) => setPhone(e.target.value)}
       placeholder="+1 (737) 555-0123"
       className="w-full max-w-sm bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
      />
      <p className="text-[11px] text-gray-500 mt-1">
       US number, any common format. We&apos;ll normalize it on save.
      </p>
     </div>

     <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
       Message template
      </label>
      <textarea
       value={template}
       onChange={(e) => setTemplate(e.target.value)}
       rows={3}
       maxLength={maxLen}
       className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900 resize-y"
      />
      <div className="flex items-center justify-between mt-1">
       <span className="text-[11px] text-gray-400">{template.length}/{maxLen}</span>
       {template !== defaultTemplate && (
        <button onClick={reset} className="text-[11px] text-gray-500 hover:text-gray-900">
         Reset to default
        </button>
       )}
      </div>
     </div>

     <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
       Available variables
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
       {VARS.map((v) => (
        <div key={v.name}>
         <code className="font-mono text-gray-900">{`{${v.name}}`}</code>
         <span className="text-gray-500"> - {v.description}</span>
        </div>
       ))}
      </div>
     </div>

     <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
       Preview
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm font-mono text-emerald-900 whitespace-pre-wrap">
       {preview}
      </div>
     </div>

     {/* Emergency template - separate from the routine template so the
         lockscreen ping for an actual emergency looks visually
         distinct. The AI agent flips between the two via the
         book_appointment is_emergency arg. Defaults to a hardcoded
         🚨 URGENT prefix if the contractor doesn't customise it. */}
     <div className="pt-2 border-t border-gray-200">
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
       Emergency message template
       <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-rose-600">used when the AI flags a call as urgent</span>
      </label>
      <textarea
       value={emergencyTemplate}
       onChange={(e) => setEmergencyTemplate(e.target.value)}
       rows={3}
       maxLength={maxLen}
       className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-rose-400 resize-y"
      />
      <div className="flex items-center justify-between mt-1">
       <span className="text-[11px] text-gray-400">{emergencyTemplate.length}/{maxLen}</span>
       {emergencyTemplate !== defaultEmergencyTemplate && (
        <button onClick={resetEmergency} className="text-[11px] text-gray-500 hover:text-gray-900">
         Reset to default
        </button>
       )}
      </div>
     </div>

     <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600 mb-1.5">
       Emergency preview
      </div>
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm font-mono text-rose-900 whitespace-pre-wrap">
       {emergencyPreview}
      </div>
     </div>

     {flash && (
      <div className={`text-xs px-3 py-2 rounded-lg ${
       flash.tone === 'ok'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        : 'bg-rose-50 border border-rose-200 text-rose-800'
      }`}>
       {flash.text}
      </div>
     )}

     <div className="flex flex-wrap items-center gap-2">
      <button
       onClick={save}
       disabled={saving}
       className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-60"
      >
       {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
       Save
      </button>
      <button
       onClick={() => sendTest(false)}
       disabled={testing || testingEmergency || !phone.trim()}
       className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg px-4 py-2 disabled:opacity-60"
       title={!phone.trim() ? 'Save a phone number first' : 'Fire a real test SMS to your phone'}
      >
       {testing ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
       Send test
      </button>
      <button
       onClick={() => sendTest(true)}
       disabled={testing || testingEmergency || !phone.trim()}
       className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-sm rounded-lg px-4 py-2 disabled:opacity-60"
       title={!phone.trim() ? 'Save a phone number first' : 'Fire the emergency-template test SMS'}
      >
       {testingEmergency ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
       Send emergency test
      </button>
     </div>
    </div>
   )}
  </div>
 )
}

function renderPreview(template: string, businessName: string): string {
 const ctx: Record<string, string> = {
  name: 'John Smith',
  phone: '+1 (555) 123-4567',
  time: 'Tue Jul 8, 2:00 PM',
  service: 'AC repair',
  address: '123 Main St',
  business: businessName || "Mike's HVAC",
 }
 return template.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '').replace(/[ \t]+/g, ' ').trim()
}

/**
 * Review-request automation. Off by default. When on:
 *   - AI asks the caller during booking: "ok if we send a quick text after?"
 *   - If yes, after the appointment time we send one SMS with the
 *     contractor's Google review link.
 *   - 90-day per-customer cap, quiet hours 9am-7pm local, STOP-to-opt-out.
 * Zero ongoing work for the contractor.
 */
type ReviewStats = {
 queued: number
 sent_last_30d: number
 failed_last_30d: number
 opted_out_count: number
 last_sent_at: string | null
}

function ReviewRequestsSection() {
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 // Default ON. The contractor can flip it off if they don't want it,
 // but the value of the feature only happens when it's enabled, so
 // making them opt-in is friction for no upside.
 const [enabled, setEnabled] = useState(true)
 const [reviewUrl, setReviewUrl] = useState('')
 const [template, setTemplate] = useState('')
 const [defaultTemplate, setDefaultTemplate] = useState('')
 const [timing, setTiming] = useState<'1h_after' | 'evening_same_day' | 'next_morning'>('1h_after')
 const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
 const [stats, setStats] = useState<ReviewStats | null>(null)
 const [testPhone, setTestPhone] = useState('')
 const [testing, setTesting] = useState(false)
 const [testResult, setTestResult] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const load = async () => {
  setLoading(true)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests')
   const j = await r.json().catch(() => ({}))
   if (r.ok && j?.success) {
    setEnabled(!!j.enabled)
    setReviewUrl(j.google_review_url || '')
    setTemplate(j.review_sms_template || j.default_template || '')
    setDefaultTemplate(j.default_template || '')
    setTiming((j.review_send_timing as any) || '1h_after')
    setStats(j.stats || null)
   }
  } finally {
   setLoading(false)
  }
 }

 const sendTest = async () => {
  setTesting(true); setTestResult(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setTestResult({ tone: 'err', text: j?.error || 'Send failed' })
   } else {
    setTestResult({ tone: 'ok', text: `Sent to ${j.sent_to}. Check your phone.` })
   }
  } finally {
   setTesting(false)
   setTimeout(() => setTestResult(null), 12000)
  }
 }

 const dryRun = async () => {
  setTesting(true); setTestResult(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setTestResult({ tone: 'err', text: j?.error || 'Dry-run failed' })
   } else {
    setTestResult({
     tone: 'ok',
     text: `Full pipeline OK: row queued, cron logic ran, SMS sent to ${j.sent_to}. Check Activity below - the count just went up.`,
    })
    load()
   }
  } finally {
   setTesting(false)
   setTimeout(() => setTestResult(null), 15000)
  }
 }

 const testOptOut = async (clear = false) => {
  setTesting(true); setTestResult(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests/test-opt-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, clear }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setTestResult({ tone: 'err', text: j?.error || 'Opt-out test failed' })
   } else if (clear) {
    setTestResult({ tone: 'ok', text: `Cleared opt-out for ${j.cleared}. The phone can receive review SMS again.` })
   } else {
    const tCancel = (j.telnyx_messages_canceled || []).length
    setTestResult({
     tone: 'ok',
     text: `Opt-out registered for ${j.phone_normalised}. ${j.canceled_count} pending review(s) canceled${tCancel > 0 ? `, ${tCancel} Telnyx scheduled message(s) recalled` : ''}. Future review SMS to this number will be blocked. Tap "Clear opt-out" to undo.`,
    })
    load()
   }
  } finally {
   setTesting(false)
   setTimeout(() => setTestResult(null), 20000)
  }
 }

 useEffect(() => { load() }, [])

 const save = async () => {
  setSaving(true); setFlash(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     enabled,
     google_review_url: reviewUrl,
     review_sms_template: template,
     review_send_timing: timing,
    }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Save failed' })
   } else {
    setFlash({ tone: 'ok', text: 'Saved' })
   }
  } finally {
   setSaving(false)
   setTimeout(() => setFlash(null), 4000)
  }
 }

 // Persist the on/off toggle the moment it's clicked. The Save button
 // is for the URL / template / timing fields where the user wants a
 // chance to undo a typo - but toggling the feature on/off shouldn't
 // require a second action. Previously it only updated local state,
 // so a refresh threw the change away (the bug screenshot).
 const toggleEnabled = async (next: boolean) => {
  setEnabled(next)
  try {
   const r = await fetchWithAuth('/api/dashboard/review-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: next }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    // Revert the visual state if the server rejected us.
    setEnabled(!next)
    setFlash({ tone: 'err', text: j?.error || 'Could not save toggle' })
    setTimeout(() => setFlash(null), 4000)
   }
  } catch {
   setEnabled(!next)
   setFlash({ tone: 'err', text: 'Network error - toggle not saved' })
   setTimeout(() => setFlash(null), 4000)
  }
 }

 const renderPreview = (tpl: string) => {
  return (tpl || defaultTemplate)
   .replace(/\{first_name\}/g, 'John')
   .replace(/\{business_name\}/g, "Mike's HVAC")
   .replace(/\{review_link\}/g, reviewUrl || 'https://g.page/r/...')
 }

 if (loading) return null

 const dim = !enabled

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
    <div>
     <h2 className="text-sm font-medium text-gray-700">Review requests</h2>
     <p className="text-xs text-gray-500 mt-1 max-w-prose leading-relaxed">
      After every booking your AI completes, automatically text the customer asking for a Google review. The AI asks for consent on the call first - only customers who say yes get the text. 90-day cap per customer, sends only between 9am-7pm local, STOP-to-opt-out is automatic.
     </p>
    </div>
    <Toggle checked={enabled} onChange={toggleEnabled} />
   </div>

   <div className={`space-y-5 mt-5 ${dim ? 'opacity-50 pointer-events-none' : ''}`}>
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Your review link</label>
     <input
      type="url"
      value={reviewUrl}
      onChange={(e) => setReviewUrl(e.target.value)}
      placeholder="https://g.page/r/your-business/review"
      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors font-mono"
     />
     <p className="text-[11px] text-gray-500 mt-1">
      Any review page works - <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Google</a>, Yelp, Facebook, BBB, your own site. Most contractors use the Google one (Google Business Profile → Customers → Reviews → &quot;Get more reviews&quot;).
     </p>
    </div>

    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">When to send</label>
     <div className="flex flex-wrap gap-2">
      {[
       { value: '1h_after',           label: '1 hour after the booking' },
       { value: 'evening_same_day',   label: 'Evening of (6pm)' },
       { value: 'next_morning',       label: 'Next morning (10am)' },
      ].map((opt) => (
       <button
        key={opt.value}
        type="button"
        onClick={() => setTiming(opt.value as any)}
        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
         timing === opt.value
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
        }`}
       >
        {opt.label}
       </button>
      ))}
     </div>
     <p className="text-[11px] text-gray-500 mt-1">All sends clamped to 9am-7pm local.</p>
    </div>

    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Message template</label>
     <textarea
      value={template}
      onChange={(e) => setTemplate(e.target.value)}
      rows={3}
      placeholder={defaultTemplate}
      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors font-mono resize-y"
     />
     <p className="text-[11px] text-gray-500 mt-1">
      Variables: <code className="text-gray-700 bg-gray-100 rounded px-1">{'{first_name}'}</code> <code className="text-gray-700 bg-gray-100 rounded px-1">{'{business_name}'}</code> <code className="text-gray-700 bg-gray-100 rounded px-1">{'{review_link}'}</code>. Leave blank for the default.
     </p>
    </div>

    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5">
     <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mb-1.5">Preview</div>
     <p className="text-sm text-gray-800 leading-relaxed">{renderPreview(template)}</p>
    </div>

    <div className="flex items-center gap-3 flex-wrap">
     <button
      onClick={save}
      disabled={saving}
      className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
     >
      {saving ? 'Saving…' : 'Save'}
     </button>
     <button
      onClick={() => setTemplate(defaultTemplate)}
      className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
     >
      Reset to default
     </button>
     {flash && (
      <span className={`text-xs ${flash.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
       {flash.text}
      </span>
     )}
    </div>

    {/* Two test flavors:
         - Send test: one-shot Telnyx send. Proves the template + URL + sender are correct.
         - Dry-run pipeline: inserts a real review_requests row, runs the same cron-send
           logic against it, and lands the SMS. Proves the FULL pipeline (schedule →
           cron → Telnyx) works end-to-end. Activity counts move so you see it. */}
    <div className="pt-5 mt-5 border-t border-gray-100">
     <div className="text-xs font-medium text-gray-700 mb-1">Test the flow</div>
     <p className="text-[11px] text-gray-500 mb-2">
      Type your phone number. <b>Send test</b> is a one-shot SMS to check the template. <b>Run full pipeline</b> creates a real queued review-request and fires the same code the cron runs, so you can verify the whole path works (and the count under Activity moves).
     </p>
     <div className="flex flex-col sm:flex-row gap-2">
      <input
       type="tel"
       value={testPhone}
       onChange={(e) => setTestPhone(e.target.value)}
       placeholder="+1 (555) 555-5555"
       className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors font-mono"
      />
      <button
       onClick={sendTest}
       disabled={testing || !testPhone.trim() || !reviewUrl.trim()}
       className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
       title={!reviewUrl.trim() ? 'Add a review link above first' : ''}
      >
       {testing ? 'Working…' : 'Send test'}
      </button>
      <button
       onClick={dryRun}
       disabled={testing || !testPhone.trim() || !reviewUrl.trim() || !enabled}
       className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
       title={!enabled ? 'Turn the toggle on first' : !reviewUrl.trim() ? 'Add a review link above first' : 'Inserts a real queued row + runs the cron-send logic on it'}
      >
       {testing ? 'Working…' : 'Run full pipeline'}
      </button>
     </div>
     <div className="flex flex-col sm:flex-row gap-2 mt-2">
      <button
       onClick={() => testOptOut(false)}
       disabled={testing || !testPhone.trim()}
       className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
       title="Simulates the customer texting STOP. Adds the phone to your opt-out list and cancels any pending sends."
      >
       Simulate STOP
      </button>
      <button
       onClick={() => testOptOut(true)}
       disabled={testing || !testPhone.trim()}
       className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
       title="Removes this phone from the opt-out list so it can receive review SMS again."
      >
       Clear opt-out
      </button>
     </div>
     {testResult && (
      <p className={`text-xs mt-2 leading-relaxed ${testResult.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
       {testResult.text}
      </p>
     )}
    </div>

    {/* Read-only stats so the contractor can see the system is alive. */}
    {stats && (
     <div className="pt-5 mt-5 border-t border-gray-100">
      <div className="text-xs font-medium text-gray-700 mb-2">Activity</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
       <Stat label="Queued" value={stats.queued} />
       <Stat label="Sent (30d)" value={stats.sent_last_30d} />
       <Stat label="Failed (30d)" value={stats.failed_last_30d} tone={stats.failed_last_30d > 0 ? 'rose' : 'gray'} />
       <Stat label="Opted out" value={stats.opted_out_count} hint="across all of CloudGreet" />
      </div>
      {stats.last_sent_at && (
       <p className="text-[11px] text-gray-500 mt-2">
        Last review SMS sent {new Date(stats.last_sent_at).toLocaleString()}
       </p>
      )}
     </div>
    )}
   </div>
  </div>
 )
}

/** Small iOS-style toggle. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
 // Inline px so flex parents can't squash the pill into a circle, and
 // so a missing Tailwind class in the production bundle can't strip
 // the width. The visual is identical to the previous Tailwind version.
 return (
  <button
   type="button"
   role="switch"
   aria-checked={checked}
   onClick={() => onChange(!checked)}
   style={{
    width: 44,
    height: 24,
    borderRadius: 9999,
    backgroundColor: checked ? '#10b981' : '#d1d5db',
    position: 'relative',
    flexShrink: 0,
    transition: 'background-color 200ms ease',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
   }}
   className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
  >
   <span
    aria-hidden="true"
    style={{
     position: 'absolute',
     top: 2,
     left: checked ? 22 : 2,
     width: 20,
     height: 20,
     borderRadius: 9999,
     backgroundColor: '#ffffff',
     boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
     transition: 'left 200ms ease',
    }}
   />
  </button>
 )
}

function Stat({ label, value, tone = 'gray', hint }: {
 label: string; value: number; tone?: 'gray' | 'rose' | 'emerald'; hint?: string
}) {
 const color = tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-gray-900'
 return (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
   <div className={`text-2xl font-medium font-mono tabular-nums ${color}`}>{value}</div>
   <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mt-0.5">{label}</div>
   {hint && <div className="text-[9px] text-gray-400 mt-0.5">{hint}</div>}
  </div>
 )
}

function CalendarConnectionSection() {
 const [loading, setLoading] = useState(true)
 const [info, setInfo] = useState<{
  connected: boolean
  username: string | null
  eventTypeTitle: string | null
  webhookConfigured: boolean
 } | null>(null)
 const [resyncing, setResyncing] = useState(false)
 const [disconnecting, setDisconnecting] = useState(false)
 const [showConnectForm, setShowConnectForm] = useState(false)
 const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const load = async () => {
  setLoading(true)
  try {
   const r = await fetchWithAuth('/api/dashboard/calcom/status')
   const j = await r.json().catch(() => ({}))
   if (r.ok && j?.success) {
    setInfo({
     connected: !!j.connected,
     username: j.username || null,
     eventTypeTitle: j.event_type_title || null,
     webhookConfigured: !!j.webhook_configured,
    })
   } else {
    setInfo({ connected: false, username: null, eventTypeTitle: null, webhookConfigured: false })
   }
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const reregister = async () => {
  setResyncing(true); setFlash(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/calcom/reregister-webhook', { method: 'POST' })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Re-sync failed' })
   } else {
    const synced =
     j.sync && (j.sync.inserted || j.sync.updated)
      ? `Pulled ${j.sync.inserted || 0} new and updated ${j.sync.updated || 0}.`
      : 'Calendar already up to date.'
    setFlash({ tone: 'ok', text: `Webhook reconnected. ${synced}` })
    await load()
   }
  } catch (e) {
   setFlash({ tone: 'err', text: e instanceof Error ? e.message : 'Re-sync failed' })
  } finally {
   setResyncing(false)
   setTimeout(() => setFlash(null), 5000)
  }
 }

 const disconnect = async () => {
  if (!window.confirm('Disconnect Cal.com? Future bookings the AI takes will save locally but won\'t sync to your calendar until you reconnect.')) return
  setDisconnecting(true); setFlash(null)
  try {
   const r = await fetchWithAuth('/api/onboarding/calcom', { method: 'DELETE' })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Disconnect failed' })
   } else {
    setFlash({ tone: 'ok', text: 'Cal.com disconnected.' })
    await load()
   }
  } catch (e) {
   setFlash({ tone: 'err', text: e instanceof Error ? e.message : 'Disconnect failed' })
  } finally {
   setDisconnecting(false)
   setTimeout(() => setFlash(null), 5000)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex items-center gap-2 mb-1">
    <CalendarBlank className="w-4 h-4 text-sky-500" />
    <h2 className="text-base font-medium text-gray-900">Cal.com calendar</h2>
   </div>
   <p className="text-sm text-gray-500 mb-4">
    Bookings made by your AI receptionist land on the calendar you have connected inside Cal.com. If your dashboard ever
    looks out of step with what&apos;s actually in Cal.com, re-sync to reconnect the live feed.
   </p>

   {loading ? (
    <div className="flex items-center gap-2 text-sm text-gray-500">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading
    </div>
   ) : !info?.connected ? (
    showConnectForm ? (
     <CalcomConnectForm
      onDone={async () => { setShowConnectForm(false); await load(); setFlash({ tone: 'ok', text: 'Cal.com connected. Bookings will sync immediately.' }); setTimeout(() => setFlash(null), 5000) }}
      onCancel={() => setShowConnectForm(false)}
     />
    ) : (
     <div className="space-y-3">
      <div className="text-sm text-gray-600">
       Cal.com isn&apos;t connected yet. Until you connect it, the AI will still answer calls and save appointments locally, but they won&apos;t land on your real calendar.
      </div>
      <button
       type="button"
       onClick={() => { setShowConnectForm(true); setFlash(null) }}
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
      >
       <Plug className="w-4 h-4" /> Connect Cal.com
      </button>
     </div>
    )
   ) : showConnectForm ? (
    <CalcomConnectForm
     onDone={async () => { setShowConnectForm(false); await load(); setFlash({ tone: 'ok', text: 'Cal.com updated.' }); setTimeout(() => setFlash(null), 5000) }}
     onCancel={() => setShowConnectForm(false)}
    />
   ) : (
    <div className="space-y-4">
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <CurrentLine label="Cal.com user" value={info.username || '-'} />
      <CurrentLine label="Event type" value={info.eventTypeTitle || '-'} />
      <CurrentLine label="Live webhook" value={info.webhookConfigured ? 'Connected' : 'Missing'} />
     </div>
     <div className="flex flex-wrap items-center gap-3">
      <button
       type="button"
       onClick={reregister}
       disabled={resyncing}
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
       {resyncing ? <CircleNotch className="w-4 h-4 animate-spin" /> : <ArrowsClockwise className="w-4 h-4" />}
       {resyncing ? 'Re-syncing...' : 'Re-sync calendar'}
      </button>
      <button
       type="button"
       onClick={() => { setShowConnectForm(true); setFlash(null) }}
       className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-800 px-4 py-2 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
      >
       <Key className="w-4 h-4" /> Change key or event type
      </button>
      <button
       type="button"
       onClick={disconnect}
       disabled={disconnecting}
       className="inline-flex items-center gap-2 text-rose-700 hover:text-rose-900 text-sm font-medium disabled:opacity-50"
      >
       {disconnecting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
       Disconnect
      </button>
      {flash && (
       <span className={`text-sm ${flash.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
        {flash.text}
       </span>
      )}
     </div>
     <EventTypeEditor onSaved={load} />
    </div>
   )}

   {!loading && !info?.connected && flash && (
    <div className={`text-sm mt-3 ${flash.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{flash.text}</div>
   )}
  </div>
 )
}

/**
 * Inline editor for the currently connected Cal.com event type. Lets
 * the contractor (or rep during onboarding) rename the event and pick
 * a meeting location (Google Meet / Zoom / phone / in-person) without
 * leaving CloudGreet and hunting through Cal.com's settings.
 */
function EventTypeEditor({ onSaved }: { onSaved: () => void }) {
 const [open, setOpen] = useState(false)
 const [title, setTitle] = useState('')
 // Default to "in person, their address" - that's the right answer for
 // 95% of contractors (HVAC, roofing, plumbing). Other options live
 // behind a "show other formats" toggle so the demo flow is one tap.
 const [preset, setPreset] = useState<'google_meet' | 'zoom' | 'cal_video' | 'attendee_phone' | 'attendee_address'>('attendee_address')
 const [showOthers, setShowOthers] = useState(false)
 const [address, setAddress] = useState('')
 const [link, setLink] = useState('')
 const [saving, setSaving] = useState(false)
 const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const save = async () => {
  setSaving(true); setMsg(null)
  try {
   const body: any = { locationPreset: preset }
   if (title.trim()) body.title = title.trim()
   if (preset === 'attendee_address' && address.trim()) body.locationAddress = address.trim()
   if ((preset === 'google_meet' || preset === 'zoom') && link.trim()) body.locationLink = link.trim()
   const r = await fetchWithAuth('/api/dashboard/calcom/event-type', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j.success) {
    setMsg({ tone: 'err', text: j?.error || `Failed (${r.status})` })
   } else {
    setMsg({ tone: 'ok', text: 'Event type updated.' })
    onSaved()
    setTimeout(() => { setMsg(null); setOpen(false) }, 1500)
   }
  } catch (e) {
   setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Failed' })
  } finally {
   setSaving(false)
  }
 }

 if (!open) {
  return (
   <button
    type="button"
    onClick={() => setOpen(true)}
    className="text-xs text-sky-700 hover:text-sky-900 font-medium"
   >
    Edit event name &amp; location →
   </button>
  )
 }

 return (
  <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/40">
   <div className="text-xs font-medium text-gray-700">Edit event type</div>

   <div>
    <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">New name (optional)</label>
    <input
     value={title}
     onChange={(e) => setTitle(e.target.value)}
     placeholder="e.g. AC Service Call"
     className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
    />
   </div>

   <div>
    <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Meeting location</label>
    {/* Primary option, always shown big. Defaults selected. */}
    <button
     type="button"
     onClick={() => setPreset('attendee_address')}
     className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-colors ${
      preset === 'attendee_address'
       ? 'border-gray-900 bg-gray-900 text-white'
       : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
     }`}
    >
     <div className="font-semibold">In person — customer&apos;s address</div>
     <div className={`text-xs mt-0.5 ${preset === 'attendee_address' ? 'text-white/70' : 'text-gray-500'}`}>
      Best for HVAC, roofing, plumbing, electrical. The AI collects the address at booking.
     </div>
    </button>

    {/* Secondary options collapsed behind a toggle. */}
    {!showOthers ? (
     <button
      type="button"
      onClick={() => setShowOthers(true)}
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
        onClick={() => setPreset(opt.value)}
        className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
         preset === opt.value
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

   {preset === 'attendee_address' && (
    <div>
     <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Fixed address (optional)</label>
     <input
      value={address}
      onChange={(e) => setAddress(e.target.value)}
      placeholder="Leave blank to ask the customer at booking"
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
     />
    </div>
   )}

   {(preset === 'google_meet' || preset === 'zoom') && (
    <div>
     <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
      {preset === 'google_meet' ? 'Google Meet link' : 'Zoom link'}
     </label>
     <input
      type="url"
      value={link}
      onChange={(e) => setLink(e.target.value)}
      placeholder={preset === 'google_meet' ? 'https://meet.google.com/abc-defg-hij' : 'https://zoom.us/j/0123456789'}
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-900"
     />
    </div>
   )}

   <div className="flex items-center gap-3 pt-1">
    <button
     type="button"
     onClick={save}
     disabled={saving}
     className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
     {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : null}
     {saving ? 'Saving...' : 'Save'}
    </button>
    <button
     type="button"
     onClick={() => { setOpen(false); setMsg(null) }}
     className="text-sm text-gray-500 hover:text-gray-900"
    >
     Cancel
    </button>
    {msg && (
     <span className={`text-sm ${msg.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</span>
    )}
   </div>
  </div>
 )
}

function CalcomConnectForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
 type EventTypeOption = { id: number; title: string; slug: string; lengthInMinutes: number }
 const [apiKey, setApiKey] = useState('')
 const [eventTypeId, setEventTypeId] = useState<number | null>(null)
 const [eventTypeOptions, setEventTypeOptions] = useState<EventTypeOption[] | null>(null)
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

 const fetchEventTypes = async (e?: React.FormEvent) => {
  if (e) e.preventDefault()
  setSubmitting(true); setError(''); setFieldErrors({})
  try {
   const res = await fetchWithAuth('/api/onboarding/calcom', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
   })
   const json = await res.json().catch(() => ({}))
   if (json.needsEventType && Array.isArray(json.eventTypes)) {
    setEventTypeOptions(json.eventTypes)
    if (json.errors) setFieldErrors(json.errors)
    if (json.eventTypes.length === 0) {
     setError('No event types found on this account. Create one in Cal.com first.')
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
   onDone()
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
 }

 return (
  <form onSubmit={eventTypeOptions ? submit : fetchEventTypes} className="space-y-4 pt-2">
   <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
    Grab a key from{' '}
    <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noreferrer" className="text-sky-700 hover:underline inline-flex items-center gap-0.5">
     Cal.com → Settings → API Keys <ArrowSquareOut className="w-3 h-3" />
    </a>
    . It starts with <code className="font-mono bg-white border border-gray-200 px-1 rounded">cal_live_</code>.
   </div>

   <div>
    <label className="block text-xs font-medium text-gray-700 mb-1.5">Cal.com API key</label>
    <input
     type="password" required value={apiKey}
     onChange={(e) => { setApiKey(e.target.value); setEventTypeOptions(null); setEventTypeId(null) }}
     placeholder="cal_live_..."
     className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500"
    />
    {fieldErrors.apiKey && <p className="mt-1 text-xs text-rose-700">{fieldErrors.apiKey}</p>}
   </div>

   {eventTypeOptions && eventTypeOptions.length > 0 && (
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Event type</label>
     <select
      required value={eventTypeId ?? ''}
      onChange={(e) => setEventTypeId(parseInt(e.target.value, 10))}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-500"
     >
      <option value="" disabled>Pick one…</option>
      {eventTypeOptions.map((et) => (
       <option key={et.id} value={et.id}>{et.title} ({et.lengthInMinutes} min)</option>
      ))}
     </select>
     {fieldErrors.eventTypeId && <p className="mt-1 text-xs text-rose-700">{fieldErrors.eventTypeId}</p>}
    </div>
   )}

   {error && (
    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">{error}</div>
   )}

   <div className="flex items-center gap-3">
    <button
     type="submit" disabled={submitting || !apiKey.trim()}
     className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
     {submitting && <CircleNotch className="w-4 h-4 animate-spin" />}
     {eventTypeOptions ? 'Save connection' : 'Continue'}
    </button>
    <button
     type="button" onClick={onCancel}
     className="text-sm text-gray-500 hover:text-gray-900"
    >
     Cancel
    </button>
   </div>
  </form>
 )
}

/* ------------------------- Call forwarding ------------------------ */

/**
 * Always-visible reference for the contractor's call forwarding setup.
 * Shows the destination Retell number, current carrier/mode, the exact
 * dial code to activate forwarding, and the cancel code so they can
 * turn it off later (or switch carriers without calling support).
 *
 * Initial setup happens in the onboarding wizard - this section is the
 * persistent home for those instructions afterwards.
 */

/* ----------------- EMERGENCY EVENT TYPE ----------------- */
/**
 * Lets the contractor designate one of their Cal.com event types as
 * the emergency dispatch type. When set, bookings the AI flags with
 * is_emergency=true land on this event type instead of the primary -
 * so emergencies can have their own colour / availability / reminders
 * in Cal.com. When unset, emergencies fall through to the primary.
 */
function EmergencyEventTypeSection() {
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [primaryId, setPrimaryId] = useState<number | null>(null)
 const [emergencyId, setEmergencyId] = useState<number | null>(null)
 const [eventTypes, setEventTypes] = useState<Array<{ id: number; title: string; slug: string; lengthInMinutes: number | null }>>([])
 const [error, setError] = useState<string | null>(null)
 const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const load = async () => {
  setLoading(true); setError(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/calcom/event-type')
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setError(j?.error || 'Could not load event types')
    return
   }
   setPrimaryId(j.primary_event_type_id)
   setEmergencyId(j.emergency_event_type_id)
   setEventTypes(j.event_types || [])
  } finally {
   setLoading(false)
  }
 }
 useEffect(() => { load() }, [])

 const save = async (newId: number | null) => {
  setSaving(true); setFlash(null)
  try {
   const r = await fetchWithAuth('/api/dashboard/calcom/event-type', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergency_event_type_id: newId }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Save failed' })
   } else {
    setEmergencyId(newId)
    setFlash({ tone: 'ok', text: newId ? 'Emergency event type saved' : 'Emergency event type cleared' })
   }
  } finally {
   setSaving(false)
   setTimeout(() => setFlash(null), 4000)
  }
 }

 if (loading) {
  return (
   <div className="bg-white border border-gray-200 rounded-2xl p-6">
    <div className="flex items-center gap-2 text-gray-500 text-sm">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading event types…
    </div>
   </div>
  )
 }
 if (error) {
  return (
   <div className="bg-white border border-gray-200 rounded-2xl p-6">
    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
     {error}
    </div>
    <p className="text-xs text-gray-500 mt-3">Connect Cal.com first under the Cal.com calendar section above.</p>
   </div>
  )
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <div className="mb-4">
    <h2 className="text-lg font-medium text-gray-900">Emergency event type</h2>
    <p className="text-sm text-gray-500 mt-1">
     Pick which Cal.com event type emergency bookings land on. The AI flags a call as urgent (gas leak, no AC with kids, flooding, sparks, etc.) and the booking goes to this event type so you can give it its own colour, availability rules, and reminders in Cal.com.
    </p>
    <p className="text-[11px] text-gray-400 mt-1">
     Leave blank to send emergencies to your primary event type.
    </p>
   </div>

   <div className="space-y-2">
    <button
     type="button"
     onClick={() => save(null)}
     disabled={saving || emergencyId === null}
     className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
      emergencyId === null
       ? 'border-rose-300 bg-rose-50/60 text-rose-900'
       : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
     } disabled:opacity-60`}
    >
     <div className="flex items-center justify-between gap-3">
      <div>
       <div className="font-medium">None — use primary for emergencies</div>
       <div className="text-[11px] text-gray-500 mt-0.5">Emergencies fall through to your primary event type.</div>
      </div>
      {emergencyId === null && <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600">selected</span>}
     </div>
    </button>

    {eventTypes.map((t) => {
     const isPrimary = t.id === primaryId
     const isEmergency = t.id === emergencyId
     return (
      <button
       key={t.id}
       type="button"
       onClick={() => save(t.id)}
       disabled={saving || isPrimary || isEmergency}
       className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
        isEmergency
         ? 'border-rose-400 bg-rose-50 text-rose-900'
         : isPrimary
          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
       } disabled:opacity-${isPrimary ? '100' : '60'}`}
       title={isPrimary ? 'Already your primary event type - pick a different one for emergencies.' : undefined}
      >
       <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
         <div className="font-medium truncate">{t.title}</div>
         <div className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
          {t.slug}{t.lengthInMinutes ? ` · ${t.lengthInMinutes} min` : ''}
         </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
         {isPrimary && <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">primary</span>}
         {isEmergency && <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600">🚨 emergency</span>}
        </div>
       </div>
      </button>
     )
    })}
   </div>

   {flash && (
    <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${
     flash.tone === 'ok'
      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
      : 'bg-rose-50 border border-rose-200 text-rose-800'
    }`}>
     {flash.text}
    </div>
   )}

   <p className="text-[11px] text-gray-400 mt-4">
    Don&apos;t see the event type you want? Create it in Cal.com first (suggestions: shorter buffer time, more aggressive reminders, distinct colour), then refresh this page.
   </p>
  </div>
 )
}

function ForwardingSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
 const [retellNumber, setRetellNumber] = useState<string | null>(null)
 const [editing, setEditing] = useState(false)
 const [lineType, setLineType] = useState<LineType | null>(
  (profile.forwardingLineType as LineType | null) || null,
 )
 const [carrier, setCarrier] = useState<CarrierId | null>(
  (profile.forwardingCarrier as CarrierId | null) || null,
 )
 const [mode, setMode] = useState<ForwardingMode>(
  (profile.forwardingMode as ForwardingMode | null) || 'missed_only',
 )
 const [saving, setSaving] = useState(false)

 useEffect(() => {
  fetchWithAuth('/api/dashboard/phone')
   .then((r) => r.json().catch(() => ({})))
   .then((j) => setRetellNumber(typeof j?.phone === 'string' ? j.phone : null))
   .catch(() => {})
 }, [])

 useEffect(() => {
  setLineType((profile.forwardingLineType as LineType | null) || null)
  setCarrier((profile.forwardingCarrier as CarrierId | null) || null)
  setMode((profile.forwardingMode as ForwardingMode | null) || 'missed_only')
 }, [profile.forwardingCarrier, profile.forwardingLineType, profile.forwardingMode])

 const carrierGuide = findCarrier(carrier || undefined)
 const instructions = carrierGuide && retellNumber ? carrierGuide.instructions(retellNumber, mode) : []
 const carriers = lineType ? carriersForLineType(lineType) : []

 const persist = async () => {
  if (!lineType || !carrier) return
  setSaving(true)
  try {
   await fetchWithAuth('/api/onboarding/forwarding', {
    method: 'POST',
    body: JSON.stringify({ lineType, carrier, mode }),
   })
   setEditing(false)
   onSaved()
  } finally {
   setSaving(false)
  }
 }

 // Quick toggle from the main view - flips mode and saves without
 // making the user re-pick line type + carrier.
 const setModeAndSave = async (next: ForwardingMode) => {
  if (next === mode || !lineType || !carrier) { setMode(next); return }
  setMode(next)
  setSaving(true)
  try {
   await fetchWithAuth('/api/onboarding/forwarding', {
    method: 'POST',
    body: JSON.stringify({ lineType, carrier, mode: next }),
   })
   onSaved()
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
   <div className="flex items-start justify-between gap-3">
    <div>
     <h2 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
      <Phone className="w-4 h-4 text-sky-500" /> Call forwarding
     </h2>
     <p className="text-xs text-gray-500 mt-1">
      Dial these codes to forward your business line to the AI. Use the cancel code to stop forwarding.
     </p>
    </div>
    {!editing && carrier && (
     <button
      onClick={() => setEditing(true)}
      className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
     >
      Change carrier
     </button>
    )}
   </div>

   {retellNumber ? (
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
   ) : (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900">
     No Retell number provisioned yet. Codes will appear once your number is live.
    </div>
   )}

   {!editing && carrierGuide && retellNumber && (
    <div className="space-y-3">
     <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-gray-500">
       {carrierGuide.name}
      </div>
      <div className="inline-flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
       <button
        onClick={() => setModeAndSave('missed_only')}
        disabled={saving}
        className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
         mode === 'missed_only'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-900'
        }`}
       >
        Forward when missed
       </button>
       <button
        onClick={() => setModeAndSave('always')}
        disabled={saving}
        className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
         mode === 'always'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-900'
        }`}
       >
        Always forward
       </button>
      </div>
     </div>
     {carrierGuide.manualNote ? (
      <div className="text-sm text-gray-700">
       {carrierGuide.manualNote}
       {carrierGuide.portalUrl && (
        <a
         href={carrierGuide.portalUrl} target="_blank" rel="noreferrer"
         className="ml-2 inline-flex items-center gap-1 text-sky-600 hover:underline"
        >
         Open portal <ArrowSquareOut className="w-3 h-3" />
        </a>
       )}
      </div>
     ) : (
      <>
       {instructions.map((ins, i) => (
        <div key={i} className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
         <div className="text-[10px] uppercase tracking-wider text-sky-700 font-semibold mb-0.5">
          {ins.label}
         </div>
         <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-lg text-gray-900">{ins.dialString}</span>
          <a
           href={`tel:${encodeURIComponent(ins.dialString)}`}
           className="text-xs font-medium text-sky-700 hover:underline"
          >
           Tap to dial
          </a>
         </div>
        </div>
       ))}
       {instructions[0] && (
        <p className="text-xs text-gray-500">
         To cancel: dial{' '}
         <code className="font-mono bg-gray-100 px-1.5 rounded">
          {instructions[0].cancelString}
         </code>
         {instructions.length > 1 && instructions[1].cancelString !== instructions[0].cancelString && (
          <> and <code className="font-mono bg-gray-100 px-1.5 rounded">{instructions[1].cancelString}</code></>
         )}.
        </p>
       )}
      </>
     )}
    </div>
   )}

   {!editing && !carrierGuide && (
    <div className="text-xs text-gray-500">
     No carrier saved yet.{' '}
     <button onClick={() => setEditing(true)} className="text-sky-600 hover:underline">
      Pick a carrier
     </button>
    </div>
   )}

   {editing && (
    <div className="space-y-4 pt-2 border-t border-gray-100">
     <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">Where does your number live?</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
       {LINE_TYPES.map((lt) => (
        <button
         key={lt.id}
         onClick={() => { setLineType(lt.id); setCarrier(null) }}
         className={`text-left p-3 rounded-xl border transition-colors ${
          lineType === lt.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
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
       <label className="block text-xs font-medium text-gray-700 mb-1.5">Provider</label>
       <select
        value={carrier || ''}
        onChange={(e) => setCarrier((e.target.value || null) as CarrierId | null)}
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
       >
        <option value="" disabled>Choose a provider…</option>
        {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
       </select>
      </div>
     )}
     {lineType && carrier && (
      <div>
       <label className="block text-xs font-medium text-gray-700 mb-1.5">When the AI takes over</label>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
         onClick={() => setMode('missed_only')}
         className={`text-left p-3 rounded-xl border transition-colors ${
          mode === 'missed_only' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
         }`}
        >
         <div className="text-sm font-medium text-gray-900">Only when I miss it</div>
         <div className="text-xs text-gray-500 mt-0.5">Your phone rings first.</div>
        </button>
        <button
         onClick={() => setMode('always')}
         className={`text-left p-3 rounded-xl border transition-colors ${
          mode === 'always' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
         }`}
        >
         <div className="text-sm font-medium text-gray-900">Always send to AI</div>
         <div className="text-xs text-gray-500 mt-0.5">Every call hits the AI.</div>
        </button>
       </div>
      </div>
     )}
     <div className="flex items-center gap-2 pt-1">
      <button
       onClick={persist}
       disabled={!lineType || !carrier || saving}
       className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
       {saving && <CircleNotch className="w-4 h-4 animate-spin" />}
       Save
      </button>
      <button
       onClick={() => setEditing(false)}
       className="text-sm text-gray-500 hover:text-gray-900"
      >
       Cancel
      </button>
     </div>
    </div>
   )}
  </div>
 )
}
