'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
 Play, Loader2, AlertCircle, CheckCircle2, X, Trash2, ArrowUpRight,
 Search, Database, ChevronRight,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import {
 Panel, PanelHeader, PrimaryButton, GhostButton, DangerButton, Input, Select,
} from '../../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

type Source = {
 id: string
 label: string
 description: string
 trade: string
}

type Job = {
 id: string
 source: string
 params: { location?: string; limit?: number }
 status: 'queued' | 'running' | 'completed' | 'failed'
 results_count: number
 promoted_count: number
 error: string | null
 created_at: string
 finished_at: string | null
}

type ScrapeResult = {
 id: string
 source: string
 business_name: string | null
 owner_name: string | null
 phone: string | null
 email: string | null
 business_type: string | null
 license_no: string | null
 address: string | null
 city: string | null
 state: string | null
 zip: string | null
 website: string | null
 promoted_lead_id: string | null
}

export default function ScraperPage() {
 const [sources, setSources] = useState<Source[]>([])
 const [jobs, setJobs] = useState<Job[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [migrationRequired, setMigrationRequired] = useState(false)
 const [openJob, setOpenJob] = useState<Job | null>(null)
 const [googleConfigured, setGoogleConfigured] = useState(true)

 // New-job form state
 const [running, setRunning] = useState(false)
 const [sourceId, setSourceId] = useState('')
 const [location, setLocation] = useState('Austin')
 const [limit, setLimit] = useState('50')

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/scrape')
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) {
    if (json?.migration_required) setMigrationRequired(true)
    throw new Error(json?.error || `Failed (${res.status})`)
   }
   setSources(json.sources || [])
   setJobs(json.jobs || [])
   setGoogleConfigured(json.enrichment?.google_places ?? false)
   if (!sourceId && json.sources?.length) setSourceId(json.sources[0].id)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() /* eslint-disable-line */ }, [])

 const runJob = async () => {
  if (!sourceId) return
  setRunning(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/scrape', {
    method: 'POST',
    body: JSON.stringify({
     source: sourceId,
     location: location.trim() || undefined,
     limit: parseInt(limit, 10) || 50,
    }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   await load()
   if (json.job) setOpenJob(json.job)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to run scrape')
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
   const res = await fetchWithAuth(`/api/admin/scrape/${id}`, { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Delete failed')
  } catch (e) {
   setJobs(prev)
   alert(e instanceof Error ? e.message : 'Delete failed')
  }
 }

 if (migrationRequired) {
  return (
   <AdminShell activeLabel="Tools">
    <section className="px-4 lg:px-8 py-6 lg:py-10 max-w-3xl">
     <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white mb-2">
      Scraper
     </h1>
     <Panel>
      <div className="flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
       <div className="flex-1">
        <h3 className="text-sm font-medium text-white">Run the migration</h3>
        <p className="text-sm text-gray-400 mt-1.5">
         The scraper tables don&apos;t exist yet. Paste{' '}
         <code className="font-mono text-xs bg-white/[0.04] px-1 rounded">sql/scraper.sql</code>{' '}
         from the repo into the Supabase SQL editor, then reload.
        </p>
        <div className="mt-3"><PrimaryButton onClick={load}>I ran it - reload</PrimaryButton></div>
       </div>
      </div>
     </Panel>
    </section>
   </AdminShell>
  )
 }

 return (
  <AdminShell activeLabel="Tools">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        Lead generation
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        Scraper
       </h1>
       <p className="text-sm text-gray-400 mt-2 max-w-xl">
        Pull verified Texas contractors from public licensing databases. Results land in a staging table - review them, then promote selected records into the leads pipeline.
       </p>
      </div>
      <div className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 self-start ${
       googleConfigured
        ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
        : 'bg-amber-400/10 text-amber-300 border-amber-400/20'
      }`}>
       <span className={`w-1.5 h-1.5 rounded-full ${googleConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
       google places · {googleConfigured ? 'connected' : 'missing'}
      </div>
     </div>

     {!googleConfigured && (
      <div className="mb-3 bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-sm text-amber-200 flex items-start gap-3">
       <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <div>
        <span className="font-medium">Phone &amp; website enrichment is off.</span>{' '}
        <span className="text-amber-200/80">
         GOOGLE_PLACES_API_KEY isn&apos;t reaching the runtime. Check it&apos;s enabled for the Production environment in Vercel and redeploy. Scrapes will still run but won&apos;t fill in phones.
        </span>
       </div>
      </div>
     )}

     {/* Run job */}
     <Panel className="mb-3">
      <PanelHeader title="New scrape" eyebrow="01 · Configure" />
      <div className="grid sm:grid-cols-4 gap-3 items-end">
       <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Source</label>
        <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
         {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
         ))}
        </Select>
       </div>
       <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">City / county</label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Austin" />
       </div>
       <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Limit</label>
        <Input
         type="number" min={1} max={2000}
         value={limit}
         onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))}
        />
       </div>
      </div>

      {sourceId && (
       <p className="text-xs text-gray-500 mt-3">
        {sources.find((s) => s.id === sourceId)?.description}
       </p>
      )}

      {error && (
       <div className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
       </div>
      )}

      <div className="flex justify-end mt-4">
       <PrimaryButton onClick={runJob} loading={running} disabled={!sourceId}>
        <Play className="w-4 h-4" />
        {running ? 'Scraping…' : 'Run scrape'}
       </PrimaryButton>
      </div>
     </Panel>

     {/* Recent jobs */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
       <PanelHeader title="Recent jobs" eyebrow={`${jobs.length} total`} />
      </div>

      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      ) : jobs.length === 0 ? (
       <div className="px-6 py-16 text-center text-sm text-gray-500">
        No scrape jobs yet. Configure a source above and click <span className="font-medium text-gray-300">Run scrape</span>.
       </div>
      ) : (
       <motion.ul
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02, delayChildren: 0.05 } } }}
        className="divide-y divide-white/[0.04]"
       >
        {jobs.map((j) => (
         <motion.li
          key={j.id}
          variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
         >
          <button
           onClick={() => setOpenJob(j)}
           className="w-full text-left px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-all duration-300 ease-out flex items-center gap-3 group"
          >
           <StatusBadge status={j.status} />
           <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
             <div className="text-sm font-medium text-white truncate">
              {sources.find((s) => s.id === j.source)?.label || j.source}
             </div>
             <span className="text-xs text-gray-500 font-mono flex-shrink-0">{relTime(j.created_at)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
             {j.params.location && <span>{j.params.location}</span>}
             <span className="text-gray-600">·</span>
             <span className="font-mono">{j.results_count} results</span>
             {j.promoted_count > 0 && (
              <>
               <span className="text-gray-600">·</span>
               <span className="font-mono text-emerald-400">{j.promoted_count} promoted</span>
              </>
             )}
             {j.error && <span className="text-rose-400 truncate">· {j.error}</span>}
            </div>
           </div>
           <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
          </button>
         </motion.li>
        ))}
       </motion.ul>
      )}
     </Panel>
    </div>
   </section>

   <AnimatePresence>
    {openJob && (
     <JobDrawer
      key={openJob.id}
      jobId={openJob.id}
      jobLabel={sources.find((s) => s.id === openJob.source)?.label || openJob.source}
      onClose={() => setOpenJob(null)}
      onDelete={() => deleteJob(openJob.id)}
      onPromoted={() => load()}
     />
    )}
   </AnimatePresence>
  </AdminShell>
 )
}

