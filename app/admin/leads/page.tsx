'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CircleNotch, WarningCircle, MagnifyingGlass, Trash, X, Upload, Phone as PhoneIcon, Envelope, CaretRight, PhoneCall, SkipForward, ArrowRight, Copy } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import {
 Panel, Stat, PrimaryButton, GhostButton, DangerButton, Input, Select, RisingFade,
} from '../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

type LeadStatus = 'cold' | 'contacted' | 'demo_booked' | 'demo_done' | 'closed_won' | 'closed_lost'
type LeadSource = 'cold_call' | 'demo_line' | 'referral' | 'social' | 'inbound_form' | 'other'

type Lead = {
 id: string
 business_name: string
 contact_name: string | null
 phone: string | null
 email: string | null
 source: LeadSource
 status: LeadStatus
 notes: string | null
 last_contacted_at: string | null
 next_action_at: string | null
 created_at: string
}

const STATUS_FLOW: { id: LeadStatus; label: string; tone: string }[] = [
 { id: 'cold',         label: 'Cold',          tone: 'gray' },
 { id: 'contacted',    label: 'Contacted',     tone: 'sky' },
 { id: 'demo_booked',  label: 'Demo booked',   tone: 'amber' },
 { id: 'demo_done',    label: 'Demo done',     tone: 'violet' },
 { id: 'closed_won',   label: 'Closed (won)',  tone: 'emerald' },
 { id: 'closed_lost',  label: 'Closed (lost)', tone: 'rose' },
]

const TONE_CLASSES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
 gray:    { bg: 'bg-gray-400/10',    text: 'text-gray-300',    border: 'border-gray-400/20',    dot: 'bg-gray-400' },
 sky:     { bg: 'bg-sky-400/10',     text: 'text-sky-300',     border: 'border-sky-400/20',     dot: 'bg-sky-400' },
 amber:   { bg: 'bg-amber-400/10',   text: 'text-amber-300',   border: 'border-amber-400/20',   dot: 'bg-amber-400' },
 violet:  { bg: 'bg-violet-400/10',  text: 'text-violet-300',  border: 'border-violet-400/20',  dot: 'bg-violet-400' },
 emerald: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
 rose:    { bg: 'bg-rose-400/10',    text: 'text-rose-300',    border: 'border-rose-400/20',    dot: 'bg-rose-400' },
}

const SOURCE_LABELS: Record<LeadSource, string> = {
 cold_call: 'Cold call',
 demo_line: 'Demo line',
 referral: 'Referral',
 social: 'Social',
 inbound_form: 'Inbound form',
 other: 'Other',
}

