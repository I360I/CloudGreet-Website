'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FORM_SECTIONS } from '@/lib/customization/form-config'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

// useSearchParams forces this page out of static generation. Marking
// dynamic explicitly avoids the prerender bail at build time and the
// Suspense wrapper below covers the client-render edge case.
export const dynamic = 'force-dynamic'

/**
 * Print-friendly version of the customization form.
 *
 * Two modes:
 *   1. Blank template (default): just the questions, dashed lines for
 *      handwritten answers. Cmd-P → Save as PDF and hand to a client.
 *   2. Pre-filled (with ?businessId=X): same layout but renders the
 *      values currently saved on businesses.customization, so the
 *      admin can hand the client a half-filled-out copy that only
 *      asks them to complete the gaps.
 *
 * The pre-filled mode requires admin auth (the API route gates on it).
 */

export default function CustomizationTemplatePage() {
  return (
    <Suspense fallback={
      <main className="bg-white text-gray-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-gray-500">Loading…</div>
      </main>
    }>
      <CustomizationTemplateInner />
    </Suspense>
  )
}

function CustomizationTemplateInner() {
  const searchParams = useSearchParams()
  const businessId = searchParams?.get('businessId')

  const [answers, setAnswers] = useState<Record<string, any> | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setAnswers(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth(`/api/admin/customization/${businessId}/answers`)
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (r.ok && j?.success) {
          setAnswers(j.answers || {})
          setBusinessName(j.business?.business_name || null)
        } else {
          setLoadError(j?.error || 'Could not load saved answers')
        }
      } catch {
        if (!cancelled) setLoadError('Could not load saved answers')
      }
    })()
    return () => { cancelled = true }
  }, [businessId])

  const isPrefilled = !!businessId && !!answers

  return (
    <main className="bg-white text-gray-900 min-h-screen print:bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 print:px-0 print:py-4">
        <header className="mb-8 pb-6 border-b border-gray-200">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            CloudGreet · Agent customization
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            {isPrefilled && businessName
              ? `${businessName} - agent customization`
              : 'Tell us how to build your agent.'}
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xl">
            {isPrefilled
              ? 'Pre-filled with what we already know. Review the answers, fill in the gaps, and we\'ll build your agent from this.'
              : 'This is a printable copy. The fastest way is the web form your rep emailed you - it autosaves, validates, and sends straight to our team.'}
          </p>
          {loadError && (
            <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
              {loadError}
            </div>
          )}
        </header>

        <div className="mb-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="space-y-8">
          {FORM_SECTIONS.map((section, sIdx) => (
            <section key={section.id} className="break-inside-avoid">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
                Section {sIdx + 1}
              </div>
              <h2 className="text-lg font-medium tracking-tight mb-1">{section.title}</h2>
              <p className="text-xs text-gray-500 italic mb-4">{section.blurb}</p>
              <div className="space-y-4">
                {section.fields.map((f) => {
                  const val = isPrefilled ? answers![f.id] : undefined
                  return (
                    <div key={f.id} className="break-inside-avoid">
                      <div className="text-sm font-medium">
                        {f.label}
                        {f.required && <span className="text-rose-500 ml-1">*</span>}
                      </div>
                      {f.hint && <div className="text-xs text-gray-500 italic mt-0.5">{f.hint}</div>}
                      {/* Filled answer if present, else blank lines for handwriting. */}
                      {isPrefilled ? (
                        <FilledAnswer kind={f.kind} value={val} options={f.options} />
                      ) : (
                        <BlankAnswer kind={f.kind} />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-4 border-t border-gray-200 text-[10px] font-mono uppercase tracking-[0.25em] text-gray-400">
          CloudGreet · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  )
}

function BlankAnswer({ kind }: { kind: string }) {
  return (
    <>
      <div className="mt-2 border-b border-dashed border-gray-300 h-6 print:h-8" />
      {(kind === 'longtext' || kind === 'list') && (
        <>
          <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
          <div className="border-b border-dashed border-gray-300 h-6 print:h-8" />
        </>
      )}
      {kind === 'kv-list' && (
        <div className="mt-1 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div className="border-b border-dashed border-gray-300 h-6 print:h-7" />
              <div className="border-b border-dashed border-gray-300 h-6 print:h-7" />
            </div>
          ))}
        </div>
      )}
      {kind === 'time-grid' && (
        <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-gray-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="border border-gray-200 rounded p-1.5 h-12 flex flex-col items-center">
              <div>{d}</div>
            </div>
          ))}
        </div>
      )}
      {kind === 'yesno' && (
        <div className="mt-1 text-xs text-gray-500 flex gap-4">
          <span>☐ Yes</span><span>☐ No</span>
        </div>
      )}
    </>
  )
}

function FilledAnswer({ kind, value, options }: { kind: string; value: any; options?: string[] }) {
  const empty = value === undefined || value === null || value === ''
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)

  if (empty) {
    return (
      <div className="mt-2 italic text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 inline-block">
        ✎ Please fill in
      </div>
    )
  }

  switch (kind) {
    case 'text':
    case 'longtext':
      return (
        <div className="mt-2 text-sm whitespace-pre-line border-l-2 border-gray-900 pl-3 py-1">
          {String(value)}
        </div>
      )
    case 'list':
      return (
        <ul className="mt-2 text-sm border-l-2 border-gray-900 pl-3 py-1 space-y-0.5">
          {(value as string[]).map((line, i) => <li key={i}>· {line}</li>)}
        </ul>
      )
    case 'yesno':
      return (
        <div className="mt-1 text-xs text-gray-700 flex gap-4">
          <span>{value === 'yes' ? '☑' : '☐'} Yes</span>
          <span>{value === 'no' ? '☑' : '☐'} No</span>
        </div>
      )
    case 'select':
      return (
        <div className="mt-2 text-sm border-l-2 border-gray-900 pl-3 py-1">{String(value)}</div>
      )
    case 'kv-list':
      return (
        <div className="mt-2 border-l-2 border-gray-900 pl-3 py-1 space-y-1 text-sm">
          {(value as { key: string; value: string }[]).map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div className="text-gray-700">{row.key}</div>
              <div>{row.value}</div>
            </div>
          ))}
        </div>
      )
    case 'time-grid': {
      const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const v = value as Record<string, { open?: string; close?: string; closed?: boolean }>
      return (
        <div className="mt-2 grid grid-cols-7 gap-1 text-[10px]">
          {days.map((d) => {
            const slot = v?.[d]
            return (
              <div key={d} className="border border-gray-300 rounded p-1.5 h-12 flex flex-col items-center justify-center">
                <div className="font-medium text-gray-700">{d}</div>
                {slot?.closed
                  ? <div className="text-rose-600">closed</div>
                  : (slot?.open && slot?.close)
                    ? <div className="text-gray-700">{slot.open}-{slot.close}</div>
                    : <div className="text-gray-400">—</div>}
              </div>
            )
          })}
        </div>
      )
    }
    default:
      return (
        <div className="mt-2 text-sm border-l-2 border-gray-900 pl-3 py-1">
          {JSON.stringify(value)}
        </div>
      )
  }
}