/* ----------------------------- Drawer ----------------------------- */

type DrawerFilter = 'all' | 'with_phone' | 'with_website' | 'errored' | 'duplicates' | 'promoted'

function JobDrawer({
 jobId, jobLabel, onClose, onDelete, onPromoted,
}: {
 jobId: string
 jobLabel: string
 onClose: () => void
 onDelete: () => void
 onPromoted: () => void
}) {
 const [job, setJob] = useState<Job | null>(null)
 const [results, setResults] = useState<ScrapeResult[]>([])
 const [duplicatePhones, setDuplicatePhones] = useState<Set<string>>(new Set())
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [selected, setSelected] = useState<Set<string>>(new Set())
 const [promoting, setPromoting] = useState(false)
 const [promoteMsg, setPromoteMsg] = useState('')
 const [filter, setFilter] = useState<DrawerFilter>('all')
 const [search, setSearch] = useState('')

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/scrape/${jobId}`)
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setJob(json.job)
   setResults(json.results || [])
   setDuplicatePhones(new Set(json.existing_phones_in_leads || []))
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }
 useEffect(() => { load() /* eslint-disable-line */ }, [jobId])

 // Auto-poll while a job is still running so partial results stream in.
 useEffect(() => {
  if (!job || job.status === 'completed' || job.status === 'failed') return
  const id = setInterval(load, 4000)
  return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [job?.status])

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const isDuplicate = (r: ScrapeResult) => {
  const p = normalizePhoneClient(r.phone)
  return !!p && duplicatePhones.has(p)
 }

 const errorOf = (r: ScrapeResult): string | null => {
  const raw = (r as any).raw
  return raw?.google_places_error || null
 }

 // Filtered + searched view
 const visible = useMemo(() => {
  const q = search.trim().toLowerCase()
  return results.filter((r) => {
   if (q) {
    const hay = [r.business_name, r.owner_name, r.phone, r.license_no, r.city]
     .filter(Boolean).join(' ').toLowerCase()
    if (!hay.includes(q)) return false
   }
   switch (filter) {
    case 'with_phone':   return !!r.phone
    case 'with_website': return !!r.website
    case 'errored':      return !!errorOf(r) && !r.phone
    case 'duplicates':   return isDuplicate(r)
    case 'promoted':     return !!r.promoted_lead_id
    default:             return true
   }
  })
 }, [results, filter, search, duplicatePhones])

 // Counts for filter pills
 const counts = useMemo(() => ({
  all: results.length,
  with_phone: results.filter((r) => r.phone).length,
  with_website: results.filter((r) => r.website).length,
  errored: results.filter((r) => errorOf(r) && !r.phone).length,
  duplicates: results.filter(isDuplicate).length,
  promoted: results.filter((r) => r.promoted_lead_id).length,
 }), [results, duplicatePhones])

 const selectableInView = useMemo(
  () => visible.filter((r) => !r.promoted_lead_id && !isDuplicate(r)),
  [visible, duplicatePhones],
 )
 const allSelectableInViewSelected =
  selectableInView.length > 0 && selectableInView.every((r) => selected.has(r.id))

 const toggle = (id: string) => {
  setSelected((s) => {
   const n = new Set(s)
   if (n.has(id)) n.delete(id); else n.add(id)
   return n
  })
 }
 const selectAllInView = () => {
  if (allSelectableInViewSelected) {
   setSelected((s) => {
    const n = new Set(s)
    selectableInView.forEach((r) => n.delete(r.id))
    return n
   })
  } else {
   setSelected((s) => {
    const n = new Set(s)
    selectableInView.forEach((r) => n.add(r.id))
    return n
   })
  }
 }
 const selectAllWithPhone = () => {
  setSelected(new Set(
   results
    .filter((r) => r.phone && !r.promoted_lead_id && !isDuplicate(r))
    .map((r) => r.id),
  ))
 }

 const promote = async () => {
  if (selected.size === 0) return
  setPromoting(true); setPromoteMsg(''); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/scrape/${jobId}/promote`, {
    method: 'POST',
    body: JSON.stringify({ result_ids: Array.from(selected) }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || 'Failed')
   const errSuffix = json.error_sample ? ` - first error: ${json.error_sample}` : ''
   setPromoteMsg(`Promoted ${json.promoted}, skipped ${json.skipped}.${errSuffix}`)
   setSelected(new Set())
   await load()
   onPromoted()
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setPromoting(false)
  }
 }

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   transition={{ duration: 0.25, ease: EASE }}
   className="fixed inset-0 z-50 flex justify-end"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
   <motion.aside
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    className="relative bg-[#0c0c10] border-l border-white/[0.06] w-full sm:max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col"
   >
    {/* Drawer header */}
    <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 sticky top-0 bg-[#0c0c10] z-10">
     <div className="min-w-0">
      <div className="text-sm font-semibold text-white truncate">{jobLabel}</div>
      <div className="text-xs text-gray-500 font-mono">
       {job ? `${job.results_count} results · ${job.promoted_count} promoted` : '…'}
      </div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    <div className="px-4 sm:px-6 py-5 space-y-4 flex-1">
     {job && (
      <div className="flex items-center justify-between flex-wrap gap-3">
       <StatusBadge status={job.status} />
       <div className="flex items-center gap-2">
        <DangerButton onClick={onDelete}>
         <Trash2 className="w-4 h-4" /> Delete
        </DangerButton>
       </div>
      </div>
     )}

     {loading && results.length === 0 ? (
      <div className="py-12 flex items-center justify-center">
       <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
     ) : error ? (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
       <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
       <span>{error}</span>
      </div>
     ) : results.length === 0 ? (
      <div className="py-10 text-sm text-gray-500 text-center">
       No results captured for this job.
      </div>
     ) : (
      <>
       {/* Filter pills */}
       <div className="flex flex-wrap items-center gap-1.5">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
         All <span className="ml-1 text-gray-500 font-mono">{counts.all}</span>
        </FilterPill>
        <FilterPill active={filter === 'with_phone'} onClick={() => setFilter('with_phone')} tone="emerald">
         Phone <span className="ml-1 text-gray-500 font-mono">{counts.with_phone}</span>
        </FilterPill>
        <FilterPill active={filter === 'with_website'} onClick={() => setFilter('with_website')} tone="sky">
         Website <span className="ml-1 text-gray-500 font-mono">{counts.with_website}</span>
        </FilterPill>
        <FilterPill active={filter === 'duplicates'} onClick={() => setFilter('duplicates')} tone="amber">
         In leads <span className="ml-1 text-gray-500 font-mono">{counts.duplicates}</span>
        </FilterPill>
        <FilterPill active={filter === 'errored'} onClick={() => setFilter('errored')} tone="rose">
         Errored <span className="ml-1 text-gray-500 font-mono">{counts.errored}</span>
        </FilterPill>
        <FilterPill active={filter === 'promoted'} onClick={() => setFilter('promoted')} tone="emerald">
         Promoted <span className="ml-1 text-gray-500 font-mono">{counts.promoted}</span>
        </FilterPill>
       </div>

       {/* Search */}
       <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <Input
         type="search" placeholder="Search by business / owner / phone / license…"
         value={search} onChange={(e) => setSearch(e.target.value)}
         className="pl-9"
        />
       </div>

       {/* Bulk selectors */}
       <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
         <button
          onClick={selectAllInView}
          disabled={selectableInView.length === 0}
          className="font-mono uppercase tracking-wider text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
         >
          {allSelectableInViewSelected ? 'Clear in view' : `Select view (${selectableInView.length})`}
         </button>
         <span className="text-gray-700">·</span>
         <button
          onClick={selectAllWithPhone}
          className="font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
         >
          all w/ phone
         </button>
        </div>
        <div className="font-mono text-gray-500">{selected.size} selected</div>
       </div>

       {visible.length === 0 ? (
        <div className="py-8 text-sm text-gray-500 text-center">No matches in this filter.</div>
       ) : (
        <div className="bg-[#101015] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
         {visible.map((r) => (
          <ResultRow
           key={r.id}
           r={r}
           isDuplicate={isDuplicate(r)}
           selected={selected.has(r.id)}
           onToggle={() => toggle(r.id)}
           errorMsg={errorOf(r)}
          />
         ))}
        </div>
       )}
      </>
     )}
    </div>

    {/* Sticky footer */}
    {results.length > 0 && (
     <div className="px-4 sm:px-6 py-4 border-t border-white/[0.06] sticky bottom-0 bg-[#0c0c10] flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-gray-500 min-w-0 flex-1 truncate">
       {promoteMsg && <span className="text-emerald-400">{promoteMsg}</span>}
      </div>
      <PrimaryButton
       onClick={promote}
       disabled={selected.size === 0}
       loading={promoting}
      >
       <CheckCircle2 className="w-4 h-4" /> Promote {selected.size > 0 ? selected.size : ''} → leads
      </PrimaryButton>
     </div>
    )}
   </motion.aside>
  </motion.div>
 )
}