export default function AdminLeadsPage() {
 const [leads, setLeads] = useState<Lead[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [search, setSearch] = useState('')
 const [filter, setFilter] = useState<LeadStatus | 'all' | 'open'>('open')
 const [showAdd, setShowAdd] = useState(false)
 const [openLead, setOpenLead] = useState<Lead | null>(null)
 const [tableMissing, setTableMissing] = useState(false)
 const [callMode, setCallMode] = useState<{ ids: string[]; idx: number } | null>(null)
 const fileRef = useRef<HTMLInputElement>(null)

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/leads')
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) {
    if (/relation .*leads.* does not exist|Could not find the table/.test(json?.error || '')) {
     setTableMissing(true)
    }
    throw new Error(json?.error || `Failed (${res.status})`)
   }
   setLeads(json.leads || [])
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load leads')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const counts = useMemo(() => {
  const c: Record<string, number> = { all: leads.length, open: 0 }
  for (const s of STATUS_FLOW) c[s.id] = 0
  for (const l of leads) {
   c[l.status] = (c[l.status] || 0) + 1
   if (l.status !== 'closed_won' && l.status !== 'closed_lost') c.open++
  }
  return c
 }, [leads])

 const filtered = useMemo(() => {
  let list = leads
  if (filter !== 'all' && filter !== 'open') {
   list = list.filter((l) => l.status === filter)
  } else if (filter === 'open') {
   list = list.filter((l) => l.status !== 'closed_won' && l.status !== 'closed_lost')
  }
  const q = search.trim().toLowerCase()
  if (q) {
   list = list.filter((l) =>
    l.business_name?.toLowerCase().includes(q) ||
    l.contact_name?.toLowerCase().includes(q) ||
    l.phone?.toLowerCase().includes(q) ||
    l.email?.toLowerCase().includes(q),
   )
  }
  // Most-recently-touched first
  return [...list].sort((a, b) => {
   const aa = a.last_contacted_at || a.created_at
   const bb = b.last_contacted_at || b.created_at
   return new Date(bb).getTime() - new Date(aa).getTime()
  })
 }, [leads, search, filter])

 const onCsvSelected = async (file: File) => {
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) {
   alert('No rows parsed from that CSV. First row must be the header.')
   return
  }
  // Heuristic mapping of common column names
  const mapped = rows.map((r) => ({
   business_name: r.business_name || r.business || r.name || r.company || '',
   contact_name: r.contact_name || r.contact || r.owner || '',
   phone: r.phone || r.phone_number || '',
   email: r.email || '',
   source: r.source || 'cold_call',
   status: r.status || 'cold',
   notes: r.notes || '',
  })).filter((r) => r.business_name)

  if (mapped.length === 0) {
   alert('Couldn\'t find a "business_name" column. Add a header row with at least: business_name, phone, email.')
   return
  }
  if (!confirm(`Import ${mapped.length} lead${mapped.length === 1 ? '' : 's'}?`)) return

  try {
   const res = await fetchWithAuth('/api/admin/leads', {
    method: 'POST',
    body: JSON.stringify({ bulk: true, leads: mapped }),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || 'Import failed')
   await load()
   alert(`Imported ${json.inserted} lead${json.inserted === 1 ? '' : 's'}.`)
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Import failed')
  }
 }

 if (tableMissing) {
  return (
   <AdminShell activeLabel="Leads">
    <section className="px-4 lg:px-8 py-6 lg:py-10 max-w-3xl">
     <div className="mb-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
       Sales pipeline
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">Leads</h1>
     </div>
     <Panel>
      <div className="flex items-start gap-3">
       <WarningCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
       <div className="flex-1">
        <h3 className="text-sm font-medium text-white">Run the migration</h3>
        <p className="text-sm text-gray-400 mt-1.5">
         The <code className="font-mono text-xs bg-white/[0.04] px-1 rounded">leads</code> table doesn&apos;t exist yet. Paste this into the Supabase SQL editor:
        </p>
        <pre className="bg-[#0c0c10] border border-white/[0.06] rounded-xl p-3 text-xs text-gray-300 mt-3 overflow-x-auto font-mono">{`create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text,
  email text,
  source text not null default 'cold_call',
  status text not null default 'cold',
  notes text,
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  assigned_business_id uuid references public.businesses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_next_action_idx on public.leads (next_action_at);`}</pre>
        <div className="mt-3">
         <PrimaryButton onClick={load}>I ran it - reload</PrimaryButton>
        </div>
       </div>
      </div>
     </Panel>
    </section>
   </AdminShell>
  )
 }

 return (
  <AdminShell activeLabel="Leads">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        Sales pipeline
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        Leads
       </h1>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
       <input
        ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => {
         const f = e.target.files?.[0]
         if (f) onCsvSelected(f)
         if (fileRef.current) fileRef.current.value = ''
        }}
       />
       <GhostButton onClick={() => fileRef.current?.click()}>
        <Upload className="w-4 h-4" /> Import CSV
       </GhostButton>
       <GhostButton
        onClick={() => {
         const callable = filtered.filter((l) => l.phone)
         if (callable.length === 0) {
          alert('No leads with phone numbers in the current filter.')
          return
         }
         setCallMode({ ids: callable.map((l) => l.id), idx: 0 })
        }}
       >
        <PhoneCall className="w-4 h-4" /> Start calling
       </GhostButton>
       <PrimaryButton onClick={() => setShowAdd(!showAdd)}>
        <Plus className="w-4 h-4" /> {showAdd ? 'Close' : 'Add lead'}
       </PrimaryButton>
      </div>
     </div>

     {/* KPI strip */}
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatTile label="Open" value={counts.open || 0} accent />
      {STATUS_FLOW.map((s) => (
       <StatTile
        key={s.id}
        label={s.label}
        value={counts[s.id] || 0}
        tone={s.tone}
       />
      ))}
     </div>

     {/* Add form */}
     {showAdd && (
      <RisingFade>
       <Panel className="mb-3">
        <AddLeadForm
         onCreated={() => { setShowAdd(false); load() }}
         onCancel={() => setShowAdd(false)}
        />
       </Panel>
      </RisingFade>
     )}

     {/* Filter row */}
     <div className="flex items-center gap-2 flex-wrap mb-3">
      <FilterPill active={filter === 'open'} onClick={() => setFilter('open')}>
       Open <span className="ml-1 text-gray-500 font-mono">{counts.open || 0}</span>
      </FilterPill>
      <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
       All <span className="ml-1 text-gray-500 font-mono">{counts.all || 0}</span>
      </FilterPill>
      <span className="w-px h-4 bg-white/[0.08] mx-1" />
      {STATUS_FLOW.map((s) => (
       <FilterPill key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} tone={s.tone}>
        {s.label} <span className="ml-1 text-gray-500 font-mono">{counts[s.id] || 0}</span>
       </FilterPill>
      ))}
      <div className="ml-auto relative w-full sm:w-72">
       <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
       <Input
        type="search" placeholder="Search…"
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="pl-9"
       />
      </div>
     </div>

     {/* Table */}
     <Panel padding="none">
      {loading ? (
       <div className="px-6 py-16 flex items-center justify-center">
        <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      ) : error ? (
       <div className="px-6 py-12 flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load leads</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      ) : filtered.length === 0 ? (
       <div className="px-6 py-16 text-center text-sm text-gray-500">
        {search || filter !== 'open'
         ? 'No leads match this filter.'
         : 'No open leads. Add one or import your CSV.'}
       </div>
      ) : (
       <motion.ul
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.015, delayChildren: 0.05 } } }}
        className="divide-y divide-white/[0.04]"
       >
        {filtered.map((l) => (
         <motion.li
          key={l.id}
          variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
         >
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-white/[0.02] group transition-all duration-300 ease-out">
           <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TONE_CLASSES[STATUS_FLOW.find((s) => s.id === l.status)?.tone || 'gray'].dot}`} />
           <button
            onClick={() => setOpenLead(l)}
            className="flex-1 min-w-0 text-left lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center"
           >
            <div className="lg:col-span-3 min-w-0">
             <div className="text-sm font-medium text-white truncate">{l.business_name}</div>
             <div className="text-xs text-gray-500 truncate mt-0.5">{l.contact_name || '-'}</div>
            </div>
            <div className="lg:col-span-3 min-w-0 mt-1.5 lg:mt-0">
             {l.phone ? (
              <span className="text-sm font-mono text-gray-200 truncate block">{prettyPhone(l.phone)}</span>
             ) : (
              <span className="text-xs font-mono text-gray-600">no phone</span>
             )}
            </div>
            <div className="hidden lg:block lg:col-span-2"><LeadStatusPill status={l.status} /></div>
            <div className="hidden lg:block lg:col-span-2 text-[10px] font-mono uppercase tracking-wider text-gray-500">
             {SOURCE_LABELS[l.source]}
            </div>
            <div className="lg:col-span-2 text-right text-xs text-gray-500 mt-1.5 lg:mt-0 font-mono">
             {l.last_contacted_at ? relTime(l.last_contacted_at) : `added ${relTime(l.created_at)}`}
            </div>
           </button>
           {l.phone && (
            <a
             href={`tel:${digitsOnly(l.phone)}`}
             onClick={(e) => e.stopPropagation()}
             className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-300 hover:text-sky-200 transition-all duration-300 ease-out"
             aria-label={`Call ${l.business_name}`}
             title="Tap to call (Continuity from Mac)"
            >
             <PhoneCall className="w-4 h-4" />
            </a>
           )}
           <CaretRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out flex-shrink-0" />
          </div>
         </motion.li>
        ))}
       </motion.ul>
      )}
     </Panel>
    </div>
   </section>

   <AnimatePresence>
    {openLead && (
     <LeadDrawer
      key={openLead.id}
      lead={openLead}
      onClose={() => setOpenLead(null)}
      onSaved={(l) => {
       setLeads((cs) => cs.map((c) => c.id === l.id ? l : c))
       setOpenLead(l)
      }}
      onDeleted={(id) => {
       setLeads((cs) => cs.filter((c) => c.id !== id))
       setOpenLead(null)
      }}
     />
    )}
    {callMode && (
     <CallMode
      ids={callMode.ids}
      idx={callMode.idx}
      leads={leads}
      onClose={() => setCallMode(null)}
      onLeadUpdated={(l) => setLeads((cs) => cs.map((c) => c.id === l.id ? l : c))}
      onAdvance={() => setCallMode((m) => m ? {
       ...m,
       idx: m.idx + 1 >= m.ids.length ? m.idx : m.idx + 1,
      } : m)}
      onBack={() => setCallMode((m) => m ? { ...m, idx: Math.max(0, m.idx - 1) } : m)}
     />
    )}
   </AnimatePresence>
  </AdminShell>
 )
}

/* ---------------------------- Status pill ---------------------------- */

function LeadStatusPill({ status }: { status: LeadStatus }) {
 const meta = STATUS_FLOW.find((s) => s.id === status)
 const tone = TONE_CLASSES[meta?.tone || 'gray']
 return (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${tone.bg} ${tone.text} border ${tone.border}`}>
   <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
   {meta?.label || status}
  </span>
 )
}

