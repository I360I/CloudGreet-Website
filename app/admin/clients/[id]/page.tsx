'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
 ArrowLeft, Loader2, AlertCircle, Trash2, Mail, Phone as PhoneIcon,
 MapPin, Globe, ExternalLink, Bot, X, Play, ChevronRight, Save,
 KeyRound, CheckCircle2, Pencil, Pause, RotateCcw, Unlink,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import {
 Panel, PanelHeader, Stat, StatusPill, GhostButton, DangerButton, PrimaryButton,
 Input, Select, Sparkline, RisingFade,
} from '../../_components/ui'

const EASE = [0.22, 1, 0.36, 1] as const

type ClientDetail = {
 client: {
  id: string
  business_name: string
  business_type?: string | null
  email: string
  phone_number?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  website?: string | null
  subscription_status?: string | null
  account_status?: string | null
  onboarding_completed?: boolean
  calcom_connected?: boolean
  forwarding_verified_at?: string | null
  cal_com_username?: string | null
  cal_com_event_type_slug?: string | null
  created_at?: string
  owner?: {
   id: string
   email: string
   name?: string | null
   phone?: string | null
   created_at?: string
   last_login?: string | null
  } | null
 }
 activity: {
  calls: {
   total: number
   answered: number
   missed: number
   recent: Array<{
    id: string
    call_id?: string
    from_number: string
    duration?: number | null
    status: string
    transcript?: string | null
    recording_url?: string | null
    created_at: string
    caller_name?: string | null
   }>
  }
  appointments: {
   total: number
   completed: number
   recent: Array<{
    id: string
    customer_name: string
    customer_phone?: string | null
    service_type?: string | null
    scheduled_date: string
    status: string
    estimated_value?: number | null
    actual_value?: number | null
   }>
  }
  revenue: { total: number }
 }
 aiAgent?: {
  id: string
  agent_name?: string | null
  status?: string | null
  retell_agent_id?: string | null
  phone_number?: string | null
 } | null
}

