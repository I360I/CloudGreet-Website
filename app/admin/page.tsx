'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Plus, ArrowUpRight, CircleNotch, Trash, MagnifyingGlass, WarningCircle, Users, Phone, CalendarCheck, Wrench } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell, useAdminTheme } from './_components/Shell'
import {
 Panel, HeroPanel, StatusPill, Input, Sparkline,
} from './_components/ui'
import {
 AreaChart, CountUp, DonutGauge, MeterBar, fmtMoney,
} from './_components/charts'

// WebGL pieces are client-only; skeletons keep panel heights stable while they load.
const TopClients3D = dynamic(() => import('./_components/Chart3D'), {
 ssr: false,
 loading: () => <div className="h-[300px] rounded-xl bg-white/[0.02] animate-pulse" />,
})
const ClientGlobe = dynamic(() => import('./_components/ClientGlobe'), {
 ssr: false,
 loading: () => <div className="h-[470px] bg-white/[0.02] animate-pulse" />,
})

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
  bookingsToday?: number
  bookingsThisMonth?: number
  overallSpark: number[]
 }
 finance?: {
  mrrCents: number
  payingClients: number
  costMtdCents: number
  costByProvider: Record<string, number>
  marginCents: number
  marginPct: number | null
 }
 series?: {
  days: string[]
  calls: number[]
  bookings: number[]
 }
 map?: {
  points: { id: string; name: string; lat: number; lng: number; kind: 'client' | 'demo' }[]
 }
 clients: Client[]
}

const EASE = [0.22, 1, 0.36, 1] as const