/* ---------------------------- Filter pill --------------------------- */

function FilterPill({
 active, onClick, children, tone = 'gray',
}: {
 active: boolean
 onClick: () => void
 children: React.ReactNode
 tone?: string
}) {
 const t = TONE_CLASSES[tone] || TONE_CLASSES.gray
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

/* ---------------------------- Stat tile ----------------------------- */

function StatTile({
 label, value, accent = false, tone,
}: {
 label: string; value: number; accent?: boolean; tone?: string
}) {
 if (tone) {
  const t = TONE_CLASSES[tone] || TONE_CLASSES.gray
  return (
   <div className="bg-[#101015] border border-white/[0.06] rounded-2xl p-4">
    <div className="flex items-center gap-1.5 mb-2">
     <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
     <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">{label}</div>
    </div>
    <div className="font-mono font-medium tracking-tight tabular-nums text-2xl text-white">{value}</div>
   </div>
  )
 }
 return <Stat label={label} value={String(value)} accent={accent} />
}

/* ---------------------------- Add lead form ------------------------- */

function AddLeadForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
 const [submitting, setSubmitting] = useState(false)
 const [error, setError] = useState('')

 const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  setSubmitting(true); setError('')
  const fd = new FormData(form)
  const body = Object.fromEntries(fd.entries())
  try {
   const res = await fetchWithAuth('/api/admin/leads', {
    method: 'POST',
    body: JSON.stringify(body),
   })
   const data = await res.json().catch(() => ({}))
   if (!res.ok || !data.success) throw new Error(data?.error || 'Failed')
   form.reset()
   onCreated()
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed')
  } finally {
   setSubmitting(false)
  }
 }

 return (
  <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3">
   <FormField name="business_name" label="Business name" required placeholder="Mike's HVAC" />
   <FormField name="contact_name" label="Contact name" placeholder="Mike Rodriguez" />
   <FormField name="phone" label="Phone" placeholder="+1 (512) 555-1234" />
   <FormField name="email" label="Email" type="email" />
   <FormField
    name="source" label="Source" type="select"
    options={Object.entries(SOURCE_LABELS).map(([id, label]) => ({ id, label }))}
   />
   <FormField
    name="status" label="Status" type="select"
    options={STATUS_FLOW.map((s) => ({ id: s.id, label: s.label }))}
   />
   <div className="sm:col-span-2">
    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notes</label>
    <textarea
     name="notes" rows={2}
     className="w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm resize-none"
    />
   </div>
   {error && (
    <div className="sm:col-span-2 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
     <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
     <span>{error}</span>
    </div>
   )}
   <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
    <GhostButton onClick={onCancel}>Cancel</GhostButton>
    <PrimaryButton type="submit" loading={submitting}>{submitting ? 'Adding…' : 'Add lead'}</PrimaryButton>
   </div>
  </form>
 )
}

