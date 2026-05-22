'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, EnvelopeSimple, ArrowLeft, CircleNotch, WarningCircle, CheckCircle, Trash, CalendarBlank, ChatCircle, Trophy, Hash, MapPin, X, Copy, CurrencyDollar, Link as LinkIcon, UserPlus, SignIn, Trash as TrashIcon } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../../_components/SalesShell'
import { Modal } from '../../_components/Modal'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Lead = {
  id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  source: string | null
  notes: string | null
  status: string
  disposition: string | null
  follow_up_at: string | null
  last_touched_at: string | null
  touch_count: number
  claimed_at: string
}

type Note = { id: string; body: string; created_at: string }

const STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-700' },
  { value: 'called', label: 'Called', color: 'bg-sky-50 text-sky-700' },
  { value: 'voicemail', label: 'Voicemail', color: 'bg-violet-50 text-violet-700' },
  { value: 'interested', label: 'Interested', color: 'bg-amber-50 text-amber-700' },
  { value: 'demo_scheduled', label: 'Demo set', color: 'bg-amber-100 text-amber-800' },
  { value: 'proposal_sent', label: 'Proposal', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'dead', label: 'Dead', color: 'bg-gray-100 text-gray-500' },
  { value: 'do_not_call', label: 'DNC', color: 'bg-red-50 text-red-700' },
]

