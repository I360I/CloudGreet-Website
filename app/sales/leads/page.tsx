'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, EnvelopeSimple, CheckCircle, WarningCircle, CircleNotch,
  Sparkle, UploadSimple, DownloadSimple, FileCsv, MagnifyingGlass,
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
  status?: string | null
  notes?: string | null
  created_at?: string
  claimed_at?: string
}

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
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
    const digits = p.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return p
  }

  const filtered = search.trim()
    ? leads.filter((l) => {
        const q = search.toLowerCase()
        return (
          l.business_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
        )
      })
    : leads

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
                Import CSV
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

        <div className="text-xs text-gray-500 mb-6 flex items-center gap-1.5">
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
              Run a scrape to pull verified contractors, or import a CSV you already have.
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
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  {filtered.length === leads.length ? 'All leads' : 'Filtered'}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {filtered.length} of {leads.length}
                </div>
              </div>
              <div className="relative">
                <MagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-48 sm:w-64 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No matches for &quot;{search}&quot;.
              </div>
            ) : (
              <motion.ul
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.015 } } }}
                className="divide-y divide-gray-100"
              >
                {filtered.map((l) => (
                  <motion.li
                    key={l.id}
                    variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } }}
                    className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {l.business_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {l.contact_name && <span>{l.contact_name}</span>}
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-gray-900">
                            <Phone weight="bold" className="w-3 h-3" /> {formatPhone(l.phone)}
                          </a>
                        )}
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-gray-900">
                            <EnvelopeSimple weight="bold" className="w-3 h-3" /> {l.email}
                          </a>
                        )}
                        {l.source && (
                          <span className="text-gray-400 inline-flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-300" /> {l.source}
                          </span>
                        )}
                      </div>
                      {l.notes && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{l.notes}</div>
                      )}
                    </div>
                    <Link
                      href={`/sales/closes/new?lead_id=${l.id}`}
                      className="text-xs font-medium text-gray-700 hover:text-white hover:bg-gray-900 border border-gray-200 hover:border-gray-900 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                    >
                      Mark closed
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
