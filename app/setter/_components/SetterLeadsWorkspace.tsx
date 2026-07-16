'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneCall, EnvelopeSimple, CheckCircle, WarningCircle, CircleNotch, Target, UploadSimple, DownloadSimple, FileCsv, MagnifyingGlass, CalendarBlank, PaperPlaneTilt, CopySimple, PencilSimple } from '@phosphor-icons/react'
import { leadTimeZone, wallClockToUtc, tzAbbrev } from '@/lib/time/lead-timezone'
import { SetterLoadingState } from './SetterShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { firaCode } from './fonts'

const EASE = [0.22, 1, 0.36, 1] as const

type Lead = {
  id: string
  business_name: string
  contact_name?: string | null
  owner_confidence?: string | null
  owner_source?: string | null
  owner_verified_at?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  notes?: string | null
  website?: string | null
  city?: string | null
  state?: string | null
  business_type?: string | null
  google_rating?: number | null
  google_review_count?: number | null
  google_business_status?: string | null
  quality_score?: number | null
  created_at?: string
  claimed_at?: string
  status: string
  disposition: string | null
  follow_up_at: string | null
  last_touched_at: string | null
  touch_count: number
  latest_note?: { body: string; created_at: string } | null
}

const STATUS_META: Record<string, { label: string; pill: string; dot: string; row: string }> = {
  new:             { label: 'New',         pill: 'bg-gray-100 text-gray-700',          dot: 'bg-gray-400',     row: '' },
  called:          { label: 'Called',      pill: 'bg-sky-100 text-sky-700',            dot: 'bg-sky-500',      row: 'bg-sky-100/70 hover:bg-sky-100' },
  voicemail:       { label: 'Voicemail',   pill: 'bg-cyan-100 text-cyan-700',      dot: 'bg-cyan-500',   row: 'bg-cyan-50 hover:bg-cyan-100/70' },
  interested:      { label: 'Interested',  pill: 'bg-amber-100 text-amber-800',        dot: 'bg-amber-500',    row: 'bg-amber-100/80 hover:bg-amber-100' },
  demo_scheduled:  { label: 'Demo set',    pill: 'bg-amber-200 text-amber-900',        dot: 'bg-amber-600',    row: 'bg-amber-100 hover:bg-amber-200/70' },
  demo_showed:     { label: 'Demo held',   pill: 'bg-blue-100 text-blue-800',          dot: 'bg-blue-600',     row: 'bg-blue-50 hover:bg-blue-100/70' },
  proposal_sent:   { label: 'Proposal',    pill: 'bg-emerald-100 text-emerald-700',    dot: 'bg-emerald-500',  row: 'bg-emerald-100/70 hover:bg-emerald-100' },
  closed:          { label: 'Closed',      pill: 'bg-emerald-200 text-emerald-900',    dot: 'bg-emerald-600',  row: 'bg-emerald-100 hover:bg-emerald-200/70' },
  dead:            { label: 'Dead',        pill: 'bg-gray-200 text-gray-500',          dot: 'bg-gray-300',     row: 'bg-gray-100/80 opacity-50 hover:opacity-75' },
  not_available:   { label: 'Not avail',   pill: 'bg-orange-100 text-orange-700',      dot: 'bg-orange-500',   row: 'bg-orange-50 hover:bg-orange-100/70' },
  not_interested:  { label: 'Not interested', pill: 'bg-slate-200 text-slate-600',      dot: 'bg-slate-400',    row: 'bg-slate-100/70 hover:bg-slate-100' },
  wrong_dm:        { label: 'Wrong DM',    pill: 'bg-cyan-100 text-cyan-700',          dot: 'bg-cyan-500',     row: 'bg-cyan-50 hover:bg-cyan-100/70' },
  do_not_call:     { label: 'DNC',         pill: 'bg-red-100 text-red-700',            dot: 'bg-red-500',      row: 'bg-red-100/70 hover:bg-red-100' },
}

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',           label: 'All' },
  { key: 'new',           label: 'New' },
  { key: 'called',        label: 'Called' },
  { key: 'voicemail',     label: 'Voicemail' },
  { key: 'interested',    label: 'Interested' },
  { key: 'demo_scheduled', label: 'Demo set' },
  { key: 'demo_showed',   label: 'Demo held' },
  { key: 'proposal_sent', label: 'Proposal' },
  { key: 'dead',          label: 'Dead' },
  { key: 'not_available', label: 'Not avail' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'wrong_dm', label: 'Wrong DM' },
  { key: 'do_not_call',   label: 'DNC' },
]

/**
 * Setter fork of app/_shared/rep-workspace/LeadsWorkspace.tsx, restyled
 * to the v5 setter design system (white canvas, navy headings, blue
 * accents, zero purple - see scratchpad setter-design-spec.md). A fork,
 * not a themed shared component, on purpose: /sales keeps its own look
 * untouched until the redesign is approved for a full rollout. Behavior
 * is identical - same /api/sales/leads* endpoints (they accept both
 * roles via REP_TOOL_ROLES) - plus one setter-only addition: the
 * demo_showed ("Demo held") status that feeds the weekly goal.
 */
const SCRAPE_HREF = '/setter/leads/scrape'