export default function ClientDetailPage() {
 const params = useParams<{ id: string }>()
 const router = useRouter()
 const id = params?.id

 const [data, setData] = useState<ClientDetail | null>(null)
 const [warnings, setWarnings] = useState<string[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [openCall, setOpenCall] = useState<ClientDetail['activity']['calls']['recent'][number] | null>(null)
 const [tempPassword, setTempPassword] = useState<string | null>(null)

 const load = async () => {
  if (!id) return
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}`)
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setData(json)
   setWarnings(Array.isArray(json.warnings) ? json.warnings : [])
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load client')
  } finally {
   setLoading(false)
  }
 }

 const patch = async (updates: Record<string, any>) => {
  const res = await fetchWithAuth(`/api/admin/clients/${id}`, {
   method: 'PATCH',
   body: JSON.stringify(updates),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.success) throw new Error(j?.error || 'Update failed')
  // Refresh from the server so all derived UI is consistent.
  await load()
  return j.client
 }

 const resetPassword = async () => {
  if (!confirm('Generate a new temporary password for this client? The current one becomes invalid immediately.')) return
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}/reset-password`, { method: 'POST' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Reset failed')
   setTempPassword(j.password)
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Reset failed')
  }
 }

 useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id])

 const onDelete = async () => {
  if (!data) return
  if (!confirm(`Delete "${data.client.business_name}"? This permanently removes the business, owner login, and all calls/appointments. Cannot be undone.`)) return
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}`, { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.detail || j?.error || `Delete failed (${res.status})`)
   router.replace('/admin')
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Delete failed')
  }
 }

 if (loading) {
  return (
   <AdminShell activeLabel="Overview">
    <div className="px-4 lg:px-8 py-10 flex items-center justify-center">
     <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
    </div>
   </AdminShell>
  )
 }

 if (error || !data) {
  return (
   <AdminShell activeLabel="Overview">
    <div className="px-4 lg:px-8 py-10 max-w-3xl">
     <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6">
      <ArrowLeft className="w-4 h-4" /> Back to overview
     </Link>
     <Panel>
      <div className="flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
       <div>
        <h3 className="text-sm font-medium text-white">Couldn&apos;t load client</h3>
        <p className="text-sm text-gray-500 mt-1">{error || 'Client not found.'}</p>
       </div>
      </div>
     </Panel>
    </div>
   </AdminShell>
  )
 }

 const { client, activity, aiAgent } = data
 const callTotal = activity.calls.total
 const apptTotal = activity.appointments.total
 const callAnswerRate = callTotal > 0 ? Math.round((activity.calls.answered / callTotal) * 100) : 0
 const apptCompleteRate = apptTotal > 0 ? Math.round((activity.appointments.completed / apptTotal) * 100) : 0

 return (
  <AdminShell activeLabel="Overview">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-7xl">
     {/* Back link */}
     <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300 transition-colors mb-4">
      <ArrowLeft className="w-3.5 h-3.5" /> Overview
     </Link>

     {/* Header */}
     <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
      <div className="flex-1 min-w-0">
       <div className="flex items-center gap-2.5 mb-2 flex-wrap">
        <StatusPill status={client.subscription_status || client.account_status || 'pending'} />
        {!client.onboarding_completed && (
         <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
          setup incomplete
         </span>
        )}
        {client.calcom_connected && (
         <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 bg-sky-400/10 border border-sky-400/20 rounded-full px-2 py-0.5">
          cal.com connected
         </span>
        )}
        {client.forwarding_verified_at && (
         <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
          forwarding live
         </span>
        )}
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white truncate">
        {client.business_name}
       </h1>
       <div className="text-sm text-gray-500 mt-1.5 font-mono">
        {client.business_type || '—'}
        {client.created_at && <> · created {fmtDate(client.created_at)}</>}
       </div>
      </div>
      <div className="flex items-center gap-2">
       <DangerButton onClick={onDelete}>
        <Trash2 className="w-4 h-4" /> Delete client
       </DangerButton>
      </div>
     </div>

     {/* KPI strip */}
     <motion.div
      initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
     >
      {[
       { label: 'Total calls', value: callTotal.toLocaleString(),
        sub: callTotal > 0 ? `${callAnswerRate}% answered` : 'No call activity', accent: false },
       { label: 'Appointments', value: apptTotal.toLocaleString(),
        sub: apptTotal > 0 ? `${apptCompleteRate}% completed` : '—', accent: true },
       { label: 'Estimated revenue', value: fmtCurrency(activity.revenue.total),
        sub: 'From recorded values', accent: false },
       { label: 'Missed calls', value: activity.calls.missed.toLocaleString(),
        sub: callTotal > 0 ? `${Math.round((activity.calls.missed / callTotal) * 100)}% of total` : '—', accent: false },
      ].map((k) => (
       <motion.div
        key={k.label}
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
       >
        <Stat label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
       </motion.div>
      ))}
     </motion.div>

     {warnings.length > 0 && (
      <RisingFade>
       <div className="mb-3 bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-sm text-amber-200 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
         <span className="font-medium">Loaded with warnings.</span>
         <ul className="mt-1 space-y-0.5 text-xs text-amber-200/80 font-mono">
          {warnings.map((w, i) => <li key={i}>· {w}</li>)}
         </ul>
        </div>
       </div>
      </RisingFade>
     )}

     {/* Admin actions */}
     <RisingFade>
      <AdminActions
       client={client}
       onPatch={patch}
       onResetPassword={resetPassword}
      />
     </RisingFade>

     {/* Two-column: calls + appointments */}
     <div className="grid lg:grid-cols-2 gap-3 mb-3 mt-3">
      <RisingFade>
       <RecentCalls calls={activity.calls.recent} onOpen={(c) => setOpenCall(c)} />
      </RisingFade>
      <RisingFade delay={0.05}>
       <RecentAppointments appts={activity.appointments.recent} />
      </RisingFade>
     </div>

     {/* Two-column: owner + agent */}
     <div className="grid lg:grid-cols-2 gap-3 mb-3">
      <RisingFade delay={0.1}>
       <OwnerCard client={client} />
      </RisingFade>
      <RisingFade delay={0.15}>
       <AgentCard aiAgent={aiAgent} client={client} />
      </RisingFade>
     </div>

     {/* Address row */}
     <RisingFade delay={0.2}>
      <Panel>
       <PanelHeader title="Address" eyebrow="Location" />
       <div className="text-sm text-gray-300 inline-flex items-start gap-2">
        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <span>
         {[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ') || '—'}
        </span>
       </div>
      </Panel>
     </RisingFade>
    </div>
   </section>

   {/* Call detail drawer */}
   <AnimatePresence>
    {openCall && <CallDrawer call={openCall} onClose={() => setOpenCall(null)} />}
    {tempPassword && (
     <TempPasswordModal
      password={tempPassword}
      ownerEmail={data.client.owner?.email || null}
      onClose={() => setTempPassword(null)}
     />
    )}
   </AnimatePresence>
  </AdminShell>
 )
}

/* ----------------------------- Recent calls ---------------------------- */

function RecentCalls({
 calls, onOpen,
}: {
 calls: ClientDetail['activity']['calls']['recent']
 onOpen: (c: ClientDetail['activity']['calls']['recent'][number]) => void
}) {
 return (
  <Panel padding="none">
   <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
    <PanelHeader title="Recent calls" eyebrow={`${calls.length} shown`} />
   </div>
   {calls.length === 0 ? (
    <div className="px-6 py-10 text-sm text-gray-500">No calls yet.</div>
   ) : (
    <ul className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
     {calls.map((c) => (
      <li key={c.id}>
       <button
        onClick={() => onOpen(c)}
        className="w-full text-left px-5 sm:px-6 py-3.5 hover:bg-white/[0.02] transition-all duration-300 ease-out flex items-center gap-3 group"
       >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
         c.status === 'answered' || c.status === 'completed'
          ? 'bg-emerald-400'
          : c.status === 'missed' || c.status === 'failed'
           ? 'bg-rose-400'
           : 'bg-gray-500'
        }`} />
        <div className="flex-1 min-w-0">
         <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-gray-100 truncate">
           {c.caller_name || c.from_number || 'Unknown'}
          </span>
          <span className="text-xs text-gray-500 font-mono flex-shrink-0">{relTime(c.created_at)}</span>
         </div>
         <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">
          {c.from_number} · {fmtDur(c.duration ?? 0)}
         </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
       </button>
      </li>
     ))}
    </ul>
   )}
  </Panel>
 )
}

