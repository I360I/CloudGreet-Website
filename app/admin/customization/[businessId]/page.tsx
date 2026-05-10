'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, ArrowLeft, MagicWand, FileText, FloppyDisk } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { FORM_SECTIONS, type FormSection } from '@/lib/customization/form-config'
import { SectionBlock, SaveIndicator } from '@/components/customization/Fields'

/**
 * Admin pre-fill page for a single business's customization form.
 *
 * Same form structure as /dashboard/customize but admin-side. Whatever
 * gets saved here lands on businesses.customization, so when the client
 * eventually opens their own form they see the admin's pre-fill on
 * top of the auto-prefill from lead/Places data.
 *
 * Three top-level actions:
 *   - Auto-fill from sources: pulls a fresh prefill (lead + Places +
 *     business row) and merges into the in-flight answers without
 *     overwriting anything you've already typed.
 *   - Save: persists the current answers as the admin pre-fill.
 *   - Print / PDF: opens the existing /sales/customization-template
 *     page with ?businessId=X so the form renders with answers filled.
 */

type State = {
  business: { id: string; business_name: string }
  answers: Record<string, any>
  prefill: Record<string, any>
  saved: Record<string, any>
  status: string
}

const AUTOSAVE_DEBOUNCE_MS = 2000

export default function AdminCustomizationPage() {
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId as string

  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autofilling, setAutofilling] = useState(false)
  const [autofillNote, setAutofillNote] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth(`/api/admin/customization/${businessId}/answers`)
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.success) {
          setState({
            business: j.business,
            answers: j.answers || {},
            prefill: j.prefill || {},
            saved: j.saved || {},
            status: j.status,
          })
          lastSaved.current = JSON.stringify(j.answers || {})
        } else if (!cancelled) {
          setError(j?.error || 'Could not load form')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [businessId])

  const update = (id: string, value: any) => {
    setState((prev) => prev ? { ...prev, answers: { ...prev.answers, [id]: value } } : prev)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void autosave() }, AUTOSAVE_DEBOUNCE_MS)
  }

  const autosave = async () => {
    setState((prev) => {
      if (!prev) return prev
      const blob = JSON.stringify(prev.answers)
      if (blob === lastSaved.current) return prev
      void (async () => {
        setSaving('saving')
        try {
          const r = await fetchWithAuth(`/api/admin/customization/${businessId}/answers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: prev.answers }),
          })
          if (r.ok) {
            lastSaved.current = blob
            setSaving('saved')
            setTimeout(() => setSaving('idle'), 1200)
          } else {
            setSaving('error')
          }
        } catch {
          setSaving('error')
        }
      })()
      return prev
    })
  }

  const saveNow = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await autosave()
  }

  const runAutofill = async () => {
    setAutofilling(true)
    setAutofillNote(null)
    try {
      const r = await fetchWithAuth(`/api/admin/customization/${businessId}/autofill`, {
        method: 'POST',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setAutofillNote(j?.error || 'Auto-fill failed')
        return
      }
      const fresh = j.prefill as Record<string, any>
      let filledCount = 0
      setState((prev) => {
        if (!prev) return prev
        const merged = { ...prev.answers }
        for (const [k, v] of Object.entries(fresh)) {
          // Only fill if the field is currently empty - never clobber
          // what the admin already typed.
          const existing = merged[k]
          const isEmpty =
            existing === undefined ||
            existing === null ||
            existing === '' ||
            (Array.isArray(existing) && existing.length === 0) ||
            (typeof existing === 'object' && existing && !Array.isArray(existing) && Object.keys(existing).length === 0)
          if (isEmpty && v !== undefined && v !== null && v !== '') {
            merged[k] = v
            filledCount += 1
          }
        }
        return { ...prev, answers: merged }
      })
      setAutofillNote(
        filledCount > 0
          ? `Filled ${filledCount} field${filledCount === 1 ? '' : 's'} from ${(j.sources || []).join(', ') || 'available sources'}.`
          : 'Nothing new to add - everything we have is already in the form.'
      )
      // Persist the merge so it survives a refresh.
      void autosave()
    } finally {
      setAutofilling(false)
      setTimeout(() => setAutofillNote(null), 6000)
    }
  }

  const completed = useMemo(() => {
    if (!state) return 0
    let c = 0
    for (const v of Object.values(state.answers)) {
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v) && v.length === 0) continue
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue
      c += 1
    }
    return c
  }, [state])

  const totalFields = useMemo(() => FORM_SECTIONS.reduce((n, s) => n + s.fields.length, 0), [])

  if (loading) {
    return (
      <AdminShell activeLabel="Overview">
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <CircleNotch className="w-4 h-4 animate-spin mr-2" /> Loading form…
        </div>
      </AdminShell>
    )
  }

  if (error || !state) {
    return (
      <AdminShell activeLabel="Overview">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900">
            {error || 'Could not load form'}
          </div>
        </div>
      </AdminShell>
    )
  }

  const printUrl = `/sales/customization-template?businessId=${businessId}`

  return (
    <AdminShell activeLabel="Overview">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link
            href={`/admin/clients/${businessId}`}
            className="inline-flex items-center gap-1.5 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to client
          </Link>
        </div>

        <header className="flex items-end justify-between gap-4 flex-wrap pb-5 border-b border-gray-200">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
              Admin pre-fill
            </div>
            <h1 className="text-2xl font-medium tracking-tight">
              {state.business.business_name}
            </h1>
            <div className="text-xs text-gray-500 mt-1">
              {completed} of {totalFields} fields filled · status:{' '}
              <span className="font-mono">{state.status}</span>
            </div>
          </div>
          <SaveIndicator state={saving} />
        </header>

        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3 flex-wrap">
            <MagicWand className="w-5 h-5 text-violet-600 mt-0.5" />
            <div className="flex-1 min-w-[200px]">
              <div className="text-sm font-medium text-violet-900">Auto-fill from sources</div>
              <div className="text-xs text-violet-800/80 mt-0.5 leading-snug">
                Pulls everything we already know (business row, originating
                lead, Google Places). Won&apos;t overwrite anything you&apos;ve typed.
              </div>
            </div>
            <button
              type="button"
              onClick={runAutofill}
              disabled={autofilling}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
            >
              {autofilling ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <MagicWand className="w-3.5 h-3.5" />}
              {autofilling ? 'Filling…' : 'Auto-fill'}
            </button>
          </div>
          {autofillNote && (
            <div className="mt-3 text-xs text-violet-900 bg-white border border-violet-200 rounded-md px-3 py-2">
              {autofillNote}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {FORM_SECTIONS.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              answers={state.answers}
              onChange={update}
              disabled={false}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2">
          <button
            type="button"
            onClick={saveNow}
            className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm"
          >
            <FloppyDisk className="w-4 h-4" /> FloppyDisk now
          </button>
          <a
            href={printUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-800 rounded-xl px-4 py-2 text-sm"
          >
            <FileText className="w-4 h-4 text-gray-500" /> Print / PDF
          </a>
          <div className="text-xs text-gray-500 ml-auto">
            Saves to <span className="font-mono">businesses.customization</span> ·
            client sees this when they open their form
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
