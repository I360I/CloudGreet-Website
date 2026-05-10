'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, ArrowUpRight, CircleNotch, Trash, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from './_components/Shell'
import {
 Panel, StatusPill, Stat, Input, Sparkline,
} from './_components/ui'

type Client = {
 id: string
 business_name: string
 email: string
 phone_number?: string | null
 business_type?: string | null
 subscription_status?: string | null
 account_status?: string | null
 onboarding_completed?: boolean
 calcom_connected?: boolean
 forwarding_verified_at?: string | null
 created_at?: string
 calls_this_month: number
 calls_today: number
 spark: number[]
 last_call_at: string | null
}

type Overview = {
 kpis: {
  totalClients: number
  activeClients: number
  trialingClients: number
  inOnboarding: number
  callsToday: number
  callsThisMonth: number
  overallSpark: number[]
 }
 clients: Client[]
}

const EASE = [0.22, 1, 0.36, 1] as const

type SortKey = 'name' | 'status' | 'calls_month' | 'last_call' | 'created'

export default function AdminHome() {
 const [data, setData] = useState<Overview | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [search, setSearch] = useState('')
 const [sortKey, setSortKey] = useState<SortKey>('last_call')

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/overview')
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setData(json)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load overview')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const deleteClient = async (id: string, name: string) => {
  if (!confirm(`Delete "${name}"? This permanently removes the business, owner login, and all calls/appointments. Cannot be undone.`)) return
  if (!data) return
  const prev = data
  setData({ ...data, clients: data.clients.filter((c) => c.id !== id) })
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}`, { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.detail || j?.error || `Delete failed (${res.status})`)
  } catch (e) {
   setData(prev)
   alert(e instanceof Error ? e.message : 'Delete failed')
  }
 }

 const filtered = useMemo(() => {
  if (!data) return []
  const q = search.trim().toLowerCase()
  let list = data.clients
  if (q) {
   list = list.filter((c) =>
    c.business_name?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q) ||
    c.business_type?.toLowerCase().includes(q),
   )
  }
  const sorted = [...list]
  switch (sortKey) {
   case 'name':
    sorted.sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''))
    break
   case 'status':
    sorted.sort((a, b) => (a.subscription_status || '').localeCompare(b.subscription_status || ''))
    break
   case 'calls_month':
    sorted.sort((a, b) => b.calls_this_month - a.calls_this_month)
    break
   case 'last_call':
    sorted.sort((a, b) => {
     const aa = a.last_call_at ? new Date(a.last_call_at).getTime() : 0
     const bb = b.last_call_at ? new Date(b.last_call_at).getTime() : 0
     return bb - aa
    })
    break
   case 'created':
    sorted.sort((a, b) => {
     const aa = a.created_at ? new Date(a.created_at).getTime() : 0
     const bb = b.created_at ? new Date(b.created_at).getTime() : 0
     return bb - aa
    })
    break
  }
  return sorted
 }, [data, search, sortKey])

 return (
  <AdminShell activeLabel="Overview">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        cloudgreet · admin
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        Overview
       </h1>
      </div>
      <Link
       href="/admin/clients/new"
       className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out shadow-[0_0_30px_-12px_rgba(56,189,248,0.6)]"
      >
       <Plus className="w-4 h-4" /> New client
      </Link>
     </div>

     {/* Hero KPI - cross-tenant calls this month with sparkline */}
     <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mb-3"
     >
      <HeroKpi
       label="Calls this month"
       value={data?.kpis.callsThisMonth ?? 0}
       sub={`${data?.kpis.callsToday ?? 0} today · across ${data?.kpis.totalClients ?? 0} client${(data?.kpis.totalClients ?? 0) === 1 ? '' : 's'}`}
       spark={data?.kpis.overallSpark || []}
      />
     </motion.div>

     {/* Sub-KPIs */}
     <motion.div
      initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
      className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
     >
      {[
       { label: 'Active', value: String(data?.kpis.activeClients ?? 0), accent: true,
        sub: data && data.kpis.totalClients ? `${Math.round((data.kpis.activeClients / data.kpis.totalClients) * 100)}% of total` : '-' },
       { label: 'Non-paying', value: String(data?.kpis.trialingClients ?? 0), accent: false,
        sub: 'Sub active but $0 this period' },
       { label: 'In onboarding', value: String(data?.kpis.inOnboarding ?? 0), accent: false,
        sub: 'Cal.com or forwarding incomplete' },
      ].map((k) => (
       <motion.div
        key={k.label}
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
       >
        <Stat label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
       </motion.div>
      ))}
     </motion.div>

     {/* Clients table */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
       <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-medium text-white">Clients</h2>
        <span className="text-xs font-mono text-gray-500">
         {filtered.length}{search && data ? ` / ${data.clients.length}` : ''}
        </span>
       </div>
       <div className="flex items-center gap-2 flex-wrap">
        <SortPills value={sortKey} onChange={setSortKey} />
        <div className="relative w-full sm:w-72">
         <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
         <Input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
         />
        </div>
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
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load clients</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : filtered.length === 0 ? (
       <div className="px-6 py-16 text-center text-sm text-gray-500">
        {search
         ? 'No clients match your search.'
         : 'No clients yet. Tap "New client" to onboard your first one.'}
       </div>
      ) : (
       <motion.ul
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02, delayChildren: 0.05 } } }}
        className="divide-y divide-white/[0.04]"
       >
        {filtered.map((c) => (
         <ClientRow
          key={c.id}
          client={c}
          onDelete={() => deleteClient(c.id, c.business_name)}
         />
        ))}
       </motion.ul>
      )}
     </Panel>
    </div>
   </section>
  </AdminShell>
 )
}

/* -------------------------------- Hero KPI ------------------------------- */

function HeroKpi({ label, value, sub, spark }: {
 label: string; value: number; sub: string; spark: number[]
}) {
 return (
  <div className="bg-[#101015] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 relative overflow-hidden">
   <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3 sm:mb-4">{label}</div>
   <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
    <div className="font-mono font-medium tracking-tight tabular-nums text-5xl sm:text-6xl md:text-7xl text-white">
     {value.toLocaleString()}
    </div>
    {spark && spark.length > 1 && (
     <div className="w-full sm:flex-1 sm:max-w-[280px] sm:pb-2">
      <BigSparkline data={spark} />
     </div>
    )}
   </div>
   <div className="text-xs text-gray-500 mt-3">{sub}</div>
  </div>
 )
}

function BigSparkline({ data }: { data: number[] }) {
 const max = Math.max(...data, 1)
 const w = 240, h = 36
 const pts = data.map((v, i) => {
  const x = (i / (data.length - 1)) * w
  const y = h - (v / max) * (h - 2) - 1
  return `${x.toFixed(1)},${y.toFixed(1)}`
 }).join(' ')
 return (
  <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
   <polyline
    fill="none"
    stroke="#38bdf8"
    strokeLinecap="round"
    strokeLinejoin="round"
    points={pts}
   />
  </svg>
 )
}

/* -------------------------------- Sort pills ----------------------------- */

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
 { id: 'last_call', label: 'Last call' },
 { id: 'calls_month', label: 'Most calls' },
 { id: 'name', label: 'Name' },
 { id: 'created', label: 'Newest' },
]

function SortPills({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
 return (
  <div className="inline-flex bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
   {SORT_OPTIONS.map((o) => (
    <button
     key={o.id}
     onClick={() => onChange(o.id)}
     className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-300 ease-out ${
      value === o.id ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'
     }`}
    >
     {o.label}
    </button>
   ))}
  </div>
 )
}