const formatPhone = (p: string | null) => {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return p
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [bookingUrl, setBookingUrl] = useState<string | null>(null)
  const [linkedBusiness, setLinkedBusiness] = useState<{ id: string; business_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [followUpInput, setFollowUpInput] = useState('')
  const [copiedDemo, setCopiedDemo] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payMonthly, setPayMonthly] = useState('')
  const [paySetup, setPaySetup] = useState('')
  const [payOverrideEmail, setPayOverrideEmail] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [copiedPay, setCopiedPay] = useState(false)

  // Onboarding (account + booking-link email)
  const [showOnbForm, setShowOnbForm] = useState(false)
  const [onbEmail, setOnbEmail] = useState('')
  const [onbScheduledAt, setOnbScheduledAt] = useState('')
  const [onbBusy, setOnbBusy] = useState(false)
  const [onbResult, setOnbResult] = useState<{
    login_url: string
    email: string
    temp_password: string
    booking_url: string | null
    email_sent: boolean
    email_error?: string | null
  } | null>(null)
  const [copiedPwd, setCopiedPwd] = useState(false)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/leads/${id}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Failed to load')
      } else {
        setLead(j.lead)
        setNotes(j.notes || [])
        setBookingUrl(j.booking_url || null)
        setLinkedBusiness(j.linked_business || null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])  // eslint-disable-line

  const patch = async (body: any) => {
    setWorking('patch')
    try {
      const res = await fetchWithAuth(`/api/sales/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Update failed')
      else await load()
    } finally {
      setWorking(null)
    }
  }

  const setStatus = (status: string) => patch({ status })
  const markTouched = () => patch({ touched: true })

  const setFollowUp = async () => {
    if (!followUpInput) return
    await patch({ follow_up_at: new Date(followUpInput).toISOString() })
    setFollowUpInput('')
  }

  const clearFollowUp = () => patch({ follow_up_at: null })

  const addNote = async () => {
    const body = noteInput.trim()
    if (!body) return
    setWorking('note')
    try {
      const res = await fetchWithAuth(`/api/sales/leads/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Note failed')
      else {
        setNotes((prev) => [j.note, ...prev])
        setNoteInput('')
      }
    } finally {
      setWorking(null)
    }
  }

  const deleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    await fetchWithAuth(`/api/sales/leads/${id}/notes?note_id=${noteId}`, { method: 'DELETE' })
  }

  const sendOnboarding = async () => {
    if (!lead) return
    setOnbBusy(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/leads/${lead.id}/send-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (onbEmail.trim() || lead.email || '').toLowerCase(),
          scheduled_at: onbScheduledAt
            ? new Date(onbScheduledAt).toISOString()
            : undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Failed to send onboarding')
      } else {
        setOnbResult({
          login_url: j.login_url,
          email: j.user.email,
          temp_password: j.temp_password,
          booking_url: j.booking_url,
          email_sent: !!j.email_sent,
          email_error: j.email_error || null,
        })
        await load()
      }
    } finally {
      setOnbBusy(false)
    }
  }

  const copyTempPwd = async () => {
    if (!onbResult) return
    try {
      await navigator.clipboard.writeText(
        `Email: ${onbResult.email}\nPassword: ${onbResult.temp_password}\nLogin: ${onbResult.login_url}`,
      )
      setCopiedPwd(true)
      setTimeout(() => setCopiedPwd(false), 2500)
    } catch { /* noop */ }
  }

  const copyBookingLink = async () => {
    if (!bookingUrl) return
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopiedDemo(true)
      patch({ touched: true })
      setTimeout(() => setCopiedDemo(false), 2500)
    } catch {
      setErr('Clipboard blocked. Copy manually: ' + bookingUrl)
    }
  }

  const generatePaymentLink = async () => {
    if (!lead) return
    setPayBusy(true); setErr('')
    try {
      const monthlyCents = Math.round(parseFloat(payMonthly || '0') * 100)
      const setupCents = Math.round(parseFloat(paySetup || '0') * 100)
      const res = await fetchWithAuth(`/api/sales/leads/${lead.id}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_cents: monthlyCents,
          setup_fee_cents: setupCents,
          email: payOverrideEmail.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Failed to generate link')
      } else {
        setPaymentUrl(j.url)
        try {
          await navigator.clipboard.writeText(j.url)
          setCopiedPay(true)
          setTimeout(() => setCopiedPay(false), 2500)
        } catch { /* clipboard may be denied */ }
        await load() // refresh status (now proposal_sent)
      }
    } finally {
      setPayBusy(false)
    }
  }

  const copyPaymentUrl = async () => {
    if (!paymentUrl) return
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setCopiedPay(true)
      setTimeout(() => setCopiedPay(false), 2500)
    } catch { /* noop */ }
  }

  const removeLead = async () => {
    if (!confirm('Remove this lead from your list? (The underlying record stays in the database.)')) return
    setWorking('delete')
    const res = await fetchWithAuth(`/api/sales/leads/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/sales/leads')
    else setWorking(null)
  }

  if (loading || !lead) {
    return (
      <SalesShell activeLabel="Leads">
        <section className="max-w-3xl mx-auto px-6 py-10">
          {err ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" /> {err}
            </div>
          ) : (
            <SalesLoadingState />
          )}
        </section>
      </SalesShell>
    )
  }

  const statusMeta = STATUSES.find((s) => s.value === lead.status) || STATUSES[0]

  return (
    <SalesShell activeLabel="Leads">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href="/sales/leads"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Leads
        </Link>

        <SalesPageHeader
          eyebrow="lead"
          title={lead.business_name}
          action={
            <div className="grid grid-cols-3 gap-2 w-full max-w-3xl [&>*]:w-full">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={(e) => {
                    markTouched()
                    if (typeof window !== 'undefined' && window.cgDial && lead.phone) {
                      e.preventDefault()
                      window.cgDial(lead.phone, lead.id)
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-[0.98] shadow-sm transition-all"
                >
                  <Phone weight="fill" className="w-4 h-4" /> Call
                </a>
              )}
              <button
                onClick={() => { setShowOnbForm((v) => !v); setShowPayForm(false); setOnbEmail(lead.email || '') }}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 active:scale-[0.98] shadow-sm shadow-violet-600/10 transition-all"
                title="Create their account + email login + your booking link"
              >
                <EnvelopeSimple weight="fill" className="w-4 h-4" /> Send booking link
              </button>
              <button
                onClick={() => { setShowPayForm((v) => !v); setShowOnbForm(false) }}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 active:scale-[0.98] shadow-sm shadow-emerald-600/10 transition-all"
              >
                <CurrencyDollar weight="fill" className="w-4 h-4" /> Send payment link
              </button>
              <CopyAccountLinkPrimary leadId={lead.id} leadEmail={lead.email || ''} />
              <MarkDemoButton leadId={lead.id} onSet={() => { void load() }} />
              <Link
                href={`/sales/closes/demo?lead_id=${lead.id}`}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
                title="Submit as a demo client - skips pricing, just gets the team the basics to start the agent build"
              >
                <Trophy weight="fill" className="w-4 h-4 text-emerald-500" /> Submit as demo client
              </Link>
              <LoginAsClientButton business={linkedBusiness} />
              <SendCustomizationButton leadId={lead.id} />
              <CreateAccountButton leadId={lead.id} leadEmail={lead.email || ''} onCreated={() => { void load() }} />
              <SendAccountLinkButton leadId={lead.id} leadEmail={lead.email || ''} />
              {linkedBusiness && (
                <DeleteClientButton businessId={linkedBusiness.id} businessName={linkedBusiness.business_name} onDeleted={() => { setLinkedBusiness(null); void load() }} />
              )}
              <a
                href="/sales/customization-template"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
                title="Print-friendly version of all the questions on the customization form"
              >
                <Hash weight="fill" className="w-4 h-4 text-gray-400" /> Download form
              </a>
              {bookingUrl ? (
                <button
                  onClick={copyBookingLink}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
                  title="Copy your booking link to clipboard"
                >
                  {copiedDemo
                    ? <><CheckCircle weight="fill" className="w-4 h-4 text-emerald-500" /> Copied</>
                    : <><CalendarBlank weight="fill" className="w-4 h-4 text-violet-500" /> Copy booking link</>}
                </button>
              ) : (
                <Link
                  href="/sales/settings"
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm text-gray-500 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-xl transition-all"
                  title="Add your booking URL"
                >
                  <CalendarBlank className="w-4 h-4" /> Add booking link
                </Link>
              )}
            </div>
          }
        />

        {err && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" /> {err}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5 text-sm space-y-1.5"
        >
          {lead.contact_name && <div className="text-gray-700">{lead.contact_name}</div>}
          {lead.phone && (
            <div>
              <a href={`tel:${lead.phone}`} className="text-gray-900 hover:underline">
                {formatPhone(lead.phone)}
              </a>
            </div>
          )}
          {lead.email && (
            <div>
              <a href={`mailto:${lead.email}`} className="text-gray-900 hover:underline">
                {lead.email}
              </a>
            </div>
          )}
          {lead.website && (
            <div>
              <a
                href={/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 hover:underline"
              >
                {lead.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          <Modal
            open={showOnbForm}
            onClose={() => setShowOnbForm(false)}
            title="Send booking link"
            icon={<EnvelopeSimple weight="duotone" className="w-5 h-5 text-violet-600" />}
          >
            <div>
                {onbResult ? (
                  <div className="space-y-3">
                    <div className="text-xs text-violet-900">
                      Account created and {onbResult.email_sent ? 'email sent.' : 'ready to share.'} Save these credentials - the temp password won&apos;t be shown again.
                    </div>
                    <div className="bg-white border border-violet-200 rounded-lg p-3 font-mono text-xs space-y-1">
                      <div><span className="text-violet-700">Email:</span> {onbResult.email}</div>
                      <div><span className="text-violet-700">Password:</span> {onbResult.temp_password}</div>
                      <div><span className="text-violet-700">Login:</span> <a href={onbResult.login_url} target="_blank" rel="noreferrer" className="text-violet-700 underline">{onbResult.login_url.replace(/^https?:\/\//, '')}</a></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copyTempPwd}
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-violet-200 hover:bg-violet-50 rounded-lg px-3 py-2 text-violet-800"
                      >
                        {copiedPwd
                          ? <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500" />
                          : <Copy className="w-3.5 h-3.5" />}
                        {copiedPwd ? 'Copied' : 'Copy login'}
                      </button>
                      <button
                        onClick={() => { setOnbResult(null); setShowOnbForm(false) }}
                        className="text-xs text-violet-800 hover:text-violet-900 px-2 py-2"
                      >
                        Done
                      </button>
                      {!onbResult.email_sent && (
                        <span className="text-[11px] text-amber-700 ml-auto truncate max-w-[260px]">
                          Email didn&apos;t go out{onbResult.email_error ? ` - ${onbResult.email_error}` : ''}. Copy + share manually.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {!lead.email && (
                      <div className="mb-3">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-violet-900 mb-1">
                          Prospect email (lead has none)
                        </label>
                        <input
                          type="email"
                          value={onbEmail}
                          onChange={(e) => setOnbEmail(e.target.value)}
                          placeholder="prospect@example.com"
                          className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                        />
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-violet-900 mb-1">
                        Demo time (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={onbScheduledAt}
                        onChange={(e) => setOnbScheduledAt(e.target.value)}
                        className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                      />
                      <p className="text-[11px] text-violet-700/80 mt-1">
                        Leave blank to email a &quot;pick a slot&quot; link. Set a time to tell
                        them their demo is already scheduled.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={sendOnboarding}
                        disabled={onbBusy || (!lead.email && !onbEmail.trim())}
                        className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-violet-700 disabled:opacity-60"
                      >
                        {onbBusy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <EnvelopeSimple weight="fill" className="w-4 h-4" />}
                        Send booking link
                      </button>
                      <button
                        onClick={() => setShowOnbForm(false)}
                        className="text-xs text-violet-800 hover:text-violet-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
            </div>
          </Modal>
          <Modal
            open={showPayForm}
            onClose={() => setShowPayForm(false)}
            title="Send payment link"
            icon={<CurrencyDollar weight="duotone" className="w-5 h-5 text-emerald-600" />}
          >
            <div>
                {paymentUrl ? (
                  <div className="space-y-2">
                    <div className="text-xs text-emerald-800">
                      Link generated. Send this URL to {lead.business_name} -
                      payment auto-creates their account and credits your commission.
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-xs font-mono text-emerald-700 hover:text-emerald-900 truncate border border-emerald-200 bg-white rounded-lg px-3 py-2"
                      >
                        {paymentUrl.replace(/^https?:\/\//, '')}
                      </a>
                      <button
                        onClick={copyPaymentUrl}
                        className="text-xs inline-flex items-center gap-1 border border-emerald-200 bg-white hover:bg-emerald-50 rounded-lg px-3 py-2 text-emerald-800"
                      >
                        {copiedPay ? <CheckCircle weight="fill" className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPay ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a
                        href={`mailto:${lead.email || ''}?subject=${encodeURIComponent(`Payment link - CloudGreet for ${lead.business_name}`)}&body=${encodeURIComponent(`Here's the payment link to get started:\n\n${paymentUrl}\n\nLet me know if you have any questions.`)}`}
                        className="text-xs text-emerald-800 hover:text-emerald-900"
                      >
                        Email it →
                      </a>
                      {lead.phone && (
                        <a
                          href={`sms:${lead.phone}?&body=${encodeURIComponent(`Payment link to get started with CloudGreet: ${paymentUrl}`)}`}
                          className="text-xs text-emerald-800 hover:text-emerald-900"
                        >
                          Text it →
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 mb-1">
                          Monthly $
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="50"
                            max="50000"
                            step="1"
                            value={payMonthly}
                            onChange={(e) => setPayMonthly(e.target.value)}
                            className="w-full bg-white border border-emerald-200 rounded-lg pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 mb-1">
                          Setup $
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            max="50000"
                            step="1"
                            value={paySetup}
                            onChange={(e) => setPaySetup(e.target.value)}
                            className="w-full bg-white border border-emerald-200 rounded-lg pl-6 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                    </div>
                    {!lead.email && (
                      <div className="mb-3">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 mb-1">
                          Email (lead has none)
                        </label>
                        <input
                          type="email"
                          value={payOverrideEmail}
                          onChange={(e) => setPayOverrideEmail(e.target.value)}
                          placeholder="prospect@example.com"
                          className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={generatePaymentLink}
                        disabled={payBusy || (!lead.email && !payOverrideEmail.trim())}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {payBusy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <LinkIcon weight="bold" className="w-4 h-4" />}
                        Generate
                      </button>
                      <button
                        onClick={() => setShowPayForm(false)}
                        className="text-xs text-emerald-800 hover:text-emerald-900"
                      >
                        Cancel
                      </button>
                      <div className="text-[11px] text-emerald-700/80 ml-auto">
                        50% of every paid invoice → you, auto-deposited Friday
                      </div>
                    </div>
                  </>
                )}
            </div>
          </Modal>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
            Status
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                disabled={working === 'patch'}
                className={`text-xs rounded-full px-3 py-1.5 border transition-all ${
                  lead.status === s.value
                    ? `${s.color} border-transparent font-medium ring-2 ring-gray-900/10`
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              Follow up
            </div>
            {lead.follow_up_at ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  <CalendarBlank weight="fill" className="w-3.5 h-3.5" />
                  {new Date(lead.follow_up_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </div>
                <button
                  onClick={clearFollowUp}
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={setFollowUp}
                  disabled={!followUpInput || working === 'patch'}
                  className="text-sm bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-800 disabled:opacity-60"
                >
                  Set
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: 'Tmrw 9am', tomorrowAt: 9 },
                { label: 'Mon 9am', mondayAt: 9 },
                { label: 'Next wk', days: 7 },
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const d = new Date()
                    if ('tomorrowAt' in preset && preset.tomorrowAt) {
                      d.setDate(d.getDate() + 1)
                      d.setHours(preset.tomorrowAt, 0, 0, 0)
                    } else if ('mondayAt' in preset && preset.mondayAt) {
                      const day = d.getDay()
                      const delta = (1 - day + 7) % 7 || 7
                      d.setDate(d.getDate() + delta)
                      d.setHours(preset.mondayAt, 0, 0, 0)
                    } else if ('days' in preset && preset.days) {
                      d.setDate(d.getDate() + preset.days)
                    }
                    patch({ follow_up_at: d.toISOString() })
                  }}
                  className="text-[11px] text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-900 rounded-md px-2 py-0.5 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <button
              onClick={removeLead}
              disabled={working === 'delete'}
              className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <Trash className="w-3 h-3" /> Remove from my list
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Notes</div>
            <div className="text-sm font-medium text-gray-900">
              {notes.length ? `${notes.length} entr${notes.length === 1 ? 'y' : 'ies'}` : 'Log calls + objections here'}
            </div>
          </div>
          <div className="px-5 pt-4">
            <div className="flex gap-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    addNote()
                  }
                }}
                rows={2}
                placeholder="Logged a call, said timing's wrong, follow up Tuesday…"
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              />
              <button
                onClick={addNote}
                disabled={!noteInput.trim() || working === 'note'}
                className="inline-flex items-center gap-1.5 self-end bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
              >
                {working === 'note' ? <CircleNotch className="w-4 h-4 animate-spin" /> : <ChatCircle weight="fill" className="w-4 h-4" />}
                Add
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">⌘/Ctrl + Enter to add</p>
          </div>
          {notes.length > 0 && (
            <ul className="divide-y divide-gray-100 mt-3">
              <AnimatePresence initial={false}>
                {notes.map((n) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 py-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{n.body}</div>
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                        aria-label="Delete note"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </section>
    </SalesShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">
        {label}
      </div>
      <div className="text-gray-700">{children}</div>
    </div>
  )
}

/**
 * Tiny inline button that posts to /api/sales/leads/[id]/send-customization
 * and surfaces a one-shot status. Living here (not as a separate panel)
 * because the email itself is preformatted - no fields to fill in.
 */
function SendCustomizationButton({ leadId }: { leadId: string }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const send = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/send-customization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setMsg({ tone: 'err', text: j?.error || 'Failed' })
      } else {
        setMsg({
          tone: 'ok',
          text: j.email_sent ? 'Form emailed' : `Form ready: ${j.form_url}`,
        })
      }
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }
  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={send}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-violet-50 border border-violet-200 text-violet-800 text-sm font-medium rounded-xl hover:bg-violet-100 hover:border-violet-300 active:scale-[0.98] transition-all disabled:opacity-60"
        title="Email the client a link to the customization form"
      >
        {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <EnvelopeSimple weight="fill" className="w-4 h-4" />}
        Send onboarding form
      </button>
      {msg && (
        <span className={`text-[11px] ${msg.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}

/**
 * Create-account button. Use when the lead has already booked or paid
 * outside the booking-link flow (called in, manual close) and the rep
 * just needs a CloudGreet account spun up so the client can log in.
 *
 * Behind the scenes: creates a close, converts it to a real client
 * (custom_users + businesses), emails login + temp password. Idempotent -
 * clicking twice doesn't make duplicate accounts. Shows the temp
 * password inline so the rep can read it to the client on the phone
 * before the email lands.
 */
function CreateAccountButton({ leadId, leadEmail, onCreated }: {
  leadId: string
  leadEmail: string
  onCreated: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    email: string
    password: string
    emailed: boolean
    already: boolean
  } | null>(null)
  const [err, setErr] = useState('')
  const [emailOverride, setEmailOverride] = useState('')
  const [showForm, setShowForm] = useState(false)

  const submit = async () => {
    const email = (emailOverride.trim() || leadEmail).toLowerCase()
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setErr('Enter a valid email')
      return
    }
    setBusy(true); setErr(''); setResult(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || `Failed (${r.status})`)
        return
      }
      setResult({
        email: j.user_email || email,
        password: j.temp_password || '',
        emailed: !!j.email_sent,
        already: !!j.already_existed,
      })
      setShowForm(false)
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="inline-flex flex-col gap-1 max-w-[320px]">
        <div className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl">
          <CheckCircle weight="fill" className="w-4 h-4" />
          {result.already ? 'Account exists' : 'Account created'}
        </div>
        {!result.already && (
          <div className="text-[11px] text-gray-600 font-mono leading-tight bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            <div>{result.email}</div>
            {result.password && <div>{result.password}</div>}
            <div className="font-sans text-gray-500 mt-0.5">
              {result.emailed ? 'Emailed' : 'Email failed - read it to them'}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="inline-flex flex-col gap-1 max-w-[280px]">
        <div className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col gap-1.5">
          <input
            type="email"
            value={emailOverride}
            onChange={(e) => setEmailOverride(e.target.value)}
            placeholder={leadEmail || 'email@business.com'}
            autoFocus
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
            onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-60"
            >
              {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <UserPlus weight="fill" className="w-3 h-3" />}
              Create
            </button>
            <button
              onClick={() => { setShowForm(false); setErr('') }}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-gray-800 px-2"
            >
              Cancel
            </button>
          </div>
          {err && <div className="text-[11px] text-rose-700">{err}</div>}
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setShowForm(true); setEmailOverride(leadEmail) }}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium rounded-xl hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98] transition-all"
      title="Create a CloudGreet account for this client (no booking link)"
    >
      <UserPlus weight="fill" className="w-4 h-4" /> Create account
    </button>
  )
}

/**
 * Sign-in-as-client button. POSTs to the rep impersonation endpoint
 * (which only lets the rep into businesses they own), stashes the
 * rep's own token in `impersonator_token`, swaps the auth cookie to
 * the client's session, and lands on /dashboard. The rep can return
 * to their own account via the impersonation banner / end endpoint.
 */
function LoginAsClientButton({ business }: {
  business: { id: string; business_name: string } | null
}) {
  const [busy, setBusy] = useState(false)
  const hasAccount = !!business
  const onClick = async () => {
    if (!business) return
    setBusy(true)
    try {
      const r = await fetch(`/api/sales/clients/${business.id}/impersonate`, {
        method: 'POST',
        credentials: 'include',
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        const { clearClientAuthState } = await import('@/lib/auth/session-guard')
        clearClientAuthState()
        window.location.href = j.redirect_url || '/dashboard'
      } else {
        alert(j?.error || 'Could not sign in as this client')
      }
    } catch {
      alert('Could not sign in as this client')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={onClick}
      disabled={busy || !hasAccount}
      className={
        hasAccount
          ? 'inline-flex items-center justify-center gap-2 h-10 px-4 bg-blue-700 text-white text-sm font-medium rounded-xl hover:bg-blue-800 active:scale-[0.98] shadow-sm shadow-blue-700/20 transition-all disabled:opacity-60'
          : 'inline-flex items-center justify-center gap-2 h-10 px-4 bg-gray-100 border border-gray-200 text-gray-400 text-sm font-medium rounded-xl cursor-not-allowed transition-all'
      }
      title={hasAccount ? `Open ${business!.business_name}'s dashboard as them` : 'No client account yet - create one first'}
    >
      {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <SignIn weight={hasAccount ? 'fill' : 'regular'} className="w-4 h-4" />}
      Login as client
    </button>
  )
}

/**
 * Delete-client button. Fully disconnects the rep's client - wipes
 * their calls/appointments/agents/phone, deletes the owner user +
 * business row, marks closes cancelled, resets the lead so the rep
 * can re-pitch later. Refuses if the client has an active Stripe
 * subscription (force flag overrides; admin path for safety).
 */
function DeleteClientButton({ businessId, businessName, onDeleted }: {
  businessId: string
  businessName: string
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    const ok = confirm(
      `Delete "${businessName}"?\n\n` +
      `This wipes the client's account, calls, bookings, and AI agent.\n` +
      `The lead is reset so you can re-pitch later.\n\n` +
      `If they have an active subscription, cancel in Stripe first.`,
    )
    if (!ok) return
    const reason = window.prompt('Reason for the audit trail (e.g. "lost", "wrong account"):', 'rep deleted client')
    if (!reason || reason.trim().length < 4) return
    setBusy(true)
    try {
      const r = await fetch(`/api/sales/clients/${businessId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        onDeleted()
      } else if (j?.error === 'subscription_active') {
        const forceOk = confirm(
          `${j.detail || 'Active subscription'}\n\nDelete anyway?`,
        )
        if (!forceOk) return
        const r2 = await fetch(`/api/sales/clients/${businessId}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: reason.trim(), force: true }),
        })
        const j2 = await r2.json().catch(() => ({}))
        if (r2.ok && j2?.success) onDeleted()
        else alert(j2?.error || 'Delete failed')
      } else {
        alert(j?.error || 'Delete failed')
      }
    } catch {
      alert('Delete failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl hover:bg-rose-100 hover:border-rose-300 active:scale-[0.98] transition-all disabled:opacity-60"
      title="Fully delete this client - the lead becomes available to re-pitch"
    >
      {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <TrashIcon weight="fill" className="w-4 h-4" />}
      Delete client
    </button>
  )
}

/**
 * Send + Copy buttons that mint a self-serve account-creation invite for
 * the prospect. The invite link goes to /create-account?token=…; the
 * prospect picks their password and lands in /dashboard/onboarding
 * signed in - no rep involvement after sending.
 *
 * Idempotent: the API reuses a fresh unconsumed invite for the same
 * (rep, email) pair, so re-clicking returns the same link.
 */
function SendAccountLinkButton({ leadId, leadEmail }: { leadId: string; leadEmail: string }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const send = async () => {
    let target = leadEmail
    if (!target) {
      const entered = window.prompt('Email to send the create-account link to:')
      if (!entered) return
      target = entered.trim().toLowerCase()
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(target)) {
        setMsg({ tone: 'err', text: 'Invalid email' })
        return
      }
    }
    setBusy(true); setMsg(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/account-link`, {
        method: 'POST',
        body: JSON.stringify({ email: target, send_email: true }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        setMsg({ tone: 'ok', text: j.email_sent ? 'Emailed!' : 'Link ready (email failed)' })
      } else {
        setMsg({ tone: 'err', text: j?.error || `Failed (${r.status})` })
      }
    } catch {
      setMsg({ tone: 'err', text: 'Failed' })
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }
  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={send}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-medium rounded-xl hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98] disabled:opacity-50 transition-all"
        title={leadEmail ? `Email ${leadEmail} a self-serve account-creation link` : 'No email on file - you will be prompted for one'}
      >
        {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <EnvelopeSimple weight="fill" className="w-4 h-4" />}
        Send create-account link
      </button>
      {msg && (
        <span className={`text-[11px] ${msg.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {msg.text}
        </span>
      )}
    </div>
  )
}

function CopyAccountLinkButton({ leadId, leadEmail }: { leadId: string; leadEmail: string }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const copy = async () => {
    setBusy(true); setErr(null); setCopied(false)
    try {
      // Email is optional for copy - the prospect can supply it on the
      // create-account page itself if we don't have it yet.
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/account-link`, {
        method: 'POST',
        body: JSON.stringify({ email: leadEmail || undefined, send_email: false }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success || !j.url) {
        setErr(j?.error || `Failed (${r.status})`)
        return
      }
      try {
        await navigator.clipboard.writeText(j.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        setErr('Copy blocked - link: ' + j.url)
      }
    } catch {
      setErr('Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={copy}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-50 transition-all"
        title="Copy the self-serve account-creation link - works even without the prospect's email"
      >
        {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> :
          copied ? <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500" /> :
          <Copy weight="fill" className="w-4 h-4 text-gray-400" />}
        {copied ? 'Copied!' : 'Copy create-account link'}
      </button>
      {err && <span className="text-[11px] text-rose-700">{err}</span>}
    </div>
  )
}

/**
 * Top-row blue button version of the copy-account-link action. Same
 * endpoint as CopyAccountLinkButton, just styled as a primary CTA so
 * it sits at the same visual weight as Call / Send booking / Send
 * payment. No email required - the prospect supplies one on the
 * create-account page if we don't have it.
 */
function CopyAccountLinkPrimary({ leadId, leadEmail }: { leadId: string; leadEmail: string }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    setBusy(true); setCopied(false)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/account-link`, {
        method: 'POST',
        body: JSON.stringify({ email: leadEmail || undefined, send_email: false }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success || !j.url) {
        alert(j?.error || `Failed (${r.status})`)
        return
      }
      try {
        await navigator.clipboard.writeText(j.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        alert('Copy blocked - link: ' + j.url)
      }
    } catch {
      alert('Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={copy}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 active:scale-[0.98] shadow-sm shadow-sky-600/10 disabled:opacity-60 transition-all"
      title="Copy the self-serve account-creation link - works even without an email"
    >
      {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> :
        copied ? <CheckCircle weight="fill" className="w-4 h-4" /> :
        <Copy weight="fill" className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy create-account link'}
    </button>
  )
}

/**
 * Mark-demo button: opens a small popup asking when the demo is set
 * for, then POSTs /api/sales/leads/[id]/mark-demo which:
 *   - flips the lead status to demo_scheduled
 *   - stamps follow_up_at = demo time
 *   - emails Anthony + pings Slack
 *
 * Same hook used from the leads list row (DemoCheckButton) so both
 * surfaces stay consistent.
 */
function MarkDemoButton({ leadId, onSet }: { leadId: string; onSet: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 active:scale-[0.98] shadow-sm shadow-amber-500/10 transition-all"
        title="Mark a demo as scheduled - pings the team + Slack"
      >
        <CalendarBlank weight="fill" className="w-4 h-4" /> Demo set
      </button>
      {open && (
        <DemoSetModal leadId={leadId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSet() }} />
      )}
    </>
  )
}

/**
 * Datetime picker modal used by both the lead detail "Demo set" button
 * and the leads-list checkmark. Local-tz datetime input -> ISO -> POST.
 */
function DemoSetModal({ leadId, onClose, onSaved }: {
  leadId: string
  onClose: () => void
  onSaved: () => void
}) {
  // Default to next business day 10am local for fast-path "yeah, tomorrow".
  const initial = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    // Format for input[type=datetime-local]: YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()
  const [when, setWhen] = useState(initial)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    if (!when) { setErr('Pick a date/time'); return }
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/mark-demo`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: new Date(when).toISOString(),
          notes: notes.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || `Failed (${r.status})`)
        return
      }
      onSaved()
    } catch {
      setErr('Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarBlank weight="fill" className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-medium text-gray-900">Mark demo set</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Sends a heads-up to the team + Slack so the demo agent gets built before the call.
        </p>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">When?</label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900"
        />
        <label className="block text-xs font-medium text-gray-700 mt-3 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="anything for the build (e.g. emergency keywords, special transfers)"
          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 resize-none"
        />
        {err && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
            {err}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || !when}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            Mark demo set
          </button>
        </div>
      </div>
    </div>
  )
}