const PROVIDER_COLORS: Record<string, string> = {
 retell: '#38bdf8',
 anthropic: '#a78bfa',
 telnyx: '#34d399',
 stripe: '#818cf8',
 google: '#fbbf24',
 other: '#64748b',
}

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

 const fin = data?.finance
 const chartLabels = useMemo(
  () => (data?.series?.days || []).map(shortDay),
  [data?.series?.days],
 )
 const topClients = useMemo(() => {
  if (!data) return []
  return [...data.clients]
   .filter((c) => c.calls_this_month > 0)
   .sort((a, b) => b.calls_this_month - a.calls_this_month)
   .slice(0, 8)
   .map((c) => ({ label: c.business_name || '-', value: c.calls_this_month }))
 }, [data])

 const providerRows = useMemo(() => {
  const by = fin?.costByProvider || {}
  return Object.entries(by)
   .filter(([, v]) => v > 0)
   .sort(([, a], [, b]) => b - a)
 }, [fin])
 const providerMax = providerRows.length ? providerRows[0][1] : 0

 return (
  <AdminShell activeLabel="Overview">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">

     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        {todayLine()}
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        {greeting()}
       </h1>
      </div>
      <Link
       href="/admin/clients/new"
       className="inline-flex items-center justify-center gap-2 bg-gradient-to-b from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-10px_rgba(56,189,248,0.65)] hover:-translate-y-px"
      >
       <Plus className="w-4 h-4" /> New client
      </Link>
     </div>

     {/* Hero: the money story + 30-day activity */}
     <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mb-4"
     >
      <HeroPanel className="p-5 sm:p-7 md:p-8 overflow-hidden">
       <div className="grid lg:grid-cols-5 gap-8 items-center">
        {/* Revenue + margin */}
        <div className="lg:col-span-2 flex items-center gap-6">
         <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-3">
           Monthly recurring revenue
          </div>
          <div className="font-display font-semibold tracking-tight text-5xl sm:text-6xl text-white">
           {fin ? <CountUp value={fin.mrrCents} format={(n) => fmtMoney(n)} duration={1.1} /> : '-'}
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
            fin && fin.marginCents < 0
             ? 'text-rose-300 bg-rose-400/10 border-rose-400/20'
             : 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20'
           }`}>
            {fin ? `${fmtMoney(fin.marginCents)} margin` : '-'}
           </span>
           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-gray-400 bg-white/[0.04] border border-white/[0.08]">
            {fin ? `${fmtMoney(fin.costMtdCents)} cost to serve` : '-'}
           </span>
          </div>
          <div className="text-xs text-gray-500 mt-3">
           {fin ? `${fin.payingClients} paying client${fin.payingClients === 1 ? '' : 's'} · provider costs measured live` : ' '}
          </div>
         </div>
         <div className="hidden sm:block flex-shrink-0 ml-auto">
          <DonutGauge pct={fin?.marginPct ?? null} label="margin" />
         </div>
        </div>

        {/* 30-day chart */}
        <div className="lg:col-span-3 min-w-0">
         <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
           Last 30 days
          </div>
          <div className="flex items-center gap-4">
           <LegendDot color="#38bdf8" label="Calls" />
           <LegendDot color="#34d399" label="Bookings" />
          </div>
         </div>
         <AreaChart
          height={215}
          labels={chartLabels}
          series={[
           { name: 'Calls', color: '#38bdf8', data: data?.series?.calls || [] },
           { name: 'Bookings', color: '#34d399', data: data?.series?.bookings || [] },
          ]}
         />
        </div>
       </div>
      </HeroPanel>
     </motion.div>

     {/* Live client map */}
     <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="mb-4"
     >
      <Panel padding="none" className="relative overflow-hidden">
       <div className="absolute top-5 left-6 z-10 pointer-events-none">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">Footprint</div>
        <h2 className="text-sm font-medium text-white">Live client map</h2>
       </div>
       <div className="absolute top-5 right-6 z-10 flex items-center gap-2 flex-wrap justify-end">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-300 bg-emerald-400/10 border border-emerald-400/20">
         <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" />
         {(data?.map?.points || []).filter((p) => p.kind === 'client').length} clients
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20">
         <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_currentColor]" />
         {(data?.map?.points || []).filter((p) => p.kind === 'demo').length} demo leads
        </span>
       </div>
       <GlobePanel points={data?.map?.points || []} />
      </Panel>
     </motion.div>

     {/* KPI row */}
     <motion.div
      initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
     >
      <Kpi
       label="Active clients"
       value={data?.kpis.activeClients ?? 0}
       sub={data && data.kpis.totalClients ? `${Math.round(((data.kpis.activeClients) / data.kpis.totalClients) * 100)}% of ${data.kpis.totalClients} total` : '-'}
       accent
       icon={Users}
      />
      <Kpi
       label="Calls today"
       value={data?.kpis.callsToday ?? 0}
       sub={`${(data?.kpis.callsThisMonth ?? 0).toLocaleString()} this month`}
       icon={Phone}
      />
      <Kpi
       label="Bookings this month"
       value={data?.kpis.bookingsThisMonth ?? 0}
       sub={`${data?.kpis.bookingsToday ?? 0} today`}
       icon={CalendarCheck}
      />
      <Kpi
       label="In onboarding"
       value={data?.kpis.inOnboarding ?? 0}
       sub="Cal.com or forwarding incomplete"
       warn={(data?.kpis.inOnboarding ?? 0) > 0}
       icon={Wrench}
      />
     </motion.div>

     {/* Depth charts row */}
     <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="grid lg:grid-cols-5 gap-3 mb-6"
     >
      <Panel className="lg:col-span-3">
       <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-medium text-white">Top clients</h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">calls this month</span>
       </div>
       {topClients.length > 0 ? (
        <TopClientsChart items={topClients} />
       ) : (
        <EmptyMascot line="No calls yet this month." />
       )}
      </Panel>

      <Panel className="lg:col-span-2">
       <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-medium text-white">Cost to serve</h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">this month</span>
       </div>
       {providerRows.length > 0 ? (
        <div className="space-y-3.5">
         {providerRows.map(([provider, cents]) => (
          <MeterBar
           key={provider}
           label={provider}
           value={cents}
           max={providerMax}
           format={(n) => fmtMoney(n)}
           color={PROVIDER_COLORS[provider] || PROVIDER_COLORS.other}
          />
         ))}
         <div className="pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500">Total</span>
          <span className="text-sm font-mono tabular-nums text-white">{fmtMoney(fin?.costMtdCents ?? 0)}</span>
         </div>
        </div>
       ) : (
        <EmptyMascot line="No provider costs recorded yet this month." />
       )}
      </Panel>
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
       <div className="px-6 py-14">
        <EmptyMascot line={search ? 'No clients match your search.' : 'No clients yet. Tap "New client" to onboard your first one.'} />
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

/* --------------------------------- pieces -------------------------------- */

function greeting(): string {
 const h = new Date().getHours()
 if (h < 5) return 'Working late'
 if (h < 12) return 'Good morning'
 if (h < 17) return 'Good afternoon'
 return 'Good evening'
}

function todayLine(): string {
 return new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
 })
}

function shortDay(key: string): string {
 // key is 'YYYY-MM-DD' (local) - parse without timezone surprises
 const [y, m, d] = key.split('-').map(Number)
 return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function LegendDot({ color, label }: { color: string; label: string }) {
 return (
  <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
   <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}99` }} />
   {label}
  </span>
 )
}

