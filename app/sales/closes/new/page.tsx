'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, WarningCircle, ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader } from '../../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

export const dynamic = 'force-dynamic'

function NewCloseForm() {
  const router = useRouter()
  const search = useSearchParams()
  const leadId = search?.get('lead_id') || null

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [monthly, setMonthly] = useState('')
  const [setupFee, setSetupFee] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/leads')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        const lead = (j.leads || []).find((l: any) => l.id === leadId)
        if (lead) {
          setBusinessName(lead.business_name || '')
          setContactName(lead.contact_name || '')
          setEmail(lead.email || '')
          setPhone(lead.phone || '')
        }
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [leadId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const monthlyNum = Math.round(parseFloat(monthly || '0') * 100)
      const setupNum = Math.round(parseFloat(setupFee || '0') * 100)
      const res = await fetchWithAuth('/api/sales/closes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_business_name: businessName,
          prospect_contact_name: contactName || null,
          prospect_email: email || null,
          prospect_phone: phone || null,
          agreed_monthly_cents: monthlyNum,
          agreed_setup_fee_cents: setupNum,
          notes: notes || null,
          lead_id: leadId,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Failed to submit')
        setSubmitting(false)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/sales/closes'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <SalesShell activeLabel="Prospects">
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <CheckCircle weight="fill" className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-medium text-gray-900 mb-1">Close submitted</h1>
          <p className="text-sm text-gray-500">
            The team will review and send the payment link. You&apos;ll see it move to &quot;Invoice sent&quot;.
          </p>
        </section>
      </SalesShell>
    )
  }

  return (
    <SalesShell activeLabel="Prospects">
      <section className="max-w-xl mx-auto px-6 py-10">
        <Link
          href="/sales/closes"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Closes
        </Link>
        <SalesPageHeader eyebrow="new close" title="Submit a close" />

        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field label="Business name" required>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className={inputCls}
              placeholder="Joe's Plumbing LLC"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contact name">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputCls}
                placeholder="Joe Smith"
              />
            </Field>
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="(555) 123-4567"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="joe@joesplumbing.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly ($)" required>
              <input
                type="number"
                step="0.01"
                min="10"
                max="10000"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Setup fee ($)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10000"
                value={setupFee}
                onChange={(e) => setSetupFee(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Notes (optional)" hint="Anything the team should know before sending the payment link">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder="They wanted to start Monday, asked about Spanish support, etc."
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              href="/sales/closes"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {submitting && <CircleNotch className="w-4 h-4 animate-spin" />}
              Submit close
            </button>
          </div>
        </form>
      </section>
    </SalesShell>
  )
}

const inputCls =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400'

function Field({
  label, required, hint, children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </label>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewCloseForm />
    </Suspense>
  )
}
