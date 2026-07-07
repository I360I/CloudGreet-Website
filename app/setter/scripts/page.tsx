'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleNotch, MagnifyingGlass, CaretDown, WarningCircle, PencilSimple, TrashSimple, Plus, CheckCircle, UploadSimple, ArrowLeft, FileText } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SetterLoadingState } from '../_components/SetterShell'
import { useDialerSession } from '../_components/DialerSessionProvider'

const NAVY = '#1E3A8A'

/**
 * Two views:
 *  - Quick reference: the section snippets (opener/objections/...) the
 *    cockpit right-rail shows in-call. Inline-editable.
 *  - Full scripts: a library of complete call flows - add, upload
 *    (.txt/.md), read, edit, delete. Backed by call_scripts.
 */
export default function SetterScriptsPage() {
  const [tab, setTab] = useState<'sections' | 'library'>('sections')
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Call scripts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quick reference is what the cockpit shows in-call - placeholders like{' '}
          <code className="text-xs bg-slate-100 rounded px-1">{'{{first_name}}'}</code> fill in
          automatically. Full scripts is your library of complete call flows.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-[#E3EAF4] bg-white p-0.5">
        {([['sections', 'Quick reference'], ['library', 'Full scripts']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`text-sm font-medium rounded-md px-3.5 py-1.5 transition-colors duration-150 ${
              tab === value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sections' ? <SectionsBody /> : <LibraryBody />}
    </div>
  )
}

/* ================= Quick reference (section snippets) ================= */

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

function SectionsBody() {
  const { repFirstName } = useDialerSession()
  const subst = (text: string) => text.replaceAll('{{rep_name}}', repFirstName || '{{rep_name}}')
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-white border border-[#E3EAF4] rounded-lg px-3 py-2 w-64 focus-within:border-blue-500">
        <MagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quick reference..."
          className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
        />
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
                      <div className="px-5 pb-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{subst(s.body)}</div>
                    </details>
                  ) : (
                    <div key={s.id} className="px-5 py-4 group">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{s.title}</div>
                        <EditButton onClick={() => { setEditingId(s.id); setAddingSection(null) }} />
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{subst(s.body)}</div>
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

/* ================= Full scripts library ================= */

type FullScript = {
  id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

function LibraryBody() {
  const { repFirstName } = useDialerSession()
  const subst = (text: string) => text.replaceAll('{{rep_name}}', repFirstName || '{{rep_name}}')
  const [scripts, setScripts] = useState<FullScript[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'read' | 'edit' | 'new'>('list')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploadDraft, setUploadDraft] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/sales/scripts-library')
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.success) setErr(j?.error || 'Failed to load the library')
        else setScripts(j.scripts || [])
      } catch {
        setErr('Failed to load the library')
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

  const open = scripts.find((s) => s.id === openId) || null

  const create = async (patch: { title: string; body: string }) => {
    const r = await fetchWithAuth('/api/sales/scripts-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.success) throw new Error(j?.error || 'Add failed')
    setScripts((prev) => [j.script, ...prev])
    setUploadDraft(null)
    setOpenId(j.script.id)
    setMode('read')
  }

  const save = async (id: string, patch: { title: string; body: string }) => {
    const r = await fetchWithAuth(`/api/sales/scripts-library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.success) throw new Error(j?.error || 'Save failed')
    setScripts((prev) => prev.map((s) => (s.id === id ? j.script : s)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    setMode('read')
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this script from the library?')) return
    setScripts((prev) => prev.filter((s) => s.id !== id))
    setOpenId(null); setMode('list')
    await fetchWithAuth(`/api/sales/scripts-library/${id}`, { method: 'DELETE' }).catch(() => null)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const text = await f.text()
    if (!text.trim()) { setErr('That file is empty'); return }
    setUploadDraft({ title: f.name.replace(/\.(txt|md|markdown)$/i, ''), body: text })
    setMode('new')
  }

  if (loading) return <SetterLoadingState />

  // Reader / editor take over the panel.
  if ((mode === 'read' || mode === 'edit') && open) {
    return (
      <div className="max-w-3xl space-y-4">
        <button
          onClick={() => { setMode('list'); setOpenId(null) }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All scripts
        </button>
        {mode === 'read' ? (
          <div className="bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="px-6 py-4 border-b border-[#EEF2F7] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: NAVY }}>{open.title}</h2>
                <div className="text-[11px] text-slate-400 mt-0.5">updated {new Date(open.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setMode('edit')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-[#E3EAF4] hover:border-blue-300 rounded-lg transition-colors"
                >
                  <PencilSimple className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => void remove(open.id)}
                  title="Delete"
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <TrashSimple className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{subst(open.body)}</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E3EAF4] p-5">
            <LibraryForm
              initialTitle={open.title}
              initialBody={open.body}
              saveLabel="Save changes"
              onSave={(patch) => save(open.id, patch)}
              onCancel={() => setMode('read')}
            />
          </div>
        )}
      </div>
    )
  }

  if (mode === 'new') {
    return (
      <div className="max-w-3xl space-y-4">
        <button
          onClick={() => { setMode('list'); setUploadDraft(null) }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All scripts
        </button>
        <div className="bg-white rounded-xl border border-[#E3EAF4] p-5">
          <LibraryForm
            initialTitle={uploadDraft?.title || ''}
            initialBody={uploadDraft?.body || ''}
            saveLabel="Add to library"
            onSave={create}
            onCancel={() => { setMode('list'); setUploadDraft(null) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#E3EAF4] rounded-lg px-3 py-2 w-64 focus-within:border-blue-500">
          <MagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search full scripts..."
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" className="hidden" onChange={(e) => void onFile(e)} />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-[#E3EAF4] hover:border-blue-300 rounded-lg px-3.5 py-2 transition-colors"
          >
            <UploadSimple className="w-4 h-4 text-blue-600" /> Upload (.txt / .md)
          </button>
          <button
            onClick={() => { setUploadDraft(null); setMode('new') }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3.5 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> New script
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E3EAF4] p-10 text-center">
          <FileText weight="duotone" className="w-8 h-8 text-blue-300 mx-auto mb-2" />
          <div className="text-sm text-slate-500">
            {scripts.length === 0
              ? 'No full scripts yet - write one or upload a .txt/.md file.'
              : 'No scripts match that search.'}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => { setOpenId(s.id); setMode('read') }}
              className="text-left bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold truncate" style={{ color: NAVY }}>{s.title}</h3>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {subst(s.body).slice(0, 220)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryForm({ initialTitle, initialBody, saveLabel, onSave, onCancel }: {
  initialTitle: string
  initialBody: string
  saveLabel: string
  onSave: (patch: { title: string; body: string }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
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
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Script title (e.g. Lost Revenue Hook - full flow)"
        autoFocus
        className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.min(28, Math.max(14, body.split('\n').length + 2))}
        placeholder="The whole script - paste or type it here..."
        className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
      />
      {err && <div className="text-xs text-rose-600">{err}</div>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
        >
          {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
      </div>
    </div>
  )
}
