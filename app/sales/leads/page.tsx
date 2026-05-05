'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Mail, Plus, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Upload, Download,
} from 'lucide-react'
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
  const [available, setAvailable] = useState<Lead[]>([])
  const [claimed, setClaimed] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchWithAuth('/api/sales/leads')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Failed to load leads')
      } else {
        setAvailable(j.available || [])
        setClaimed(j.claimed || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const claimSelected = async () => {
    if (selected.size === 0) return
    setWorking(true); setError(''); setFlash('')
    try {
      const res = await fetchWithAuth('/api/sales/leads/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: Array.from(selected) }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Claim failed')
      } else {
        const parts: string[] = []
        if (j.claimed) parts.push(`${j.claimed} claimed`)
        if (j.skipped_taken) parts.push(`${j.skipped_taken} already taken`)
        if (j.skipped_already_mine) parts.push(`${j.skipped_already_mine} already yours`)
        setFlash(parts.join(' · ') || 'Done')
        setSelected(new Set())
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setWorking(false)
    }
  }

  const selectAllAvailable = () => {
    if (selected.size === available.length) setSelected(new Set())
    else setSelected(new Set(available.map((l) => l.id)))
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
    const digits = p.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return p
  }

  const allSelected = useMemo(
    () => available.length > 0 && selected.size === available.length,
    [available.length, selected.size],
  )

  return (
    <SalesShell activeLabel="Leads">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="leads"
          title="Pool"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/sales/leads/scrape"
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Scrape
              </Link>
              <button
                onClick={onPickFile}
                disabled={importing}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import CSV
              </button>
              <a
                href="/api/sales/leads/export"
                className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Export
              </a>
              {selected.size > 0 && (
                <button
                  onClick={claimSelected}
                  disabled={working}
                  className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Claim {selected.size}
                </button>
              )}
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

        <p className="text-xs text-gray-500 mb-6">
          CSV format: <span className="font-mono">business_name, contact_name, phone, email, notes</span> (header required, business_name required per row).
        </p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{flash}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <SalesLoadingState />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Available</div>
                  <div className="text-sm font-medium text-gray-900">{available.length} unclaimed</div>
                </div>
                {available.length > 0 && (
                  <button
                    onClick={selectAllAvailable}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {available.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No unclaimed leads right now. Run a <Link href="/sales/leads/scrape" className="text-gray-900 font-medium underline">scrape</Link> or import a CSV.
                </div>
              ) : (
                <motion.ul
                  initial="hidden" animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
                  className="divide-y divide-gray-100"
                >
                  {available.map((l) => {
                    const checked = selected.has(l.id)
                    return (
                      <motion.li
                        key={l.id}
                        variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } }}
                        onClick={() => toggle(l.id)}
                        className={`px-5 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                          checked ? 'bg-gray-50' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(l.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {l.business_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {l.contact_name && <span>{l.contact_name}</span>}
                            {l.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {formatPhone(l.phone)}
                              </span>
                            )}
                            {l.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {l.email}
                              </span>
                            )}
                            {l.source && <span className="text-gray-400">· {l.source}</span>}
                          </div>
                          {l.notes && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{l.notes}</div>
                          )}
                        </div>
                      </motion.li>
                    )
                  })}
                </motion.ul>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Yours</div>
                <div className="text-sm font-medium text-gray-900">{claimed.length} claimed</div>
              </div>
              {claimed.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Nothing claimed yet. Pick some from the pool above, scrape, or import.
                </div>
              ) : (
                <motion.ul
                  initial="hidden" animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
                  className="divide-y divide-gray-100"
                >
                  {claimed.map((l) => (
                    <motion.li
                      key={l.id}
                      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } }}
                      className="px-5 py-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{l.business_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {l.contact_name && <span>{l.contact_name}</span>}
                          {l.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {formatPhone(l.phone)}
                            </span>
                          )}
                          {l.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {l.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/sales/closes/new?lead_id=${l.id}`}
                        className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
                      >
                        Mark closed
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </motion.div>
          </>
        )}
      </section>
    </SalesShell>
  )
}
