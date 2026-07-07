'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleNotch, MagnifyingGlass, CaretDown, WarningCircle, PencilSimple, TrashSimple, Plus, CheckCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SetterLoadingState } from '../_components/SetterShell'

const NAVY = '#1E3A8A'

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
  sms: 'Text templates',
}
const SECTION_ORDER: Script['section'][] = ['opener', 'discovery', 'pitch', 'objection', 'closing', 'sms']

/**
 * Scripts: readable reference AND editable - the setter owns the
 * wording that's landing (or not) on real calls. Same dialer_scripts
 * table the cockpit right rail and /admin/scripts use, so edits show
 * up everywhere on the next load.
 */
export default function SetterScriptsPage() {
  return <ScriptsBody />
}

function ScriptsBody() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState<Script['section'] | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/sales/dialer/scripts')
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.success) setErr(j?.error || 'Failed to load scripts')
        else setScripts(j.scripts || [])
      } catch {
        setErr('Failed to load scripts')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return scripts
    return scripts.filter((s) => (s.title + ' ' + s.body).toLowerCase().includes(q))
  }, [scripts, search])

  const saveEntry = async (id: string, patch: { title: string; body: string }) => {
    const r = await fetchWithAuth(`/api/sales/dialer/scripts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.success) throw new Error(j?.error || 'Save failed')
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...j.script } : s)))
    setEditingId(null)
  }

  const addEntry = async (section: Script['section'], patch: { title: string; body: string }) => {
    const r = await fetchWithAuth('/api/sales/dialer/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, ...patch }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.success) throw new Error(j?.error || 'Add failed')
    setScripts((prev) => [...prev, j.script])
    setAddingSection(null)
  }

  const removeEntry = async (id: string) => {
    if (!confirm('Delete this script entry?')) return
    setScripts((prev) => prev.filter((s) => s.id !== id))
    await fetchWithAuth(`/api/sales/dialer/scripts/${id}`, { method: 'DELETE' }).catch(() => null)
  }

  if (loading) return <SetterLoadingState />

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Call scripts</h1>
          <p className="text-sm text-slate-500 mt-1">
            What the cockpit shows in-call - and yours to sharpen. Placeholders like{' '}
            <code className="text-xs bg-slate-100 rounded px-1">{'{{first_name}}'}</code> fill in
            automatically during calls.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E3EAF4] rounded-lg px-3 py-2 w-64 focus-within:border-blue-500">
          <MagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scripts..."
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      <div className="columns-1 lg:columns-2 gap-4 [column-fill:_balance]">
        {SECTION_ORDER.map((section) => {
          const items = filtered
            .filter((s) => s.section === section)
            .sort((a, b) => a.sort_order - b.sort_order)
          if (items.length === 0 && addingSection !== section && search.trim()) return null
          return (
            <div key={section} className="break-inside-avoid mb-4 bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#EEF2F7] flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: NAVY }}>{SECTION_LABELS[section]}</span>
                <button
                  onClick={() => { setAddingSection(section); setEditingId(null) }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {addingSection === section && (
                <div className="p-4 border-b border-[#EEF2F7] bg-blue-50/40">
                  <EntryForm
                    initialTitle=""
                    initialBody=""
                    saveLabel="Add script"
                    onSave={(patch) => addEntry(section, patch)}
                    onCancel={() => setAddingSection(null)}
                  />
                </div>
              )}

              <div className="divide-y divide-[#F5F8FC]">
                {items.map((s) => (
                  editingId === s.id ? (
                    <div key={s.id} className="p-4 bg-blue-50/40">
                      <EntryForm
                        initialTitle={s.title}
                        initialBody={s.body}
                        saveLabel="Save"
                        onSave={(patch) => saveEntry(s.id, patch)}
                        onCancel={() => setEditingId(null)}
                        onDelete={() => void removeEntry(s.id)}
                      />
                    </div>
                  ) : section === 'objection' ? (
                    <details key={s.id} className="group">
                      <summary className="cursor-pointer list-none px-5 py-2.5 text-sm font-medium text-slate-800 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]">
                        <span className="truncate">&ldquo;{s.title}&rdquo;</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <EditButton onClick={(e) => { e.preventDefault(); setEditingId(s.id); setAddingSection(null) }} />
                          <CaretDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
                        </span>
                      </summary>
                      <div className="px-5 pb-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{s.body}</div>
                    </details>
                  ) : (
                    <div key={s.id} className="px-5 py-4 group">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{s.title}</div>
                        <EditButton onClick={() => { setEditingId(s.id); setAddingSection(null) }} />
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{s.body}</div>
                    </div>
                  )
                ))}
                {items.length === 0 && addingSection !== section && (
                  <div className="px-5 py-4 text-xs text-slate-400">Nothing here yet - add your first one.</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title="Edit"
      aria-label="Edit script"
      className="p-1 text-slate-300 hover:text-blue-600 group-hover:text-slate-400 transition-colors"
    >
      <PencilSimple className="w-3.5 h-3.5" />
    </button>
  )
}

function EntryForm({ initialTitle, initialBody, saveLabel, onSave, onCancel, onDelete }: {
  initialTitle: string
  initialBody: string
  saveLabel: string
  onSave: (patch: { title: string; body: string }) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title and script text are both required'); return }
    setBusy(true); setErr('')
    try {
      await onSave({ title: title.trim(), body: body.trim() })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (for objections: the exact thing they say)"
        autoFocus
        className="w-full px-3 py-2 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.min(12, Math.max(4, body.split('\n').length + 1))}
        placeholder="What to say..."
        className="w-full px-3 py-2 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
      />
      {err && <div className="text-xs text-rose-600">{err}</div>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
        >
          {busy ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle weight="fill" className="w-3.5 h-3.5" />}
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800">Cancel</button>
        <div className="flex-1" />
        {onDelete && (
          <button
            onClick={onDelete}
            title="Delete"
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-rose-600 transition-colors"
          >
            <TrashSimple className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>
    </div>
  )
}