export function SetterLeadsWorkspace() {
  const scrapeHref = SCRAPE_HREF
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [migrationNeeded, setMigrationNeeded] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [findingOwnerId, setFindingOwnerId] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'quality' | 'newest' | 'untouched'>('newest')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  // Page-scoped modal so any row can pop the demo-set picker without
  // each row having to own its own state.
  const [demoModalLeadId, setDemoModalLeadId] = useState<string | null>(null)
  const [noteModalLeadId, setNoteModalLeadId] = useState<string | null>(null)
  const [emailModalLeadId, setEmailModalLeadId] = useState<string | null>(null)
  const [findingEmails, setFindingEmails] = useState(false)
  const [outreachModal, setOutreachModal] = useState<{
    leads: Pick<Lead, 'id' | 'business_name'>[]
    results: Map<string, string>
    loading: boolean
  } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const generateOutreach = async (ids: string[]) => {
    const targetLeads = leads.filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, business_name: l.business_name }))
    setOutreachModal({ leads: targetLeads, results: new Map(), loading: true })
    try {
      const res = await fetchWithAuth('/api/sales/leads/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.results) {
        const map = new Map<string, string>(
          (json.results as { leadId: string; draft: string }[]).map((r) => [r.leadId, r.draft]),
        )
        setOutreachModal((prev) => prev ? { ...prev, results: map, loading: false } : null)
      } else {
        setOutreachModal((prev) => prev ? { ...prev, loading: false } : null)
      }
    } catch {
      setOutreachModal((prev) => prev ? { ...prev, loading: false } : null)
    }
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const clearSelected = () => setSelected(new Set())

  const bulkUpdateStatus = async (status: string) => {
    if (selected.size === 0) return
    setBulkBusy(true)
    const ids = Array.from(selected)
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, status } : l))
    try {
      const res = await fetchWithAuth('/api/sales/leads/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status, touched: true }),
      })
      if (!res.ok) throw new Error('Bulk update failed')
      setFlash(`Updated ${ids.length} lead${ids.length === 1 ? '' : 's'}.`)
      setTimeout(() => setFlash(''), 1500)
      clearSelected()
    } catch {
      setFlash('Update failed - reloading.')
      setTimeout(() => setFlash(''), 2500)
      await load()
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkFindEmails = async () => {
    const ids = Array.from(selected).filter((id) => {
      const l = leads.find((l) => l.id === id)
      return l?.website && !l.email
    })
    if (ids.length === 0) return
    setFindingEmails(true)
    try {
      const res = await fetchWithAuth('/api/sales/leads/find-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.results) {
        const emailMap = new Map<string, string | null>(
          (json.results as { leadId: string; email: string | null }[]).map((r) => [r.leadId, r.email]),
        )
        setLeads((prev) => prev.map((l) => emailMap.has(l.id) ? { ...l, email: emailMap.get(l.id) || l.email } : l))
        const found = (json.results as { email: string | null }[]).filter((r) => r.email).length
        setFlash(`Found ${found} of ${ids.length} email${ids.length === 1 ? '' : 's'}.`)
        setTimeout(() => setFlash(''), 3000)
      }
    } catch {
      // non-fatal
    } finally {
      setFindingEmails(false)
    }
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} lead${selected.size === 1 ? '' : 's'}? This unassigns them from your portal.`)) return
    setBulkBusy(true)
    const ids = Array.from(selected)
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)))
    try {
      const res = await fetchWithAuth('/api/sales/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Bulk delete failed')
      setFlash(`Removed ${ids.length} lead${ids.length === 1 ? '' : 's'}.`)
      setTimeout(() => setFlash(''), 1500)
      clearSelected()
    } catch {
      setFlash('Remove failed - reloading.')
      setTimeout(() => setFlash(''), 2500)
      await load()
    } finally {
      setBulkBusy(false)
    }
  }

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetchWithAuth('/api/sales/leads', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setError(j?.error || 'Failed to load leads')
      else {
        setLeads(j.leads || [])
        setMigrationNeeded(j.migration_needed || null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // "Just promoted" handshake from the scraper page: when promote
    // succeeds it sets cg.leads.justPromoted in sessionStorage. The
    // initial load() above usually fires before Supabase's read-after-
    // write lag clears, so do one more refetch ~1.5s later to catch
    // the new rows. This is what made reps think they had to "refresh
    // 1-2 times" to see promoted leads.
    let extra: ReturnType<typeof setTimeout> | null = null
    try {
      if (sessionStorage.getItem('cg.leads.justPromoted')) {
        sessionStorage.removeItem('cg.leads.justPromoted')
        extra = setTimeout(() => { void load() }, 1500)
      }
    } catch { /* sessionStorage unavailable, skip */ }

    // Refetch when the tab regains focus / visibility - covers reps
    // tabbing back from the scraper page or any other window.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      if (extra) clearTimeout(extra)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On-demand owner lookup ("Find owner"). Grounded web search; result is
  // cached on the lead so a repeat click is free. Populates contact_name +
  // owner_confidence so the existing name badge renders.
  const findOwner = async (leadId: string) => {
    setFindingOwnerId(leadId)
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/find-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? {
          ...l,
          contact_name: j.name || '',
          owner_confidence: j.confidence || l.owner_confidence,
          owner_source: j.source || l.owner_source,
          owner_verified_at: new Date().toISOString(),
        } : l))
      } else {
        setFlash(`Couldn't look up the owner${j?.error ? ` - ${j.error}` : ''}.`)
        setTimeout(() => setFlash(''), 3000)
      }
    } catch {
      setFlash('Owner lookup failed - try again.')
      setTimeout(() => setFlash(''), 3000)
    } finally {
      setFindingOwnerId(null)
    }
  }

  const updateStatus = async (leadId: string, status: string) => {
    setUpdatingStatusId(leadId)
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l))
    try {
      const res = await fetchWithAuth(`/api/sales/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // keepalive: reps pick an outcome then immediately switch pages,
        // which was aborting the in-flight PATCH so the status silently
        // reverted to 'new' on the next load. keepalive lets the write
        // finish even as the page unmounts.
        keepalive: true,
        body: JSON.stringify({ status, touched: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setFlash(`Couldn't save that outcome${j?.error ? ` - ${j.error}` : ''}.`)
        setTimeout(() => setFlash(''), 3500)
        await load()
      }
    } catch {
      // Network/abort - refetch to reflect the true server state.
      await load()
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const onPickFile = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImporting(true); setError(''); setFlash('')
    try {
      const csv = await f.text()
      const res = await fetchWithAuth('/api/sales/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Import failed')
      } else {
        const parts = [
          `${j.imported} imported`,
          j.skipped_duplicate_phone ? `${j.skipped_duplicate_phone} dup` : null,
          j.invalid ? `${j.invalid} invalid` : null,
        ].filter(Boolean)
        setFlash(parts.join(' · '))
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const formatPhone = (p?: string | null) => {
    if (!p) return ''
    const d = p.replace(/\D/g, '')
    if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    return p
  }

  const filtered = useMemo(() => {
    let out = [...leads]
    if (filter === 'callbacks_due') {
      const now = Date.now()
      out = out.filter((l) =>
        l.follow_up_at && new Date(l.follow_up_at).getTime() <= now &&
        l.status !== 'dead' && l.status !== 'do_not_call')
    } else if (filter !== 'all') out = out.filter((l) => l.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((l) =>
        l.business_name?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q),
      )
    }
    // Sort: quality (default) puts the most-reviewed, highest-rated
    // shops at the top so the rep stops opening day with the dead
    // listings. Tie-broken by newest claim so freshly-pulled leads
    // get a small boost over stale ones.
    if (sortBy === 'quality') {
      out.sort((a, b) => {
        const qa = a.quality_score ?? -1
        const qb = b.quality_score ?? -1
        if (qb !== qa) return qb - qa
        return (b.claimed_at || '').localeCompare(a.claimed_at || '')
      })
    } else if (sortBy === 'newest') {
      out.sort((a, b) => (b.claimed_at || '').localeCompare(a.claimed_at || ''))
    } else if (sortBy === 'untouched') {
      // Never-touched first, then oldest-touched.
      out.sort((a, b) => {
        const ta = a.last_touched_at ? new Date(a.last_touched_at).getTime() : 0
        const tb = b.last_touched_at ? new Date(b.last_touched_at).getTime() : 0
        return ta - tb
      })
    }
    return out
  }, [leads, filter, search, sortBy])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length }
    const now = Date.now()
    for (const l of leads) {
      c[l.status] = (c[l.status] || 0) + 1
      if (l.follow_up_at && new Date(l.follow_up_at).getTime() <= now &&
          l.status !== 'dead' && l.status !== 'do_not_call') {
        c.callbacks_due = (c.callbacks_due || 0) + 1
      }
    }
    return c
  }, [leads])

  const fmtFollowUp = (iso: string) => {
    const d = new Date(iso)
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0)
    const isToday = dayStart.getTime() === today.getTime()
    const isTmrw = dayStart.getTime() === tomorrow.getTime()
    const isPast = d.getTime() < Date.now()
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    if (isToday) return { label: `Today ${time}`, overdue: isPast }
    if (isTmrw) return { label: `Tmrw ${time}`, overdue: false }
    return { label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), overdue: isPast }
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-[#1E3A8A]">Your leads</h1>
          <p className="text-sm text-slate-500 mt-1">Work the list, tag what happened, book the demo.</p>
        </div>
        {
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                // Hand the queue to the full-screen call cockpit. With
                // checkboxes ticked, session = just those leads;
                // otherwise the whole filtered list.
                const source = selected.size > 0
                  ? filtered.filter((l) => selected.has(l.id))
                  : filtered
                const callable = source
                  .filter((l) => !!l.phone && l.status !== 'do_not_call' && l.status !== 'closed' && l.status !== 'dead')
                  .map((l) => ({
                    leadId: l.id,
                    phone: l.phone!,
                    businessName: l.business_name,
                    contactName: l.contact_name,
                    email: l.email,
                    city: l.city,
                    state: l.state,
                    businessType: l.business_type,
                    rating: l.google_rating,
                    reviews: l.google_review_count,
                    status: l.status,
                    followUpAt: l.follow_up_at,
                  }))
                if (callable.length === 0) {
                  alert(selected.size > 0
                    ? 'None of the selected leads are callable (needs a phone number, not Closed/Dead/DNC).'
                    : 'No callable leads in the current filter. Sessions only queue leads with a phone number that aren\'t Closed/Dead/DNC.')
                  return
                }
                try { sessionStorage.setItem('cg.dialer.queue', JSON.stringify(callable)) } catch {}
                window.location.href = '/setter/dialer'
              }}
              className="inline-flex items-center gap-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-3.5 py-2 transition-colors shadow-sm"
              title={selected.size > 0
                ? `Open the call cockpit with the ${selected.size} selected lead${selected.size === 1 ? '' : 's'} queued`
                : 'Open the call cockpit with the filtered list queued'}
            >
              <PhoneCall weight="fill" className="w-4 h-4" />
              {selected.size > 0 ? `Start call session (${selected.size})` : 'Start call session'}
            </button>
            <Link
              href={scrapeHref}
              className="inline-flex items-center gap-1.5 text-sm bg-[#1E3A8A] text-white hover:bg-[#182f70] rounded-lg px-3.5 py-2 transition-colors shadow-sm"
            >
              <Target weight="fill" className="w-4 h-4" /> Scrape
            </Link>
            <button
              onClick={onPickFile}
              disabled={importing}
              className="inline-flex items-center gap-1.5 text-sm border border-[#E3EAF4] text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
            >
              {importing
                ? <CircleNotch className="w-4 h-4 animate-spin" />
                : <UploadSimple weight="bold" className="w-4 h-4" />}
              Import
            </button>
            <a
              href="/api/sales/leads/export"
              className="inline-flex items-center gap-1.5 text-sm border border-[#E3EAF4] text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors"
            >
              <DownloadSimple weight="bold" className="w-4 h-4" /> Export
            </a>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
            />
          </div>
        }
      </div>

      <div className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
        <FileCsv weight="bold" className="w-3.5 h-3.5" />
        CSV: <span className="font-mono text-gray-600">business_name, contact_name, phone, email, notes</span>
      </div>

      <AnimatePresence>
        {migrationNeeded && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 flex items-start gap-2"
          >
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <span>
              Workflow features are off. Ask admin to run{' '}
              <code className="font-mono text-xs bg-amber-100 px-1 rounded">sql/{migrationNeeded}.sql</code>{' '}
              in Supabase so status pills, follow-ups and notes show up.
            </span>
          </motion.div>
        )}
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
        <SetterLoadingState />
      ) : leads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-white border border-[#E3EAF4] rounded-xl p-10 text-center shadow-sm"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Target weight="duotone" className="w-6 h-6" />
          </div>
          <h2 className="text-base font-medium text-gray-900 mb-1">No leads yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Run a scrape to pull verified contractors, or import a CSV.
          </p>
          <div className="flex items-center gap-2 justify-center mt-5">
            <Link
              href={scrapeHref}
              className="inline-flex items-center gap-1.5 text-sm bg-[#1E3A8A] text-white hover:bg-[#182f70] rounded-lg px-4 py-2 transition-colors"
            >
              <Target weight="fill" className="w-4 h-4" /> Scrape leads
            </Link>
            <button
              onClick={onPickFile}
              className="inline-flex items-center gap-1.5 text-sm border border-[#E3EAF4] text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors"
            >
              <UploadSimple weight="bold" className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-white border border-[#E3EAF4] rounded-xl overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {(counts.callbacks_due ?? 0) > 0 && (
                <button
                  onClick={() => setFilter(filter === 'callbacks_due' ? 'all' : 'callbacks_due')}
                  className={`text-xs font-semibold rounded-full px-2.5 py-1 border transition-all ${
                    filter === 'callbacks_due'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  Callbacks due
                  <span className={`ml-1 tabular-nums ${filter === 'callbacks_due' ? 'text-amber-100' : 'text-amber-600'}`}>
                    {counts.callbacks_due}
                  </span>
                </button>
              )}
              {STATUS_FILTERS.map((f) => {
                const c = counts[f.key] ?? 0
                if (f.key !== 'all' && c === 0) return null
                const active = filter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`text-xs rounded-full px-2.5 py-1 border transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-[#E3EAF4] hover:border-gray-400'
                    }`}
                  >
                    {f.label}
                    <span className={`ml-1 tabular-nums ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                      {c}
                    </span>
                  </button>
                )
              })}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-gray-50 border border-[#E3EAF4] rounded-lg px-2.5 py-1.5 hover:border-gray-400 focus:outline-none focus:bg-white"
              title="Sort"
            >
              <option value="quality">Best leads first</option>
              <option value="newest">Newest claim</option>
              <option value="untouched">Untouched longest</option>
            </select>
            <div className="relative flex-shrink-0">
              <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-[#E3EAF4] rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Bulk action bar - appears once any row is selected */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="sticky top-0 z-10 px-3 py-2 bg-sky-50 border-y border-sky-200 flex items-center gap-3 flex-wrap"
              >
                <span className="text-sm font-medium text-sky-900 inline-flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-sky-600 text-white rounded-full text-[10px] font-mono tabular-nums">{selected.size}</span>
                  selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selected.size === filtered.length) clearSelected()
                      else setSelected(new Set(filtered.map((l) => l.id)))
                    }}
                    className="text-xs text-sky-700 hover:text-sky-900 underline-offset-2 hover:underline"
                  >
                    {selected.size === filtered.length ? 'Deselect all' : `Select all ${filtered.length}`}
                  </button>
                  {filtered.some((l) => !!l.email) && (
                    <button
                      onClick={() => {
                        const withEmail = new Set(filtered.filter((l) => !!l.email).map((l) => l.id))
                        setSelected(withEmail)
                      }}
                      className="text-xs text-sky-700 hover:text-sky-900 underline-offset-2 hover:underline"
                    >
                      Select all with email
                    </button>
                  )}
                </div>
                <div className="flex-1" />
                {Array.from(selected).some((id) => { const l = leads.find((l) => l.id === id); return l?.website && !l.email }) && (
                  <button
                    onClick={bulkFindEmails}
                    disabled={findingEmails || bulkBusy}
                    className="inline-flex items-center gap-1.5 text-xs bg-sky-600 text-white hover:bg-sky-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    {findingEmails
                      ? <CircleNotch className="w-3 h-3 animate-spin" />
                      : <EnvelopeSimple weight="bold" className="w-3 h-3" />}
                    {findingEmails ? 'Finding emails...' : 'Find emails'}
                  </button>
                )}
                <button
                  onClick={() => void generateOutreach(Array.from(selected))}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  <PaperPlaneTilt weight="bold" className="w-3 h-3" />
                  Generate DMs
                </button>
                <select
                  onChange={(e) => { if (e.target.value) bulkUpdateStatus(e.target.value); e.target.value = '' }}
                  disabled={bulkBusy}
                  defaultValue=""
                  className="text-xs font-mono uppercase tracking-wider rounded-lg border border-sky-300 bg-white px-3 py-1.5 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>Set status…</option>
                  {STATUS_FILTERS.filter((s) => s.key !== 'all').map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={bulkDelete}
                  disabled={bulkBusy}
                  className="text-xs text-rose-700 hover:text-rose-900 bg-white border border-rose-200 hover:border-rose-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Remove
                </button>
                <button
                  onClick={clearSelected}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No matches.
            </div>
          ) : (
            <motion.ul
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.012 } } }}
              className="divide-y divide-gray-100"
            >
              {filtered.map((l) => {
                const meta = STATUS_META[l.status] || STATUS_META.new
                const fu = l.follow_up_at ? fmtFollowUp(l.follow_up_at) : null
                const updating = updatingStatusId === l.id
                const isSelected = selected.has(l.id)
                const nameBlock = (
                  <div className="flex-1 min-w-0 block group">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 truncate leading-tight">
                        {l.business_name}
                      </div>
                      <QualityChip lead={l} />
                    </div>
                    <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 flex-wrap leading-tight">
                      {l.contact_name && (
                        <span className="inline-flex items-center gap-1">
                          <span>{l.contact_name}</span>
                          {(l.owner_confidence === 'high' || l.owner_confidence === 'medium') ? (
                            <CheckCircle
                              weight="fill"
                              className={`w-3 h-3 ${l.owner_confidence === 'high' ? 'text-emerald-500' : 'text-emerald-400/70'}`}
                              aria-label={l.owner_confidence === 'high' ? 'Owner confirmed on website' : 'Owner from state license record'}
                            />
                          ) : l.owner_confidence === 'low' ? (
                            <span title="Owner name not confirmed - ask for the owner on the call" className="text-[9px] uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-px">unverified</span>
                          ) : null}
                        </span>
                      )}
                      {!l.contact_name && !l.owner_verified_at && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); findOwner(l.id) }}
                          disabled={findingOwnerId === l.id}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60"
                          title="Look up the owner's name so you can ask for them by name"
                        >
                          {findingOwnerId === l.id
                            ? <><CircleNotch weight="bold" className="w-3 h-3 animate-spin" /> Finding owner…</>
                            : <><MagnifyingGlass weight="bold" className="w-3 h-3" /> Find owner</>}
                        </button>
                      )}
                      {!l.contact_name && l.owner_verified_at && (
                        <span className="text-gray-400 italic" title="No owner name found - ask for the owner on the call">no owner name found</span>
                      )}
                      {l.contact_name && (l.city || l.business_type) && <span className="text-gray-300">·</span>}
                      {l.business_type && <span className="text-gray-600">{l.business_type}</span>}
                      {l.business_type && l.city && <span className="text-gray-300">·</span>}
                      {l.city && <span>{l.city}{l.state ? `, ${l.state}` : ''}</span>}
                    </div>
                  </div>
                )
                return (
                  <motion.li
                    key={l.id}
                    variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } } }}
                    className={`px-3 py-1.5 transition-colors ${
                      isSelected ? 'bg-sky-100/80 ring-1 ring-inset ring-sky-300' :
                      (meta.row || 'hover:bg-gray-50/60')
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(l.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer flex-shrink-0"
                        aria-label="Select lead"
                      />
                      {/* Left: company + contact */}
                      {nameBlock}

                      {/* Middle: BIG phone - easy to read while typing into a phone.
                          On desktop, the in-browser dialer handles the click. On mobile
                          (no window.cgDial registered) the tel: link fires the OS dialer. */}
                      {l.phone && (
                        <a
                          href={`tel:${l.phone}`}
                          onClick={(e) => {
                            if (typeof window !== 'undefined' && window.cgDial && l.phone) {
                              e.preventDefault()
                              window.cgDial(l.phone, l.id)
                            }
                          }}
                          className={`hidden sm:flex items-center gap-2 text-sm tabular-nums text-gray-900 hover:text-gray-700 select-all ${firaCode.className}`}
                          aria-label="Call"
                        >
                          {formatPhone(l.phone)}
                        </a>
                      )}

                      {/* Right: status dropdown + call button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative">
                          <select
                            value={l.status}
                            onChange={(e) => updateStatus(l.id, e.target.value)}
                            disabled={updating}
                            onClick={(e) => e.stopPropagation()}
                            className={`appearance-none text-[11px] font-mono uppercase tracking-wider rounded-full pl-3 pr-7 py-1.5 cursor-pointer transition-all ${meta.pill} hover:ring-2 hover:ring-gray-200 disabled:opacity-60`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='currentColor'%3e%3cpath d='M4.293 6.707a1 1 0 011.414 0L8 9l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'/%3e%3c/svg%3e")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.4rem center',
                              backgroundSize: '0.85em',
                            }}
                          >
                            {STATUS_FILTERS.filter((s) => s.key !== 'all').map((s) => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        {l.phone && (
                          <a
                            href={`tel:${l.phone}`}
                            onClick={(e) => {
                              if (typeof window !== 'undefined' && window.cgDial && l.phone) {
                                e.preventDefault()
                                window.cgDial(l.phone, l.id)
                              }
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            aria-label="Call"
                          >
                            <Phone weight="bold" className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEmailModalLeadId(l.id) }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label="Send email"
                          title="Email this prospect"
                        >
                          <EnvelopeSimple weight="bold" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNoteModalLeadId(l.id) }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label="Add note"
                          title="Add a note (does not book anything)"
                        >
                          <PencilSimple weight="bold" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDemoModalLeadId(l.id) }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          aria-label="Mark demo set"
                          title="Mark demo set - books the demo + pings the team"
                        >
                          <CheckCircle weight="fill" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile-only: phone gets its own line under the company */}
                    {l.phone && (
                      <a
                        href={`tel:${l.phone}`}
                        className={`sm:hidden inline-flex items-center gap-1.5 mt-2 text-sm tabular-nums text-gray-700 select-all ${firaCode.className}`}
                      >
                        <Phone weight="bold" className="w-3.5 h-3.5 text-gray-400" />
                        {formatPhone(l.phone)}
                      </a>
                    )}

                    {/* Footer: badges + last note hint */}
                    {(fu || l.touch_count > 0 || l.latest_note) && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {fu && (
                          <span className={`text-[11px] inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                            fu.overdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <CalendarBlank weight="fill" className="w-3 h-3" /> {fu.label}
                          </span>
                        )}
                        {l.touch_count > 0 && (
                          <span className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                            <Phone weight="bold" className="w-2.5 h-2.5" />
                            {l.touch_count} {l.touch_count === 1 ? 'touch' : 'touches'}
                          </span>
                        )}
                        {l.latest_note && (
                          <span className="text-[11px] text-gray-500 italic truncate max-w-md">
                            “{l.latest_note.body}”
                          </span>
                        )}
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </motion.div>
      )}
      {demoModalLeadId && (
        <LeadsDemoSetModal
          leadId={demoModalLeadId}
          leadState={leads.find((l) => l.id === demoModalLeadId)?.state || null}
          leadPhone={leads.find((l) => l.id === demoModalLeadId)?.phone || null}
          initialEmail={leads.find((l) => l.id === demoModalLeadId)?.email || ''}
          onClose={() => setDemoModalLeadId(null)}
          onSaved={(result) => {
            const lid = demoModalLeadId
            setDemoModalLeadId(null)
            // Bump the row's status in-place so the user sees the change
            // immediately. Background refetch keeps the rest in sync.
            setLeads((prev) => prev.map((l) => l.id === lid
              ? { ...l, status: 'demo_scheduled', ...(result?.sentTo && !l.email ? { email: result.sentTo } : {}) }
              : l))
            setFlash(
              result?.sentTo ? `Demo set and booking link sent to ${result.sentTo}.`
              : result?.warn ? 'Demo set, but the booking link did not send - resend it from the email button.'
              : 'Demo set - the team has been pinged.',
            )
            setTimeout(() => setFlash(''), 4000)
          }}
        />
      )}
      {noteModalLeadId && (
        <LeadsNoteModal
          leadId={noteModalLeadId}
          businessName={leads.find((l) => l.id === noteModalLeadId)?.business_name || 'this lead'}
          onClose={() => setNoteModalLeadId(null)}
          onSaved={(body) => {
            const lid = noteModalLeadId
            setNoteModalLeadId(null)
            setLeads((prev) => prev.map((l) => l.id === lid
              ? { ...l, latest_note: { body, created_at: new Date().toISOString() } }
              : l))
            setFlash('Note saved.')
            setTimeout(() => setFlash(''), 2500)
          }}
        />
      )}
      {emailModalLeadId && (() => {
        const lead = leads.find((l) => l.id === emailModalLeadId)
        return (
          <LeadsEmailModal
            leadId={emailModalLeadId}
            businessName={lead?.business_name || 'this business'}
            contactName={lead?.contact_name || null}
            initialEmail={lead?.email || ''}
            onClose={() => setEmailModalLeadId(null)}
            onSent={(toEmail) => {
              const lid = emailModalLeadId
              setEmailModalLeadId(null)
              setLeads((prev) => prev.map((l) => l.id === lid && !l.email ? { ...l, email: toEmail } : l))
              setFlash('Email sent.')
              setTimeout(() => setFlash(''), 2500)
            }}
          />
        )
      })()}
      {outreachModal && (
        <OutreachModal
          leads={outreachModal.leads}
          results={outreachModal.results}
          loading={outreachModal.loading}
          onClose={() => setOutreachModal(null)}
        />
      )}
    </section>
  )
}

