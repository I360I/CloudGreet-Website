'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2, KeyRound, Eye, EyeOff, Play, Bot, Gauge } from 'lucide-react'
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
  // Optional small delay so Retell's read-after-write is consistent —
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
       <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
     )}

     {!loading && error && !profile && (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
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
 // Server scopes by JWT — no need to send businessId from the client.
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
   <CheckCircle2 className="w-3.5 h-3.5" /> Saved. AI agent updated automatically.
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
   {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
     <p className="text-sm font-medium text-amber-900">No live AI agent linked yet</p>
     <p className="text-xs text-amber-800 mt-0.5">
      {state.reason || 'Saved settings won\'t reach Retell until an admin links your agent.'}
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
       ? 'Agent linked, but no Retell phone number routes to it yet'
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
   <span className="text-gray-700">{value || '—'}</span>
  </div>
 )
}

function GreetingSection({ profile, state, onSaved }: { profile: Profile; state: AgentState | null; onSaved: (opts?: { delay?: number }) => void }) {
 // Initialize from the live Retell value when available — that's the
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
    setError(`Saved, but Retell didn't sync: ${r.agentSyncError}`)
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
     <summary className="cursor-pointer text-gray-700 font-medium">Retell trace ({trace.length} steps)</summary>
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
    <Bot className="w-4 h-4 text-sky-500" />
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
     <Loader2 className="w-4 h-4 animate-spin" /> Loading voices…
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
     label={profile.retellAgentId ? 'Save & push to Retell' : 'Save'}
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
    How fast the AI talks. 1.0 is Retell&apos;s default — drop it for older callers, raise it for impatient ones.
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
     label={profile.retellAgentId ? 'Save & push to Retell' : 'Save'}
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
     <Loader2 className="w-4 h-4 animate-spin" /> Loading…
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
    <KeyRound className="w-4 h-4 text-sky-500" />
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
     {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
     <div className="text-sm text-gray-700">{profile.email || '—'}</div>
    </div>
   </div>

   <div className="flex justify-end mt-5">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
   <p className="text-[11px] text-gray-400 mt-4">
    Email is locked here — contact support to change it (we verify the new address before switching).
   </p>
  </div>
 )
}
