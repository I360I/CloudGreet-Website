'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, FloppyDisk, WarningCircle, CheckCircle, Key, Eye, EyeSlash, Play, Robot, Gauge, CalendarBlank, ArrowsClockwise } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'

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
      <div className="space-y-3">
       <LiveAgentBanner state={agentState} />
       <NameSection profile={profile} onSaved={reload} />
       <OwnerNameSection />
       <GreetingSection profile={profile} state={agentState} onSaved={reload} />
       <VoiceSection profile={profile} state={agentState} onSaved={reload} />
       <SpeedSection profile={profile} state={agentState} onSaved={reload} />
       <BookingNotificationsSection />
       <CalendarConnectionSection />
       <ReviewRequestsSection />
       <PasswordSection />
       <ProfileSection profile={profile} onSaved={reload} />
      </div>
     )}
    </div>
   </section>
  </DashShell>
 )
}

/* ----------------------------- shared ----------------------------- */

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
 const [trace, setTrace] = useState<string[] | null>(null)

 // Re-sync when profile or live state changes (e.g. after a reload).
 useEffect(() => { setValue(state?.beginMessage ?? profile.greetingMessage ?? '') },
  [profile.greetingMessage, state?.beginMessage])

 const dirty = value !== initialGreeting && value.trim().length > 0

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false); setTrace(null)
  try {
   const r = await patchBusiness({ greeting_message: value, greeting: value })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   if (r.agentSyncError) {
    setError(`Saved, but the agent didn't sync: ${r.agentSyncError}`)
    setTrace(Array.isArray(r.retellTrace) ? r.retellTrace : null)
   } else if (Array.isArray(r.retellTrace)) {
    setTrace(r.retellTrace)
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
   {trace && trace.length > 0 && (
    <details className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
     <summary className="cursor-pointer text-gray-700 font-medium">Sync trace ({trace.length} steps)</summary>
     <ul className="mt-2 space-y-1 font-mono text-gray-600">
      {trace.map((line, i) => <li key={i}>· {line}</li>)}
     </ul>
    </details>
   )}
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

 const togglePreview = (e: React.MouseEvent) => {
  e.stopPropagation()
  if (!audio || !voice.preview_audio_url) return
  if (playing) {
   audio.pause(); audio.currentTime = 0; setPlaying(false); return
  }
  audio.src = voice.preview_audio_url
  audio.onended = () => setPlaying(false)
  audio.onerror = () => setPlaying(false)
  audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
 }

 useEffect(() => () => { if (audio) { audio.pause(); audio.src = '' } }, [audio])

 return (
  <div
   onClick={onSelect}
   className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out cursor-pointer flex items-center gap-3 ${
    selected
     ? 'border-gray-900 bg-gray-50'
     : 'border-gray-200 hover:border-gray-400 bg-white'
   }`}
  >
   {voice.preview_audio_url ? (
    <button
     type="button" onClick={togglePreview}
     className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
      playing ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
     }`}
     aria-label={playing ? 'Stop preview' : 'Play preview'}
    >
     <Play className="w-3.5 h-3.5" fill={playing ? 'currentColor' : 'none'} />
    </button>
   ) : (
    <div className="w-8 h-8 rounded-full bg-gray-50 flex-shrink-0" />
   )}
   <div className="flex-1 min-w-0">
    <div className="text-sm font-medium text-gray-900 truncate">{voice.voice_name}</div>
    <div className="text-[10px] text-gray-500 mt-0.5 font-mono uppercase tracking-wider truncate">
     {[voice.gender, voice.accent, voice.provider].filter(Boolean).join(' · ') || 'voice'}
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
    const res = await fetchWithAuth('/api/me/profile')
    const j = await res.json().catch(() => ({}))
    if (!cancelled && j?.success) {
     const p = j.profile || {}
     const nameParts = (p.name || '').split(/\s+/).filter(Boolean)
     const f = p.first_name || nameParts[0] || ''
     const l = p.last_name || nameParts.slice(1).join(' ') || ''
     setFirst(f); setLast(l); setPhone(p.phone || '')
     setInitial({ first: f, last: l, phone: p.phone || '' })
    }
   } catch { /* non-fatal */ }
   finally { if (!cancelled) setLoading(false) }
  })()
  return () => { cancelled = true }
 }, [])

 const dirty = first !== initial.first || last !== initial.last || phone !== initial.phone

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const res = await fetchWithAuth('/api/me/profile', {
    method: 'PATCH',
    body: JSON.stringify({
     first_name: first.trim(),
     last_name: last.trim(),
     phone: phone.trim() || null,
    }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
   setInitial({ first: first.trim(), last: last.trim(), phone: phone.trim() })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-1">Your name</h2>
   <p className="text-xs text-gray-500 mb-4">
    Used in confirmations and shared with your AI receptionist so it can refer to you by name.
   </p>
   {loading ? (
    <div className="flex items-center gap-2 text-xs text-gray-400">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading…
    </div>
   ) : (
    <>
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
     <input
      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
      placeholder="Phone (for the AI to reach you on)"
      className="mt-3 w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900"
     />
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
 const [phone, setPhone] = useState('')
 const [template, setTemplate] = useState('')
 const [businessName, setBusinessName] = useState('')
 const [defaultTemplate, setDefaultTemplate] = useState('')
 const [maxLen, setMaxLen] = useState(320)
 const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 const VARS: { name: string; description: string; sample: string }[] = [
  { name: 'name',     description: "caller's name",         sample: 'John Smith' },
  { name: 'phone',    description: "caller's phone",        sample: '+1 (555) 123-4567' },
  { name: 'time',     description: 'appointment date/time', sample: 'Tue Jul 8, 2:00 PM' },
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
    setDefaultTemplate(j.default_template || '')
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

 const sendTest = async () => {
  setTesting(true); setFlash(null)
  try {
   // Save first so the test uses the latest template + phone.
   await fetchWithAuth('/api/dashboard/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     notifications_phone: phone,
     booking_sms_template: template,
    }),
   })
   const r = await fetchWithAuth('/api/dashboard/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setFlash({ tone: 'err', text: j?.error || 'Test send failed' })
   } else {
    setFlash({ tone: 'ok', text: `Test sent to ${j.sent_to}` })
   }
  } finally {
   setTesting(false)
   setTimeout(() => setFlash(null), 5000)
  }
 }

 const reset = () => setTemplate(defaultTemplate)

 const preview = renderPreview(template || defaultTemplate, businessName)

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
       onClick={sendTest}
       disabled={testing || !phone.trim()}
       className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg px-4 py-2 disabled:opacity-60"
       title={!phone.trim() ? 'Save a phone number first' : 'Fire a real test SMS to your phone'}
      >
       {testing ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
       Send test
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
   setTimeout(() => setTestResult(null), 8000)
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
      After every appointment your AI books, automatically text the customer asking for a Google review. The AI asks for consent on the call first - only customers who say yes get the text. 90-day cap per customer, sends only between 9am-7pm local, STOP-to-opt-out is automatic.
     </p>
    </div>
    <Toggle checked={enabled} onChange={setEnabled} />
   </div>

   <div className={`space-y-5 mt-5 ${dim ? 'opacity-50 pointer-events-none' : ''}`}>
    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Google review link</label>
     <input
      type="url"
      value={reviewUrl}
      onChange={(e) => setReviewUrl(e.target.value)}
      placeholder="https://g.page/r/your-business/review"
      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors font-mono"
     />
     <p className="text-[11px] text-gray-500 mt-1">
      Get this from <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Google Business Profile</a> → Customers → Reviews → &quot;Get more reviews&quot;.
     </p>
    </div>

    <div>
     <label className="block text-xs font-medium text-gray-700 mb-1.5">When to send</label>
     <div className="flex flex-wrap gap-2">
      {[
       { value: '1h_after',           label: '1 hour after appointment' },
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

    {/* Send a test SMS to a number you own. Bypasses the queue/cap so you
        can verify the wiring works without booking a real appointment. */}
    <div className="pt-5 mt-5 border-t border-gray-100">
     <div className="text-xs font-medium text-gray-700 mb-1">Send test SMS</div>
     <p className="text-[11px] text-gray-500 mb-2">
      Type your phone number and we&apos;ll send the actual review SMS using your settings above. Use this to verify your link, your template, and that messages reach the customer.
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
       className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
       title={!reviewUrl.trim() ? 'Add a Google review link above first' : ''}
      >
       {testing ? 'Sending…' : 'Send test'}
      </button>
     </div>
     {testResult && (
      <p className={`text-xs mt-2 ${testResult.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
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
 return (
  <button
   type="button"
   role="switch"
   aria-checked={checked}
   onClick={() => onChange(!checked)}
   className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
    checked ? 'bg-emerald-500' : 'bg-gray-300'
   }`}
  >
   <span
    aria-hidden="true"
    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
     checked ? 'translate-x-5' : 'translate-x-0'
    }`}
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
    <div className="text-sm text-gray-600">
     Cal.com isn&apos;t connected yet. Finish onboarding to link an event type.
    </div>
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
      {flash && (
       <span className={`text-sm ${flash.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
        {flash.text}
       </span>
      )}
     </div>
    </div>
   )}
  </div>
 )
}
