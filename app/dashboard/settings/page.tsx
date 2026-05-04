'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2, X, Plus, KeyRound, Eye, EyeOff } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'

type Tone = 'professional' | 'friendly' | 'casual'

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
 aiTone: Tone
}

export default function SettingsPage() {
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [profile, setProfile] = useState<Profile | null>(null)

 const reload = async () => {
  try {
   const res = await fetchWithAuth('/api/business/profile')
   const json = await res.json()
   if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load profile')
   setProfile(json.data)
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
       <NameSection profile={profile} onSaved={reload} />
       <GreetingSection profile={profile} onSaved={reload} />
       <ToneSection profile={profile} onSaved={reload} />
       <ServicesSection profile={profile} onSaved={reload} />
       <PasswordSection />
       <ProfileReadOnly profile={profile} />
      </div>
     )}
    </div>
   </section>
  </DashShell>
 )
}

/* ----------------------------- shared ----------------------------- */

async function patchBusiness(updates: Record<string, any>) {
 const businessRaw = localStorage.getItem('business')
 const businessId = businessRaw ? JSON.parse(businessRaw).id : null
 if (!businessId) throw new Error('Missing business id — sign in again.')
 const res = await fetchWithAuth('/api/businesses/update', {
  method: 'PATCH',
  body: JSON.stringify({ businessId, ...updates }),
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

function NameSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
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

function GreetingSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
 const [value, setValue] = useState(profile.greetingMessage)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 const dirty = value !== profile.greetingMessage

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   await patchBusiness({ greeting_message: value, greeting: value })
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   onSaved()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 const placeholder = `Hi, thanks for calling ${profile.businessName}. This is the virtual receptionist. How can I help today?`

 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-1">AI greeting</h2>
   <p className="text-xs text-gray-500 mb-4">First thing your AI says when answering a call.</p>
   <textarea
    value={value} onChange={(e) => setValue(e.target.value)}
    placeholder={placeholder} rows={3}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors text-sm resize-none"
   />
   <div className="flex justify-end mt-3">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ------------------------------- Tone ----------------------------- */

const TONES: { id: Tone; label: string; sub: string }[] = [
 { id: 'professional', label: 'Professional', sub: 'Polished and concise.' },
 { id: 'friendly', label: 'Friendly', sub: 'Warm, conversational.' },
 { id: 'casual', label: 'Casual', sub: 'Loose and laid-back.' },
]

function ToneSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
 const [value, setValue] = useState<Tone>(profile.aiTone)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 const dirty = value !== profile.aiTone

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   await patchBusiness({ ai_tone: value, tone: value })
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
   <h2 className="text-sm font-medium text-gray-700 mb-1">AI tone</h2>
   <p className="text-xs text-gray-500 mb-4">How the AI sounds on a call.</p>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    {TONES.map((t) => (
     <button
      key={t.id} onClick={() => setValue(t.id)}
      className={`text-left p-3 rounded-xl border transition-all duration-300 ease-out ${
       value === t.id
        ? 'border-gray-900 bg-gray-50'
        : 'border-gray-200 hover:border-gray-400'
      }`}
     >
      <div className="text-sm font-medium text-gray-900">{t.label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{t.sub}</div>
     </button>
    ))}
   </div>
   <div className="flex justify-end mt-4">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ----------------------------- Services --------------------------- */

function ServicesSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
 const [list, setList] = useState<string[]>(profile.services)
 const [draft, setDraft] = useState('')
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 const dirty = JSON.stringify(list) !== JSON.stringify(profile.services)

 const add = () => {
  const v = draft.trim()
  if (!v) return
  if (list.some((s) => s.toLowerCase() === v.toLowerCase())) { setDraft(''); return }
  setList([...list, v])
  setDraft('')
 }
 const remove = (s: string) => setList(list.filter((x) => x !== s))

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   await patchBusiness({ services: list })
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
   <h2 className="text-sm font-medium text-gray-700 mb-1">Services</h2>
   <p className="text-xs text-gray-500 mb-4">
    What you offer. Bookings can only be made for services on this list.
   </p>

   {list.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3">
     {list.map((s) => (
      <span
       key={s}
       className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-full px-3 py-1 text-xs font-medium"
      >
       {s}
       <button
        onClick={() => remove(s)}
        className="text-sky-600 hover:text-sky-900 transition-colors"
        aria-label={`Remove ${s}`}
       >
        <X className="w-3 h-3" />
       </button>
      </span>
     ))}
    </div>
   )}

   <div className="flex flex-col sm:flex-row gap-2">
    <input
     type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
     onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
     placeholder="e.g. AC tune-up"
     className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors text-sm"
    />
    <button
     onClick={add} disabled={!draft.trim()}
     className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-900 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
    >
     <Plus className="w-4 h-4" /> Add
    </button>
   </div>

   <div className="flex justify-end mt-4">
    <SaveButton disabled={!dirty} saving={saving} onClick={onSave} />
   </div>
   {savedFlag && <SavedHint />}
   {error && <ErrorHint message={error} />}
  </div>
 )
}

/* ---------------------------- Read-only --------------------------- */

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

function ProfileReadOnly({ profile }: { profile: Profile }) {
 return (
  <div className="bg-white border border-gray-200 rounded-2xl p-6">
   <h2 className="text-sm font-medium text-gray-700 mb-4">Profile</h2>
   <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
    <Field label="Business type" value={profile.businessType} />
    <Field label="Phone" value={profile.phoneNumber} mono />
    <Field label="Email" value={profile.email} />
    <Field label="Website" value={profile.website || '—'} />
    <div className="sm:col-span-2">
     <Field
      label="Address"
      value={[profile.address, profile.city, profile.state, profile.zipCode].filter(Boolean).join(', ') || '—'}
     />
    </div>
   </dl>
   <p className="text-xs text-gray-400 mt-6">
    Address, phone, and email — contact support to update.
   </p>
  </div>
 )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
 return (
  <div>
   <dt className="text-xs text-gray-500 mb-1">{label}</dt>
   <dd className={`text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
  </div>
 )
}