/* ------------------------------- Client row ------------------------------ */

function ClientRow({ client, onDelete }: { client: Client; onDelete: () => void }) {
 return (
  <motion.li
   variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
   className="group"
  >
   <a
    href={`/admin/clients/${client.id}`}
    className="block px-4 sm:px-6 py-4 hover:bg-white/[0.02] transition-all duration-300 ease-out"
   >
    <div className="flex items-center gap-4">
     <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
      {/* Name + email */}
      <div className="lg:col-span-3 min-w-0">
       <div className="text-sm font-medium text-white truncate">{client.business_name}</div>
       <div className="text-xs text-gray-500 truncate mt-0.5">{client.email}</div>
      </div>
      {/* Status */}
      <div className="lg:col-span-2 mt-1.5 lg:mt-0 flex items-center gap-1.5 flex-wrap">
       <StatusPill status={client.subscription_status || client.account_status || 'pending'} />
       {!client.onboarding_completed && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
         setup
        </span>
       )}
      </div>
      {/* Calls this month + sparkline */}
      <div className="hidden lg:flex lg:col-span-3 items-center gap-3">
       <div className="font-mono text-sm tabular-nums text-gray-200 w-9 text-right">
        {client.calls_this_month}
       </div>
       <div className="text-[10px] font-mono uppercase tracking-wider text-gray-600">calls/mo</div>
       <div className="ml-auto">
        <Sparkline data={client.spark} accent={client.calls_this_month > 0} />
       </div>
      </div>
      {/* Last call */}
      <div className="hidden lg:block lg:col-span-2 text-xs text-gray-500">
       {client.last_call_at ? relTime(client.last_call_at) : '-'}
      </div>
      {/* Actions */}
      <div className="hidden lg:flex lg:col-span-2 items-center justify-end gap-3">
       <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
        className="p-1.5 rounded-md text-gray-500 hover:text-rose-300 hover:bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"
        aria-label="Delete client"
       >
        <Trash className="w-4 h-4" />
       </button>
       <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
      </div>
     </div>
     {/* Mobile: small inline summary on the right */}
     <div className="lg:hidden flex flex-col items-end gap-1.5 text-xs text-gray-500 flex-shrink-0">
      <span className="font-mono tabular-nums text-gray-200">{client.calls_this_month}</span>
      <span className="font-mono text-[10px]">{client.last_call_at ? relTime(client.last_call_at) : '-'}</span>
     </div>
     <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
      className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-rose-300"
      aria-label="Delete client"
     >
      <Trash className="w-4 h-4" />
     </button>
    </div>
   </a>
  </motion.li>
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
