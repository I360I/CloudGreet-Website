'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Phone, EnvelopeSimple, ChatText, Link as LinkIcon, Copy, CheckCircle, CircleNotch, Trophy, ArrowSquareOut, Sparkle, ListChecks, GearSix, SignIn, Trash } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

export type CloseRow = {
  id: string
  prospect_business_name: string
  prospect_contact_name: string | null
  prospect_email: string | null
  prospect_phone: string | null
  agreed_monthly_cents: number
  agreed_setup_fee_cents: number | null
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  created_at: string
  notes: string | null
  business_id: string | null
  subscription_status: string | null
  account_status: string | null
  demo_agent_status: 'pending' | 'building' | 'ready' | 'skipped' | null
  demo_agent_test_phone: string | null
  customization_status: 'not_sent' | 'sent' | 'submitted' | 'building' | 'ready' | 'live' | null
  business_phone_number: string | null
  business_greeting: string | null
  business_voice_id: string | null
  demo_scheduled_at?: string | null
  demo_result?: 'pending' | 'won' | 'lost' | 'no_show' | 'needs_followup' | 'reschedule' | 'ghosted' | null
  demo_result_at?: string | null
  demo_result_notes?: string | null
}

/**
 * Slide-in detail panel for a single close.
 *
 * Lifecycle-aware layout - shows the rep:
 *   1. who the close is and the agreed dollars
 *   2. the right next-step CTAs for the current state
 *   3. once the agent is connected, the agent number and quick edits
 *   4. status of the customization form + demo agent
 *
 * Renders inline next to the closes list. Closes via X / ESC / backdrop.
 */
export type PaymentLinkOverrides = {
  monthly_cents?: number
  setup_fee_cents?: number
  email?: string
}

