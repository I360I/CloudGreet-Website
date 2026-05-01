'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
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
}

export default function SettingsPage() {
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [saved, setSaved] = useState(false)
 const [profile, setProfile] = useState<Profile | null>(null)
 const [name, setName] = useState('')

 useEffect(() => {
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/business/profile')
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load profile')
    setProfile(json.data)
    setName(json.data.businessName || '')
   } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to load profile')
   } finally {
    setLoading(false)
   }
  })()
 }, [])

 const onSave = async () => {
  if (!name.trim() || name === profile?.businessName) return
  setSaving(true); setError(''); setSaved(false)
  try {
   const businessRaw = localStorage.getItem('business')
   const businessId = businessRaw ? JSON.parse(businessRaw).id : null
   if (!businessId) throw new Error('Missing business id')
   const res = await fetchWithAuth('/api/businesses/update', {
    method: 'PATCH',
    body: JSON.stringify({ businessId, business_name: name.trim() }),
   })
   const json = await res.json()
   if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save')
   setProfile((p) => p ? { ...p, businessName: name.trim() } : p)
   try {
    const b = JSON.parse(localStorage.getItem('business') || '{}')
    b.business_name = name.trim()
    localStorage.setItem('business', JSON.stringify(b))
   } catch {}
   setSaved(true)
   setTimeout(() => setSaved(false), 2500)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
   setSaving(false)
  }
 }

 return (
  <DashShell activeLabel="Settings">
   <section className="px-8 py-10">
    <div className="max-w-3xl">
     <div className="mb-8">
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Settings</h1>
      <p className="text-sm text-gray-500 mt-1">Your business profile.</p>
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
       <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Business name</h2>
        <div className="flex items-center gap-3">
         <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors text-sm"
         />
         <button
          onClick={onSave}
          disabled={saving || !name.trim() || name === profile.businessName}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
         >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
         </button>
        </div>
        {saved && (
         <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved. AI agent updated automatically.
         </p>
        )}
        {error && profile && <p className="text-xs text-red-600 mt-3">{error}</p>}
       </div>

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
         <div className="sm:col-span-2">
          <Field
           label="Services"
           value={profile.services.length ? profile.services.join(' · ') : '—'}
          />
         </div>
        </dl>
        <p className="text-xs text-gray-400 mt-6">
         To update profile fields beyond your business name, contact support.
        </p>
       </div>
      </div>
     )}
    </div>
   </section>
  </DashShell>
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
