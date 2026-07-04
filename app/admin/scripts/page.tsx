'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, Plus, TrashSimple, CheckCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, Input } from '../_components/ui'

type Script = {
  id: string
  section: 'opener' | 'discovery' | 'pitch' | 'objection' | 'closing' | 'sms'
  title: string
  body: string
  sort_order: number
}

const SECTION_LABELS: Record<Script['section'], string> = {
  opener: 'Opener',
  discovery: 'Discovery questions',
  pitch: 'Pitch',
  objection: 'Objection battle cards',
  closing: 'Closing',
  sms: 'SMS templates',
}
const SECTION_ORDER: Script['section'][] = ['opener', 'discovery', 'pitch', 'objection', 'closing', 'sms']

/**
 * Editor for the dialer cockpit's script panel + SMS templates.
 * {{first_name}} and {{business_name}} get filled with the live lead's
 * info in the cockpit. SMS COMPLIANCE: templates send from rep DIDs -
 * those numbers need a Telnyx Messaging Profile with A2P 10DLC
 * registration or carriers will filter the texts.
 */
export default function AdminScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newSection, setNewSection] = useState<Script['section']>('objection')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetchWithAuth('/api/admin/scripts')
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setError(j?.error || 'Failed to load')
      else setScripts(j.scripts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const patchLocal = (id: string, patch: Partial<Script>) =>
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const save = async (s: Script) => {
    setBusyId(s.id)
    try {
      const r = await fetchWithAuth(`/api/admin/scripts/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: s.title, body: s.body, sort_order: s.sort_order }),
      })
      if (r.ok) {
        setSavedId(s.id)
        setTimeout(() => setSavedId(null), 1500)
      }
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this script entry?')) return
    setScripts((prev) => prev.filter((s) => s.id !== id))
    await fetchWithAuth(`/api/admin/scripts/${id}`, { method: 'DELETE' }).catch(() => load())
  }

  const add = async () => {
    const r = await fetchWithAuth('/api/admin/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: newSection, title: 'New entry', body: '…', sort_order: 99 }),
    })
    const j = await r.json().catch(() => ({}))
    if (j?.script) setScripts((prev) => [...prev, j.script])
  }

  return (
    <AdminShell activeLabel="Scripts">
      <PanelHeader eyebrow="dialer" title="Dialer scripts" />
      <p className="text-sm opacity-60 mb-6 -mt-4">
        What setters see in the call cockpit - opener, pitch, objection battle cards, and
        post-call SMS templates. Placeholders: {'{{first_name}}'}, {'{{business_name}}'}.
      </p>
      {error && <div className="mb-4 text-sm text-rose-500">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-16"><CircleNotch className="w-5 h-5 animate-spin opacity-60" /></div>
      ) : (
        <div className="space-y-6">
          {SECTION_ORDER.map((section) => {
            const items = scripts.filter((s) => s.section === section).sort((a, b) => a.sort_order - b.sort_order)
            if (items.length === 0 && section !== newSection) return null
            return (
              <Panel key={section}>
                <div className="text-sm font-semibold mb-3">{SECTION_LABELS[section]}</div>
                {section === 'sms' && (
                  <div className="text-xs opacity-60 mb-3">
                    Sent from the setter&apos;s dialer number. Needs Telnyx Messaging Profile + 10DLC registration for reliable delivery; STOP replies auto-DNC the lead.
                  </div>
                )}
                <div className="space-y-4">
                  {items.map((s) => (
                    <div key={s.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={s.title}
                          onChange={(e) => patchLocal(s.id, { title: e.target.value })}
                          placeholder="Title"
                        />
                        <GhostButton onClick={() => void save(s)} disabled={busyId === s.id}>
                          {busyId === s.id ? <CircleNotch className="w-4 h-4 animate-spin" />
                            : savedId === s.id ? <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500" />
                            : 'Save'}
                        </GhostButton>
                        <button
                          onClick={() => void remove(s.id)}
                          className="p-2 opacity-50 hover:opacity-100 hover:text-rose-400 transition-opacity"
                          aria-label="Delete"
                        >
                          <TrashSimple className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={s.body}
                        onChange={(e) => patchLocal(s.id, { body: e.target.value })}
                        onBlur={() => void save(s)}
                        rows={Math.min(10, Math.max(3, s.body.split('\n').length + 1))}
                        className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-white/30 resize-y"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            )
          })}
          <div className="flex items-center gap-2">
            <select
              value={newSection}
              onChange={(e) => setNewSection(e.target.value as Script['section'])}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {SECTION_ORDER.map((s) => <option key={s} value={s} className="bg-gray-900">{SECTION_LABELS[s]}</option>)}
            </select>
            <PrimaryButton onClick={() => void add()}>
              <Plus className="w-4 h-4" /> Add entry
            </PrimaryButton>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