/**
 * Tiny self-contained datetime modal used by the leads list checkmark.
 * Same endpoint as the lead detail "Demo set" button - keeps both
 * surfaces consistent (status flip + founder email + Slack ping).
 */
function LeadsDemoSetModal({ leadId, leadState, leadPhone, initialEmail, onClose, onSaved }: {
  leadId: string
  leadState?: string | null
  leadPhone?: string | null
  initialEmail?: string | null
  onClose: () => void
  onSaved: (result?: { sentTo?: string; warn?: string }) => void
}) {
  const tz = leadTimeZone(leadState, leadPhone)
  const initial = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()
  const [when, setWhen] = useState(initial)
  const [email, setEmail] = useState((initialEmail || '').trim())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const emailTrimmed = email.trim()
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrimmed)

  const save = async () => {
    if (!when) { setErr('Pick a date/time'); return }
    if (emailTrimmed && !emailValid) { setErr("That email doesn't look right"); return }
    setBusy(true); setErr(null)
    const scheduledAt = tz ? wallClockToUtc(when, tz) : new Date(when).toISOString()
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/mark-demo`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: scheduledAt,
          notes: notes.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }

      // Also email the prospect the booking link so the demo lands on the
      // rep's calendar with an invite + reminders - a verbal time alone
      // no-shows. Non-fatal: the demo is already booked either way.
      let result: { sentTo?: string; warn?: string } = {}
      if (emailValid) {
        try {
          const lr = await fetchWithAuth(`/api/sales/leads/${leadId}/send-booking-link`, {
            method: 'POST',
            body: JSON.stringify({ email: emailTrimmed, scheduled_at: scheduledAt, tz: tz || undefined }),
          })
          const lj = await lr.json().catch(() => ({}))
          if (lr.ok && lj?.success) result = { sentTo: emailTrimmed }
          else result = { warn: lj?.error || 'link failed' }
        } catch {
          result = { warn: 'link failed' }
        }
      }
      onSaved(result)
    } catch {
      setErr('Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarBlank weight="fill" className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-medium text-gray-900">Book a demo</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Books the demo, pings the team, and emails the prospect the booking link so it lands on the rep&apos;s calendar. Only use it when a demo is actually set.
        </p>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          When? <span className="font-normal text-gray-400">{tz ? `(prospect's time · ${tzAbbrev(tz, new Date(when || Date.now()))})` : '(your local time)'}</span>
        </label>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-gray-900"
        />
        <label className="block text-xs font-medium text-gray-700 mt-3 mb-1.5">
          Prospect&apos;s email <span className="font-normal text-gray-400">(we&apos;ll send them the booking link)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-gray-900"
        />
        <p className="text-[11px] text-gray-400 mt-1">Optional. Leave blank if you&apos;ll send the invite yourself, we&apos;ll just book it and ping the team.</p>
        <label className="block text-xs font-medium text-gray-700 mt-3 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="anything for the build"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-gray-900 resize-none"
        />
        {err && (
          <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={save}
            disabled={busy || !when}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            {emailValid ? 'Book demo & send link' : 'Mark demo set'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Standalone note for a lead - a real notes home on the leads list so
 * setters stop typing call notes into the demo modal (which was booking
 * a demo). Pure POST /notes, never changes status.
 */
function LeadsNoteModal({ leadId, businessName, onClose, onSaved }: {
  leadId: string
  businessName: string
  onClose: () => void
  onSaved: (body: string) => void
}) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    const text = body.trim()
    if (!text) { setErr('Write a note first'); return }
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }
      onSaved(text)
    } catch { setErr('Failed') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <PencilSimple weight="bold" className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-medium text-gray-900">Note on {businessName}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Just a note - this does not book anything or change the lead&apos;s status.</p>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={5} autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save() } }}
          placeholder="What happened on the call, who you spoke to, next steps…"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
        />
        {err && <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={save} disabled={busy || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 1:1 prospect email compose. Sends from {rep}@getcloudgreet.com with a
 * personal, pre-filled draft the setter can edit. Not a campaign.
 */
function LeadsEmailModal({ leadId, businessName, contactName, initialEmail, onClose, onSent }: {
  leadId: string
  businessName: string
  contactName: string | null
  initialEmail: string
  onClose: () => void
  onSent: (toEmail: string) => void
}) {
  const first = (contactName || '').trim().split(/\s+/)[0] || 'there'
  const [to, setTo] = useState(initialEmail)
  const [subject, setSubject] = useState('Following up from our call')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    // Prefill a solid personal draft (rep can edit or rewrite).
    void (async () => {
      let bookingUrl = ''
      try {
        const r = await fetchWithAuth('/api/setter/assigned-rep')
        const j = await r.json().catch(() => ({}))
        bookingUrl = j?.rep?.booking_url || ''
      } catch { /* optional */ }
      setBody(
        `Hi ${first},\n\n` +
        `Thanks for taking my call. I know how busy it gets at ${businessName}, so quick recap: CloudGreet is an AI receptionist that answers every call 24/7, books jobs straight onto your calendar, and texts back missed callers in under a minute. It's like adding a front-desk person who never misses a call.\n\n` +
        `If you're open to it, the fastest way to see it is a quick 15-minute demo` +
        (bookingUrl ? ` — you can grab a time here: ${bookingUrl}` : `, just reply and I'll set one up`) + `.\n\n` +
        `Talk soon,\n`,
      )
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/send-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }
      onSent(to.trim())
    } catch { setErr('Failed to send') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <EnvelopeSimple weight="fill" className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-medium text-gray-900">Email {businessName}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Sends a personal email from your CloudGreet address. Replies come back to you.</p>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">To</label>
        <input
          type="email" value={to} onChange={(e) => setTo(e.target.value)} autoFocus={!initialEmail}
          placeholder="name@company.com"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm mb-3 focus:outline-none focus:border-blue-500"
        />
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm mb-3 focus:outline-none focus:border-blue-500"
        />
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Message</label>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={9}
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
        />
        {err && <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={send} disabled={busy || !to.trim() || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <PaperPlaneTilt weight="fill" className="w-4 h-4" />}
            Send email
          </button>
        </div>
      </div>
    </div>
  )
}

function OutreachModal({ leads, results, loading, onClose }: {
  leads: Pick<Lead, 'id' | 'business_name'>[]
  results: Map<string, string>
  loading: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const copyAll = () => {
    const all = leads
      .map((l) => {
        const draft = results.get(l.id)
        return draft ? `--- ${l.business_name} ---\n${draft}` : null
      })
      .filter(Boolean)
      .join('\n\n')
    void navigator.clipboard.writeText(all)
    setCopied('__all__')
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PaperPlaneTilt weight="fill" className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-medium text-gray-900">
              {loading
                ? `Writing ${leads.length} message${leads.length === 1 ? '' : 's'}...`
                : `${results.size} DM${results.size === 1 ? '' : 's'} ready`}
            </h3>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Done</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <CircleNotch className="w-5 h-5 animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          ) : (
            leads.map((lead) => {
              const draft = results.get(lead.id)
              if (!draft) return null
              const id = lead.id
              return (
                <div key={id} className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{lead.business_name}</div>
                  <p className="text-sm text-gray-900 leading-relaxed">{draft}</p>
                  <button
                    onClick={() => copy(draft, id)}
                    className={`inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors ${
                      copied === id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white border border-[#E3EAF4] text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {copied === id
                      ? <CheckCircle weight="fill" className="w-3 h-3" />
                      : <CopySimple weight="bold" className="w-3 h-3" />}
                    {copied === id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )
            })
          )}
        </div>
        {!loading && results.size > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">Copy one at a time or grab all below</span>
            <button
              onClick={copyAll}
              className={`inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors ${
                copied === '__all__'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white border border-[#E3EAF4] text-gray-600 hover:border-gray-400'
              }`}
            >
              {copied === '__all__'
                ? <CheckCircle weight="fill" className="w-3 h-3" />
                : <CopySimple weight="bold" className="w-3 h-3" />}
              {copied === '__all__' ? 'Copied all!' : 'Copy all'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact "★ 4.7 · 142" chip rendered next to the business name.
 * Color-coded by quality_score band so a rep skimming the list can
 * spot the gold without reading numbers. CLOSED listings get a rose
 * pill so they're never accidentally called.
 */
function QualityChip({ lead }: { lead: Lead }) {
  if (lead.google_business_status && /CLOSED/i.test(lead.google_business_status)) {
    return (
      <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-[0.18em] text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5">
        Closed
      </span>
    )
  }
  if (lead.google_rating === null || lead.google_rating === undefined) return null

  const score = lead.quality_score ?? 0
  const tone =
    score >= 8 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    score >= 4 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                 'text-gray-600 bg-gray-50 border-[#E3EAF4]'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] tabular-nums border rounded-full px-1.5 py-0.5 ${tone}`}>
      <span aria-hidden>★</span>
      <span>{Number(lead.google_rating).toFixed(1)}</span>
      {typeof lead.google_review_count === 'number' && lead.google_review_count > 0 && (
        <span className="opacity-70">· {lead.google_review_count}</span>
      )}
    </span>
  )
}