function ResultRow({
 r, isDuplicate, selected, onToggle, errorMsg,
}: {
 r: ScrapeResult
 isDuplicate: boolean
 selected: boolean
 onToggle: () => void
 errorMsg: string | null
}) {
 const promoted = !!r.promoted_lead_id
 const disabled = promoted || isDuplicate
 const noEnrich = !!errorMsg && !r.phone

 return (
  <div className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${
   disabled ? 'opacity-60' : ''
  }`}>
   <input
    type="checkbox"
    disabled={disabled}
    checked={selected}
    onChange={onToggle}
    className="mt-1 accent-sky-500"
   />
   <div className="flex-1 min-w-0">
    <div className="flex items-baseline justify-between gap-2 flex-wrap">
     <div className="text-sm font-medium text-white truncate">{r.business_name || '-'}</div>
     <div className="flex items-center gap-1 flex-shrink-0">
      {r.phone ? (
       <span className="text-[10px] font-mono uppercase text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-1.5 py-0.5">📞</span>
      ) : noEnrich ? (
       <span className="text-[10px] font-mono uppercase text-rose-300 bg-rose-400/10 border border-rose-400/20 rounded-full px-1.5 py-0.5" title={errorMsg || ''}>!</span>
      ) : null}
      {r.website && (
       <span className="text-[10px] font-mono uppercase text-sky-300 bg-sky-400/10 border border-sky-400/20 rounded-full px-1.5 py-0.5">🌐</span>
      )}
      {isDuplicate && (
       <Link
        href="/admin/leads"
        className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5"
        title="A lead with this phone is already in your pipeline"
       >
        in leads
       </Link>
      )}
      {promoted && (
       <Link
        href="/admin/leads"
        className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5"
       >
        promoted
       </Link>
      )}
     </div>
    </div>
    <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
     {r.owner_name && <span>{r.owner_name}</span>}
     {r.phone && <span className="font-mono">{r.phone}</span>}
     {r.business_type && <span className="text-gray-500">· {r.business_type}</span>}
    </div>
    <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-3 font-mono">
     {r.license_no && <span>lic {r.license_no}</span>}
     {r.city && <span>{[r.city, r.state].filter(Boolean).join(', ')}</span>}
     {r.website && (
      <a href={r.website} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
       {r.website.replace(/^https?:\/\//, '').slice(0, 30)} <ArrowUpRight className="w-3 h-3" />
      </a>
     )}
     {errorMsg && !r.phone && (
      <span className="text-rose-400 truncate" title={errorMsg}>· {errorMsg.slice(0, 50)}</span>
     )}
    </div>
   </div>
  </div>
 )
}

const TONE_BG: Record<string, { bg: string; text: string; border: string }> = {
 default: { bg: 'bg-white/[0.04]', text: 'text-white', border: 'border-white/[0.08]' },
 emerald: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
 sky:     { bg: 'bg-sky-400/10', text: 'text-sky-300', border: 'border-sky-400/20' },
 amber:   { bg: 'bg-amber-400/10', text: 'text-amber-300', border: 'border-amber-400/20' },
 rose:    { bg: 'bg-rose-400/10', text: 'text-rose-300', border: 'border-rose-400/20' },
}

function FilterPill({
 active, onClick, children, tone = 'default',
}: {
 active: boolean
 onClick: () => void
 children: React.ReactNode
 tone?: keyof typeof TONE_BG
}) {
 const t = TONE_BG[tone] || TONE_BG.default
 return (
  <button
   onClick={onClick}
   className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full transition-all duration-300 ease-out border ${
    active
     ? `${t.bg} ${t.text} ${t.border}`
     : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
   }`}
  >
   {children}
  </button>
 )
}