function FormField({
 name, label, type = 'text', required = false, placeholder, options,
}: {
 name: string; label: string; type?: string; required?: boolean
 placeholder?: string
 options?: { id: string; label: string }[]
}) {
 const id = `f-${name}`
 return (
  <div>
   <label htmlFor={id} className="text-xs font-medium text-gray-400 mb-1.5 block">
    {label}{required && <span className="text-gray-600"> *</span>}
   </label>
   {type === 'select' && options ? (
    <Select id={id} name={name} required={required} defaultValue="">
     {!required && <option value="">-</option>}
     {required && <option value="" disabled>Select…</option>}
     {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </Select>
   ) : (
    <Input id={id} name={name} type={type} required={required} placeholder={placeholder} />
   )}
  </div>
 )
}

/* ---------------------------- Lead drawer --------------------------- */

function LeadDrawer({
 lead, onClose, onSaved, onDeleted,
}: {
 lead: Lead
 onClose: () => void
 onSaved: (l: Lead) => void
 onDeleted: (id: string) => void
}) {
 const [notes, setNotes] = useState(lead.notes || '')
 const [busy, setBusy] = useState(false)
 const [savedFlag, setSavedFlag] = useState(false)
 const [error, setError] = useState('')

 useEffect(() => {
  setNotes(lead.notes || '')
 }, [lead.id, lead.notes])

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const patch = async (update: Partial<Lead>) => {
  setBusy(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/leads/${lead.id}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || 'Failed')
   onSaved(json.lead)
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2000)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setBusy(false)
  }
 }

 const onDelete = async () => {
  if (!confirm(`Delete "${lead.business_name}"? Cannot be undone.`)) return
  setBusy(true)
  try {
   const res = await fetchWithAuth(`/api/admin/leads/${lead.id}`, { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   onDeleted(lead.id)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
   setBusy(false)
  }
 }

 const meta = STATUS_FLOW.find((s) => s.id === lead.status)

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
     <div className="text-sm font-semibold text-white">Lead</div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
       <LeadStatusPill status={lead.status} />
       <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
        from {SOURCE_LABELS[lead.source]}
       </span>
      </div>
      <h2 className="text-2xl font-medium text-white">{lead.business_name}</h2>
      <div className="text-sm text-gray-400 mt-1">{lead.contact_name || '-'}</div>
     </div>

     <div className="border-t border-white/[0.06] pt-4 space-y-3 text-sm">
      {lead.phone ? (
       <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-gray-300 hover:text-white">
        <PhoneIcon className="w-4 h-4 text-gray-500" />
        <span className="font-mono">{lead.phone}</span>
       </a>
      ) : (
       <div className="flex items-center gap-2.5 text-gray-600">
        <PhoneIcon className="w-4 h-4" /><span className="font-mono">no phone</span>
       </div>
      )}
      {lead.email ? (
       <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-gray-300 hover:text-white">
        <Envelope className="w-4 h-4 text-gray-500" />
        <span>{lead.email}</span>
       </a>
      ) : (
       <div className="flex items-center gap-2.5 text-gray-600">
        <Envelope className="w-4 h-4" /><span>no email</span>
       </div>
      )}
     </div>

     {/* Status flow */}
     <div className="border-t border-white/[0.06] pt-4">
      <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">Move to status</h4>
      <div className="flex flex-wrap gap-2">
       {STATUS_FLOW.map((s) => (
        <button
         key={s.id}
         onClick={() => patch({ status: s.id })}
         disabled={busy || s.id === lead.status}
         className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ease-out border disabled:opacity-100 ${
          s.id === lead.status
           ? `${TONE_CLASSES[s.tone].bg} ${TONE_CLASSES[s.tone].text} ${TONE_CLASSES[s.tone].border} cursor-default`
           : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
         }`}
        >
         <span className={`w-1.5 h-1.5 rounded-full ${TONE_CLASSES[s.tone].dot}`} />
         {s.label}
        </button>
       ))}
      </div>
     </div>

     {/* Notes editor */}
     <div className="border-t border-white/[0.06] pt-4">
      <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Notes</h4>
      <textarea
       value={notes} onChange={(e) => setNotes(e.target.value)}
       rows={6} placeholder="What did you talk about? What's the next step?"
       className="w-full px-4 py-3 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm resize-none"
      />
      <div className="flex justify-end mt-2">
       <PrimaryButton
        onClick={() => patch({ notes })}
        loading={busy}
        disabled={notes === (lead.notes || '')}
       >
        Save notes
       </PrimaryButton>
      </div>
      {savedFlag && <p className="text-xs text-emerald-400 mt-2 text-right">Saved.</p>}
      {error && <p className="text-xs text-rose-400 mt-2 text-right">{error}</p>}
     </div>

     <div className="border-t border-white/[0.06] pt-4 text-[10px] font-mono text-gray-600 space-y-0.5">
      <div>added {fmtDateTime(lead.created_at)}</div>
      {lead.last_contacted_at && <div>last touched {fmtDateTime(lead.last_contacted_at)}</div>}
     </div>

     <div className="pt-2">
      <DangerButton onClick={onDelete} loading={busy}>
       <Trash className="w-4 h-4" /> Delete lead
      </DangerButton>
     </div>
    </div>
   </motion.aside>
  </motion.div>
 )
}

/* ------------------------------ helpers ------------------------------ */

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

function fmtDateTime(iso: string): string {
 const d = new Date(iso)
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
 })
}

/** Tiny CSV parser - handles quoted cells with embedded commas. */
function parseCsv(text: string): Record<string, string>[] {
 const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
 if (lines.length < 2) return []
 const parseLine = (line: string): string[] => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
   const c = line[i]
   if (c === '"') {
    if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
    else inQuotes = !inQuotes
   } else if (c === ',' && !inQuotes) {
    out.push(cur); cur = ''
   } else {
    cur += c
   }
  }
  out.push(cur)
  return out.map((s) => s.trim())
 }
 const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
 return lines.slice(1).map((line) => {
  const cells = parseLine(line)
  const row: Record<string, string> = {}
  headers.forEach((h, i) => { row[h] = cells[i] || '' })
  return row
 })
}

/* --------------------------- phone helpers --------------------------- */

function digitsOnly(p: string): string {
 return (p || '').replace(/[^0-9]/g, '')
}

function prettyPhone(p: string): string {
 const d = digitsOnly(p)
 if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
 if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
 return p
}

/* ----------------------------- Call mode ----------------------------- */

function CallMode({
 ids, idx, leads, onClose, onLeadUpdated, onAdvance, onBack,
}: {
 ids: string[]
 idx: number
 leads: Lead[]
 onClose: () => void
 onLeadUpdated: (l: Lead) => void
 onAdvance: () => void
 onBack: () => void
}) {
 const lead = useMemo(() => leads.find((l) => l.id === ids[idx]) || null, [ids, idx, leads])
 const [notes, setNotes] = useState(lead?.notes || '')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)
 const [copied, setCopied] = useState(false)

 useEffect(() => {
  setNotes(lead?.notes || '')
  setSavedFlag(false)
  setError('')
 }, [lead?.id, lead?.notes])

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
   if (e.key === 'Escape') onClose()
   else if (e.key === 'ArrowRight' || e.key === 'j') onAdvance()
   else if (e.key === 'ArrowLeft' || e.key === 'k') onBack()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose, onAdvance, onBack])

 const patch = async (update: Partial<Lead>): Promise<Lead | null> => {
  if (!lead) return null
  setBusy(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/leads/${lead.id}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
   })
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || 'Failed')
   onLeadUpdated(json.lead)
   return json.lead as Lead
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
   return null
  } finally {
   setBusy(false)
  }
 }

 const setStatusAndAdvance = async (status: LeadStatus) => {
  await patch({ status })
  setTimeout(onAdvance, 200)
 }

 const saveNotes = async () => {
  await patch({ notes })
  setSavedFlag(true)
  setTimeout(() => setSavedFlag(false), 2000)
 }

 const copyPhone = async () => {
  if (!lead?.phone) return
  try {
   await navigator.clipboard?.writeText(digitsOnly(lead.phone))
   setCopied(true)
   setTimeout(() => setCopied(false), 1500)
  } catch {}
 }

 if (!lead) {
  // Filter changed under us - bail out cleanly.
  return null
 }

 const meta = STATUS_FLOW.find((s) => s.id === lead.status)

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   transition={{ duration: 0.25, ease: EASE }}
   className="fixed inset-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
  >
   {/* Top bar */}
   <div className="absolute top-0 inset-x-0 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 border-b border-white/[0.06]">
    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
     Call mode · {idx + 1} of {ids.length}
    </div>
    <button
     onClick={onClose}
     className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors"
     aria-label="Exit call mode"
    >
     <X className="w-4 h-4 text-gray-400" />
    </button>
   </div>

   {/* Card */}
   <motion.div
    key={lead.id}
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: EASE }}
    className="w-full max-w-2xl bg-[#101015] border border-white/[0.08] rounded-3xl shadow-2xl p-6 sm:p-10 mt-12"
   >
    {/* Header */}
    <div className="flex items-center gap-2 flex-wrap mb-3">
     <LeadStatusPill status={lead.status} />
     <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
      from {SOURCE_LABELS[lead.source]}
     </span>
    </div>
    <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-white">
     {lead.business_name}
    </h2>
    {lead.contact_name && (
     <div className="text-base text-gray-400 mt-1">{lead.contact_name}</div>
    )}

    {/* Phone - the main affordance */}
    {lead.phone ? (
     <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <a
       href={`tel:${digitsOnly(lead.phone)}`}
       className="flex-1 inline-flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-400 text-white px-6 py-5 rounded-2xl font-mono text-2xl sm:text-3xl tracking-tight transition-all duration-300 ease-out shadow-[0_0_50px_-15px_rgba(56,189,248,0.6)]"
      >
       <PhoneCall className="w-6 h-6" />
       {prettyPhone(lead.phone)}
      </a>
      <button
       onClick={copyPhone}
       className="inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 px-4 py-3 rounded-2xl text-sm font-medium border border-white/[0.06] transition-all duration-300 ease-out"
      >
       <Copy className="w-4 h-4" />
       {copied ? 'Copied' : 'Copy'}
      </button>
     </div>
    ) : (
     <div className="mt-6 bg-amber-500/10 border border-amber-400/20 text-amber-200 rounded-xl px-4 py-3 text-sm">
      No phone number on this lead. Skip or add a number first.
     </div>
    )}

    {lead.email && (
     <a href={`mailto:${lead.email}`} className="mt-3 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
      <Envelope className="w-4 h-4" /> {lead.email}
     </a>
    )}

    {/* Status flow */}
    <div className="mt-6 border-t border-white/[0.06] pt-5">
     <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
      Set status (auto-advances)
     </h4>
     <div className="flex flex-wrap gap-2">
      {STATUS_FLOW.map((s) => (
       <button
        key={s.id}
        onClick={() => setStatusAndAdvance(s.id)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-300 ease-out border disabled:opacity-50 ${
         s.id === lead.status
          ? `${TONE_CLASSES[s.tone].bg} ${TONE_CLASSES[s.tone].text} ${TONE_CLASSES[s.tone].border}`
          : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
        }`}
       >
        <span className={`w-1.5 h-1.5 rounded-full ${TONE_CLASSES[s.tone].dot}`} />
        {s.label}
       </button>
      ))}
     </div>
    </div>

    {/* Notes */}
    <div className="mt-5">
     <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
      Notes for this call
     </h4>
     <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="What did they say? Next step?"
      rows={3}
      className="w-full px-4 py-3 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm resize-none"
     />
     <div className="flex items-center justify-between mt-2">
      <div className="text-xs text-gray-500">
       {savedFlag && <span className="text-emerald-400">Saved.</span>}
       {error && <span className="text-rose-400">{error}</span>}
      </div>
      <GhostButton onClick={saveNotes} disabled={busy || notes === (lead.notes || '')}>
       Save notes
      </GhostButton>
     </div>
    </div>

    {/* Footer nav */}
    <div className="mt-6 border-t border-white/[0.06] pt-5 flex items-center justify-between gap-3">
     <button
      onClick={onBack}
      disabled={idx === 0}
      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
     >
      ← Back
     </button>
     <div className="flex items-center gap-2">
      <GhostButton onClick={onAdvance} disabled={idx >= ids.length - 1}>
       <SkipForward className="w-4 h-4" /> Skip
      </GhostButton>
      <PrimaryButton
       onClick={onAdvance}
       disabled={idx >= ids.length - 1}
      >
       Next <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
     </div>
    </div>

    <div className="mt-4 text-[10px] font-mono uppercase tracking-wider text-gray-600 text-center">
     ← / → to navigate · Esc to exit
    </div>
   </motion.div>
  </motion.div>
 )
}
