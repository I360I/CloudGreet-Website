'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, EnvelopeSimple, CheckCircle, WarningCircle, CircleNotch,
  Sparkle, UploadSimple, DownloadSimple, FileCsv, MagnifyingGlass,
  CaretRight, Clock, Calendar,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Lead = {
  id: string
  business_name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  notes?: string | null
  created_at?: string
  claimed_at?: string
  status: string
  disposition: string | null
  follow_up_at: string | null
  last_touched_at: string | null
  touch_count: number
  latest_note?: { body: string; created_at: string } | null
}

const STATUS_META: Record<string, { label: string; pill: string; dot: string }> = {
  new:             { label: 'New',         pill: 'bg-gray-100 text-gray-700',          dot: 'bg-gray-400' },
  called:          { label: 'Called',      pill: 'bg-sky-50 text-sky-700',             dot: 'bg-sky-500' },
  voicemail:       { label: 'Voicemail',   pill: 'bg-violet-50 text-violet-700',       dot: 'bg-violet-500' },
  interested:      { label: 'Interested',  pill: 'bg-amber-50 text-amber-700',         dot: 'bg-amber-500' },
  demo_scheduled:  { label: 'Demo set',    pill: 'bg-amber-100 text-amber-800',        dot: 'bg-amber-600' },
  proposal_sent:   { label: 'Proposal',    pill: 'bg-emerald-50 text-emerald-700',     dot: 'bg-emerald-500' },
  closed:          { label: 'Closed',      pill: 'bg-emerald-100 text-emerald-800',    dot: 'bg-emerald-600' },
  dead:            { label: 'Dead',        pill: 'bg-gray-100 text-gray-500',          dot: 'bg-gray-300' },
  do_not_call:     { label: 'DNC',         pill: 'bg-red-50 text-red-700',             dot: 'bg-red-500' },
}

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',           label: 'All' },
  { key: 'new',           label: 'New' },
  { key: 'called',        label: 'Called' },
  { key: 'voicemail',     label: 'Voicemail' },
  { key: 'interested',    label: 'Interested' },
  { key: 'demo_scheduled', label: 'Demo' },
  { key: 'proposal_sent', label: 'Proposal' },
  { key: 'dead',          label: 'Dead' },
  { key: 'do_not_call',   label: 'DNC' },
]

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetchWithAuth('/api/sales/leads')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setError(j?.error || 'Failed to load leads')
      else setLeads(j.leads || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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
    let out = leads
    if (filter !== 'all') out = out.filter((l) => l.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((l) =>
        l.business_name?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q),
      )
    }
    return out
  }, [leads, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length }
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1
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
    <SalesShell activeLabel="Leads">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="leads"
          title="Your leads"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/sales/leads/scrape"
                className="inline-flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-3.5 py-2 transition-colors shadow-sm"
              >
                <Sparkle weight="fill" className="w-4 h-4" /> Scrape
              </Link>
              <button
                onClick={onPickFile}
                disabled={importing}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-60"
              >
                {importing
                  ? <CircleNotch className="w-4 h-4 animate-spin" />
                  : <UploadSimple weight="bold" className="w-4 h-4" />}
                Import
              </button>
              <a
                href="/api/sales/leads/export"
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3.5 py-2 transition-colors"
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
        />

        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <FileCsv weight="bold" className="w-3.5 h-3.5" />
          CSV: <span className="font-mono text-gray-600">business_name, contact_name, phone, email, notes</span>
        </div>

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
        ) : leads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 mb-3">
              <Sparkle weight="duotone" className="w-6 h-6" />
            </div>
            <h2 className="text-base font-medium text-gray-900 mb-1">No leads yet</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Run a scrape to pull verified contractors, or import a CSV.
            </p>
            <div className="flex items-center gap-2 justify-center mt-5">
              <Link
                href="/sales/leads/scrape"
                className="inline-flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 py-2 transition-colors"
              >
                <Sparkle weight="fill" className="w-4 h-4" /> Scrape leads
              </Link>
              <button
                onClick={onPickFile}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors"
              >
                <UploadSimple weight="bold" className="w-4 h-4" /> Import CSV
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
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
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
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
              <div className="relative flex-shrink-0">
                <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

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
                  return (
                    <motion.li
                      key={l.id}
                      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } } }}
                      className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${meta.dot}`} />
                      <Link
                        href={`/sales/leads/${l.id}`}
                        className="flex-1 min-w-0 block"
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {l.business_name}
                          </div>
                          <span className={`text-[10px] font-mono uppercase tracking-wider rounded-full px-2 py-0.5 ${meta.pill}`}>
                            {meta.label}
                          </span>
                          {fu && (
                            <span className={`text-[10px] inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                              fu.overdue
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <Calendar weight="fill" className="w-3 h-3" /> {fu.label}
                            </span>
                          )}
                          {l.touch_count > 0 && (
                            <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                              <Phone weight="bold" className="w-2.5 h-2.5" />
                              {l.touch_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {l.contact_name && <span>{l.contact_name}</span>}
                          {l.phone && <span>{formatPhone(l.phone)}</span>}
                          {l.email && <span>{l.email}</span>}
                        </div>
                        {l.latest_note && (
                          <div className="text-xs text-gray-500 mt-1 italic line-clamp-1">
                            “{l.latest_note.body}”
                          </div>
                        )}
                      </Link>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {l.phone && (
                          <a
                            href={`tel:${l.phone}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors"
                            aria-label="Call"
                          >
                            <Phone weight="bold" className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          href={`/sales/leads/${l.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                          aria-label="Open"
                        >
                          <CaretRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
