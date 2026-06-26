'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretLeft, CircleNotch, WarningCircle, CheckCircle, Plus, X,
  PaperPlaneTilt, Pause, PhoneCall, MagnifyingGlass, EnvelopeSimple,
  ArrowBendUpLeft, PencilSimple, Trash, ArrowClockwise, ThermometerSimple,
} from '@phosphor-icons/react'
import { SalesShell } from '../../_components/SalesShell'
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
  body_template: string
  signature: string | null
  status: CampaignStatus
  sent_count: number
  bounce_count: number
  reply_count: number
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
  replied_at: string | null
  next_follow_up_at: string | null
  sequence_step: number
  error: string | null
  created_at: string
}

type SequenceStep = {
  id?: string
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
}

type RepLead = {
  id: string
  business_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  city: string | null
  status: string
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const CAMPAIGN_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  draft:    { label: 'Draft',    classes: 'bg-gray-100 text-gray-600' },
  sending:  { label: 'Sending',  classes: 'bg-sky-100 text-sky-700' },
  paused:   { label: 'Paused',   classes: 'bg-amber-100 text-amber-700' },
  complete: { label: 'Complete', classes: 'bg-emerald-100 text-emerald-700' },
}

const LEAD_BADGE: Record<string, { label: string; classes: string }> = {
  queued:       { label: 'Queued',       classes: 'bg-gray-100 text-gray-600' },
  sending:      { label: 'Sending',      classes: 'bg-sky-100 text-sky-700' },
  sent:         { label: 'Sent',         classes: 'bg-emerald-100 text-emerald-700' },
  bounced:      { label: 'Bounced',      classes: 'bg-red-100 text-red-700' },
  replied:      { label: 'Replied',      classes: 'bg-blue-100 text-blue-700' },
  unsubscribed: { label: 'Unsub',        classes: 'bg-gray-100 text-gray-500' },
}