function normalizePhoneClient(p: string | null | undefined): string | null {
 if (!p) return null
 const digits = p.replace(/[^0-9]/g, '')
 if (!digits) return null
 if (digits.length === 10) return `+1${digits}`
 if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
 return p.trim()
}

/* ----------------------------- Helpers ----------------------------- */

function StatusBadge({ status }: { status: Job['status'] }) {
 const map: Record<Job['status'], { dot: string; text: string; bg: string; border: string; label: string }> = {
  queued:    { dot: 'bg-gray-400', text: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/20', label: 'queued' },
  running:   { dot: 'bg-sky-400 animate-pulse', text: 'text-sky-300', bg: 'bg-sky-400/10', border: 'border-sky-400/20', label: 'running' },
  completed: { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', label: 'completed' },
  failed:    { dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-400/10', border: 'border-rose-400/20', label: 'failed' },
 }
 const t = map[status] || map.queued
 return (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${t.bg} ${t.text} border ${t.border}`}>
   <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
   {t.label}
  </span>
 )
}

function relTime(iso: string): string {
 const d = new Date(iso)
 const min = Math.floor((Date.now() - d.getTime()) / 60000)
 if (min < 1) return 'just now'
 if (min < 60) return `${min}m ago`
 const hr = Math.floor(min / 60)
 if (hr < 24) return `${hr}h ago`
 const days = Math.floor(hr / 24)
 if (days < 7) return `${days}d ago`
 return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
