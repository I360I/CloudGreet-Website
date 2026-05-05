'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, CircleNotch, WarningCircle, CheckCircle, X, Trash, ArrowLeft,
  CaretRight, MapPin, Phone, Globe, PaperPlaneTilt, Plus,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../../_components/SalesShell'

const EASE = [0.22, 1, 0.36, 1] as const

type Source = { id: string; label: string; description: string; trade: string }
type Job = {
  id: string
  source: string
  params: { location?: string; limit?: number; rep_id?: string }
  status: 'queued' | 'running' | 'completed' | 'failed'
  results_count: number
  promoted_count: number
  error: string | null
  created_at: string
  finished_at: string | null
}
type Result = {
  id: string
  business_name: string | null
  owner_name: string | null
  phone: string | null
  email: string | null
  business_type: string | null
  address: string | null
  city: string | null
  state: string | null
  website: string | null
  promoted_lead_id: string | null
}

export default function SalesScrapePage() {
  const [sources, setSources] = useState<Source[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [dailyLimit, setDailyLimit] = useState(200)
  const [dailyUsed, setDailyUsed] = useState(0)
  const [googleConfigured, setGoogleConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [err, setErr] = useState('')
  const [openJob, setOpenJob] = useState<Job | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const [running, setRunning] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [location, setLocation] = useState('Austin')
  const [limit, setLimit] = useState('50')

  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)
  const capReached = dailyRemaining <= 0

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth('/api/sales/scrape')
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) {
        if (j?.migration_required) setMigrationRequired(true)
        throw new Error(j?.error || `Failed (${res.status})`)
      }
      setSources(j.sources || [])
      setJobs(j.jobs || [])
      setDailyLimit(j.daily_limit || 200)
      setDailyUsed(j.daily_used || 0)
      setGoogleConfigured(j.enrichment?.google_places ?? false)
      if (!sourceId && j.sources?.length) setSourceId(j.sources[0].id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const runJob = async () => {
    if (!sourceId) return
    setRunning(true); setErr('')
    try {
      const requested = Math.max(1, Math.min(dailyRemaining, parseInt(limit, 10) || 50))
      const res = await fetchWithAuth('/api/sales/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceId,
          location: location.trim() || undefined,
          limit: requested,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || `Failed (${res.status})`)
      await load()
      if (j.job) setOpenJob(j.job)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Scrape failed')
    } finally {
      setRunning(false)
    }
  }

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this scrape job and its results?')) return
    const prev = jobs
    setJobs((j) => j.filter((x) => x.id !== id))
    if (openJob?.id === id) setOpenJob(null)
    try {
      const res = await fetchWithAuth(`/api/sales/scrape/${id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Delete failed')
    } catch (e) {
      setJobs(prev)
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (migrationRequired) {
    return (
      <SalesShell activeLabel="Leads">
        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Scraper not set up</p>
              <p className="text-xs text-amber-800 mt-1">
                Ask Anthony to run sql/scraper.sql in Supabase, then reload.
              </p>
            </div>
          </div>
        </section>
      </SalesShell>
    )
  }

  return (
    <SalesShell activeLabel="Leads">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/sales/leads"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Leads
        </Link>

        <SalesPageHeader
          eyebrow="lead generation"
          title="Scraper"
          action={
            <DailyCap
              used={dailyUsed}
              limit={dailyLimit}
              requesting={requesting}
              requestSent={requestSent}
              onRequestMore={async () => {
                setRequesting(true)
                try {
                  await fetchWithAuth('/api/sales/scrape/request-more', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  })
                  setRequestSent(true)
                } finally {
                  setRequesting(false)
                }
              }}
            />
          }
        />

        <p className="text-sm text-gray-500 mb-4 max-w-xl">
          Pull verified contractors from public licensing databases. Results auto-land in your leads list as they finish — no extra click needed.
        </p>

        {!googleConfigured && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <div>
              <span className="font-medium">Phone numbers won&apos;t fill in.</span>{' '}
              <span className="text-amber-800">
                Google Places enrichment is off — TDLR doesn&apos;t expose phones,
                so you&apos;ll get business names + license info but you&apos;ll
                need to look up phones yourself. Tell Anthony to set
                <code className="font-mono text-xs bg-amber-100 px-1 rounded mx-1">GOOGLE_PLACES_API_KEY</code>
                in Vercel.
              </span>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="bg-white border border-gray-200 rounded-2xl p-5 mb-4"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
            01 · Configure
          </div>
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Source</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">City / county</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Austin"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Limit <span className="text-gray-400">(left today: {dailyRemaining})</span>
              </label>
              <input
                type="number"
                min={1}
                max={dailyRemaining || 1}
                value={limit}
                disabled={capReached}
                onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 disabled:opacity-60 disabled:bg-gray-50"
              />
            </div>
          </div>

          {sourceId && (
            <p className="text-xs text-gray-500 mt-3">
              {sources.find((s) => s.id === sourceId)?.description}
            </p>
          )}

          {err && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={runJob}
              disabled={!sourceId || running || capReached}
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {running ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Scraping…' : 'Run scrape'}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Recent jobs</div>
            <div className="text-sm font-medium text-gray-900">{jobs.length} run{jobs.length === 1 ? '' : 's'}</div>
          </div>
          {loading ? (
            <SalesLoadingState />
          ) : jobs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No scrape jobs yet. Configure a source above and click <span className="font-medium text-gray-700">Run scrape</span>.
            </div>
          ) : (
            <motion.ul
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } } }}
              className="divide-y divide-gray-100"
            >
              {jobs.map((j) => (
                <motion.li
                  key={j.id}
                  variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
                >
                  <button
                    onClick={() => setOpenJob(j)}
                    className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                  >
                    <StatusBadge status={j.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {sources.find((s) => s.id === j.source)?.label || j.source}
                        </div>
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                          {relTime(j.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        {j.params.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {j.params.location}</span>}
                        <span className="text-gray-300">·</span>
                        <span className="font-mono">{j.results_count} results</span>
                        {j.promoted_count > 0 && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-mono text-emerald-600">{j.promoted_count} promoted</span>
                          </>
                        )}
                        {j.error && <span className="text-red-500 truncate">· {j.error}</span>}
                      </div>
                    </div>
                    <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      </section>

      <AnimatePresence>
        {openJob && (
          <JobDrawer
            key={openJob.id}
            job={openJob}
            sources={sources}
            onClose={() => setOpenJob(null)}
            onDelete={() => deleteJob(openJob.id)}
            onChanged={load}
          />
        )}
      </AnimatePresence>
    </SalesShell>
  )
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const map: Record<Job['status'], { dot: string; label: string }> = {
    queued: { dot: 'bg-gray-300', label: 'queued' },
    running: { dot: 'bg-sky-400 animate-pulse', label: 'running' },
    completed: { dot: 'bg-emerald-500', label: 'done' },
    failed: { dot: 'bg-red-500', label: 'failed' },
  }
  const m = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-500 flex-shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  )
}

function DailyCap({
  used, limit, requesting, requestSent, onRequestMore,
}: {
  used: number
  limit: number
  requesting: boolean
  requestSent: boolean
  onRequestMore: () => void
}) {
  const remaining = Math.max(0, limit - used)
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const tone = remaining === 0
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : remaining < limit * 0.2
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <div className="flex items-center gap-3">
      <div className={`text-[10px] font-mono uppercase tracking-wider border rounded-full px-3 py-1.5 ${tone}`}>
        <div className="flex items-center gap-2">
          <span>{used} / {limit} today</span>
          <span className="hidden sm:inline-block w-12 h-1 rounded-full bg-black/10 overflow-hidden">
            <span
              className="block h-full bg-current transition-all"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>
      {requestSent ? (
        <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
          <CheckCircle weight="fill" className="w-3.5 h-3.5" /> Sent
        </span>
      ) : (
        <button
          onClick={onRequestMore}
          disabled={requesting}
          className="text-[11px] text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-60"
        >
          {requesting ? <CircleNotch className="w-3 h-3 animate-spin" /> : <PaperPlaneTilt weight="bold" className="w-3 h-3" />}
          Request more
        </button>
      )}
    </div>
  )
}

function JobDrawer({
  job, sources, onClose, onDelete, onChanged,
}: {
  job: Job
  sources: Source[]
  onClose: () => void
  onDelete: () => void
  onChanged: () => void
}) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [promoteMsg, setPromoteMsg] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [duplicatePhones, setDuplicatePhones] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/scrape/${job.id}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      setResults(j.results || [])
      setDuplicatePhones(new Set(j.existing_phones_in_leads || []))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  // Poll while running
  useEffect(() => {
    if (job.status !== 'running' && job.status !== 'queued') return
    const t = setInterval(load, 2500)
    return () => clearInterval(t)
  }, [job.status]) // eslint-disable-line

  const promote = async (allUnpromoted: boolean) => {
    setPromoting(true); setPromoteMsg('')
    try {
      const body = allUnpromoted ? {} : { result_ids: Array.from(selected) }
      const res = await fetchWithAuth(`/api/sales/scrape/${job.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Promote failed')
      setPromoteMsg(`${j.promoted} new · ${j.skipped} dup · ${j.claimed} claimed`)
      setSelected(new Set())
      await load()
      onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Promote failed')
    } finally {
      setPromoting(false)
    }
  }

  const unpromotedCount = useMemo(
    () => results.filter((r) => !r.promoted_lead_id).length,
    [results],
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.35, ease: EASE }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white border-l border-gray-200 flex flex-col"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Scrape job</div>
            <div className="text-base font-medium text-gray-900 truncate">
              {sources.find((s) => s.id === job.source)?.label || job.source}
              {job.params.location ? ` · ${job.params.location}` : ''}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 font-mono">
              {results.length} results · {results.filter((r) => r.promoted_lead_id).length} promoted
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              aria-label="Delete"
            >
              <Trash className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-500">
            {selected.size > 0 ? `${selected.size} selected` : `${unpromotedCount} ready to promote`}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={() => promote(false)}
                disabled={promoting}
                className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {promoting ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Plus weight="bold" className="w-3 h-3" />}
                Promote {selected.size}
              </button>
            )}
            {unpromotedCount > 0 && (
              <button
                onClick={() => promote(true)}
                disabled={promoting}
                className="text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                Promote all
              </button>
            )}
          </div>
        </div>

        {promoteMsg && (
          <div className="px-5 py-2 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border-b border-emerald-100">
            <CheckCircle weight="fill" className="w-3.5 h-3.5" /> {promoteMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <CircleNotch className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : err ? (
            <div className="p-5 text-sm text-red-600">{err}</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {job.status === 'running' || job.status === 'queued'
                ? 'Scraping… results will stream in here.'
                : 'No results.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((r) => {
                const dup = !!(r.phone && duplicatePhones.has(normalizePhone(r.phone) || ''))
                const promoted = !!r.promoted_lead_id
                const checked = selected.has(r.id)
                const disabled = promoted
                return (
                  <li
                    key={r.id}
                    onClick={() => {
                      if (disabled) return
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(r.id)) next.delete(r.id)
                        else next.add(r.id)
                        return next
                      })
                    }}
                    className={`px-5 py-3 flex items-start gap-3 ${
                      disabled ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'
                    } ${checked ? 'bg-gray-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {r.business_name || '—'}
                        </div>
                        {promoted && (
                          <span className="text-[10px] font-mono uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                            promoted
                          </span>
                        )}
                        {!promoted && dup && (
                          <span className="text-[10px] font-mono uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                            dup phone
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {r.owner_name && <span>{r.owner_name}</span>}
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                        {r.website && <span className="inline-flex items-center gap-1 truncate"><Globe className="w-3 h-3" /> {r.website.replace(/^https?:\/\//, '')}</span>}
                      </div>
                      {(r.address || r.city) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[r.address, r.city, r.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </motion.aside>
    </>
  )
}

function normalizePhone(p: string | null): string | null {
  if (!p) return null
  const digits = p.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return p.trim()
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
