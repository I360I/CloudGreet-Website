'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Trash2, Plus } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import { FORM_SECTIONS, isComplete, type FormField, type FormSection } from '@/lib/customization/form-config'

/**
 * Post-close customization form.
 *
 * Auth'd as the client. Loads prefill + saved answers from
 * /api/customize/state, autosaves to /api/customize/save, finalises
 * via /api/customize/submit. Branded with the business name at top
 * so the client knows it's "their" form, not a generic CG questionnaire.
 *
 * Field types are kept simple - text/longtext/list/yesno/select plus
 * two compound widgets (kv-list for FAQ + price list, time-grid for
 * weekly hours). Layout is one-column, scroll through, autosaves on
 * blur. Submit at the bottom does a final isComplete() check before
 * flipping the server pipeline to 'submitted'.
 */

type State = {
  business: { id: string; business_name: string }
  answers: Record<string, any>
  status: 'not_sent' | 'sent' | 'submitted' | 'building' | 'ready' | 'live'
  submitted_at: string | null
  ready_at: string | null
}

const AUTOSAVE_DEBOUNCE_MS = 1500

export default function CustomizePage() {
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth('/api/customize/state')
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.success) {
          setState(j)
          lastSaved.current = JSON.stringify(j.answers || {})
        } else if (!cancelled) {
          setError(j?.error || 'Could not load form')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const update = (id: string, value: any) => {
    setState((prev) => prev ? { ...prev, answers: { ...prev.answers, [id]: value } } : prev)
    // Debounced autosave.
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
          const r = await fetchWithAuth('/api/customize/save', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: prev.answers }),
          })
          if (r.ok) {
            lastSaved.current = blob
            setSaving('saved')
            setTimeout(() => setSaving('idle'), 1500)
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

  const submit = async () => {
    if (!state) return
    setError(''); setSubmitting(true)
    try {
      // Force a final flush of any pending edits.
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
      const r = await fetchWithAuth('/api/customize/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: state.answers }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Could not submit')
      } else {
        setState((p) => p ? { ...p, status: 'submitted', submitted_at: j.submitted_at } : p)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const completeEnough = useMemo(
    () => state ? isComplete(state.answers) : false,
    [state],
  )

  if (loading) {
    return (
      <DashShell activeLabel="Setup">
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </DashShell>
    )
  }

  if (error || !state) {
    return (
      <DashShell activeLabel="Setup">
        <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">{error || 'Could not load form'}</p>
          </div>
        </div>
      </DashShell>
    )
  }

  const submitted = state.status !== 'not_sent' && state.status !== 'sent'

  return (
    <DashShell activeLabel="Setup">
      <div className="px-4 lg:px-8 py-8 max-w-3xl">
        {/* Branded header */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
            Customization · {state.business.business_name}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
            Tell us how to build your agent.
          </h1>
          <p className="mt-3 text-sm text-gray-600 max-w-xl">
            Most of this is prefilled from what we already know - just review and edit. Your answers autosave as you go. Submit when you&apos;re done and we&apos;ll have your polished agent ready in 2-3 business days.
          </p>
        </div>

        {submitted && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                {state.status === 'submitted' && 'Submitted - building your agent now.'}
                {state.status === 'building' && 'Your agent is being built.'}
                {state.status === 'ready' && 'Your agent is ready - watch for the go-live email.'}
                {state.status === 'live' && 'Your agent is live.'}
              </p>
              <p className="text-xs text-emerald-800 mt-1">
                You can still edit answers below if anything changes. Reach out to your rep if something needs to be updated post-go-live.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {FORM_SECTIONS.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              answers={state.answers}
              onChange={update}
              disabled={submitted}
            />
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <SaveIndicator state={saving} />
          {!submitted && (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !completeEnough}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={completeEnough ? '' : 'Some required fields are still empty.'}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit for build
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </div>
    </DashShell>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  return (
    <div className="text-xs text-gray-500 flex items-center gap-1.5 min-h-[20px]">
      {state === 'saving' && (<><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>)}
      {state === 'saved' && (<><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved</>)}
      {state === 'error' && (<><AlertCircle className="w-3 h-3 text-rose-500" /> Couldn&apos;t save</>)}
      {state === 'idle' && <span>&nbsp;</span>}
    </div>
  )
}

function SectionBlock({
  section, answers, onChange, disabled,
}: {
  section: FormSection
  answers: Record<string, any>
  onChange: (id: string, v: any) => void
  disabled: boolean
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
      <div className="mb-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
          {section.title}
        </div>
        <p className="text-sm text-gray-600">{section.blurb}</p>
      </div>
      <div className="space-y-5">
        {section.fields.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={answers[f.id]}
            onChange={(v) => onChange(f.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  )
}

function FieldInput({
  field, value, onChange, disabled,
}: {
  field: FormField
  value: any
  onChange: (v: any) => void
  disabled: boolean
}) {
  const baseInput = `w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500`

  const Label = (
    <label className="block">
      <div className="text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-rose-500 ml-1">*</span>}
      </div>
      {field.hint && <div className="text-xs text-gray-500 italic mt-0.5">{field.hint}</div>}
    </label>
  )

  switch (field.kind) {
    case 'text':
      return (
        <div>
          {Label}
          <input
            type="text"
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`mt-2 ${baseInput}`}
          />
        </div>
      )
    case 'longtext':
      return (
        <div>
          {Label}
          <textarea
            rows={3}
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`mt-2 ${baseInput} resize-y`}
          />
        </div>
      )
    case 'list': {
      // Stored as string[]; render as textarea, one per line.
      const text = Array.isArray(value) ? value.join('\n') : (value || '')
      return (
        <div>
          {Label}
          <textarea
            rows={4}
            value={text}
            disabled={disabled}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)
              onChange(lines)
            }}
            className={`mt-2 ${baseInput} resize-y`}
            placeholder="One per line"
          />
        </div>
      )
    }
    case 'yesno':
      return (
        <div>
          {Label}
          <div className="mt-2 flex gap-2">
            {['yes', 'no'].map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                  value === opt
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {opt === 'yes' ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
      )
    case 'select':
      return (
        <div>
          {Label}
          <select
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`mt-2 ${baseInput}`}
          >
            <option value="">Select…</option>
            {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    case 'kv-list':
      return (
        <div>
          {Label}
          <KvList
            rows={Array.isArray(value) ? value : []}
            keyLabel={field.keyLabel || 'Key'}
            valueLabel={field.valueLabel || 'Value'}
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      )
    case 'time-grid':
      return (
        <div>
          {Label}
          <HoursGrid value={value || {}} disabled={disabled} onChange={onChange} />
        </div>
      )
  }
}

function KvList({
  rows, keyLabel, valueLabel, disabled, onChange,
}: {
  rows: { key: string; value: string }[]
  keyLabel: string; valueLabel: string; disabled: boolean
  onChange: (rows: { key: string; value: string }[]) => void
}) {
  const update = (i: number, patch: Partial<{ key: string; value: string }>) => {
    onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  const add = () => onChange([...rows, { key: '', value: '' }])
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div className="mt-2 space-y-2">
      {rows.length === 0 && (
        <div className="text-xs text-gray-400">No rows yet.</div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input
            type="text"
            placeholder={keyLabel}
            value={r.key}
            disabled={disabled}
            onChange={(e) => update(i, { key: e.target.value })}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
          />
          <input
            type="text"
            placeholder={valueLabel}
            value={r.value}
            disabled={disabled}
            onChange={(e) => update(i, { value: e.target.value })}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => remove(i)}
            className="p-2 text-gray-400 hover:text-rose-600 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-40"
      >
        <Plus className="w-4 h-4" /> Add row
      </button>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function HoursGrid({
  value, disabled, onChange,
}: {
  value: Record<string, { open?: string; close?: string; closed?: boolean } | undefined>
  disabled: boolean
  onChange: (v: any) => void
}) {
  const set = (day: string, patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    onChange({ ...value, [day]: { ...(value[day] || {}), ...patch } })
  }
  return (
    <div className="mt-2 space-y-2">
      {DAYS.map((d) => {
        const v = value[d] || {}
        return (
          <div key={d} className="flex items-center gap-3">
            <div className="w-12 text-sm text-gray-600">{d}</div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                disabled={disabled}
                checked={!!v.closed}
                onChange={(e) => set(d, { closed: e.target.checked })}
              />
              Closed
            </label>
            {!v.closed && (
              <>
                <input
                  type="time"
                  disabled={disabled}
                  value={v.open || ''}
                  onChange={(e) => set(d, { open: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="time"
                  disabled={disabled}
                  value={v.close || ''}
                  onChange={(e) => set(d, { close: e.target.value })}
                  className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
