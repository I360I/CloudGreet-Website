'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleNotch, MagnifyingGlass, CaretDown, WarningCircle } from '@phosphor-icons/react'
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
 * Full-page view of the same call scripts the cockpit shows in its right
 * rail - readable outside a live session for practice and reference.
 * Content is managed by admin (/admin/scripts).
 */
export default function SetterScriptsPage() {
  return <ScriptsBody />
}

function ScriptsBody() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')

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

  if (loading) return <SetterLoadingState />

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Call scripts</h1>
          <p className="text-sm text-slate-500 mt-1">
            The same scripts and battle cards the cockpit shows in-call. Placeholders like{' '}
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

      {!err && scripts.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E3EAF4] p-8 text-center text-sm text-slate-500">
          No scripts yet - admin adds them under the admin panel&apos;s Scripts page.
        </div>
      )}

      {/* Two-column flow on wide screens - section cards fill the canvas
          instead of stacking down the left with a blank right third. */}
      <div className="columns-1 lg:columns-2 gap-4 [column-fill:_balance]">
        {SECTION_ORDER.map((section) => {
          const items = filtered
            .filter((s) => s.section === section)
            .sort((a, b) => a.sort_order - b.sort_order)
          if (items.length === 0) return null
          return (
            <div key={section} className="break-inside-avoid mb-4 bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#EEF2F7] text-sm font-semibold" style={{ color: NAVY }}>
                {SECTION_LABELS[section]}
              </div>
              {section === 'objection' ? (
                <div className="p-4 space-y-2">
                  {items.map((s) => (
                    <details key={s.id} className="group border border-[#E3EAF4] rounded-lg">
                      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-slate-800 flex items-center justify-between gap-2 hover:bg-[#F8FAFC] rounded-lg">
                        <span className="truncate">&ldquo;{s.title}&rdquo;</span>
                        <CaretDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                      </summary>
                      <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{s.body}</div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[#F5F8FC]">
                  {items.map((s) => (
                    <div key={s.id} className="px-5 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-1.5">{s.title}</div>
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{s.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
