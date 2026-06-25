'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Plus, CircleNotch, WarningCircle, X, Envelope, PaperPlaneTilt,
  Pause, Trash, CaretLeft, Upload, MagnifyingGlass, CheckCircle,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, DangerButton, Input, Select, RisingFade } from '../_components/ui'

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
  body_template: string
  status: CampaignStatus
  sent_count: number
  bounce_count: number
  reply_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

type LeadStatus = 'queued' | 'sending' | 'sent' | 'bounced' | 'replied' | 'unsubscribed'

type EmailLead = {
  id: string
  email: string
  owner_name: string | null
  business_name: string | null
  city: string | null
  phone: string | null
  source: string
  status: LeadStatus
  sent_at: string | null
  resend_message_id: string | null
  error: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FROM_EMAIL_OPTIONS = [
  'aaron@cloudgreet.com',
  'darrin@cloudgreet.com',
  'anthony@cloudgreet.com',
]

const DEFAULT_SUBJECT = 'Quick question about {{business_name}}'

const DEFAULT_BODY = `Hi {{first_name}},

I came across {{business_name}} and wanted to reach out -- we help local service businesses like yours never miss a call or booking by answering your phone 24/7 with AI.

Most of our clients see a noticeable uptick in bookings within the first week, without hiring anyone.

Would it be worth a quick 10-minute call to see if it's a fit for {{business_name}}?

Best,
{{from_name}}
CloudGreet
cloudgreet.com`

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  draft:       { label: 'Draft',         classes: 'bg-gray-400/10 text-gray-300 border-gray-400/20' },
  sending:     { label: 'Sending',       classes: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  paused:      { label: 'Paused',        classes: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  complete:    { label: 'Complete',      classes: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
}

const LEAD_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  queued:      { label: 'Queued',        classes: 'bg-gray-400/10 text-gray-300 border-gray-400/20' },
  sending:     { label: 'Sending',       classes: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  sent:        { label: 'Sent',          classes: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  bounced:     { label: 'Bounced',       classes: 'bg-rose-400/10 text-rose-300 border-rose-400/20' },
  replied:     { label: 'Replied',       classes: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  unsubscribed:{ label: 'Unsubscribed',  classes: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; classes: string }> }) {
  const s = map[status] || { label: status, classes: 'bg-gray-400/10 text-gray-400 border-gray-400/20' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${s.classes}`}>
      {s.label}
    </span>
  )
}

function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// ---------------------------------------------------------------------------
// New Campaign Modal
// ---------------------------------------------------------------------------

function NewCampaignModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (campaign: Campaign) => void
}) {
  const [form, setForm] = useState({
    name: '',
    from_name: 'CloudGreet',
    from_email: FROM_EMAIL_OPTIONS[0],
    reply_to: FROM_EMAIL_OPTIONS[0],
    subject: '',
    body_template: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const fillDefault = () => {
    setForm((f) => ({ ...f, subject: DEFAULT_SUBJECT, body_template: DEFAULT_BODY }))
  }

  const syncReplyTo = (email: string) => {
    setForm((f) => ({ ...f, from_email: email, reply_to: email }))
  }

  const submit = async () => {
    if (!form.name.trim()) { setErr('Campaign name is required.'); return }
    if (!form.subject.trim()) { setErr('Subject is required.'); return }
    if (!form.body_template.trim()) { setErr('Body template is required.'); return }
    setSaving(true)
    setErr('')
    try {
      const res = await fetchWithAuth('/api/admin/email-campaigns', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create campaign')
      onCreate(json.campaign as Campaign)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0d0f14] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h2 className="text-base font-medium text-white">New Campaign</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Campaign name</label>
            <Input
              placeholder="e.g. June HVAC outreach"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">From name</label>
              <Input
                value={form.from_name}
                onChange={(e) => set('from_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">From email</label>
              <Select
                value={form.from_email}
                onChange={(e) => syncReplyTo(e.target.value)}
              >
                {FROM_EMAIL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Reply-to</label>
            <Input
              value={form.reply_to}
              onChange={(e) => set('reply_to', e.target.value)}
              placeholder="Defaults to from email"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Subject line</label>
            <Input
              placeholder="e.g. Quick question about {{business_name}}"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
            />
            <p className="text-[11px] text-gray-600 mt-1">Supports: {'{{first_name}}'}, {'{{owner_name}}'}, {'{{business_name}}'}, {'{{city}}'}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-gray-500">Body template</label>
              <button
                onClick={fillDefault}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Default template
              </button>
            </div>
            <textarea
              rows={10}
              value={form.body_template}
              onChange={(e) => set('body_template', e.target.value)}
              placeholder="Hi {{first_name}}, ..."
              className="w-full px-4 py-2.5 bg-black/30 border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none focus:border-sky-400/50 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(56,189,248,0.12)] transition-all text-sm font-mono resize-y"
            />
            <p className="text-[11px] text-gray-600 mt-1">Supports: {'{{first_name}}'}, {'{{owner_name}}'}, {'{{business_name}}'}, {'{{city}}'}, {'{{from_name}}'}</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <WarningCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit} loading={saving}>
            <Envelope className="w-4 h-4" />
            Create campaign
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Leads Modal
// ---------------------------------------------------------------------------

function AddLeadsModal({
  campaignId,
  onClose,
  onAdded,
}: {
  campaignId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [tab, setTab] = useState<'csv' | 'scraper'>('csv')
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<Array<Record<string, string>>>([])
  const [scraperLeads, setScraperLeads] = useState<Array<Record<string, string>>>([])
  const [scraperLoaded, setScraperLoaded] = useState(false)
  const [scraperEmpty, setScraperEmpty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')

  const parseCsvPreview = (text: string) => {
    const rows = parseCsv(text)
    setPreview(rows)
  }

  const loadScraperLeads = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/leads?limit=100')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      const leads = json.leads || []
      if (leads.length === 0) {
        setScraperEmpty(true)
      } else {
        setScraperLeads(leads)
      }
      setScraperLoaded(true)
    } catch {
      setScraperLoaded(true)
      setScraperEmpty(true)
    }
  }

  const handleTabChange = (t: 'csv' | 'scraper') => {
    setTab(t)
    if (t === 'scraper' && !scraperLoaded) {
      loadScraperLeads()
    }
  }

  const submitCsv = async () => {
    if (preview.length === 0) { setErr('No rows parsed.'); return }
    setSaving(true); setErr(''); setSuccess('')
    try {
      const leads = preview.map((r) => ({
        email: r.email || '',
        owner_name: r.owner_name || r.owner || r.contact_name || r.contact || null,
        business_name: r.business_name || r.business || r.company || null,
        city: r.city || null,
        phone: r.phone || null,
        source: 'csv',
      })).filter((l) => l.email.includes('@'))

      if (leads.length === 0) { setErr('No valid email addresses found.'); setSaving(false); return }

      const res = await fetchWithAuth(`/api/admin/email-campaigns/${campaignId}/leads`, {
        method: 'POST',
        body: JSON.stringify({ leads }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setSuccess(`Added ${json.inserted} lead${json.inserted === 1 ? '' : 's'}.`)
      setTimeout(() => { onAdded(); onClose() }, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const submitScraper = async () => {
    if (scraperLeads.length === 0) return
    setSaving(true); setErr(''); setSuccess('')
    try {
      const leads = scraperLeads
        .filter((l) => l.email)
        .map((l) => ({
          email: l.email,
          owner_name: l.contact_name || l.owner_name || null,
          business_name: l.business_name || null,
          city: l.city || null,
          phone: l.phone || null,
          source: 'scraper',
        }))

      if (leads.length === 0) { setErr('No leads with email addresses.'); setSaving(false); return }

      const res = await fetchWithAuth(`/api/admin/email-campaigns/${campaignId}/leads`, {
        method: 'POST',
        body: JSON.stringify({ leads }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setSuccess(`Added ${json.inserted} lead${json.inserted === 1 ? '' : 's'}.`)
      setTimeout(() => { onAdded(); onClose() }, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0d0f14] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h2 className="text-base font-medium text-white">Add Leads</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] px-6">
          {(['csv', 'scraper'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-sky-400 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'csv' ? 'Paste CSV' : 'From Scraper'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === 'csv' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Paste rows as <code className="font-mono text-gray-400 bg-white/[0.04] px-1 rounded">email,owner_name,business_name,city</code>.
                First row can be a header.
              </p>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); parseCsvPreview(e.target.value) }}
                placeholder={'email,owner_name,business_name,city\njohn@example.com,John Smith,Smith Plumbing,Columbus'}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none focus:border-sky-400/50 transition-all text-sm font-mono resize-y"
              />
              {preview.length > 0 && (
                <p className="text-xs text-gray-400">
                  Parsed <span className="text-white font-medium">{preview.filter((r) => r.email).length}</span> rows with an email.
                </p>
              )}
            </div>
          )}

          {tab === 'scraper' && (
            <div className="space-y-3">
              {!scraperLoaded && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  Loading leads...
                </div>
              )}
              {scraperLoaded && scraperEmpty && (
                <div className="flex items-start gap-2 text-amber-400 text-sm">
                  <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  No stored leads found. Run the lead finder first.
                </div>
              )}
              {scraperLoaded && !scraperEmpty && (
                <p className="text-xs text-gray-400">
                  <span className="text-white font-medium">{scraperLeads.filter((l) => l.email).length}</span> leads with email found from the scraper.
                </p>
              )}
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 text-rose-400 text-sm mt-3">
              <WarningCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm mt-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={tab === 'csv' ? submitCsv : submitScraper}
            loading={saving}
            disabled={tab === 'csv' ? preview.length === 0 : scraperLeads.filter((l) => l.email).length === 0}
          >
            <Upload className="w-4 h-4" />
            Add leads
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign Detail View
// ---------------------------------------------------------------------------

function CampaignDetail({
  campaignId,
  onBack,
}: {
  campaignId: string
  onBack: () => void
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<EmailLead[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showAddLeads, setShowAddLeads] = useState(false)
  const [sending, setSending] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; errors: number } | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/admin/email-campaigns/${campaignId}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setCampaign(json.campaign)
      setLeads(json.leads || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [campaignId])

  const queuedCount = leads.filter((l) => l.status === 'queued').length

  const handleSend = async () => {
    if (!confirm(`Send to ${queuedCount} queued lead${queuedCount === 1 ? '' : 's'}?`)) return
    setSending(true); setSendResult(null)
    try {
      const res = await fetchWithAuth(`/api/admin/email-campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({ batchSize: 50 }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Send failed')
      setSendResult({ sent: json.sent, errors: json.errors })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handlePause = async () => {
    setPausing(true)
    try {
      const res = await fetchWithAuth(`/api/admin/email-campaigns/${campaignId}/pause`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Pause failed')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Pause failed')
    } finally {
      setPausing(false)
    }
  }

  const filteredLeads = leads.filter((l) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      l.email.toLowerCase().includes(q) ||
      (l.owner_name || '').toLowerCase().includes(q) ||
      (l.business_name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 px-8">
        <CircleNotch className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (err && !campaign) {
    return (
      <div className="px-8 py-12 text-rose-400 text-sm">{err}</div>
    )
  }

  if (!campaign) return null

  return (
    <>
      {showAddLeads && (
        <AddLeadsModal
          campaignId={campaignId}
          onClose={() => setShowAddLeads(false)}
          onAdded={load}
        />
      )}

      <section className="px-4 lg:px-8 py-6 lg:py-10 max-w-7xl">
        {/* Back + header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-4"
          >
            <CaretLeft className="w-3.5 h-3.5" /> Back to campaigns
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Email Campaign</div>
                <StatusBadge status={campaign.status} map={STATUS_BADGE} />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-white">
                {campaign.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                From {campaign.from_name} &lt;{campaign.from_email}&gt;
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <GhostButton onClick={() => setShowAddLeads(true)}>
                <Plus className="w-4 h-4" /> Add Leads
              </GhostButton>
              {campaign.status !== 'paused' && campaign.status !== 'complete' && (
                <GhostButton onClick={handlePause} disabled={pausing}>
                  {pausing ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                  Pause
                </GhostButton>
              )}
              <PrimaryButton
                onClick={handleSend}
                loading={sending}
                disabled={queuedCount === 0 || campaign.status === 'paused'}
              >
                <PaperPlaneTilt className="w-4 h-4" />
                Send Batch ({queuedCount} queued)
              </PrimaryButton>
            </div>
          </div>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-rose-400 text-sm mb-4">
            <WarningCircle className="w-4 h-4 flex-shrink-0" /> {err}
          </div>
        )}

        {sendResult && (
          <RisingFade>
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Sent {sendResult.sent} email{sendResult.sent === 1 ? '' : 's'}.
              {sendResult.errors > 0 && ` ${sendResult.errors} bounced.`}
            </div>
          </RisingFade>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Sent', value: campaign.sent_count },
            { label: 'Bounced', value: campaign.bounce_count },
            { label: 'Replies', value: campaign.reply_count },
          ].map((s) => (
            <Panel key={s.label} padding="tight">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">{s.label}</div>
              <div className="text-2xl font-display font-semibold text-white tabular-nums">{s.value}</div>
            </Panel>
          ))}
        </div>

        {/* Campaign info */}
        <Panel className="mb-6">
          <PanelHeader eyebrow="Campaign" title="Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Subject: </span>
              <span className="text-gray-200">{campaign.subject}</span>
            </div>
            <div>
              <span className="text-gray-500">Created: </span>
              <span className="text-gray-200">{fmtDate(campaign.created_at)}</span>
            </div>
          </div>
        </Panel>

        {/* Leads table */}
        <Panel padding="none">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-medium text-white">
              Leads <span className="text-gray-500 font-normal text-sm ml-1">({leads.length})</span>
            </h2>
            <div className="relative w-56">
              <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 py-2 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-white/[0.05]">
                  {['Email', 'Owner', 'Business', 'City', 'Status', 'Sent at'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-gray-500 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">
                      {leads.length === 0 ? 'No leads yet. Add some.' : 'No results for that search.'}
                    </td>
                  </tr>
                )}
                {filteredLeads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="px-4 py-2.5 text-gray-200 font-mono text-xs">{lead.email}</td>
                    <td className="px-4 py-2.5 text-gray-300">{lead.owner_name || <span className="text-gray-600">--</span>}</td>
                    <td className="px-4 py-2.5 text-gray-300">{lead.business_name || <span className="text-gray-600">--</span>}</td>
                    <td className="px-4 py-2.5 text-gray-400">{lead.city || <span className="text-gray-600">--</span>}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={lead.status} map={LEAD_STATUS_BADGE} />
                      {lead.error && (
                        <p className="text-[10px] text-rose-400 mt-0.5 truncate max-w-[180px]" title={lead.error}>{lead.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {lead.sent_at ? fmtDate(lead.sent_at) : <span className="text-gray-700">--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth('/api/admin/email-campaigns')
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setCampaigns(json.campaigns || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This removes all leads too.`)) return
    try {
      const res = await fetchWithAuth(`/api/admin/email-campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (selectedId) {
    return (
      <AdminShell activeLabel="Email Campaigns">
        <CampaignDetail campaignId={selectedId} onBack={() => { setSelectedId(null); load() }} />
      </AdminShell>
    )
  }

  return (
    <AdminShell activeLabel="Email Campaigns">
      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreate={(c) => {
            setShowNew(false)
            setSelectedId(c.id)
            load()
          }}
        />
      )}

      <section className="px-4 lg:px-8 py-6 lg:py-10 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
              Outreach
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
              Email Campaigns
            </h1>
          </div>
          <PrimaryButton onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4" /> New Campaign
          </PrimaryButton>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-rose-400 text-sm mb-4">
            <WarningCircle className="w-4 h-4 flex-shrink-0" /> {err}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12">
            <CircleNotch className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : campaigns.length === 0 ? (
          <Panel>
            <div className="py-8 text-center">
              <Envelope className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No campaigns yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create one to start sending cold outreach.</p>
              <div className="mt-4">
                <PrimaryButton onClick={() => setShowNew(true)}>
                  <Plus className="w-4 h-4" /> New Campaign
                </PrimaryButton>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Campaign', 'From', 'Status', 'Sent', 'Bounced', 'Replies', 'Created', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-gray-500 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.from_email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} map={STATUS_BADGE} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 tabular-nums">{c.sent_count}</td>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{c.bounce_count}</td>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{c.reply_count}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DangerButton
                          onClick={() => handleDelete(c.id, c.name)}
                          className="py-1 px-2 text-xs"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </DangerButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
    </AdminShell>
  )
}