function Kpi({ label, value, sub, accent = false, warn = false, icon: Icon }: {
 label: string
 value: number
 sub?: string
 accent?: boolean
 warn?: boolean
 icon?: React.ElementType
}) {
 return (
  <motion.div
   variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
  >
   <Panel>
    {Icon && (
     <div className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center border ${
      warn && value > 0
       ? 'bg-amber-400/10 border-amber-400/20 text-amber-300'
       : 'bg-sky-400/10 border-sky-400/20 text-sky-400'
     }`}>
      <Icon weight="duotone" className="w-[18px] h-[18px]" />
     </div>
    )}
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">{label}</div>
    <div className={`font-display font-semibold tracking-tight text-3xl md:text-4xl ${
     warn && value > 0
      ? 'text-amber-300'
      : accent
       ? 'text-transparent bg-clip-text bg-gradient-to-br from-sky-300 to-sky-500'
       : 'text-white'
    }`}>
     <CountUp value={value} />
    </div>
    {sub && <div className="text-xs text-gray-500 mt-1.5">{sub}</div>}
   </Panel>
  </motion.div>
 )
}

function TopClientsChart({ items }: { items: { label: string; value: number }[] }) {
 const { theme } = useAdminTheme()
 return <TopClients3D items={items} theme={theme} height={300} />
}

function GlobePanel({ points }: {
 points: { id: string; name: string; lat: number; lng: number; kind: 'client' | 'demo' }[]
}) {
 const { theme } = useAdminTheme()
 return <ClientGlobe points={points} theme={theme} height={470} />
}

function EmptyMascot({ line }: { line: string }) {
 return (
  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
   <Image
    src="/chat-agent-pose.png"
    alt=""
    width={64}
    height={90}
    className="w-14 h-auto opacity-90 drop-shadow-[0_8px_24px_rgba(56,189,248,0.25)]"
   />
   <p className="text-sm text-gray-500 max-w-[260px]">{line}</p>
  </div>
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
      value === o.id ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-gray-500 hover:text-gray-300'
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
    className="block px-4 sm:px-6 py-4 hover:bg-white/[0.025] transition-all duration-300 ease-out"
   >
    <div className="flex items-center gap-4">
     <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
      {/* Avatar + name + email */}
      <div className="lg:col-span-3 min-w-0 flex items-center gap-3">
       <div className="hidden sm:flex w-9 h-9 rounded-xl flex-shrink-0 items-center justify-center text-sm font-semibold text-sky-200 bg-gradient-to-br from-sky-400/[0.18] to-indigo-500/[0.12] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {(client.business_name || '?').charAt(0).toUpperCase()}
       </div>
       <div className="min-w-0">
        <div className="text-sm font-medium text-white truncate">{client.business_name}</div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{client.email}</div>
       </div>
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
