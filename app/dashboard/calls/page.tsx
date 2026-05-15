'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretRight, MagnifyingGlass, CircleNotch, WarningCircle, CaretLeft, CaretRight as ChevronRightIcon } from '@phosphor-icons/react'

const EASE = [0.22, 1, 0.36, 1] as const
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import { demoCalls } from '../_components/demo-data'
import {
 type Call, CallDrawer, OutcomeBadge, OutcomeDot, BookingTypeTag, tagOutcome,
 fmtDur, relTime,
} from '../_components/calls'

type Filter = 'all' | 'booked' | 'message' | 'dropped'

const PAGE_SIZE = 25

export default function CallsPage() {
 const [calls, setCalls] = useState<Call[] | null>(null)
 const [total, setTotal] = useState(0)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [filter, setFilter] = useState<Filter>('all')
 const [search, setSearch] = useState('')
 const [page, setPage] = useState(0)
 const [openCall, setOpenCall] = useState<Call | null>(null)
 const [needsSetup, setNeedsSetup] = useState(false)

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/onboarding/state')
    if (!res.ok) return
    const json = await res.json()
    if (!cancelled && json?.success && json.business) {
     setNeedsSetup(!json.business.onboarding_completed)
    }
   } catch { /* non-fatal */ }
  })()
  return () => { cancelled = true }
 }, [])

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setLoading(true); setError('')
   try {
    // The server reads business_id from the JWT and IGNORES this
    // query param (it was the cross-tenant leak vector). We pass a
    // best-effort id from localStorage just to keep older route
    // contracts happy, but it isn't required - and we no longer
    // fail the page when localStorage is empty (e.g. fresh
    // create-account session that hasn't hydrated it yet).
    let businessId = ''
    try {
     const raw = localStorage.getItem('business')
     if (raw) businessId = JSON.parse(raw)?.id || ''
    } catch { /* localStorage disabled or malformed - rely on JWT */ }

    const params = new URLSearchParams({
     ...(businessId ? { businessId } : {}),
     limit: String(PAGE_SIZE),
     offset: String(page * PAGE_SIZE),
    })
    const res = await fetchWithAuth(`/api/calls/history?${params.toString()}`)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`)
    if (cancelled) return

    const list: Call[] = (json.calls || []).map((c: any) => ({
     id: c.id,
     call_id: c.call_id || c.id,
     from_number: c.from_number || '',
     caller_name: c.caller_name ?? null,
     duration: c.duration ?? null,
     created_at: c.created_at,
     status: c.status || 'unknown',
     sentiment: c.sentiment ?? null,
     summary: c.summary ?? null,
     transcript: c.transcript ?? null,
     recording_url: c.recording_url ?? null,
     outcome: c.outcome ?? null,
    }))
    setCalls(list)
    setTotal(json.total ?? list.length)
   } catch (e) {
    if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load calls')
   } finally {
    if (!cancelled) setLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [page])

 // Show demo calls when onboarding is incomplete and no real calls exist.
 const isDemo = needsSetup && (calls?.length ?? 0) === 0 && !loading && !error
 const sourceCalls = isDemo ? demoCalls() : calls

 const filtered = useMemo(() => {
  if (!sourceCalls) return []
  let list = sourceCalls
  if (filter !== 'all') list = list.filter((c) => tagOutcome(c) === filter)
  if (search) {
   const q = search.toLowerCase()
   list = list.filter((c) =>
    (c.caller_name || '').toLowerCase().includes(q) ||
    (c.from_number || '').includes(q) ||
    (c.summary || '').toLowerCase().includes(q),
   )
  }
  return list
 }, [sourceCalls, filter, search])

 const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

 return (
  <DashShell activeLabel="Calls">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-6xl">
     <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Calls</h1>
      {total > 0 && <span className="text-sm text-gray-500 font-mono">{total} total</span>}
     </div>

     <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
       <div className="flex items-center gap-2 flex-wrap">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        <Pill active={filter === 'booked'} onClick={() => setFilter('booked')}>Booked</Pill>
        <Pill active={filter === 'message'} onClick={() => setFilter('message')}>Messages</Pill>
        <Pill active={filter === 'dropped'} onClick={() => setFilter('dropped')}>Dropped</Pill>
        <div className="ml-auto relative">
         <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
         <input
          type="search" placeholder="Search by name, number, summary…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-gray-400 w-full sm:w-72 transition-colors"
         />
        </div>
       </div>
      </div>

      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
       </div>
      ) : error ? (
       <div className="px-6 py-12 flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load calls</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : filtered.length === 0 ? (
       <Empty hasAny={(calls?.length ?? 0) > 0} />
      ) : (
       <motion.ul
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } } }}
        className="divide-y divide-gray-100"
       >
        {filtered.map((c) => (
         <motion.li
          key={c.id}
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
         >
          <button
           onClick={() => setOpenCall(c)}
           className="w-full text-left px-4 lg:px-6 py-3.5 lg:py-4 hover:bg-gray-50/60 flex items-center gap-3 lg:gap-4 group transition-all duration-300 ease-out"
          >
           <OutcomeDot outcome={tagOutcome(c)} />
           <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-baseline">
            {/* Mobile: stacked compact layout; Desktop: 12-col table */}
            <div className="lg:col-span-4 min-w-0">
             <div className="text-sm font-medium text-gray-900 truncate">
              {c.caller_name || c.from_number || 'Unknown'}
             </div>
             <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 font-mono truncate">{c.from_number}</span>
              <span className="lg:hidden text-xs text-gray-400">·</span>
              <span className="lg:hidden text-xs text-gray-400">{relTime(c.created_at)}</span>
             </div>
            </div>
            <div className="lg:col-span-2 mt-1.5 lg:mt-0 flex flex-wrap items-center gap-1">
             <BookingTypeTag call={c} />
             <OutcomeBadge outcome={tagOutcome(c)} />
            </div>
            <div className="hidden lg:block lg:col-span-4 text-xs text-gray-500 truncate">
             {(c.call_extractions as any)?.summary || c.summary || '-'}
            </div>
            <div className="hidden lg:block lg:col-span-2 text-right text-xs text-gray-500">
             <div>{relTime(c.created_at)}</div>
             <div className="text-gray-400 mt-0.5">{fmtDur(c.duration || 0)}</div>
            </div>
           </div>
           <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all duration-300 ease-out" />
          </button>
         </motion.li>
        ))}
       </motion.ul>
      )}

      {!loading && !error && total > PAGE_SIZE && (
       <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Page {page + 1} of {pageCount}</span>
        <div className="flex items-center gap-1">
         <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
         >
          <CaretLeft className="w-4 h-4" />
         </button>
         <button
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
         >
          <ChevronRightIcon className="w-4 h-4" />
         </button>
        </div>
       </div>
      )}
     </div>
    </div>
   </section>

   <AnimatePresence>
    {openCall && <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />}
   </AnimatePresence>
  </DashShell>
 )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
 return (
  <button
   onClick={onClick}
   className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
    active ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
   }`}
  >
   {children}
  </button>
 )
}

function Empty({ hasAny }: { hasAny: boolean }) {
 if (hasAny) {
  return (
   <div className="px-6 py-6">
    <p className="text-sm text-gray-500">No calls match your filters.</p>
   </div>
  )
 }
 return (
  <div className="px-6 py-6">
   <p className="text-sm text-gray-700">
    No calls yet. Once your CloudGreet agent is live and your business line is forwarded to it, calls will show up here.
   </p>
  </div>
 )
}