function CallDrawer({
 call, onClose,
}: {
 call: ClientDetail['activity']['calls']['recent'][number]
 onClose: () => void
}) {
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
      <div className="text-sm font-semibold text-white">{call.caller_name || call.from_number || 'Unknown caller'}</div>
      <div className="text-xs text-gray-500 font-mono">{fmtDateTime(call.created_at)} · {fmtDur(call.duration ?? 0)}</div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
      status: <span className="text-gray-300">{call.status}</span>
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

/* -------------------------- Recent appointments ------------------------- */

function RecentAppointments({ appts }: { appts: ClientDetail['activity']['appointments']['recent'] }) {
 return (
  <Panel padding="none">
   <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
    <PanelHeader title="Recent appointments" eyebrow={`${appts.length} shown`} />
   </div>
   {appts.length === 0 ? (
    <div className="px-6 py-10 text-sm text-gray-500">No appointments yet.</div>
   ) : (
    <ul className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
     {appts.map((a) => (
      <li key={a.id} className="px-5 sm:px-6 py-3.5">
       <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span className="text-sm font-medium text-gray-100 truncate">{a.customer_name}</span>
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">{fmtDate(a.scheduled_date)}</span>
       </div>
       <div className="flex items-center gap-2 text-xs text-gray-500">
        <StatusPill status={a.status} />
        {a.service_type && <span className="truncate">· {a.service_type}</span>}
        {(a.actual_value || a.estimated_value) ? (
         <span className="ml-auto font-mono text-gray-300">{fmtCurrency((a.actual_value ?? a.estimated_value) as number)}</span>
        ) : null}
       </div>
      </li>
     ))}
    </ul>
   )}
  </Panel>
 )
}

/* --------------------------------- Owner -------------------------------- */

function OwnerCard({ client }: { client: ClientDetail['client'] }) {
 const o = client.owner
 return (
  <Panel>
   <PanelHeader title="Owner" eyebrow="Account contact" />
   {o ? (
    <ul className="space-y-3 text-sm">
     <li className="flex items-start gap-2.5 text-gray-300">
      <Mail className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
      <a href={`mailto:${o.email}`} className="hover:text-white truncate">{o.email}</a>
     </li>
     {o.phone && (
      <li className="flex items-start gap-2.5 text-gray-300">
       <PhoneIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
       <a href={`tel:${o.phone}`} className="hover:text-white font-mono">{o.phone}</a>
      </li>
     )}
     {client.website && (
      <li className="flex items-start gap-2.5 text-gray-300">
       <Globe className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
       <a href={client.website} target="_blank" rel="noreferrer" className="hover:text-white truncate inline-flex items-center gap-1">
        {client.website} <ExternalLink className="w-3 h-3" />
       </a>
      </li>
     )}
     {o.last_login && (
      <li className="text-xs text-gray-500">Last login {relTime(o.last_login)}</li>
     )}
    </ul>
   ) : (
    <p className="text-sm text-gray-500">No owner record found.</p>
   )}
  </Panel>
 )
}

/* --------------------------------- Agent ------------------------------- */

function AgentCard({
 aiAgent, client,
}: {
 aiAgent: ClientDetail['aiAgent']
 client: ClientDetail['client']
}) {
 return (
  <Panel>
   <PanelHeader title="AI agent" eyebrow="Retell" />
   {aiAgent ? (
    <div className="space-y-3 text-sm">
     <div className="inline-flex items-center gap-2 text-gray-300">
      <Bot className="w-4 h-4 text-sky-400" />
      <span className="font-medium">{aiAgent.agent_name || 'Agent'}</span>
      {aiAgent.status && <StatusPill status={aiAgent.status} />}
     </div>
     {aiAgent.phone_number && (
      <div className="text-gray-300 inline-flex items-center gap-2">
       <PhoneIcon className="w-4 h-4 text-gray-500" />
       <span className="font-mono">{aiAgent.phone_number}</span>
      </div>
     )}
     {aiAgent.retell_agent_id && (
      <div className="text-xs text-gray-500 font-mono break-all">retell agent: {aiAgent.retell_agent_id}</div>
     )}
     {client.cal_com_username && (
      <div className="pt-3 border-t border-white/[0.06] text-xs text-gray-500">
       Cal.com: <a href={`https://cal.com/${client.cal_com_username}/${client.cal_com_event_type_slug || ''}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
        @{client.cal_com_username}{client.cal_com_event_type_slug ? `/${client.cal_com_event_type_slug}` : ''} <ExternalLink className="w-3 h-3" />
       </a>
      </div>
     )}
    </div>
   ) : (
    <p className="text-sm text-gray-500">No agent provisioned for this client yet.</p>
   )}
  </Panel>
 )
}

/* ------------------------------- helpers ------------------------------- */

function fmtCurrency(n: number) {
 if (!n) return '$0'
 return `$${(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDur(sec: number) {
 if (!sec) return '0s'
 const m = Math.floor(sec / 60)
 const s = sec % 60
 return m > 0 ? `${m}m ${s}s` : `${s}s`
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

function fmtDate(iso: string): string {
 const d = new Date(iso)
 const sameYear = d.getFullYear() === new Date().getFullYear()
 return d.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  ...(sameYear ? {} : { year: 'numeric' }),
 })
}

function fmtDateTime(iso: string): string {
 const d = new Date(iso)
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
 })
}

/* --------------------------- Admin actions --------------------------- */

const SUBSCRIPTION_OPTIONS = ['active', 'trialing', 'past_due', 'paused', 'cancelled', 'inactive'] as const
const ACCOUNT_OPTIONS = ['active', 'paused', 'cancelled', 'pending'] as const

function AdminActions({
 client, onPatch, onResetPassword,
}: {
 client: ClientDetail['client']
 onPatch: (updates: Record<string, any>) => Promise<any>
 onResetPassword: () => Promise<void>
}) {
 const [busy, setBusy] = useState<string | null>(null)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState<string | null>(null)

 // local edit state for inline name field
 const [name, setName] = useState(client.business_name)
 const [editName, setEditName] = useState(false)

 useEffect(() => { setName(client.business_name); setEditName(false) }, [client.business_name])

 const run = async (key: string, fn: () => Promise<void>) => {
  setBusy(key); setError(''); setSavedFlag(null)
  try {
   await fn()
   setSavedFlag(key)
   setTimeout(() => setSavedFlag(null), 2000)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setBusy(null)
  }
 }

 const setSubscription = (status: string) =>
  run(`sub:${status}`, async () => { await onPatch({ subscription_status: status }) })

 const toggleOnboarding = () =>
  run('onboarding', async () => { await onPatch({ onboarding_completed: !client.onboarding_completed }) })

 const disconnectCalcom = () =>
  run('calcom', async () => {
   if (!confirm('Disconnect Cal.com? This clears the API key + webhook from this client; they\'ll need to reconnect to take bookings.')) {
    throw new Error('cancelled')
   }
   const res = await fetchWithAuth('/api/onboarding/calcom', { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   await onPatch({}) // triggers a fresh load via the parent
  })

 const saveName = () =>
  run('name', async () => {
   const trimmed = name.trim()
   if (!trimmed || trimmed === client.business_name) return
   await onPatch({ business_name: trimmed })
   setEditName(false)
  })

 return (
  <Panel>
   <PanelHeader title="Admin actions" eyebrow="Manage" />
   <div className="space-y-4">
    {/* Business name inline edit */}
    <div className="flex items-center gap-3 flex-wrap">
     <div className="flex-1 min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Business name</div>
      {editName ? (
       <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <PrimaryButton onClick={saveName} loading={busy === 'name'}>
         <Save className="w-4 h-4" /> Save
        </PrimaryButton>
        <GhostButton onClick={() => { setName(client.business_name); setEditName(false) }}>
         Cancel
        </GhostButton>
       </div>
      ) : (
       <div className="flex items-center gap-2">
        <span className="text-sm text-white font-medium">{client.business_name}</span>
        <button
         onClick={() => setEditName(true)}
         className="text-gray-500 hover:text-white transition-colors"
         aria-label="Edit business name"
        >
         <Pencil className="w-3.5 h-3.5" />
        </button>
       </div>
      )}
     </div>
    </div>

    {/* Subscription status row */}
    <div>
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Subscription status</div>
     <div className="flex flex-wrap gap-2">
      {SUBSCRIPTION_OPTIONS.map((s) => {
       const active = (client.subscription_status || 'inactive') === s
       return (
        <button
         key={s}
         onClick={() => setSubscription(s)}
         disabled={busy === `sub:${s}` || active}
         className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-300 ease-out ${
          active
           ? 'bg-sky-400/10 text-sky-300 border-sky-400/20'
           : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
         }`}
        >
         {s === 'paused' ? <Pause className="w-3 h-3 inline mr-1" /> : null}
         {s}
        </button>
       )
      })}
     </div>
    </div>

    {/* Other actions */}
    <div className="border-t border-white/[0.06] pt-4 flex flex-wrap items-center gap-2">
     <GhostButton onClick={onResetPassword} disabled={!client.owner}>
      <KeyRound className="w-4 h-4" /> Reset password
     </GhostButton>
     <GhostButton onClick={toggleOnboarding} disabled={busy === 'onboarding'}>
      <RotateCcw className="w-4 h-4" />
      {client.onboarding_completed ? 'Re-open onboarding' : 'Mark onboarding done'}
     </GhostButton>
     {client.calcom_connected && (
      <GhostButton onClick={disconnectCalcom} disabled={busy === 'calcom'}>
       <Unlink className="w-4 h-4" /> Disconnect Cal.com
      </GhostButton>
     )}
    </div>

    {savedFlag && (
     <div className="text-xs text-emerald-400 flex items-center gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5" /> Saved.
     </div>
    )}
    {error && error !== 'cancelled' && (
     <div className="text-xs text-rose-400 flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" /> {error}
     </div>
    )}
   </div>
  </Panel>
 )
}

/* --------------------------- Temp password modal --------------------------- */

function TempPasswordModal({
 password, ownerEmail, onClose,
}: {
 password: string
 ownerEmail: string | null
 onClose: () => void
}) {
 const [copied, setCopied] = useState(false)

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const copy = async () => {
  try {
   await navigator.clipboard?.writeText(password)
   setCopied(true)
   setTimeout(() => setCopied(false), 1500)
  } catch {}
 }

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   transition={{ duration: 0.25, ease: EASE }}
   className="fixed inset-0 z-50 flex items-center justify-center px-4"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
   <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
    transition={{ duration: 0.3, ease: EASE }}
    className="relative bg-[#0c0c10] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md"
   >
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
     <div className="text-sm font-semibold text-white inline-flex items-center gap-2">
      <KeyRound className="w-4 h-4 text-sky-400" /> Temporary password
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>
    <div className="px-6 py-5 space-y-4">
     <p className="text-sm text-gray-400">
      Shown <span className="font-medium text-amber-300">once</span>. Copy it now and send it to the client securely (Signal, in-person). The hash is stored on the user; the plaintext is not.
     </p>
     {ownerEmail && (
      <div className="text-xs font-mono text-gray-500">For: <span className="text-gray-300">{ownerEmail}</span></div>
     )}
     <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-lg text-white tracking-wide select-all break-all">
      {password}
     </div>
     <div className="flex items-center justify-end gap-2">
      <GhostButton onClick={onClose}>Done</GhostButton>
      <PrimaryButton onClick={copy}>
       <CheckCircle2 className="w-4 h-4" /> {copied ? 'Copied' : 'Copy'}
      </PrimaryButton>
     </div>
    </div>
   </motion.div>
  </motion.div>
 )
}
