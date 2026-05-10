'use client'

import { CircleNotch, CheckCircle, WarningCircle, Trash, Plus } from '@phosphor-icons/react'
import { type FormField, type FormSection } from '@/lib/customization/form-config'

/**
 * Shared customization form-field components.
 *
 * Used by both /dashboard/customize (client-facing) and
 * /admin/customization/[businessId] (admin pre-fill). Pure presentation
 * + value/onChange contract - the parent owns autosave / submit.
 */

export function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  return (
    <div className="text-xs text-gray-500 flex items-center gap-1.5 min-h-[20px]">
      {state === 'saving' && (<><CircleNotch className="w-3 h-3 animate-spin" /> Saving…</>)}
      {state === 'saved' && (<><CheckCircle className="w-3 h-3 text-emerald-500" /> Saved</>)}
      {state === 'error' && (<><WarningCircle className="w-3 h-3 text-rose-500" /> Couldn&apos;t save</>)}
      {state === 'idle' && <span>&nbsp;</span>}
    </div>
  )
}

export function SectionBlock({
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
            <Trash className="w-4 h-4" />
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
