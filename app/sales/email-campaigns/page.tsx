'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  EnvelopeSimple, Plus, CircleNotch, WarningCircle, CheckCircle, X,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignStatus = 'draft' | 'sending' | 'paused' | 'complete'

type Campaign = {
  id: string
  name: string
  from_name: string
  from_email: string
  reply_to: string | null
  subject: string
  signature: string | null
  status: CampaignStatus
  sent_count: number
  bounce_count: number
  reply_count: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  draft:    { label: 'Draft',    classes: 'bg-gray-100 text-gray-600' },
  sending:  { label: 'Sending',  classes: 'bg-sky-100 text-sky-700' },
  paused:   { label: 'Paused',   classes: 'bg-amber-100 text-amber-700' },
  complete: { label: 'Complete', classes: 'bg-emerald-100 text-emerald-700' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status as CampaignStatus] || { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${s.classes}`}>
      {s.label}
    </span>
  )
}

function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Default template content
// ---------------------------------------------------------------------------

const DEFAULT_SUBJECT = 'Following up on {{business_name}}'

const DEFAULT_BODY = `Hi {{first_name}},

I wanted to reach out about {{business_name}} -- we help local service businesses answer every call and book more clients automatically with AI, 24/7.

Most clients see more booked appointments within the first week without hiring anyone.

Worth a quick 10-minute call to see if it makes sense for {{business_name}}?

{{signature}}`

// ---------------------------------------------------------------------------
// New Campaign Modal
// ---------------------------------------------------------------------------

function NewCampaignModal({
  repEmail,
  lastSignature,
  onClose,
  onCreate,
}: {
  repEmail: string
  lastSignature: string | null
  onClose: () => void
  onCreate: (campaign: Campaign) => void
}) {
  const [form, setForm] = useState({
    name: '',
    from_name: 'CloudGreet',
    from_email_prefix: repEmail.split('@')[0] || '',
    reply_to: repEmail,
    subject: '',
    body_template: '',
    signature: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const sigRef = useRef<HTMLDivElement>(null)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const fillDefault = () => {
    setForm((f) => ({ ...f, subject: DEFAULT_SUBJECT, body_template: DEFAULT_BODY }))
  }

  const submit = async () => {
    if (!form.name.trim()) { setErr('Campaign name is required.'); return }
    if (!form.subject.trim()) { setErr('Subject is required.'); return }
    if (!form.body_template.trim()) { setErr('Body template is required.'); return }
    setSaving(true); setErr('')
    try {
      const from_email = form.from_email_prefix
        ? `${form.from_email_prefix}@getcloudgreet.com`
        : repEmail
      const signature = sigRef.current?.innerHTML || form.signature || null
      const res = await fetchWithAuth('/api/sales/email-campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...form, from_email, signature }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create campaign')
      onCreate(json.campaign as Campaign)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <EnvelopeSimple weight="duotone" className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">New Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Campaign name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. June HVAC outreach"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">From name</label>
              <input
                value={form.from_name}
                onChange={(e) => set('from_name', e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">From email</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-gray-900 transition-colors">
                <input
                  value={form.from_email_prefix}
                  onChange={(e) => set('from_email_prefix', e.target.value.replace(/[@\s]/g, ''))}
                  placeholder="sales"
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-white text-sm focus:outline-none"
                />
                <span className="px-3 py-2.5 bg-gray-50 border-l border-gray-200 text-sm text-gray-500 select-none whitespace-nowrap">
                  @getcloudgreet.com
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Forward replies to</label>
            <input
              value={form.reply_to}
              onChange={(e) => set('reply_to', e.target.value)}
              placeholder="Defaults to from email"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject line</label>
            <input
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="e.g. Following up on {{business_name}}"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">Supports: {'{{first_name}}'}, {'{{business_name}}'}, {'{{city}}'}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">Body template</label>
              <button
                type="button"
                onClick={fillDefault}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors"
              >
                Use default template
              </button>
            </div>
            <textarea
              rows={10}
              value={form.body_template}
              onChange={(e) => set('body_template', e.target.value)}
              placeholder="Hi {{first_name}}, ..."
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-gray-900 transition-colors resize-y"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Variables: {'{{first_name}}'}, {'{{business_name}}'}, {'{{city}}'}, {'{{from_name}}'}, {'{{signature}}'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">
                Signature <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {lastSignature && !form.signature && (
                <button
                  type="button"
                  onClick={() => {
                    set('signature', lastSignature)
                    if (sigRef.current) sigRef.current.innerHTML = lastSignature
                  }}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-medium transition-colors"
                >
                  Reuse last signature
                </button>
              )}
            </div>
            <div
              ref={sigRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => set('signature', sigRef.current?.innerHTML || '')}
              className="w-full min-h-[80px] px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">Paste directly from Outlook, Apple Mail, or any email client to preserve images and formatting.</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <WarningCircle weight="fill" className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-colors"
          >
            {saving
              ? <CircleNotch className="w-4 h-4 animate-spin" />
              : <EnvelopeSimple weight="fill" className="w-4 h-4" />}
            Create campaign
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SalesEmailCampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [repEmail, setRepEmail] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [camRes, meRes] = await Promise.all([
        fetchWithAuth('/api/sales/email-campaigns'),
        fetchWithAuth('/api/sales/profile'),
      ])
      const camJson = await camRes.json().catch(() => ({}))
      const meJson = await meRes.json().catch(() => ({}))
      if (!camRes.ok) {
        setError(camJson?.error || 'Failed to load campaigns')
      } else {
        setCampaigns(camJson.campaigns || [])
      }
      if (meJson?.profile?.email) {
        setRepEmail(meJson.profile.email)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <SalesShell activeLabel="Emails">
      {showNew && (
        <NewCampaignModal
          repEmail={repEmail}
          lastSignature={campaigns.find((c) => c.signature)?.signature ?? null}
          onClose={() => setShowNew(false)}
          onCreate={(c) => {
            setShowNew(false)
            router.push(`/sales/email-campaigns/${c.id}`)
          }}
        />
      )}

      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="outreach"
          title="Email campaigns"
          action={
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3.5 py-2 transition-colors shadow-sm"
            >
              <Plus weight="bold" className="w-4 h-4" /> New campaign
            </button>
          }
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2"
            >
              <CheckCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{flash}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <SalesLoadingState />
        ) : campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mb-3">
              <PaperPlaneTilt weight="duotone" className="w-6 h-6" />
            </div>
            <h2 className="text-base font-medium text-gray-900 mb-1">No campaigns yet</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
              Create a campaign to start sending personalized cold outreach to your leads.
            </p>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 py-2 transition-colors"
            >
              <Plus weight="bold" className="w-4 h-4" /> New campaign
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Campaign', 'From', 'Status', 'Sent', 'Bounced', 'Created'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-gray-500 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${
                      i === campaigns.length - 1 ? 'border-b-0' : ''
                    }`}
                    onClick={() => router.push(`/sales/email-campaigns/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{c.from_email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">{c.sent_count}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{c.bounce_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