export function CloseDetailPanel({
  close, paymentUrl, onClose, onPaymentLink, onPaymentLinkBusy, onCopy, paymentError,
}: {
  close: CloseRow
  paymentUrl: string | null
  onClose: () => void
  onPaymentLink: (overrides?: PaymentLinkOverrides) => void
  onPaymentLinkBusy: boolean
  onCopy: () => void
  paymentError?: string
}) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const stage = pickStage(close)

  const monthly = (close.agreed_monthly_cents / 100).toFixed(2)
  const setup = close.agreed_setup_fee_cents
    ? (close.agreed_setup_fee_cents / 100).toFixed(2)
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
    >
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-gray-200 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
              Close
            </div>
            <h2 className="text-xl font-medium tracking-tight text-gray-900 truncate">
              {close.prospect_business_name}
            </h2>
            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {close.prospect_contact_name && <span>{close.prospect_contact_name}</span>}
              {close.prospect_email && (
                <span className="inline-flex items-center gap-1">
                  <EnvelopeSimple className="w-3 h-3" /> {close.prospect_email}
                </span>
              )}
              {close.prospect_phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {close.prospect_phone}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-700 mt-2 tabular-nums">
              <span className="font-medium">${monthly}/mo</span>
              {setup && <span className="text-gray-500"> + ${setup} setup</span>}
              <span className="text-gray-300 mx-2">·</span>
              <span className="text-gray-500">{new Date(close.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1 -m-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <StageStrip stage={stage} />

          {/* Stage-aware action sections */}
          {(stage === 'pending' || stage === 'invoice_sent') && (
            <>
              <PaymentSection
                close={close}
                paymentUrl={paymentUrl}
                onGenerate={onPaymentLink}
                busy={onPaymentLinkBusy}
                onCopy={onCopy}
                error={paymentError}
              />
              {!close.business_id && (
                <AccountLinkCard closeId={close.id} prospectEmail={close.prospect_email} />
              )}
              <DemoCard close={close} />
            </>
          )}

          {stage === 'paid' && (
            <>
              <DemoCard close={close} />
              <CustomizationSection close={close} />
              <DemoAgentSection close={close} />
              {close.customization_status === 'live' && close.business_phone_number && (
                <AgentNumberCard close={close} />
              )}
              {close.business_id && <QuickEditsCard close={close} />}
            </>
          )}

          {(stage === 'cancelled' || stage === 'rejected') && (
            <Card title="Closed out">
              <p className="text-sm text-gray-600">
                This close is marked <span className="font-mono">{close.status}</span>.
                {close.notes && <> Notes: {close.notes}</>}
              </p>
            </Card>
          )}

          {/* Notes - always visible if present */}
          {close.notes && stage !== 'cancelled' && stage !== 'rejected' && (
            <Card title="Notes" subtle>
              <p className="text-sm text-gray-700 whitespace-pre-line">{close.notes}</p>
            </Card>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}

type Stage = 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'

function pickStage(c: CloseRow): Stage {
  return c.status
}

function StageStrip({ stage }: { stage: Stage }) {
  const steps: { key: Stage | 'live'; label: string }[] = [
    { key: 'pending', label: 'Submitted' },
    { key: 'invoice_sent', label: 'Link sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'live', label: 'Agent live' },
  ]
  const activeIdx = stage === 'paid' ? 2 : stage === 'invoice_sent' ? 1 : stage === 'pending' ? 0 : -1
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">
        Lifecycle
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((s, i) => {
          const done = activeIdx >= 0 && i < activeIdx
          const current = i === activeIdx
          return (
            <li key={s.key} className="text-center">
              <div className={`mx-auto h-1.5 rounded-full mb-1.5 ${
                done ? 'bg-emerald-500'
                : current ? 'bg-gray-900'
                : 'bg-gray-200'
              }`} />
              <div className={`text-[10px] font-mono uppercase tracking-wider ${
                done ? 'text-emerald-700'
                : current ? 'text-gray-900'
                : 'text-gray-400'
              }`}>
                {s.label}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function PaymentSection({
  close, paymentUrl, onGenerate, busy, onCopy, error,
}: {
  close: CloseRow
  paymentUrl: string | null
  onGenerate: (overrides?: PaymentLinkOverrides) => void
  busy: boolean
  onCopy: () => void
  error?: string
}) {
  // Form defaults from the close's agreed amounts. If the close was
  // created from a "send booking link" flow with no pricing yet, monthly
  // will be 0 and the rep needs to fill it in here.
  const [monthly, setMonthly] = useState<string>(
    close.agreed_monthly_cents ? String(close.agreed_monthly_cents / 100) : '',
  )
  const [setupFee, setSetupFee] = useState<string>(
    close.agreed_setup_fee_cents ? String(close.agreed_setup_fee_cents / 100) : '',
  )
  const [overrideEmail, setOverrideEmail] = useState<string>('')

  const monthlyNum = parseFloat(monthly || '0')
  const setupNum = parseFloat(setupFee || '0')
  const monthlyValid = Number.isFinite(monthlyNum) && monthlyNum >= 50
  const needEmail = !close.prospect_email
  const emailValid = !needEmail || /^\S+@\S+\.\S+$/.test(overrideEmail.trim())

  const submit = () => {
    if (!monthlyValid || !emailValid) return
    onGenerate({
      monthly_cents: Math.round(monthlyNum * 100),
      setup_fee_cents: Math.round((Number.isFinite(setupNum) ? setupNum : 0) * 100),
      ...(needEmail ? { email: overrideEmail.trim() } : {}),
    })
  }

  const emailDeepLink = close.prospect_email && paymentUrl
    ? `mailto:${close.prospect_email}?subject=${encodeURIComponent(`Payment link · CloudGreet for ${close.prospect_business_name}`)}&body=${encodeURIComponent(`Here's the payment link to get started:\n\n${paymentUrl}\n\nLet me know if you have any questions.`)}`
    : null
  const smsDeepLink = close.prospect_phone && paymentUrl
    ? `sms:${close.prospect_phone}?&body=${encodeURIComponent(`Payment link to get started with CloudGreet: ${paymentUrl}`)}`
    : null
  return (
    <Card
      title={paymentUrl ? 'Payment link sent' : 'Next: send payment link'}
      icon={<LinkIcon weight="fill" className="w-4 h-4 text-emerald-600" />}
    >
      {paymentUrl ? (
        <>
          <div className="flex items-center gap-2">
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-xs font-mono text-emerald-700 hover:text-emerald-900 truncate border border-emerald-200 bg-emerald-50/50 rounded-lg px-3 py-2"
            >
              {paymentUrl.replace(/^https?:\/\//, '')}
            </a>
            <button
              onClick={onCopy}
              className="text-xs inline-flex items-center gap-1 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {emailDeepLink && (
              <a href={emailDeepLink} className="text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1">
                <EnvelopeSimple className="w-3.5 h-3.5" /> Email it
              </a>
            )}
            {smsDeepLink && (
              <a href={smsDeepLink} className="text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1">
                <ChatText className="w-3.5 h-3.5" /> Text it
              </a>
            )}
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            Payment auto-creates the client account and credits your commission. Status flips to <span className="font-mono">paid</span> on the Stripe webhook.
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700 mb-3">
            Set the agreed pricing and generate a Stripe Checkout link.
            Stripe requires <span className="font-mono">$50</span> minimum monthly.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-1">
                Monthly $
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  step={1}
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  placeholder="200"
                  className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-1">
                Setup $
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  max={50000}
                  step={1}
                  value={setupFee}
                  onChange={(e) => setSetupFee(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
          </div>
          {needEmail && (
            <div className="mb-3">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-1">
                Prospect email <span className="text-amber-700">(close has none)</span>
              </label>
              <input
                type="email"
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
                placeholder="prospect@example.com"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          )}
          <button
            onClick={submit}
            disabled={busy || !monthlyValid || !emailValid}
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-3.5 py-2 hover:bg-gray-800 disabled:opacity-60"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" weight="bold" />}
            Generate payment link
          </button>
          {!monthlyValid && monthly !== '' && (
            <div className="mt-2 text-[11px] text-amber-700">
              Monthly must be at least $50.
            </div>
          )}
          {error && (
            <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function DemoCard({ close }: { close: CloseRow }) {
  const [scheduledAt, setScheduledAt] = useState(close.demo_scheduled_at || '')
  const [result, setResult] = useState<NonNullable<CloseRow['demo_result']>>(
    (close.demo_result || 'pending') as NonNullable<CloseRow['demo_result']>,
  )
  const [notes, setNotes] = useState(close.demo_result_notes || '')
  const [busy, setBusy] = useState<'date' | 'result' | null>(null)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)

  const upcoming = scheduledAt && new Date(scheduledAt).getTime() > Date.now()
  const past = scheduledAt && new Date(scheduledAt).getTime() <= Date.now()

  const save = async (body: any, kind: 'date' | 'result') => {
    setBusy(kind)
    try {
      const r = await fetchWithAuth(`/api/sales/closes/${close.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setSavedFlash(j?.error || 'Save failed')
      } else {
        setSavedFlash('Saved')
      }
      setTimeout(() => setSavedFlash(null), 1800)
    } finally {
      setBusy(null)
    }
  }

  const RESULTS: { v: NonNullable<CloseRow['demo_result']>; label: string }[] = [
    { v: 'pending',         label: 'Pending' },
    { v: 'won',             label: 'Won' },
    { v: 'lost',            label: 'Lost' },
    { v: 'no_show',         label: 'No-show' },
    { v: 'needs_followup',  label: 'Follow-up' },
    { v: 'reschedule',      label: 'Reschedule' },
    { v: 'ghosted',         label: 'Ghosted' },
  ]

  return (
    <Card
      title={upcoming ? 'Demo booked' : past ? 'Demo' : 'Demo'}
      icon={<Sparkle weight="fill" className="w-4 h-4 text-violet-600" />}
    >
      <div>
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">
          Demo date / time
        </label>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={toLocalInput(scheduledAt)}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={() => save({ demo_scheduled_at: scheduledAt || null }, 'date')}
            disabled={busy === 'date'}
            className="text-xs bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-3 py-2 disabled:opacity-60"
          >
            {busy === 'date' ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
          </button>
        </div>
        {upcoming && (
          <div className="mt-1 text-[11px] text-violet-700">
            Upcoming · {formatNice(scheduledAt)}
          </div>
        )}
        {past && (
          <div className="mt-1 text-[11px] text-sky-700">
            Past · {formatNice(scheduledAt)}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 block">
          Demo result
        </label>
        <div className="flex flex-wrap gap-1.5">
          {RESULTS.map((opt) => (
            <button
              key={opt.v}
              onClick={() => {
                setResult(opt.v)
                void save({ demo_result: opt.v, demo_result_notes: notes || null }, 'result')
              }}
              className={`text-xs rounded-lg px-2.5 py-1 border transition-colors ${
                result === opt.v
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">
          Result notes (optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if ((notes || '') !== (close.demo_result_notes || '')) {
              void save({ demo_result_notes: notes || null }, 'result')
            }
          }}
          placeholder="Anything worth remembering for the next touch."
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-y"
        />
      </div>

      {savedFlash && (
        <div className="mt-2 text-[11px] text-emerald-700">{savedFlash}</div>
      )}
    </Card>
  )
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  // Convert to local datetime-local format yyyy-mm-ddTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatNice(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function CustomizationSection({ close }: { close: CloseRow }) {
  const status = close.customization_status || 'not_sent'
  const stateLabel: Record<string, string> = {
    not_sent: 'Not sent yet',
    sent: 'Sent · waiting on client',
    submitted: 'Submitted by client',
    building: 'CloudGreet building agent',
    ready: 'Agent ready for review',
    live: 'Live',
  }
  const tone = status === 'submitted' || status === 'building' || status === 'ready' || status === 'live'
    ? 'emerald'
    : 'amber'
  return (
    <Card
      title="Customization form"
      icon={<ListChecks weight="fill" className={`w-4 h-4 ${tone === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`} />}
    >
      <div className="text-sm text-gray-800">{stateLabel[status]}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {(status === 'not_sent' || status === 'sent') && (
          <NextStepHint>
            {status === 'not_sent'
              ? 'Send the form so the client can fill it out. Or admin can pre-fill it for them.'
              : 'Form is in their inbox. Nudge them after a couple of days if no response.'}
          </NextStepHint>
        )}
        {(status === 'submitted' || status === 'building') && (
          <NextStepHint>CloudGreet team is on it. You&apos;ll see the agent here once it&apos;s ready.</NextStepHint>
        )}
      </div>
    </Card>
  )
}

function DemoAgentSection({ close }: { close: CloseRow }) {
  if (!close.demo_agent_status) return null
  const labelMap: Record<NonNullable<CloseRow['demo_agent_status']>, { label: string; tone: 'sky' | 'emerald' | 'gray' | 'amber' }> = {
    pending: { label: 'Pending build', tone: 'amber' },
    building: { label: 'Building', tone: 'sky' },
    ready: { label: 'Ready', tone: 'emerald' },
    skipped: { label: 'Skipped', tone: 'gray' },
  }
  const { label, tone } = labelMap[close.demo_agent_status]
  const toneCls =
    tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' :
    tone === 'sky'     ? 'border-sky-200 bg-sky-50/50 text-sky-900' :
    tone === 'amber'   ? 'border-amber-200 bg-amber-50/50 text-amber-900' :
                         'border-gray-200 bg-gray-50/50 text-gray-700'
  return (
    <Card
      title="Demo agent"
      icon={<Trophy weight="fill" className={`w-4 h-4 ${tone === 'emerald' ? 'text-emerald-600' : 'text-gray-500'}`} />}
    >
      <div className={`rounded-lg border px-3 py-2 text-sm ${toneCls}`}>
        {label}
        {close.demo_agent_status === 'ready' && close.demo_agent_test_phone && (
          <div className="mt-1 font-mono text-xs">
            Test number:{' '}
            <a href={`tel:${close.demo_agent_test_phone}`} className="underline">
              {close.demo_agent_test_phone}
            </a>
          </div>
        )}
      </div>
      {close.demo_agent_status === 'ready' && close.demo_agent_test_phone && (
        <NextStepHint>
          Call the test number on speaker during your follow-up so the prospect hears it live.
        </NextStepHint>
      )}
    </Card>
  )
}

function AgentNumberCard({ close }: { close: CloseRow }) {
  const num = close.business_phone_number!
  return (
    <Card
      title="Live agent number"
      icon={<Phone weight="fill" className="w-4 h-4 text-emerald-600" />}
    >
      <div className="flex items-center justify-between gap-3 bg-gray-900 text-white rounded-xl px-4 py-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
            Forwarding to
          </div>
          <div className="text-lg font-mono mt-0.5">{num}</div>
        </div>
        <a
          href={`tel:${num}`}
          className="inline-flex items-center gap-1.5 bg-white text-gray-900 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-100"
        >
          <Phone weight="fill" className="w-3.5 h-3.5" /> Call
        </a>
      </div>
    </Card>
  )
}

function QuickEditsCard({ close }: { close: CloseRow }) {
  return (
    <Card
      title="Quick edits"
      icon={<Sparkle weight="fill" className="w-4 h-4 text-violet-600" />}
    >
      <div className="space-y-2">
        {close.business_greeting && (
          <div className="text-xs">
            <div className="text-gray-500 uppercase font-mono tracking-wider mb-1">Greeting</div>
            <div className="text-gray-800 line-clamp-2 italic">&ldquo;{close.business_greeting}&rdquo;</div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <Link
            href={`/sales/clients/${close.business_id}`}
            className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:text-violet-900"
          >
            <GearSix className="w-4 h-4" /> Open full agent editor
            <ArrowSquareOut className="w-3.5 h-3.5" />
          </Link>
          <LoginAsClientLink businessId={close.business_id!} businessName={close.prospect_business_name} />
          <DeleteClientLink businessId={close.business_id!} businessName={close.prospect_business_name} />
        </div>
      </div>
      <NextStepHint>
        Voice, greeting, edge cases, and Cal.com all editable in the full editor.
      </NextStepHint>
    </Card>
  )
}

function Card({
  title, icon, children, subtle,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  subtle?: boolean
}) {
  return (
    <section className={`${subtle ? 'bg-gray-50/50' : 'bg-white'} border border-gray-200 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function NextStepHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-[11px] text-gray-500 leading-snug">
      <span className="text-gray-400 font-mono uppercase tracking-wider mr-1.5">Next:</span>
      {children}
    </div>
  )
}


/**
 * Inline-link versions of LoginAsClient / DeleteClient for the
 * closes detail Quick edits card. Same endpoints as the lead page
 * buttons; rendered as text links since they sit next to "Open full
 * agent editor" rather than in a button row.
 */
function LoginAsClientLink({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    setBusy(true)
    try {
      const r = await fetch(`/api/sales/clients/${businessId}/impersonate`, {
        method: 'POST', credentials: 'include',
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        const { clearClientAuthState } = await import('@/lib/auth/session-guard')
        clearClientAuthState()
        window.location.href = j.redirect_url || '/dashboard'
      } else alert(j?.error || 'Could not sign in as this client')
    } catch { alert('Could not sign in as this client') }
    finally { setBusy(false) }
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:text-sky-900 disabled:opacity-60"
      title={`Sign in as ${businessName}`}
    >
      {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <SignIn className="w-4 h-4" />} Login as client
    </button>
  )
}

function DeleteClientLink({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    const ok = confirm(`Delete "${businessName}"?

Wipes account, calls, appointments, and AI agent. Lead is reset so you can re-pitch.`)
    if (!ok) return
    const reason = window.prompt('Reason for audit trail:', 'rep deleted client')
    if (!reason || reason.trim().length < 4) return
    setBusy(true)
    try {
      const r = await fetch(`/api/sales/clients/${businessId}/delete`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) window.location.href = '/sales/closes'
      else if (j?.error === 'subscription_active') {
        const force = confirm(`${j.detail || 'Active subscription'}

Delete anyway?`)
        if (!force) return
        const r2 = await fetch(`/api/sales/clients/${businessId}/delete`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim(), force: true }),
        })
        const j2 = await r2.json().catch(() => ({}))
        if (r2.ok && j2?.success) window.location.href = '/sales/closes'
        else alert(j2?.error || 'Delete failed')
      } else alert(j?.error || 'Delete failed')
    } catch { alert('Delete failed') }
    finally { setBusy(false) }
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900 disabled:opacity-60"
      title={`Fully delete ${businessName}`}
    >
      {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />} Delete client
    </button>
  )
}

/**
 * Account-link card for the closes detail. Mints a self-serve invite
 * via the closes account-link endpoint and gives the rep both an
 * "email it" button and a "copy it" button. Use during a demo when
 * the prospect can create their account live on the call.
 */
function AccountLinkCard({ closeId, prospectEmail }: {
  closeId: string
  prospectEmail: string | null
}) {
  const [busy, setBusy] = useState<'send' | 'copy' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const generate = async (sendEmail: boolean) => {
    if (!prospectEmail) { setMsg({ tone: 'err', text: 'No prospect email on this close' }); return }
    setBusy(sendEmail ? 'send' : 'copy'); setMsg(null)
    try {
      const r = await fetchWithAuth(`/api/sales/closes/${closeId}/account-link`, {
        method: 'POST',
        body: JSON.stringify({ email: prospectEmail, send_email: sendEmail }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setMsg({ tone: 'err', text: j?.error || `Failed (${r.status})` })
        return
      }
      if (sendEmail) {
        setMsg({ tone: 'ok', text: j.email_sent ? 'Emailed!' : 'Link ready (email failed)' })
      } else {
        try {
          await navigator.clipboard.writeText(j.url)
          setMsg({ tone: 'ok', text: 'Copied!' })
        } catch {
          setMsg({ tone: 'err', text: `Copy blocked. Link: ${j.url}` })
        }
      }
    } catch {
      setMsg({ tone: 'err', text: 'Failed' })
    } finally {
      setBusy(null)
      if (msg) setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <Card
      title="Self-serve account link"
      icon={<Sparkle weight="fill" className="w-4 h-4 text-indigo-600" />}
    >
      <p className="text-xs text-gray-600 mb-3">
        Give the prospect a link to set up their own account during the demo - they pick the password, no follow-up needed.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => generate(true)}
          disabled={busy !== null || !prospectEmail}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy === 'send' ? <CircleNotch className="w-4 h-4 animate-spin" /> : <EnvelopeSimple weight="fill" className="w-4 h-4" />}
          Send create-account link
        </button>
        <button
          onClick={() => generate(false)}
          disabled={busy !== null || !prospectEmail}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy === 'copy' ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Copy weight="fill" className="w-4 h-4 text-gray-400" />}
          Copy create-account link
        </button>
        {msg && (
          <span className={`text-[11px] ${msg.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  )
}
