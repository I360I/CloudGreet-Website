'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, CaretDown } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Cal = {
 name: string; externalId: string; credentialId: number; integration: string
 isSelected: boolean; readOnly: boolean; primary: boolean
}
type Group = { title: string; integrationType: string; calendars: Cal[] }
type Selection = { integration: string; externalId: string; credentialId: number; enabled: boolean; name?: string }

/** iOS-style toggle - inline px so flex parents can't squash the pill and a
 *  missing Tailwind class in the bundle can't strip its width. Matches the
 *  toggles used elsewhere in settings. */
function Switch({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
 return (
  <button
   type="button"
   role="switch"
   aria-checked={checked}
   disabled={disabled}
   onClick={() => onChange(!checked)}
   style={{
    width: 44, height: 24, borderRadius: 9999,
    backgroundColor: checked ? '#10b981' : '#d1d5db',
    position: 'relative', flexShrink: 0, border: 'none', padding: 0,
    transition: 'background-color 200ms ease',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
   }}
   className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
  >
   <span aria-hidden="true" style={{
    position: 'absolute', top: 2, left: checked ? 22 : 2,
    width: 20, height: 20, borderRadius: 9999,
    backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    transition: 'left 200ms ease',
   }} />
  </button>
 )
}

/**
 * Surfaces Cal.com's "Check for conflicts" calendars in our own UI: a single
 * master "check all" switch (what most people want, on by default), with a
 * "Pick specific" expander for granular control. Writes straight to Cal.com
 * via the contractor's stored API key.
 */
export function ConflictCalendars() {
 const [groups, setGroups] = useState<Group[] | null>(null)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [showSpecific, setShowSpecific] = useState(false)
 const [error, setError] = useState('')

 const load = async () => {
  try {
   const res = await fetchWithAuth('/api/dashboard/calcom/conflict-calendars')
   const j = await res.json().catch(() => ({}))
   if (j.success) setGroups(j.groups || [])
   else setError(j.error || 'Could not load calendars')
  } catch { setError('Could not load calendars') } finally { setLoading(false) }
 }
 useEffect(() => { load() }, [])

 // Holiday / birthday feeds aren't real busy time - checking them would make
 // the agent think you're booked on every holiday and everyone's birthday.
 // "Check all" skips them; you can still flip them on manually below.
 const isNoise = (name: string) => /holiday|birthday/i.test(name || '')
 const allCals = (groups || []).flatMap((g) => g.calendars)
 const realCals = allCals.filter((c) => !isNoise(c.name))
 const noiseCals = allCals.filter((c) => isNoise(c.name))
 const allOn = realCals.length > 0 && realCals.every((c) => c.isSelected) && noiseCals.every((c) => !c.isSelected)

 const apply = async (selections: Selection[]) => {
  setSaving(true); setError('')
  // optimistic
  setGroups((prev) => prev?.map((g) => ({
   ...g,
   calendars: g.calendars.map((c) => {
    const sel = selections.find((s) => s.externalId === c.externalId && s.integration === c.integration)
    return sel ? { ...c, isSelected: sel.enabled } : c
   }),
  })) ?? prev)
  try {
   const res = await fetchWithAuth('/api/dashboard/calcom/conflict-calendars', {
    method: 'POST', body: JSON.stringify({ selections }),
   })
   const j = await res.json().catch(() => ({}))
   if (Array.isArray(j.groups) && j.groups.length) setGroups(j.groups)
   if (!j.success && j.error) setError(j.error)
  } catch { setError('Could not save'); load() } finally { setSaving(false) }
 }

 const toggleAll = (on: boolean) =>
  apply(allCals.map((c) => ({
   integration: c.integration, externalId: c.externalId, credentialId: c.credentialId,
   // turning "check all" on selects every real calendar but leaves holiday/
   // birthday feeds off; turning it off clears everything.
   enabled: on ? !isNoise(c.name) : false, name: c.name,
  })))
 const toggleOne = (c: Cal, on: boolean) =>
  apply([{ integration: c.integration, externalId: c.externalId, credentialId: c.credentialId, enabled: on, name: c.name }])

 if (loading) {
  return <div className="flex items-center gap-2 text-sm text-gray-500"><CircleNotch className="w-4 h-4 animate-spin" /> Loading your calendars…</div>
 }
 if (error && !groups) return <p className="text-sm text-red-600">{error}</p>
 if (!allCals.length) return <p className="text-sm text-gray-500">No calendars connected in Cal.com yet. Connect one in Cal.com and it&apos;ll show here.</p>

 return (
  <div className="space-y-3">
   {/* Master: check all */}
   <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5">
    <div className="min-w-0">
     <div className="text-sm font-medium text-gray-900">Check all my calendars for conflicts</div>
     <div className="text-xs text-gray-500 mt-0.5">So the agent never books a time you&apos;re already busy. Skips holiday &amp; birthday feeds. Recommended.</div>
    </div>
    <Switch checked={allOn} disabled={saving} onChange={toggleAll} />
   </div>

   <button
    type="button"
    onClick={() => setShowSpecific((v) => !v)}
    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
   >
    <CaretDown className={`w-3.5 h-3.5 transition-transform ${showSpecific ? 'rotate-180' : ''}`} />
    Pick specific calendars
   </button>

   {showSpecific && (
    <div className="space-y-3 pt-0.5">
     {(groups || []).map((g) => (
      <div key={g.title + g.integrationType} className="rounded-xl border border-gray-200 bg-white p-3">
       <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">{g.title}</div>
       <div className="space-y-1">
        {g.calendars.map((c) => (
         <div key={c.externalId} className="flex items-center justify-between gap-3 px-1 py-1.5">
          <div className="min-w-0">
           <div className="text-sm text-gray-900 truncate">{c.name}{c.primary ? <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sky-600">primary</span> : null}</div>
           {c.readOnly && <div className="text-[11px] text-gray-400">read-only</div>}
          </div>
          <Switch checked={c.isSelected} disabled={saving} onChange={(on) => toggleOne(c, on)} />
         </div>
        ))}
       </div>
      </div>
     ))}
    </div>
   )}

   {error && groups && <p className="text-xs text-red-600">{error}</p>}
  </div>
 )
}
