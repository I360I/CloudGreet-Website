'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ArrowUpRight, Loader2, Trash2, Search, AlertCircle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from './_components/Shell'
import {
 Panel, PanelHeader, Stat, StatusPill, PrimaryButton, GhostButton, Input, RisingFade,
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
 created_at?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export default function AdminHome() {
 const [clients, setClients] = useState<Client[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [showForm, setShowForm] = useState(false)
 const [search, setSearch] = useState('')

 const loadClients = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/clients?limit=200')
   const data = await res.json().catch(() => ({}))
   if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`)
   setClients(data.clients || data.data || [])
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load clients')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { loadClients() }, [])

 const deleteClient = async (id: string, name: string) => {
  if (!confirm(`Delete "${name}"? This permanently removes the business, owner login, and all calls/appointments. Cannot be undone.`)) return
  const prev = clients
  setClients((cs) => cs.filter((c) => c.id !== id))
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}`, { method: 'DELETE' })
   const data = await res.json().catch(() => ({}))
   if (!res.ok || !data.success) {
    throw new Error(data?.detail || data?.error || `Delete failed (${res.status})`)
   }
  } catch (e) {
   setClients(prev)
   alert(e instanceof Error ? e.message : 'Delete failed')
  }
 }

 const filtered = useMemo(() => {
  const q = search.trim().toLowerCase()
  if (!q) return clients
  return clients.filter((c) =>
   c.business_name?.toLowerCase().includes(q) ||
   c.email?.toLowerCase().includes(q) ||
   c.business_type?.toLowerCase().includes(q),
  )
 }, [clients, search])

 const stats = useMemo(() => {
  const total = clients.length
  const active = clients.filter((c) => c.subscription_status === 'active').length
  const trialing = clients.filter((c) => c.subscription_status === 'trialing').length
  const onboarding = clients.filter((c) => !c.onboarding_completed).length
  return { total, active, trialing, onboarding }
 }, [clients])

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
      <PrimaryButton onClick={() => setShowForm(!showForm)}>
       <Plus className="w-4 h-4" />
       {showForm ? 'Close' : 'New client'}
      </PrimaryButton>
     </div>

     {/* KPI strip */}
     <motion.div
      initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
     >
      {[
       { label: 'Total clients', value: String(stats.total), accent: false },
       { label: 'Active', value: String(stats.active), accent: true, sub: stats.total ? `${Math.round((stats.active / stats.total) * 100)}% of total` : '—' },
       { label: 'Trialing', value: String(stats.trialing), accent: false },
       { label: 'In onboarding', value: String(stats.onboarding), accent: false, sub: 'Cal.com or forwarding incomplete' },
      ].map((k) => (
       <motion.div
        key={k.label}
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
       >
        <Stat label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
       </motion.div>
      ))}
     </motion.div>

     {/* New client form */}
     {showForm && (
      <RisingFade>
       <Panel className="mb-3">
        <PanelHeader title="New client" eyebrow="Onboard" />
        <NewClientForm
         onCreated={() => { setShowForm(false); loadClients() }}
         onCancel={() => setShowForm(false)}
        />
       </Panel>
      </RisingFade>
     )}

     {/* Clients table */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
       <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-medium text-white">Clients</h2>
        <span className="text-xs font-mono text-gray-500">{filtered.length}{search && ` / ${clients.length}`}</span>
       </div>
       <div className="relative w-full sm:w-72">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <Input
         type="search"
         placeholder="Search by name, email, or type…"
         value={search}
         onChange={(e) => setSearch(e.target.value)}
         className="pl-9"
        />
       </div>
      </div>

      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      ) : error ? (
       <div className="px-6 py-12 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load clients</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : filtered.length === 0 ? (
       <div className="px-6 py-16 text-center text-sm text-gray-500">
        {search ? 'No clients match your search.' : 'No clients yet. Tap "New client" to onboard your first one.'}
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

/* ----------------------------- Client row ----------------------------- */

function ClientRow({ client, onDelete }: { client: Client; onDelete: () => void }) {
 return (
  <motion.li
   variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
   className="group"
  >
   <a
    href={`/admin/clients/${client.id}`}
    className="block px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-all duration-300 ease-out"
   >
    <div className="flex items-center gap-4">
     <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
      <div className="lg:col-span-4 min-w-0">
       <div className="text-sm font-medium text-white truncate">{client.business_name}</div>
       <div className="text-xs text-gray-500 truncate mt-0.5">{client.email}</div>
      </div>
      <div className="lg:col-span-3 mt-1.5 lg:mt-0 flex items-center gap-2 flex-wrap">
       <StatusPill status={client.subscription_status || client.account_status || 'pending'} />
       {!client.onboarding_completed && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
         setup
        </span>
       )}
      </div>
      <div className="hidden lg:block lg:col-span-3 text-xs text-gray-500 truncate">
       {client.business_type || '—'}
      </div>
      <div className="hidden lg:flex lg:col-span-2 items-center justify-end gap-3">
       <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
        className="p-1.5 rounded-md text-gray-500 hover:text-rose-300 hover:bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"
        aria-label="Delete client"
       >
        <Trash2 className="w-4 h-4" />
       </button>
       <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
      </div>
     </div>
     {/* Mobile-only delete — visible without hover */}
     <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
      className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-rose-300"
      aria-label="Delete client"
     >
      <Trash2 className="w-4 h-4" />
     </button>
    </div>
   </a>
  </motion.li>
 )
}

