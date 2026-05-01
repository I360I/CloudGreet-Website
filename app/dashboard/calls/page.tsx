'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Phone, ChevronRight, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'
import {
 type Call, CallDrawer, OutcomeBadge, OutcomeDot, tagOutcome,
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

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setLoading(true); setError('')
   try {
    const businessRaw = localStorage.getItem('business')
    const businessId = businessRaw ? JSON.parse(businessRaw).id : null
    if (!businessId) throw new Error('Missing business id — please sign in again.')

    const params = new URLSearchParams({
     businessId,
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

 const filtered = useMemo(() => {
  if (!calls) return []
  let list = calls
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
 }, [calls, filter, search])

 const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

 return (
  <DashShell activeLabel="Calls">
   <section className="px-8 py-10">
    <div className="max-w-6xl">
     <div className="mb-8">
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Calls</h1>
      <p className="text-sm text-gray-500 mt-1">
       {total > 0 ? `${total} total` : 'Every call your AI agent handled.'}
      </p>
     </div>

     <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
       <div className="flex items-center gap-2 flex-wrap">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        <Pill active={filter === 'booked'} onClick={() => setFilter('booked')}>Booked</Pill>
        <Pill active={filter === 'message'} onClick={() => setFilter('message')}>Messages</Pill>
        <Pill active={filter === 'dropped'} onClick={() => setFilter('dropped')}>Dropped</Pill>
        <div className="ml-auto relative">
         <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
         <input
          type="search" placeholder="Search by name, number, summary…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-gray-400 w-72 transition-colors"
         />
        </div>
       </div>
      </div>

      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
       </div>
      ) : error ? (
       <div className="px-6 py-12 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load calls</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : filtered.length === 0 ? (
       <Empty hasAny={(calls?.length ?? 0) > 0} />
      ) : (
       <ul className="divide-y divide-gray-100">
        {filtered.map((c) => (
         <li key={c.id}>
          <button
           onClick={() => setOpenCall(c)}
           className="w-full text-left px-6 py-4 hover:bg-gray-50/60 flex items-center gap-4 group transition-colors"
          >
           <OutcomeDot outcome={tagOutcome(c)} />
           <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-baseline">
            <div className="col-span-4 min-w-0">
             <div className="text-sm font-medium text-gray-900 truncate">
              {c.caller_name || c.from_number || 'Unknown'}
             </div>
             <div className="text-xs text-gray-500 font-mono truncate mt-0.5">{c.from_number}</div>
            </div>
            <div className="col-span-2"><OutcomeBadge outcome={tagOutcome(c)} /></div>
            <div className="col-span-4 text-xs text-gray-500 truncate">
             {c.summary || '—'}
            </div>
            <div className="col-span-2 text-right text-xs text-gray-500">
             <div>{relTime(c.created_at)}</div>
             <div className="text-gray-400 mt-0.5">{fmtDur(c.duration || 0)}</div>
            </div>
           </div>
           <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
          </button>
         </li>
        ))}
       </ul>
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
          <ChevronLeft className="w-4 h-4" />
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
   <div className="px-8 py-16 text-center">
    <p className="text-sm text-gray-500">No calls match your filters.</p>
   </div>
  )
 }
 return (
  <div className="px-8 py-16 text-center">
   <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-4">
    <Phone className="w-4 h-4 text-sky-500" />
   </div>
   <p className="text-sm font-medium text-gray-900 mb-1">No calls yet.</p>
   <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
    Calls will appear here as soon as your AI agent answers them.
   </p>
  </div>
 )
}