function CampaignStatusBadge({ status }: { status: string }) {
  const s = CAMPAIGN_BADGE[status as CampaignStatus] || { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${s.classes}`}>
      {s.label}
    </span>
  )
}

function LeadStatusBadge({ status }: { status: string }) {
  const s = LEAD_BADGE[status] || { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${s.classes}`}>
      {s.label}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Add Leads Modal - two tabs: My Leads + Paste CSV
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
  const [tab, setTab] = useState<'myLeads' | 'csv'>('myLeads')

  // My Leads tab state
  const [myLeads, setMyLeads] = useState<RepLead[]>([])
  const [myLeadsLoading, setMyLeadsLoading] = useState(false)
  const [myLeadsSearch, setMyLeadsSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [findingEmails, setFindingEmails] = useState(false)
  const [findMsg, setFindMsg] = useState('')

  // Import tab state
  type CsvRow = { email: string; owner_name?: string; business_name?: string; city?: string; phone?: string }
  type ManualRow = { email: string; owner_name: string; business_name: string; city: string; phone: string }
  const emptyRow = (): ManualRow => ({ email: '', owner_name: '', business_name: '', city: '', phone: '' })
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyRow()])
  const [csvDragging, setCsvDragging] = useState(false)

  const csvParsed: CsvRow[] = manualRows
    .filter((r) => r.email.includes('@'))
    .map(({ email, owner_name, business_name, city, phone }) => ({
      email,
      owner_name: owner_name || undefined,
      business_name: business_name || undefined,
      city: city || undefined,
      phone: phone || undefined,
    }))

  function normalizeHeader(h: string): string {
    const c = h.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (['email','emailaddress','mail','emails'].includes(c)) return 'email'
    if (['ownername','owner','contactname','contact','fullname','name','person'].includes(c)) return 'owner_name'
    if (['firstname','fname','givenname'].includes(c)) return 'first_name'
    if (['lastname','lname','surname','familyname'].includes(c)) return 'last_name'
    if (['businessname','business','company','companyname','organization','org','biz','account'].includes(c)) return 'business_name'
    if (['city','location','town','area','metro'].includes(c)) return 'city'
    if (['state','province','region'].includes(c)) return 'state'
    if (['phone','phonenumber','mobile','cell','telephone','tel','number'].includes(c)) return 'phone'
    if (['website','web','url','site','homepage','domain'].includes(c)) return 'website'
    return c
  }

  function splitRow(line: string, delimiter: string): string[] {
    if (delimiter !== ',') return line.split(delimiter).map((v) => v.trim())
    const fields: string[] = []
    let cur = ''; let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    fields.push(cur.trim())
    return fields
  }

  function sniffHeaders(rows: string[][]): string[] {
    const colCount = Math.max(...rows.map((r) => r.length), 0)
    const result: string[] = new Array(colCount).fill('')
    const textOrder = ['owner_name', 'business_name', 'city']
    let textIdx = 0
    for (let i = 0; i < colCount; i++) {
      const samples = rows.map((r) => (r[i] || '').trim()).filter(Boolean)
      if (samples.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        result[i] = 'email'
      } else if (samples.length > 0 && samples.every((v) => /^[\d\s()\-+.]{7,15}$/.test(v))) {
        result[i] = 'phone'
      } else if (textIdx < textOrder.length) {
        result[i] = textOrder[textIdx++]
      }
    }
    return result
  }

  function importText(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 1) return
    const delim = (lines[0].match(/\t/g) || []).length >= (lines[0].match(/,/g) || []).length ? '\t' : ','
    const firstVals = splitRow(lines[0], delim)
    const isHeaderless = firstVals.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
    const allRows = lines.map((l) => splitRow(l, delim))
    const headers = isHeaderless ? sniffHeaders(allRows) : firstVals.map(normalizeHeader)
    const dataLines = isHeaderless ? lines : lines.slice(1)
    const parsed: ManualRow[] = []
    for (const line of dataLines) {
      if (!line.trim()) continue
      const vals = splitRow(line, delim)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { if (vals[i]) row[h] = vals[i].replace(/^"|"$/g, '').trim() })
      if (!row.owner_name && (row.first_name || row.last_name)) {
        row.owner_name = [row.first_name, row.last_name].filter(Boolean).join(' ')
      }
      if (row.state && row.city && !row.city.includes(row.state)) {
        row.city = `${row.city}, ${row.state}`
      }
      parsed.push({
        email: row.email || '',
        owner_name: row.owner_name || '',
        business_name: row.business_name || '',
        city: row.city || '',
        phone: row.phone || '',
      })
    }
    if (parsed.length > 0) setManualRows(parsed)
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => importText(e.target?.result as string)
    reader.readAsText(file)
  }

  // Shared state
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load my leads when tab is shown
  useEffect(() => {
    if (tab === 'myLeads' && myLeads.length === 0 && !myLeadsLoading) {
      setMyLeadsLoading(true)
      fetchWithAuth('/api/sales/my-leads')
        .then((r) => r.json().catch(() => ({})))
        .then((j) => { setMyLeads(j.leads || []) })
        .catch(() => {})
        .finally(() => setMyLeadsLoading(false))
    }
  }, [tab])

  const filteredMyLeads = useMemo(() => {
    if (!myLeadsSearch.trim()) return myLeads
    const q = myLeadsSearch.toLowerCase()
    return myLeads.filter((l) =>
      l.business_name?.toLowerCase().includes(q) ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q),
    )
  }, [myLeads, myLeadsSearch])

  // Any selected lead without an email -- directories can find emails for all of them now
  const selectedNoEmail = useMemo(
    () => filteredMyLeads.filter((l) => selected.has(l.id) && !l.email),
    [filteredMyLeads, selected],
  )

  const handleFindEmails = async () => {
    if (selectedNoEmail.length === 0) return
    setFindingEmails(true); setFindMsg(''); setErr('')
    try {
      const res = await fetchWithAuth('/api/sales/leads/find-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedNoEmail.map((l) => l.id) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      // Update local lead state with found emails
      const emailMap = new Map<string, string | null>(
        (json.results as { leadId: string; email: string | null }[]).map((r) => [r.leadId, r.email]),
      )
      setMyLeads((prev) => prev.map((l) => emailMap.has(l.id) ? { ...l, email: emailMap.get(l.id) || null } : l))
      const found = (json.results as { email: string | null }[]).filter((r) => r.email).length
      setFindMsg(`Found ${found} of ${selectedNoEmail.length} email${selectedNoEmail.length === 1 ? '' : 's'}.`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to find emails')
    } finally {
      setFindingEmails(false)
    }
  }

  const toggleLead = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filteredMyLeads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredMyLeads.map((l) => l.id)))
    }
  }

  const submitMyLeads = async () => {
    const toAdd = myLeads.filter((l) => selected.has(l.id) && !!l.email)
    if (toAdd.length === 0) { setErr('No selected leads have an email address yet. Use Find emails first.'); return }
    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      const leads = toAdd.map((l) => ({
        email: l.email!,
        owner_name: l.contact_name || null,
        business_name: l.business_name || null,
        city: l.city || null,
        phone: l.phone || null,
        lead_id: l.id,
      }))
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/leads`, {
        method: 'POST',
        body: JSON.stringify({ leads }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setSuccessMsg(`Added ${json.inserted} lead${json.inserted === 1 ? '' : 's'}.`)
      setTimeout(() => { onAdded(); onClose() }, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const submitCsv = async () => {
    if (csvParsed.length === 0) { setErr('No valid rows parsed.'); return }
    setSaving(true); setErr(''); setSuccessMsg('')
    try {
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/leads`, {
        method: 'POST',
        body: JSON.stringify({ leads: csvParsed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setSuccessMsg(`Added ${json.inserted} lead${json.inserted === 1 ? '' : 's'}.`)
      setTimeout(() => { onAdded(); onClose() }, 1200)
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
        className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900">Add leads</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['myLeads', 'csv'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setErr(''); setSuccessMsg('') }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'myLeads' ? 'My Leads' : 'Import'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === 'myLeads' && (
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={myLeadsSearch}
                  onChange={(e) => setMyLeadsSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>

              {myLeadsLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <CircleNotch className="w-4 h-4 animate-spin" /> Loading your leads...
                </div>
              ) : myLeads.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">No leads in your pipeline yet.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={selected.size === filteredMyLeads.length && filteredMyLeads.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                      />
                      <span>
                        {selected.size > 0 ? `${selected.size} selected` : `${filteredMyLeads.length} leads`}
                      </span>
                      {filteredMyLeads.some((l) => !!l.email) && (
                        <button
                          type="button"
                          onClick={() => setSelected(new Set(filteredMyLeads.filter((l) => !!l.email).map((l) => l.id)))}
                          className="text-sky-600 hover:text-sky-800 underline-offset-2 hover:underline ml-1"
                        >
                          Select all with email
                        </button>
                      )}
                    </div>
                    {selectedNoEmail.length > 0 && (
                      <button
                        type="button"
                        onClick={handleFindEmails}
                        disabled={findingEmails}
                        className="inline-flex items-center gap-1.5 text-xs bg-sky-600 text-white hover:bg-sky-700 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-60"
                      >
                        {findingEmails
                          ? <CircleNotch className="w-3 h-3 animate-spin" />
                          : <MagnifyingGlass className="w-3 h-3" />}
                        {findingEmails ? 'Finding...' : `Find emails (${selectedNoEmail.length})`}
                      </button>
                    )}
                  </div>
                  {findMsg && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      {findMsg}
                    </div>
                  )}
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {filteredMyLeads.map((l) => (
                      <label
                        key={l.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggleLead(l.id)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{l.business_name}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {l.contact_name && <span>{l.contact_name} &middot; </span>}
                            {l.email
                              ? l.email
                              : <span className="text-amber-500">No email found yet</span>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'csv' && (
            <div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Email *', 'Name', 'Business', 'City', 'Phone'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-gray-500 font-normal whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {manualRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        {(['email', 'owner_name', 'business_name', 'city', 'phone'] as const).map((field) => (
                          <td key={field} className="px-1.5 py-1.5">
                            <input
                              value={row[field]}
                              onChange={(e) => setManualRows((rows) => rows.map((r, ri) => ri === i ? { ...r, [field]: e.target.value } : r))}
                              placeholder={field === 'email' ? 'name@example.com' : ''}
                              className="w-full px-2 py-1.5 text-xs bg-transparent border border-transparent rounded-md focus:outline-none focus:border-gray-300 focus:bg-white transition-colors placeholder:text-gray-300"
                            />
                          </td>
                        ))}
                        <td className="pr-2 text-center">
                          {manualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualRows((rows) => rows.filter((_, ri) => ri !== i))}
                              className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setManualRows((rows) => [...rows, emptyRow()])}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors px-1"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" />
                Add row
              </button>

              <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">or import</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* File drop zone */}
              <div
                className={`mt-3 relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                  csvDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => document.getElementById('csv-file-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); setCsvDragging(true) }}
                onDragLeave={() => setCsvDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setCsvDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleFileUpload(file)
                }}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                />
                <p className="text-xs font-medium text-gray-600">Drop a file or click to upload</p>
                <p className="text-[11px] text-gray-400 mt-0.5">CSV, TSV, or Excel export</p>
              </div>

              {/* Paste area */}
              <textarea
                rows={3}
                onChange={(e) => { if (e.target.value.trim()) importText(e.target.value) }}
                placeholder={'Paste from Excel or Google Sheets — populates the table above'}
                className="mt-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-gray-900 transition-colors resize-none placeholder:text-gray-300"
              />
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 mt-3">
              <WarningCircle weight="fill" className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm text-emerald-700 mt-3">
              <CheckCircle weight="fill" className="w-4 h-4 flex-shrink-0" />
              {successMsg}
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
            onClick={tab === 'myLeads' ? submitMyLeads : submitCsv}
            disabled={
              saving ||
              (tab === 'myLeads' ? selected.size === 0 : csvParsed.length === 0)
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <CircleNotch className="w-4 h-4 animate-spin" />
            ) : (
              <Plus weight="bold" className="w-4 h-4" />
            )}
            {tab === 'myLeads'
              ? (() => {
                  const withEmail = filteredMyLeads.filter((l) => selected.has(l.id) && !!l.email).length
                  return withEmail > 0 ? `Add ${withEmail} to campaign` : 'Add selected'
                })()
              : `Add ${csvParsed.length > 0 ? csvParsed.length : ''} leads`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Email Warming Warning
// ---------------------------------------------------------------------------

const WARMING_KEY = 'cg_warmup_warning_dismissed'

function WarmingWarning({ onClose }: { onClose: () => void }) {
  const [dontShow, setDontShow] = useState(false)

  const dismiss = () => {
    if (dontShow) localStorage.setItem(WARMING_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <ThermometerSimple weight="fill" className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Email sending limits</h2>
              <p className="text-xs text-gray-500 mt-0.5">Read this before your first send</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Email providers like Gmail and Outlook track the reputation of every sending address. A brand-new address that suddenly sends hundreds of emails looks like spam. Once you get flagged, deliverability tanks for weeks.
            </p>
            <p>
              The fix is called <span className="font-medium text-gray-900">warming</span>: start small and increase gradually over 2-4 weeks so providers learn to trust the address.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Recommended ramp</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-900 font-mono">
                <span>Week 1</span><span>20-30 / day</span>
                <span>Week 2</span><span>50-75 / day</span>
                <span>Week 3</span><span>100-150 / day</span>
                <span>Week 4+</span><span>200+ / day</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-700 mb-1">How CloudGreet handles this</p>
              <p className="text-xs text-gray-600">
                The daily cap is enforced automatically and increases by 10 each week (10 on week 1, 20 on week 2, up to 200). The Send batch button disables once you hit the day's cap. You'll see your usage on the campaign page at all times.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              If you are sending from a personal address you have used for months (like your M365 Outlook), it already has reputation and you can ramp faster. If the sending domain is new, go slow.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
            />
            <span className="text-xs text-gray-500">Don't show again</span>
          </label>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step Edit Modal
// ---------------------------------------------------------------------------

function StepEditModal({
  step,
  onSave,
  onClose,
}: {
  step: SequenceStep
  onSave: (s: SequenceStep) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<SequenceStep>({ ...step })

  const valid =
    form.delay_days >= 1 &&
    form.subject_template.trim().length > 0 &&
    form.body_template.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              Follow-up step {form.step_number}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sent {form.delay_days} day{form.delay_days === 1 ? '' : 's'} after the previous email
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Send after (days since previous email)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.delay_days}
              onChange={(e) => setForm((f) => ({ ...f, delay_days: parseInt(e.target.value) || 1 }))}
              className="w-24 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={form.subject_template}
              onChange={(e) => setForm((f) => ({ ...f, subject_template: e.target.value }))}
              placeholder="Re: {{original_subject}}"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors font-mono"
            />
            <p className="text-[10px] text-gray-400 mt-1">Use <code>{'{{original_subject}}'}</code> to thread under the first email.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Body</label>
            <textarea
              rows={8}
              value={form.body_template}
              onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors font-mono resize-y"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Variables: <code>{'{{first_name}}'}</code> <code>{'{{business_name}}'}</code> <code>{'{{from_name}}'}</code>
            </p>
          </div>
        </div>

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
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <CheckCircle weight="fill" className="w-4 h-4" /> Save step
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign Detail Page
// ---------------------------------------------------------------------------

export default function SalesEmailCampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<EmailLead[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')
  const [showAddLeads, setShowAddLeads] = useState(false)
  const [sending, setSending] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [search, setSearch] = useState('')
  const [seqSteps, setSeqSteps] = useState<SequenceStep[]>([])
  const [seqSaving, setSeqSaving] = useState(false)
  const [seqSaved, setSeqSaved] = useState(false)
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null)
  const [showWarmingWarning, setShowWarmingWarning] = useState(false)
  const [sentToday, setSentToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(10)
  const [settingsEdit, setSettingsEdit] = useState<{
    name: string; from_name: string; reply_to: string; subject: string; body_template: string; signature: string
  } | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const [campRes, seqRes] = await Promise.all([
        fetchWithAuth(`/api/sales/email-campaigns/${campaignId}`),
        fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/sequences`),
      ])
      const campJson = await campRes.json().catch(() => ({}))
      if (!campRes.ok || !campJson.success) throw new Error(campJson.error || 'Failed to load')
      setCampaign(campJson.campaign)
      setLeads(campJson.leads || [])
      setSentToday(campJson.sentToday ?? 0)
      setDailyCap(campJson.dailyCap ?? 10)
      const seqJson = await seqRes.json().catch(() => ({}))
      setSeqSteps(seqJson.steps || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load().then(() => {
      if (typeof window !== 'undefined' && !localStorage.getItem(WARMING_KEY)) {
        setShowWarmingWarning(true)
      }
    })
  }, [campaignId])

  const queuedCount = leads.filter((l) => l.status === 'queued').length
  const sentLeads = leads.filter((l) => l.status === 'sent')
  const repliedCount = leads.filter((l) => l.status === 'replied').length
  const warmupWeek = campaign
    ? Math.floor(Math.max(0, Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
    : 1
  const isCapped = sentToday >= dailyCap

  const handleSend = async () => {
    if (!confirm(
      `Send to ${queuedCount} queued lead${queuedCount === 1 ? '' : 's'}. This will use Haiku AI to personalize each email. Continue?`
    )) return
    setSending(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({ batchSize: 50 }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Send failed')
      if (typeof json.sentToday === 'number') setSentToday(json.sentToday)
      if (typeof json.dailyCap === 'number') setDailyCap(json.dailyCap)
      const msg = json.cappedOut
        ? `Daily limit of ${json.dailyCap} reached. Resets midnight UTC.`
        : `Sent ${json.sent}${json.errors > 0 ? `, ${json.errors} bounced` : ''}.`
      setFlash(msg)
      setTimeout(() => setFlash(''), 5000)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handlePause = async () => {
    setPausing(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/pause`, {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Pause failed')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Pause failed')
    } finally {
      setPausing(false)
    }
  }

  const handlePowerDial = () => {
    if (sentLeads.length === 0) return
    if (typeof window === 'undefined' || !window.cgPowerDial) {
      alert('Dialer not loaded yet. Try again in a second.')
      return
    }
    const items = sentLeads
      .filter((l) => !!l.phone)
      .map((l) => ({
        leadId: l.id,
        phone: l.phone!,
        businessName: l.business_name,
        contactName: l.owner_name,
      }))
    if (items.length === 0) {
      alert('No sent leads with phone numbers to dial.')
      return
    }
    if (!confirm(`Power dial through ${items.length} emailed lead${items.length === 1 ? '' : 's'}?`)) return
    window.cgPowerDial(items)
  }

  const handleSaveSequence = async () => {
    setSeqSaving(true); setSeqSaved(false)
    try {
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/sequences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: seqSteps }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed')
      setSeqSaved(true)
      setTimeout(() => setSeqSaved(false), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save sequence')
    } finally {
      setSeqSaving(false)
    }
  }

  const handleMarkReplied = async (leadId: string) => {
    setLeads((prev) => prev.map((l) => l.id === leadId
      ? { ...l, status: 'replied' as LeadStatus, replied_at: new Date().toISOString(), next_follow_up_at: null }
      : l,
    ))
    await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replied: true }),
    }).catch(() => {})
  }

  const addStep = () => {
    const nextNum = seqSteps.length + 1
    const defaultDelay = nextNum === 1 ? 3 : 4
    setEditingStep({
      step_number: nextNum,
      delay_days: defaultDelay,
      subject_template: 'Re: {{original_subject}}',
      body_template: nextNum === 1
        ? `Hi {{first_name}},\n\nJust wanted to make sure this didn't get buried. Did you get a chance to look?\n\n{{from_name}}`
        : `Hi {{first_name}},\n\nI'll leave it here. Don't want to be a pest. If the timing ever makes sense for {{business_name}}, I'd love to chat.\n\n{{from_name}}`,
    })
  }

  const saveEditingStep = (step: SequenceStep) => {
    setSeqSteps((prev) => {
      const exists = prev.findIndex((s) => s.step_number === step.step_number)
      if (exists >= 0) {
        const next = [...prev]
        next[exists] = step
        return next
      }
      return [...prev, step].sort((a, b) => a.step_number - b.step_number)
    })
    setEditingStep(null)
  }

  const deleteStep = (stepNumber: number) => {
    setSeqSteps((prev) =>
      prev
        .filter((s) => s.step_number !== stepNumber)
        .map((s, i) => ({ ...s, step_number: i + 1 })),
    )
  }

  const handleSaveSettings = async () => {
    if (!settingsEdit) return
    setSettingsSaving(true); setSettingsSaved(false)
    try {
      const res = await fetchWithAuth(`/api/sales/email-campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsEdit),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed')
      setCampaign((prev) => prev ? { ...prev, ...settingsEdit } : prev)
      setSettingsSaved(true)
      setSettingsEdit(null)
      setTimeout(() => setSettingsSaved(false), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSettingsSaving(false)
    }
  }

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads
    const q = search.toLowerCase()
    return leads.filter((l) =>
      l.email.toLowerCase().includes(q) ||
      (l.owner_name || '').toLowerCase().includes(q) ||
      (l.business_name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q),
    )
  }, [leads, search])

  if (loading) {
    return (
      <SalesShell activeLabel="Emails">
        <div className="flex items-center justify-center py-20">
          <CircleNotch className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </SalesShell>
    )
  }

  if (err && !campaign) {
    return (
      <SalesShell activeLabel="Emails">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{err}</div>
          <Link
            href="/sales/email-campaigns"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <CaretLeft className="w-3.5 h-3.5" /> Back to campaigns
          </Link>
        </div>
      </SalesShell>
    )
  }

  if (!campaign) return null

  return (
    <SalesShell activeLabel="Emails">
      {showAddLeads && (
        <AddLeadsModal
          campaignId={campaignId}
          onClose={() => setShowAddLeads(false)}
          onAdded={() => { void load() }}
        />
      )}

      {showWarmingWarning && (
        <WarmingWarning onClose={() => setShowWarmingWarning(false)} />
      )}

      {/* Step editor modal */}
      {editingStep && (
        <StepEditModal
          step={editingStep}
          onSave={saveEditingStep}
          onClose={() => setEditingStep(null)}
        />
      )}

      <section className="max-w-5xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/sales/email-campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <CaretLeft className="w-3.5 h-3.5" /> Back to campaigns
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Email Campaign</div>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-gray-900">
              {campaign.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              From {campaign.from_name} &lt;{campaign.from_email}&gt;
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {campaign.sent_count > 0 && (
              <button
                type="button"
                onClick={handlePowerDial}
                className="inline-flex items-center gap-1.5 text-sm bg-violet-600 text-white hover:bg-violet-700 rounded-lg px-3.5 py-2 transition-colors shadow-sm"
                title="Call everyone you emailed"
              >
                <PhoneCall weight="fill" className="w-4 h-4" /> Power dial sent
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddLeads(true)}
              className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors"
            >
              <Plus weight="bold" className="w-4 h-4" /> Add leads
            </button>
            {campaign.status === 'sending' && (
              <button
                type="button"
                onClick={handlePause}
                disabled={pausing}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
              >
                {pausing
                  ? <CircleNotch className="w-4 h-4 animate-spin" />
                  : <Pause weight="fill" className="w-4 h-4" />}
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || queuedCount === 0 || campaign.status === 'paused' || isCapped}
              className="inline-flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3.5 py-2 transition-colors shadow-sm disabled:opacity-50"
              title={isCapped ? `Daily cap of ${dailyCap} reached. Resets midnight UTC.` : undefined}
            >
              {sending
                ? <CircleNotch className="w-4 h-4 animate-spin" />
                : <PaperPlaneTilt weight="fill" className="w-4 h-4" />}
              Send batch ({queuedCount} queued)
            </button>
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
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

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          {[
            { label: 'Sent',    value: campaign.sent_count },
            { label: 'Bounced', value: campaign.bounce_count },
            { label: 'Queued',  value: queuedCount },
            { label: 'Replied', value: repliedCount },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">{s.label}</div>
              <div className="text-2xl font-display font-semibold text-gray-900 tabular-nums">{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Campaign Settings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.02 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-4 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-0.5">Campaign Settings</div>
              <p className="text-xs text-gray-500">Name, sender, subject, and email body.</p>
            </div>
            <div className="flex items-center gap-2">
              {settingsEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsEdit(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={settingsSaving}
                    className="inline-flex items-center gap-1.5 text-xs bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {settingsSaving
                      ? <CircleNotch className="w-3 h-3 animate-spin" />
                      : <CheckCircle weight="fill" className="w-3 h-3" />}
                    Save changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSettingsEdit({
                    name: campaign.name,
                    from_name: campaign.from_name,
                    reply_to: campaign.reply_to || '',
                    subject: campaign.subject,
                    body_template: campaign.body_template,
                    signature: campaign.signature || '',
                  })}
                  className="inline-flex items-center gap-1.5 text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {settingsSaved
                    ? <><CheckCircle weight="fill" className="w-3 h-3 text-emerald-500" /> Saved</>
                    : <><PencilSimple className="w-3 h-3" /> Edit</>}
                </button>
              )}
            </div>
          </div>

          {settingsEdit ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campaign name</label>
                  <input
                    value={settingsEdit.name}
                    onChange={(e) => setSettingsEdit((f) => f ? { ...f, name: e.target.value } : f)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From name</label>
                  <input
                    value={settingsEdit.from_name}
                    onChange={(e) => setSettingsEdit((f) => f ? { ...f, from_name: e.target.value } : f)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Forward replies to</label>
                <input
                  value={settingsEdit.reply_to}
                  onChange={(e) => setSettingsEdit((f) => f ? { ...f, reply_to: e.target.value } : f)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input
                  value={settingsEdit.subject}
                  onChange={(e) => setSettingsEdit((f) => f ? { ...f, subject: e.target.value } : f)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Body template</label>
                <textarea
                  rows={8}
                  value={settingsEdit.body_template}
                  onChange={(e) => setSettingsEdit((f) => f ? { ...f, body_template: e.target.value } : f)}
                  className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors resize-y"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Variables: <code>{'{{first_name}}'}</code> <code>{'{{business_name}}'}</code> <code>{'{{city}}'}</code> <code>{'{{from_name}}'}</code>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Signature <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={settingsEdit.signature}
                  onChange={(e) => setSettingsEdit((f) => f ? { ...f, signature: e.target.value } : f)}
                  placeholder={"Best,\nYour Name\nTitle | Company\n(555) 000-0000"}
                  className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 transition-colors resize-y"
                />
                <p className="text-[10px] text-gray-400 mt-1">Appended to every email in this campaign.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex gap-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Name</span>
                  <p className="text-gray-800 mt-0.5">{campaign.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">From</span>
                  <p className="text-gray-800 mt-0.5">{campaign.from_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Replies to</span>
                  <p className="text-gray-800 mt-0.5">{campaign.reply_to || campaign.from_email}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Subject</span>
                <p className="text-gray-800 mt-0.5 font-mono text-xs">{campaign.subject}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Body</span>
                <pre className="text-gray-600 text-xs mt-0.5 whitespace-pre-wrap font-sans line-clamp-3">{campaign.body_template}</pre>
              </div>
              {campaign.signature && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Signature</span>
                  <pre className="text-gray-600 text-xs mt-0.5 whitespace-pre-wrap font-sans line-clamp-2">{campaign.signature}</pre>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Warmup cap status */}
        <div className={`flex items-center justify-between mb-4 rounded-xl px-4 py-2.5 text-xs ${
          isCapped
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-gray-50 border border-gray-100'
        }`}>
          <div className="flex items-center gap-2">
            <ThermometerSimple className={`w-3.5 h-3.5 ${isCapped ? 'text-amber-500' : 'text-gray-400'}`} />
            <span className={isCapped ? 'text-amber-800' : 'text-gray-600'}>
              Week {warmupWeek} warmup cap:
              {' '}
              <span className="font-semibold">{sentToday}</span>
              {' of '}
              <span className="font-semibold">{dailyCap}</span>
              {' sent today'}
            </span>
          </div>
          {isCapped && (
            <span className="text-amber-700 font-medium">Daily limit reached, resets midnight UTC</span>
          )}
          {!isCapped && dailyCap < 200 && (
            <span className="text-gray-400">
              Increases to {Math.min(dailyCap + 10, 200)}/day next week
            </span>
          )}
        </div>

        {/* Follow-up Sequence */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.04 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-4 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-0.5">Follow-up Sequence</div>
              <p className="text-xs text-gray-500">Emails sent automatically after the initial send.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus weight="bold" className="w-3 h-3" /> Add follow-up
              </button>
              <button
                type="button"
                onClick={handleSaveSequence}
                disabled={seqSaving}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {seqSaving
                  ? <CircleNotch className="w-3 h-3 animate-spin" />
                  : seqSaved
                    ? <CheckCircle weight="fill" className="w-3 h-3 text-emerald-400" />
                    : null}
                {seqSaved ? 'Saved' : 'Save sequence'}
              </button>
            </div>
          </div>

          {seqSteps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
              <ArrowClockwise className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No follow-ups yet.</p>
              <button
                type="button"
                onClick={addStep}
                className="mt-2 text-xs text-sky-600 hover:text-sky-700 transition-colors"
              >
                Add your first follow-up
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {seqSteps.map((step, idx) => (
                <div
                  key={step.step_number}
                  className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-shrink-0 text-center">
                    <div className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[10px] font-mono text-gray-600 shadow-sm">
                      Day {step.delay_days}
                    </div>
                    {idx > 0 && (
                      <div className="text-[9px] text-gray-400 mt-0.5">after prev</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{step.subject_template}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {step.body_template.split('\n').find((l) => l.trim()) || ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingStep(step)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <PencilSimple className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStep(step.step_number)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Leads table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.06 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-medium text-gray-900">
              Leads{' '}
              <span className="text-gray-400 font-normal">({leads.length})</span>
            </h2>
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <EnvelopeSimple weight="duotone" className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No leads yet.</p>
              <button
                type="button"
                onClick={() => setShowAddLeads(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 transition-colors"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" /> Add leads
              </button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No results.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Email', 'Owner', 'Business', 'City', 'Status', 'Sent', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-gray-500 font-normal"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
                        i === filteredLeads.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-700 font-mono text-xs">{lead.email}</td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {lead.owner_name || <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {lead.business_name || <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {lead.city || <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <LeadStatusBadge status={lead.status} />
                        {lead.status === 'sent' && lead.next_follow_up_at && (
                          <p className="text-[10px] text-sky-500 mt-0.5">
                            Follow-up step {(lead.sequence_step || 0) + 1} &middot; {fmtDate(lead.next_follow_up_at)}
                          </p>
                        )}
                        {lead.error && (
                          <p
                            className="text-[10px] text-red-500 mt-0.5 truncate max-w-[160px]"
                            title={lead.error}
                          >
                            {lead.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {lead.sent_at ? fmtDate(lead.sent_at) : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {lead.status === 'sent' && (
                          <button
                            type="button"
                            onClick={() => handleMarkReplied(lead.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-2 py-1 transition-colors"
                            title="They replied, stop follow-ups"
                          >
                            <ArrowBendUpLeft className="w-3 h-3" /> Replied
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </section>
    </SalesShell>
  )
}
