'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleNotch, WarningCircle, MagnifyingGlass, CaretLeft, CaretRight, X, Play, ArrowSquareOut } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, Input, StatusPill } from '../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const
const PAGE_SIZE = 50

type AdminCall = {
 id: string
 retell_call_id?: string | null
 business_id: string
 business_name: string
 from_number: string
 to_number?: string | null
 caller_name?: string | null
 status: string
 duration?: number | null
 recording_url?: string | null
 transcript?: string | null
 sentiment?: string | null
 call_summary?: string | null
 outcome?: string | null
 created_at: string
}

export default function AdminCallsPage() {
 const [calls, setCalls] = useState<AdminCall[]>([])
 const [total, setTotal] = useState(0)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [search, setSearch] = useState('')
 const [page, setPage] = useState(0)
 const [openCall, setOpenCall] = useState<AdminCall | null>(null)

 const load = async (signal?: AbortSignal) => {
  setLoading(true); setError('')
  try {
   const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
   })
   if (search.trim()) params.set('q', search.trim())
   const res = await fetchWithAuth(`/api/admin/calls?${params.toString()}`)
   if (signal?.aborted) return
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setCalls(json.calls || [])
   setTotal(json.total ?? 0)
  } catch (e) {
   if (signal?.aborted) return
   setError(e instanceof Error ? e.message : 'Failed to load calls')
  } finally {
   if (!signal?.aborted) setLoading(false)
  }
 }

 useEffect(() => {
  const ctrl = new AbortController()
  load(ctrl.signal)
  return () => ctrl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [page])

 // Debounced reload on search.
 useEffect(() => {
  const ctrl = new AbortController()
  const t = setTimeout(() => { setPage(0); load(ctrl.signal) }, 300)
  return () => { clearTimeout(t); ctrl.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [search])

 const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

 return (
  <AdminShell activeLabel="Calls">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        Cross-tenant feed
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        Calls
       </h1>
      </div>
      <span className="text-sm text-gray-500 font-mono">
       {total.toLocaleString()} total
      </span>
     </div>

     <Panel padding="none">
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
       <h2 className="text-sm font-medium text-white">Recent</h2>
       <div className="relative w-full sm:w-72">
        <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <Input
         type="search"
         placeholder="Search by caller or number…"
         value={search}
         onChange={(e) => setSearch(e.target.value)}
         className="pl-9"
        />
       </div>
      </div>

      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      ) : error ? (
       <div className="px-6 py-12 flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load calls</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : calls.length === 0 ? (
       <div className="px-6 py-16 text-center text-sm text-gray-500">
        No calls match this filter.
       </div>
      ) : (
       <motion.ul
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.015, delayChildren: 0.05 } } }}
        className="divide-y divide-white/[0.04]"
       >
        {calls.map((c) => (
         <motion.li
          key={c.id}
          variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
         >
          <button
           onClick={() => setOpenCall(c)}
           className="w-full text-left px-4 sm:px-6 py-3.5 hover:bg-white/[0.02] flex items-center gap-3 group transition-all duration-300 ease-out"
          >
           <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotForStatus(c.status)}`} />
           <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
            <div className="lg:col-span-3 min-w-0">
             <div className="text-sm font-medium text-white truncate">{c.caller_name || c.from_number || 'Unknown'}</div>
             <div className="text-xs text-gray-500 font-mono truncate mt-0.5">{c.from_number}</div>
            </div>
            <div className="lg:col-span-3 min-w-0 mt-1.5 lg:mt-0">
             <Link
              href={`/admin/clients/${c.business_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-sky-400 hover:text-sky-300 truncate inline-flex items-center gap-1"
             >
              {c.business_name} <ArrowSquareOut className="w-3 h-3 flex-shrink-0" />
             </Link>
            </div>
            <div className="hidden lg:block lg:col-span-2"><StatusPill status={c.status} /></div>
            <div className="hidden lg:block lg:col-span-2 text-xs text-gray-500 truncate">
             {c.call_summary || '-'}
            </div>
            <div className="lg:col-span-2 text-right text-xs text-gray-500 mt-1.5 lg:mt-0">
             <div className="font-mono">{relTime(c.created_at)}</div>
             <div className="font-mono text-gray-600 mt-0.5">{fmtDur(c.duration ?? 0)}</div>
            </div>
           </div>
          </button>
         </motion.li>
        ))}
       </motion.ul>
      )}

      {!loading && !error && total > PAGE_SIZE && (
       <div className="px-4 sm:px-6 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-500">
        <span>Page {page + 1} of {pageCount}</span>
        <div className="flex items-center gap-1">
         <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-1.5 rounded-md hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
         >
          <CaretLeft className="w-4 h-4" />
         </button>
         <button
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          className="p-1.5 rounded-md hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
         >
          <CaretRight className="w-4 h-4" />
         </button>
        </div>
       </div>
      )}
     </Panel>
    </div>
   </section>

   <AnimatePresence>
    {openCall && <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />}
   </AnimatePresence>
  </AdminShell>
 )
}

/* ----------------------------- Drawer ---------------------------- */

function CallDrawer({ call, onClose }: { call: AdminCall; onClose: () => void }) {
 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

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
    className="relative bg-[#0c0c10] border-l border-white/[0.06] w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col"
   >
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0c0c10] z-10">
     <div>
      <div className="text-sm font-semibold text-white">
       {call.caller_name || call.from_number || 'Unknown caller'}
      </div>
      <div className="text-xs text-gray-500 font-mono">
       {fmtDateTime(call.created_at)} · {fmtDur(call.duration ?? 0)}
      </div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div className="flex items-center gap-2 flex-wrap">
      <StatusPill status={call.status} />
      <Link
       href={`/admin/clients/${call.business_id}`}
       className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
      >
       {call.business_name} <ArrowSquareOut className="w-3 h-3" />
      </Link>
     </div>

     {call.recording_url && (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
       <div className="flex items-center gap-2 mb-2">
        <Play className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 font-medium">Recording</span>
       </div>
       <audio controls src={call.recording_url} className="w-full" />
      </div>
     )}

     {call.call_summary && (
      <div>
       <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Summary</h4>
       <p className="text-sm text-gray-300 leading-relaxed">{call.call_summary}</p>
      </div>
     )}

     {call.transcript ? (
      <div>
       <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Transcript</h4>
       <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
        {call.transcript}
       </div>
      </div>
     ) : (
      <p className="text-xs text-gray-500">No transcript available for this call.</p>
     )}
    </div>
   </motion.aside>
  </motion.div>
 )
}

/* ------------------------------ Helpers ------------------------------ */

function dotForStatus(status: string) {
 const s = (status || '').toLowerCase()
 if (s === 'answered' || s === 'completed') return 'bg-emerald-400'
 if (s === 'missed' || s === 'failed') return 'bg-rose-400'
 if (s === 'in_progress' || s === 'ringing') return 'bg-sky-400'
 return 'bg-gray-500'
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

function fmtDur(sec: number) {
 if (!sec) return '0s'
 const m = Math.floor(sec / 60)
 const s = sec % 60
 return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function fmtDateTime(iso: string): string {
 const d = new Date(iso)
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
 })
}