/* ---------------------------- New client form ---------------------------- */

function NewClientForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  setSubmitting(true); setError('')
  const fd = new FormData(form)
  const body = Object.fromEntries(fd.entries())
  try {
   const res = await fetchWithAuth('/api/admin/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
   })
   const data = await res.json().catch(() => ({}))
   if (!res.ok) {
    setError(data.error || data.detail || 'Failed to create client')
    return
   }
   form.reset()
   onCreated()
  } catch (err) {
   setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
   setSubmitting(false)
  }
 }

 return (
  <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
   <FormField name="business_name" label="Business name" required />
   <FormField
    name="business_type"
    label="Business type"
    required
    type="select"
    options={['HVAC', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Other']}
   />
   <FormField name="first_name" label="Owner first name" placeholder="Mike" />
   <FormField name="last_name" label="Owner last name" placeholder="Rodriguez" />
   <FormField name="email" label="Owner email" type="email" required />
   <FormField name="password" label="Temporary password" type="text" required />
   <FormField name="phone_number" label="Business phone" placeholder="+1 (512) 555-1234" />
   <div />
   <FormField name="retell_phone_number" label="Retell phone number" placeholder="+15125551234" />
   <FormField name="retell_agent_id" label="Retell agent ID" placeholder="agent_…" />

   {error && (
    <div className="sm:col-span-2 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
     <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
     <span>{error}</span>
    </div>
   )}

   <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
    <GhostButton onClick={onCancel}>Cancel</GhostButton>
    <PrimaryButton type="submit" loading={submitting}>
     {submitting ? 'Creating…' : 'Create client'}
    </PrimaryButton>
   </div>
  </form>
 )
}

function FormField({
 name, label, type = 'text', required = false, placeholder, options,
}: {
 name: string
 label: string
 type?: string
 required?: boolean
 placeholder?: string
 options?: string[]
}) {
 const id = `f-${name}`
 return (
  <div>
   <label htmlFor={id} className="text-xs font-medium text-gray-400 mb-1.5 block">
    {label}{required && <span className="text-gray-600"> *</span>}
   </label>
   {type === 'select' && options ? (
    <select
     id={id} name={name} required={required}
     defaultValue=""
     className="w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
    >
     <option value="" disabled>Select…</option>
     {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
   ) : (
    <input
     id={id} name={name} type={type} required={required} placeholder={placeholder}
     className="w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
    />
   )}
  </div>
 )
}
