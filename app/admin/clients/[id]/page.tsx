'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CircleNotch, WarningCircle, Trash, Envelope, Phone as PhoneIcon, MapPin, Globe, ArrowSquareOut, Robot, X, Play, CaretRight, FloppyDisk, Key, CheckCircle, Pencil, Pause, ArrowCounterClockwise, LinkBreak, CreditCard, Copy } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import {
 Panel, PanelHeader, Stat, StatusPill, GhostButton, DangerButton, PrimaryButton,
 Input, Select, Sparkline, RisingFade,
} from '../../_components/ui'
import { ProgressRing } from '../../_components/charts'

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
  cal_com_webhook_id?: string | null
  cal_com_event_type_slug?: string | null
  greeting_message?: string | null
  voice_id?: string | null
  created_at?: string
  rep_id?: string | null
  monthly_price_cents?: number | null
  setup_fee_cents?: number | null
  assigned_rep?: {
   id: string
   name: string | null
   email: string | null
  } | null
  owner?: {
   id: string
   email: string
   name?: string | null
   first_name?: string | null
   last_name?: string | null
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
    call_extractions?: Record<string, any> | null
    call_summary?: string | null
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
 retellPhone?: string | null
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
 const [checkoutOpen, setCheckoutOpen] = useState(false)

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

 const resetPassword = async (customPassword?: string) => {
  // No confirm() prompt when a custom password is supplied - the user
  // already typed it and pressed save. Random-generate path keeps the
  // confirm so a misclick doesn't invalidate the live password.
  if (!customPassword && !confirm('Generate a new random password for this client? The current one becomes invalid immediately.')) return
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${id}/reset-password`, {
    method: 'POST',
    body: customPassword ? JSON.stringify({ password: customPassword }) : undefined,
   })
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
  if (!confirm(`Delete "${data.client.business_name}"? This permanently removes the business, owner login, and all calls/bookings. Cannot be undone.`)) return
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
     <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
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
       <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
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
        {client.business_type || '-'}
        {client.created_at && <> · created {fmtDate(client.created_at)}</>}
       </div>
      </div>
      <div className="flex items-center gap-2">
       <StripeSyncButton clientId={id} onSynced={load} />
       <DangerButton onClick={onDelete}>
        <Trash className="w-4 h-4" /> Delete client
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
       { label: 'Bookings', value: apptTotal.toLocaleString(),
        sub: apptTotal > 0 ? `${apptCompleteRate}% completed` : '-', accent: true },
       { label: 'Estimated revenue', value: fmtCurrency(activity.revenue.total),
        sub: 'From recorded values', accent: false },
       { label: 'Missed calls', value: activity.calls.missed.toLocaleString(),
        sub: callTotal > 0 ? `${Math.round((activity.calls.missed / callTotal) * 100)}% of total` : '-', accent: false },
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
        <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
       onSendCheckout={() => setCheckoutOpen(true)}
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
       <OwnerCard client={client} clientId={id} onSaved={load} />
      </RisingFade>
      <RisingFade delay={0.15}>
       <AgentCard
        aiAgent={aiAgent}
        client={client}
        retellPhone={(data?.retellPhone as string | null) ?? aiAgent?.phone_number ?? null}
        clientId={id}
        onPhoneSaved={load}
       />
      </RisingFade>
     </div>

     {/* Sales rep assignment */}
     <RisingFade delay={0.17}>
      <SalesRepAssignmentCard client={client} clientId={id} onSaved={load} />
     </RisingFade>

     {/* SMS booking number management */}
     <RisingFade delay={0.175}>
      <SmsBookingCard clientId={id} />
     </RisingFade>

     {/* AI tuning */}
     <RisingFade delay={0.18}>
      <AgentTuning client={client} hasAgent={!!aiAgent?.retell_agent_id} onPatch={patch} />
     </RisingFade>

     {/* Knowledge base view - read-only mirror of whatever the
         operator has curated in Retell for this client's agent. */}
     <RisingFade delay={0.19}>
      <KnowledgeBaseCard clientId={id} hasAgent={!!aiAgent?.retell_agent_id} />
     </RisingFade>

     {/* Cost to serve vs revenue (margin) */}
     <RisingFade delay={0.195}>
      <CostMarginCard clientId={id} />
     </RisingFade>


     {/* Address row */}
     <RisingFade delay={0.2}>
      <Panel>
       <PanelHeader title="Address" eyebrow="Location" />
       <div className="text-sm text-gray-300 inline-flex items-start gap-2">
        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <span>
         {[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ') || '-'}
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
    {checkoutOpen && (
     <CheckoutLinkModal
      clientId={id!}
      businessName={data.client.business_name}
      onClose={() => setCheckoutOpen(false)}
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
        <CaretRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
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

     {call.call_extractions && Object.keys(call.call_extractions).length > 0 && (
      <ExtractionsPanel data={call.call_extractions} />
     )}

     {call.call_summary && (
      <div>
       <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Summary</h4>
       <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
        {call.call_summary}
       </div>
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

function ExtractionsPanel({ data }: { data: Record<string, any> }) {
 const entries = Object.entries(data).filter(([k]) => k && !k.startsWith('_'))
 if (entries.length === 0) return null
 return (
  <div>
   <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Captured from call</h4>
   <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
    {entries.map(([k, v]) => (
     <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mt-0.5">
       {k.replace(/_/g, ' ')}
      </span>
      <span className="text-sm text-gray-200 text-right break-words flex-1">
       {formatExtractionValue(v)}
      </span>
     </div>
    ))}
   </div>
  </div>
 )
}

function formatExtractionValue(v: any): string {
 if (v === null || v === undefined || v === '') return '-'
 if (typeof v === 'boolean') return v ? 'Yes' : 'No'
 if (typeof v === 'number') return v.toLocaleString()
 if (typeof v === 'string') return v
 try { return JSON.stringify(v) } catch { return String(v) }
}

/* -------------------------- Recent appointments ------------------------- */

function RecentAppointments({ appts }: { appts: ClientDetail['activity']['appointments']['recent'] }) {
 return (
  <Panel padding="none">
   <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
    <PanelHeader title="Recent bookings" eyebrow={`${appts.length} shown`} />
   </div>
   {appts.length === 0 ? (
    <div className="px-6 py-10 text-sm text-gray-500">No bookings yet.</div>
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

function OwnerCard({
 client, clientId, onSaved,
}: {
 client: ClientDetail['client']
 clientId: string
 onSaved: () => void
}) {
 const o = client.owner
 const [editing, setEditing] = useState(false)
 const [first, setFirst] = useState('')
 const [last, setLast] = useState('')
 const [phone, setPhone] = useState('')
 const [email, setEmail] = useState('')
 const [originalEmail, setOriginalEmail] = useState('')
 const [saving, setSaving] = useState(false)
 const [err, setErr] = useState('')

 useEffect(() => {
  const name = (o as any)?.name || ''
  const parts = name ? name.split(/\s+/) : []
  setFirst((o as any)?.first_name ?? parts[0] ?? '')
  setLast((o as any)?.last_name ?? parts.slice(1).join(' ') ?? '')
  setPhone(o?.phone ?? '')
  setEmail(o?.email ?? '')
  setOriginalEmail(o?.email ?? '')
 }, [o])

 const save = async () => {
  setSaving(true); setErr('')
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/owner`, {
    method: 'PATCH',
    body: JSON.stringify({
     first_name: first.trim(),
     last_name: last.trim(),
     phone: phone.trim() || null,
    }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')

   // Email is a login identifier, persisted via a separate endpoint
   // so the regular owner-edit flow can keep its tighter validation
   // semantics. Only fire if it actually changed.
   const nextEmail = email.trim().toLowerCase()
   if (nextEmail && nextEmail !== (originalEmail || '').toLowerCase()) {
    if (!window.confirm(`Change owner's login email to ${nextEmail}? They'll use this to log in going forward.`)) {
     setSaving(false)
     return
    }
    const er = await fetchWithAuth(`/api/admin/clients/${clientId}/owner-email`, {
     method: 'PATCH',
     body: JSON.stringify({ email: nextEmail }),
    })
    const ej = await er.json().catch(() => ({}))
    if (!er.ok || !ej.success) throw new Error(ej?.error || 'Email update failed')
   }

   setEditing(false)
   onSaved()
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 return (
  <Panel>
   <PanelHeader
    title="Owner"
    eyebrow="Account contact"
    trailing={o && !editing ? (
     <button
      onClick={() => setEditing(true)}
      className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
     >
      edit
     </button>
    ) : null}
   />
   {!o ? (
    <p className="text-sm text-gray-500">No owner record found.</p>
   ) : editing ? (
    <div className="space-y-2">
     <div className="grid grid-cols-2 gap-2">
      <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" />
      <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" />
     </div>
     <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
     <Input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Login email"
     />
     <div className="flex items-center gap-2">
      <PrimaryButton onClick={save} disabled={saving}>
       {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
       Save
      </PrimaryButton>
      <GhostButton onClick={() => { setEditing(false); setErr('') }}>Cancel</GhostButton>
      {err && <span className="text-xs text-rose-300">{err}</span>}
     </div>
     <p className="text-[10px] text-gray-500">
      Email is the owner&apos;s login. Changing it asks for confirmation and updates how they sign in. Name/phone updates also refresh the agent&apos;s knowledge base.
     </p>
    </div>
   ) : (
    <ul className="space-y-3 text-sm">
     {(o as any)?.name && (
      <li className="text-sm font-medium text-gray-200">{(o as any).name}</li>
     )}
     <li className="flex items-start gap-2.5 text-gray-300">
      <Envelope className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
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
        {client.website} <ArrowSquareOut className="w-3 h-3" />
       </a>
      </li>
     )}
     {o.last_login && (
      <li className="text-xs text-gray-500">Last login {relTime(o.last_login)}</li>
     )}
    </ul>
   )}
  </Panel>
 )
}

/* --------------------------------- Agent ------------------------------- */

function AgentCard({
 aiAgent, client, retellPhone, clientId, onPhoneSaved,
}: {
 aiAgent: ClientDetail['aiAgent']
 client: ClientDetail['client']
 retellPhone: string | null
 clientId: string
 onPhoneSaved: () => void
}) {
 const [editingPhone, setEditingPhone] = useState(false)
 const [phoneInput, setPhoneInput] = useState(retellPhone || '')
 const [savingPhone, setSavingPhone] = useState(false)
 const [phoneErr, setPhoneErr] = useState('')

 const currentAgentId = aiAgent?.retell_agent_id || ''
 const [editingAgent, setEditingAgent] = useState(false)
 const [agentInput, setAgentInput] = useState(currentAgentId)
 const [savingAgent, setSavingAgent] = useState(false)
 const [agentErr, setAgentErr] = useState('')

 useEffect(() => { setPhoneInput(retellPhone || '') }, [retellPhone])
 useEffect(() => { setAgentInput(currentAgentId) }, [currentAgentId])

 const savePhone = async () => {
  setSavingPhone(true); setPhoneErr('')
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/retell-phone`, {
    method: 'PUT',
    body: JSON.stringify({ phone: phoneInput.trim() || null }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
   setEditingPhone(false)
   onPhoneSaved()
  } catch (e) {
   setPhoneErr(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSavingPhone(false)
  }
 }

 const saveAgent = async () => {
  setSavingAgent(true); setAgentErr('')
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/retell-agent`, {
    method: 'PUT',
    body: JSON.stringify({ agentId: agentInput.trim() || null }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
   // The link succeeded; surface the tool-wire result so a silent failure
   // there (which leaves the agent with NO tools and is why a test call
   // hallucinates instead of booking) doesn't get hidden behind a green
   // "saved" toast. toolsError comes back even on a successful link.
   if (j.toolsError) {
    setAgentErr(`Linked, but tool attach failed: ${j.toolsError}. Re-run "Re-wire tools" from this panel or call the agent test number to verify the Functions list in Retell.`)
   } else {
    setEditingAgent(false)
   }
   onPhoneSaved() // re-fetches everything including the agent block
  } catch (e) {
   setAgentErr(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSavingAgent(false)
  }
 }

 return (
  <Panel>
   <PanelHeader title="AI agent" eyebrow="Retell" />
   <div className="space-y-3 text-sm">
    {aiAgent ? (
     <div className="inline-flex items-center gap-2 text-gray-300">
      <Robot className="w-4 h-4 text-sky-400" />
      <span className="font-medium">{aiAgent.agent_name || 'Agent'}</span>
      {aiAgent.status && <StatusPill status={aiAgent.status} />}
     </div>
    ) : (
     <p className="text-sm text-amber-300/90">No Retell agent provisioned for this client yet.</p>
    )}

    {/* Retell phone - always shown, editable. The client dashboard
        reads this to display "listening on <number>"; without it the
        client sees a "no number provisioned" warning. */}
    <div className="pt-3 border-t border-white/[0.06]">
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
      Retell phone number
     </div>
     {!editingPhone ? (
      <div className="flex items-center gap-3 flex-wrap">
       {retellPhone ? (
        <span className="inline-flex items-center gap-2 text-gray-200 font-mono text-sm">
         <PhoneIcon className="w-4 h-4 text-gray-500" />
         {retellPhone}
        </span>
       ) : (
        <span className="inline-flex items-center gap-2 text-amber-300/90 text-xs">
         <PhoneIcon className="w-4 h-4" />
         Not provisioned · client dashboard will show a warning
        </span>
       )}
       <button
        type="button"
        onClick={() => setEditingPhone(true)}
        className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
       >
        {retellPhone ? 'edit' : 'set number'}
       </button>
      </div>
     ) : (
      <div className="space-y-2">
       <Input
        value={phoneInput}
        onChange={(e) => setPhoneInput(e.target.value)}
        placeholder="+1 (737) 555-0123"
       />
       <div className="flex items-center gap-2">
        <PrimaryButton onClick={savePhone} disabled={savingPhone}>
         {savingPhone ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
         Save
        </PrimaryButton>
        <GhostButton onClick={() => { setEditingPhone(false); setPhoneInput(retellPhone || ''); setPhoneErr('') }}>
         Cancel
        </GhostButton>
        {phoneErr && <span className="text-xs text-rose-300">{phoneErr}</span>}
       </div>
       <p className="text-[10px] text-gray-500">
        Stored as the active Retell number for this business. Leave blank to clear.
       </p>
      </div>
     )}
    </div>

    {/* Retell agent ID - the canonical link between this client and
        the agent that answers their calls. Without this, settings the
        client edits go nowhere. We verify with Retell on save so a
        typo can't be persisted. */}
    <div className="pt-3 border-t border-white/[0.06]">
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
      Retell agent ID
     </div>
     {!editingAgent ? (
      <div className="flex items-center gap-3 flex-wrap">
       {currentAgentId ? (
        <span className="font-mono text-xs text-gray-300 break-all">{currentAgentId}</span>
       ) : (
        <span className="inline-flex items-center gap-2 text-amber-300/90 text-xs">
         <Robot className="w-4 h-4" />
         Not linked · client&apos;s settings won&apos;t reach Retell
        </span>
       )}
       <button
        type="button"
        onClick={() => setEditingAgent(true)}
        className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
       >
        {currentAgentId ? 'edit' : 'link agent'}
       </button>
      </div>
     ) : (
      <div className="space-y-2">
       <Input
        value={agentInput}
        onChange={(e) => setAgentInput(e.target.value)}
        placeholder="agent_xxxxxxxxxxxxxxx"
       />
       <div className="flex items-center gap-2">
        <PrimaryButton onClick={saveAgent} disabled={savingAgent}>
         {savingAgent ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
         Save
        </PrimaryButton>
        <GhostButton onClick={() => { setEditingAgent(false); setAgentInput(currentAgentId); setAgentErr('') }}>
         Cancel
        </GhostButton>
        {agentErr && <span className="text-xs text-rose-300">{agentErr}</span>}
       </div>
       <p className="text-[10px] text-gray-500">
        Copy from <a href="https://dashboard.retellai.com/agents" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">Retell dashboard → Agents</a>.
        We verify it exists before saving. Leave blank to unlink.
       </p>
      </div>
     )}
    </div>
    {client.cal_com_username && (
     <div className="pt-3 border-t border-white/[0.06] text-xs text-gray-500 space-y-2">
      <div>
       Cal.com: <a href={`https://cal.com/${client.cal_com_username}/${client.cal_com_event_type_slug || ''}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
        @{client.cal_com_username}{client.cal_com_event_type_slug ? `/${client.cal_com_event_type_slug}` : ''} <ArrowSquareOut className="w-3 h-3" />
       </a>
      </div>
      <CalcomWebhookStatus
       clientId={clientId}
       webhookId={(client as any).cal_com_webhook_id || null}
      />
      <TimezoneFixer
       clientId={clientId}
       currentTz={(client as any).timezone || null}
       state={(client as any).state || null}
      />
     </div>
    )}
   </div>
  </Panel>
 )
}

function TimezoneFixer({ clientId, currentTz, state }: { clientId: string; currentTz: string | null; state: string | null }) {
 const [busy, setBusy] = useState(false)
 const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

 const setTz = async (tz: string) => {
  setBusy(true); setResult(null)
  try {
   const res = await fetchWithAuth(
    `/api/admin/diagnostics/business-tz?businessId=${clientId}`,
    {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ timezone: tz }),
    },
   )
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) {
    setResult({ ok: false, msg: j?.error || `Failed (${res.status})` })
    return
   }
   setResult({ ok: true, msg: `Timezone set to ${tz}` })
   setTimeout(() => location.reload(), 800)
  } catch (e) {
   setResult({ ok: false, msg: e instanceof Error ? e.message : 'Unknown' })
  } finally {
   setBusy(false)
  }
 }

 const ZONES: { label: string; tz: string }[] = [
  { label: 'CT', tz: 'America/Chicago' },
  { label: 'ET', tz: 'America/New_York' },
  { label: 'MT', tz: 'America/Denver' },
  { label: 'PT', tz: 'America/Los_Angeles' },
  { label: 'AZ', tz: 'America/Phoenix' },
 ]

 return (
  <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-400">
   <span>
    Timezone: <span className="font-mono text-gray-300">{currentTz || '∅'}</span>
    {state && <span className="ml-1.5 text-gray-500">(state: {state})</span>}
   </span>
   <span className="text-gray-600">|</span>
   <span className="text-gray-500">set to:</span>
   {ZONES.map((z) => (
    <button
     key={z.tz}
     onClick={() => setTz(z.tz)}
     disabled={busy}
     className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
      currentTz === z.tz
       ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
       : 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent'
     } disabled:opacity-50`}
    >
     {z.label}
    </button>
   ))}
   {result && (
    <span className={`text-[11px] ${result.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{result.msg}</span>
   )}
  </div>
 )
}

function CalcomWebhookStatus({ clientId, webhookId }: { clientId: string; webhookId: string | null }) {
 const [registering, setRegistering] = useState(false)
 const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

 const wired = !!webhookId

 const rewire = async () => {
  setRegistering(true); setResult(null)
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/calcom-rewire`, { method: 'POST' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) {
    setResult({ ok: false, msg: j?.error || `Failed (${res.status})` })
    return
   }
   setResult({ ok: true, msg: `Webhook ${j.webhookId} registered.` })
   // Force a hard refresh so the parent re-fetches the new state.
   setTimeout(() => location.reload(), 1200)
  } catch (e) {
   setResult({ ok: false, msg: e instanceof Error ? e.message : 'Unknown' })
  } finally {
   setRegistering(false)
  }
 }

 return (
  <div className="flex items-center gap-3 flex-wrap">
   {wired ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-300/90 text-[11px]">
     <CheckCircle className="w-3 h-3" /> Booking webhook wired - bookings flow to dashboard
    </span>
   ) : (
    <>
     <span className="inline-flex items-center gap-1.5 text-amber-300/90 text-[11px]">
      <WarningCircle className="w-3 h-3" /> Booking webhook not registered - Cal.com bookings won&apos;t hit the dashboard
     </span>
     <button
      onClick={rewire}
      disabled={registering}
      className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 disabled:opacity-50"
     >
      {registering ? 'registering…' : 'register now'}
     </button>
    </>
   )}
   {result && (
    <span className={`text-[11px] ${result.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{result.msg}</span>
   )}
  </div>
 )
}

type ExtractionField = {
 name: string
 type: 'string' | 'number' | 'boolean'
 description: string
}

const PRESET_FIELDS: { label: string; field: ExtractionField }[] = [
 { label: 'Service requested', field: { name: 'service_requested', type: 'string', description: 'What service the caller asked about (e.g. AC tune-up, drain clear, roof inspection).' } },
 { label: 'Budget mentioned ($)', field: { name: 'budget_cents', type: 'number', description: 'Any dollar amount the caller mentioned, in dollars (no cents). Null if not mentioned.' } },
 { label: 'Urgency / emergency', field: { name: 'is_emergency', type: 'boolean', description: 'True if the caller said urgent, asap, today, or emergency.' } },
 { label: 'Customer name', field: { name: 'customer_name', type: 'string', description: 'The caller\'s name as stated.' } },
 { label: 'Service address', field: { name: 'service_address', type: 'string', description: 'The address where work would be done.' } },
 { label: 'Preferred callback time', field: { name: 'preferred_callback', type: 'string', description: 'When the caller asked to be reached back, free-text (e.g. "Tuesday morning").' } },
 { label: 'Booked appointment?', field: { name: 'booked_appointment', type: 'boolean', description: 'True if the AI confirmed an appointment on this call.' } },
]

/**
 * Cost-to-serve panel: measured provider cost (Retell voice, Anthropic LLM,
 * Telnyx SMS, Stripe fees, Google routes) plus allocated infra, shown
 * against the client's monthly price as a margin. Fetches its own data.
 */
function CostMarginCard({ clientId }: { clientId: string }) {
 const [data, setData] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 useEffect(() => {
  let alive = true
  ;(async () => {
   try {
    const res = await fetchWithAuth(`/api/admin/clients/${clientId}/cost-margin`)
    const j = await res.json()
    if (!alive) return
    if (!res.ok) { setError(j.error || 'Failed to load costs'); return }
    setData(j)
   } catch { if (alive) setError('Failed to load costs') }
   finally { if (alive) setLoading(false) }
  })()
  return () => { alive = false }
 }, [clientId])

 const usd = (c: number) =>
  `$${((c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

 const mtd = data?.monthToDate
 const positive = (mtd?.marginCents ?? 0) >= 0
 const providerRows: Array<[string, number]> = mtd
  ? [
     ['Voice · Retell', mtd.byProvider.retell],
     ['AI · Anthropic', mtd.byProvider.anthropic],
     ['SMS · Telnyx', mtd.byProvider.telnyx],
     ['Stripe fees', mtd.byProvider.stripe],
     ['Maps · Google', mtd.byProvider.google],
    ]
  : []

 return (
  <Panel>
   <PanelHeader
    eyebrow="Cost to serve"
    title="Cost & margin · this billing cycle"
    trailing={mtd?.periodStart ? (
     <span className="text-[11px] text-gray-500">
      since {new Date(mtd.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
     </span>
    ) : undefined}
   />
   {loading ? (
    <div className="text-sm text-gray-500">Loading…</div>
   ) : error ? (
    <div className="text-sm text-rose-300">{error}</div>
   ) : mtd ? (
    <div className="space-y-5">
     <div className="flex items-center gap-6">
      <ProgressRing value={mtd.marginPct} label="margin" size={92} danger={!positive} />
      <div className="grid grid-cols-3 gap-3 flex-1">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">Revenue</div>
       <div className="font-mono font-medium tabular-nums text-xl md:text-2xl text-white">{usd(mtd.revenueCents)}</div>
      </div>
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">Cost</div>
       <div className="font-mono font-medium tabular-nums text-xl md:text-2xl text-white">{usd(mtd.totalCostCents)}</div>
      </div>
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">Margin</div>
       <div className={`font-mono font-medium tabular-nums text-xl md:text-2xl ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {usd(mtd.marginCents)}
        {mtd.marginPct != null && (
         <span className="text-xs text-gray-500 ml-1.5">{mtd.marginPct}%</span>
        )}
       </div>
      </div>
      </div>
     </div>

     <div className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
      {providerRows.map(([label, cents]) => (
       <div key={label} className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="font-mono tabular-nums text-sm text-gray-200">{usd(cents)}</span>
       </div>
      ))}
     </div>

     <div className="text-[11px] text-gray-600">
      Per-customer cost only. Exact where the provider reports it (Retell, Stripe),
      rate-based otherwise (Anthropic tokens, Telnyx segments).{' '}
      Lifetime cost: {usd(data.lifetime.measuredCostCents)}.
     </div>
    </div>
   ) : null}
  </Panel>
 )
}

function ExtractionFieldsSection({ clientId, hasAgent }: { clientId: string; hasAgent: boolean }) {
 const [fields, setFields] = useState<ExtractionField[]>([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState(false)

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth(`/api/admin/clients/${clientId}/extractions`)
    const j = await res.json().catch(() => ({}))
    if (!cancelled && j.success) setFields(j.fields || [])
   } catch { /* non-fatal */ }
   finally { if (!cancelled) setLoading(false) }
  })()
  return () => { cancelled = true }
 }, [clientId])

 const updateField = (i: number, patch: Partial<ExtractionField>) => {
  setFields((cur) => cur.map((f, idx) => idx === i ? { ...f, ...patch } : f))
 }
 const removeField = (i: number) => setFields((cur) => cur.filter((_, idx) => idx !== i))
 const addPreset = (preset: ExtractionField) => {
  if (fields.some((f) => f.name === preset.name)) return
  setFields((cur) => [...cur, preset])
 }
 const addCustom = () => {
  setFields((cur) => [...cur, { name: '', type: 'string', description: '' }])
 }

 const onSave = async () => {
  setSaving(true); setError(''); setSavedFlag(false)
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/extractions`, {
    method: 'PUT',
    body: JSON.stringify({ fields }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Save failed')
   setFields(j.fields || [])
   setSavedFlag(true)
   setTimeout(() => setSavedFlag(false), 2500)
   if (j.syncError) setError(`Saved, but Retell didn't sync: ${j.syncError}`)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 return (
  <Panel>
   <PanelHeader title="What to capture from calls" eyebrow="Post-call extraction" />
   <p className="text-xs text-gray-500 mb-4">
    After every call, Retell extracts these fields from the transcript automatically.
    They show up on the call detail panel so the contractor sees the structured ask
    without scrubbing the transcript. Tune the prompt separately so the agent actually asks.
   </p>

   {!hasAgent && (
    <div className="text-xs text-amber-300/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2 mb-3">
     No Retell agent linked yet. Saving stores the schema, but it won&apos;t take effect on calls until an agent is wired.
    </div>
   )}

   {loading ? (
    <div className="flex items-center gap-2 text-xs text-gray-500"><CircleNotch className="w-4 h-4 animate-spin" /> Loading…</div>
   ) : (
    <div className="space-y-3">
     {fields.length === 0 && (
      <p className="text-xs text-gray-500">No fields configured yet. Add some below.</p>
     )}
     {fields.map((f, i) => (
      <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
       <div className="flex items-center gap-2 flex-wrap">
        <Input
         value={f.name}
         onChange={(e) => updateField(i, { name: e.target.value })}
         placeholder="field_name"
        />
        <Select
         value={f.type}
         onChange={(e) => updateField(i, { type: e.target.value as ExtractionField['type'] })}
        >
         <option value="string">text</option>
         <option value="number">number</option>
         <option value="boolean">true / false</option>
        </Select>
        <button
         onClick={() => removeField(i)}
         className="text-[10px] font-mono uppercase tracking-wider text-rose-300 hover:text-rose-200"
        >
         remove
        </button>
       </div>
       <Input
        value={f.description}
        onChange={(e) => updateField(i, { description: e.target.value })}
        placeholder="What to extract - Retell uses this as the LLM prompt"
       />
      </div>
     ))}

     <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 self-center mr-1">
       quick add:
      </span>
      {PRESET_FIELDS.filter((p) => !fields.some((f) => f.name === p.field.name)).map((p) => (
       <button
        key={p.field.name}
        onClick={() => addPreset(p.field)}
        className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 bg-sky-400/5 border border-sky-400/20 rounded-full px-2.5 py-1"
       >
        + {p.label}
       </button>
      ))}
      <button
       onClick={addCustom}
       className="text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-gray-200 border border-white/[0.08] rounded-full px-2.5 py-1"
      >
       + custom field
      </button>
     </div>

     <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
      <PrimaryButton onClick={onSave} disabled={saving}>
       {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
       Save & push to Retell
      </PrimaryButton>
      {savedFlag && (
       <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" /> Synced
       </span>
      )}
      {error && <span className="text-xs text-rose-300">{error}</span>}
     </div>
    </div>
   )}
  </Panel>
 )
}

function KnowledgeBaseCard({ clientId, hasAgent }: { clientId: string; hasAgent: boolean }) {
 type KB = {
  kbId: string
  name: string | null
  status: string | null
  sources: Array<{
   type: 'text' | 'document' | 'url' | 'unknown'
   title: string | null
   preview: string | null
   url: string | null
  }>
 }
 const [bases, setBases] = useState<KB[] | null>(null)
 const [reason, setReason] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [linked, setLinked] = useState(hasAgent)

 const load = async () => {
  setLoading(true); setReason(null)
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/knowledge`)
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed to load')
   setLinked(!!j.linked)
   setBases(Array.isArray(j.bases) ? j.bases : [])
   if (j.reason) setReason(j.reason)
  } catch (e) {
   setReason(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }
 useEffect(() => { load() /* eslint-disable-line */ }, [clientId])

 return (
  <Panel>
   <PanelHeader
    title="Knowledge base"
    eyebrow="Retell · read-only"
    trailing={
     <button
      onClick={load}
      className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
     >
      refresh
     </button>
    }
   />
   {!linked ? (
    <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2 text-xs text-amber-300/90">
     Link a Retell agent above first - once linked, the agent&apos;s knowledge base shows up here.
    </div>
   ) : loading ? (
    <div className="flex items-center gap-2 text-xs text-gray-500">
     <CircleNotch className="w-4 h-4 animate-spin" /> Loading…
    </div>
   ) : bases && bases.length > 0 ? (
    <div className="space-y-3">
     {bases.map((kb) => (
      <div key={kb.kbId} className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
       <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
         <div className="text-sm font-medium text-white truncate">{kb.name || kb.kbId}</div>
         <div className="text-[10px] font-mono text-gray-500 mt-0.5 break-all">{kb.kbId}</div>
        </div>
        {kb.status && (
         <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
          {kb.status}
         </span>
        )}
       </div>
       {kb.sources.length === 0 ? (
        <div className="px-4 py-3 text-xs text-gray-500">No sources yet - add some in the Retell dashboard.</div>
       ) : (
        <ul className="divide-y divide-white/[0.04]">
         {kb.sources.map((s, i) => (
          <li key={i} className="px-4 py-3">
           <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 bg-sky-400/5 border border-sky-400/20 rounded px-1.5 py-0.5">
             {s.type}
            </span>
            <span className="text-sm text-gray-200 truncate">{s.title || 'Untitled'}</span>
            {s.url && (
             <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
             >
              open <ArrowSquareOut className="w-3 h-3" />
             </a>
            )}
           </div>
           {s.preview && (
            <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
             {s.preview}
            </p>
           )}
          </li>
         ))}
        </ul>
       )}
      </div>
     ))}
    </div>
   ) : (
    <div className="text-xs text-gray-500">
     {reason || 'No knowledge bases attached to this agent yet.'}{' '}
     <a
      href="https://dashboard.retellai.com/knowledge-base"
      target="_blank"
      rel="noreferrer"
      className="text-sky-400 hover:text-sky-300"
     >
      Open Retell &rarr;
     </a>
    </div>
   )}
  </Panel>
 )
}

function AgentTuning({
 client, hasAgent, onPatch,
}: {
 client: ClientDetail['client']
 hasAgent: boolean
 onPatch: (updates: Record<string, any>) => Promise<any>
}) {
 type Voice = {
  voice_id: string
  voice_name: string
  provider: string | null
  accent: string | null
  gender: string | null
  preview_audio_url: string | null
 }
 const [voices, setVoices] = useState<Voice[]>([])
 const [voicesError, setVoicesError] = useState('')
 const [voicesLoading, setVoicesLoading] = useState(true)
 const [greeting, setGreeting] = useState(client.greeting_message || '')
 const [voiceId, setVoiceId] = useState(client.voice_id || '')
 const [saving, setSaving] = useState(false)
 const [savedAt, setSavedAt] = useState<number | null>(null)
 const [saveError, setSaveError] = useState('')

 useEffect(() => {
  setGreeting(client.greeting_message || '')
  setVoiceId(client.voice_id || '')
 }, [client.id, client.greeting_message, client.voice_id])

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   setVoicesLoading(true); setVoicesError('')
   try {
    const res = await fetchWithAuth('/api/admin/retell/voices')
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.success) throw new Error(j?.error || `Failed (${res.status})`)
    if (!cancelled) setVoices(j.voices || [])
   } catch (e) {
    if (!cancelled) setVoicesError(e instanceof Error ? e.message : 'Failed to load voices')
   } finally {
    if (!cancelled) setVoicesLoading(false)
   }
  })()
  return () => { cancelled = true }
 }, [])

 const dirty =
  (greeting || '') !== (client.greeting_message || '') ||
  (voiceId || '') !== (client.voice_id || '')

 const selectedVoice = useMemo(() => voices.find((v) => v.voice_id === voiceId), [voices, voiceId])

 const onSave = async () => {
  setSaving(true); setSaveError('')
  try {
   await onPatch({
    greeting_message: greeting,
    voice_id: voiceId || null,
   })
   setSavedAt(Date.now())
  } catch (e) {
   setSaveError(e instanceof Error ? e.message : 'Save failed')
  } finally {
   setSaving(false)
  }
 }

 return (
  <Panel>
   <PanelHeader title="AI tuning" eyebrow="Live agent" />
   {!hasAgent && (
    <div className="text-xs text-amber-300/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2 mb-3">
     No Retell agent is provisioned for this client. Saving here will store
     values, but they won&apos;t take effect until an agent is created.
    </div>
   )}
   <div className="space-y-4">
    <div>
     <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 block">
      Greeting
     </label>
     <Input
      value={greeting}
      onChange={(e) => setGreeting(e.target.value)}
      placeholder="Hi, thanks for calling Acme Plumbing - how can I help?"
      maxLength={240}
     />
     <div className="text-[10px] text-gray-600 mt-1">
      First sentence the AI says when answering. {greeting.length}/240.
     </div>
    </div>

    <div>
     <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 block">
      Voice
     </label>
     {voicesError ? (
      <div className="text-xs text-rose-300/90 bg-rose-400/5 border border-rose-400/20 rounded-lg px-3 py-2">
       Couldn&apos;t load Retell voices: {voicesError}
      </div>
     ) : (
      <Select
       value={voiceId}
       onChange={(e) => setVoiceId(e.target.value)}
       disabled={voicesLoading}
      >
       <option value="">{voicesLoading ? 'Loading voices…' : 'Auto (based on business type)'}</option>
       {voices.map((v) => (
        <option key={v.voice_id} value={v.voice_id}>
         {v.voice_name}
         {v.gender ? ` · ${v.gender}` : ''}
         {v.accent ? ` · ${v.accent}` : ''}
         {v.provider ? ` · ${v.provider}` : ''}
        </option>
       ))}
      </Select>
     )}
     {selectedVoice?.preview_audio_url && (
      <a
       href={selectedVoice.preview_audio_url}
       target="_blank" rel="noreferrer"
       className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300"
      >
       <Play className="w-3 h-3" /> preview
      </a>
     )}
    </div>

    <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
     <PrimaryButton onClick={onSave} disabled={!dirty || saving}>
      {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
      {saving ? 'Pushing to Retell…' : 'Save & push to Retell'}
     </PrimaryButton>
     {savedAt && !dirty && !saveError && (
      <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
       <CheckCircle className="w-3.5 h-3.5" /> Synced
      </span>
     )}
     {saveError && (
      <span className="text-xs text-rose-300">{saveError}</span>
     )}
    </div>
   </div>
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
 client, onPatch, onResetPassword, onSendCheckout,
}: {
 client: ClientDetail['client']
 onPatch: (updates: Record<string, any>) => Promise<any>
 onResetPassword: (customPassword?: string) => Promise<void>
 onSendCheckout: () => void
}) {
 const [busy, setBusy] = useState<string | null>(null)
 const [error, setError] = useState('')
 const [savedFlag, setSavedFlag] = useState<string | null>(null)
 const [customPwOpen, setCustomPwOpen] = useState(false)
 const [customPw, setCustomPw] = useState('')

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
  run('onboarding', async () => {
   if (client.onboarding_completed) {
    // Re-opening: just flip the flag.
    await onPatch({ onboarding_completed: false })
    return
   }
   // Going live: hit force-live so forwarding_verified_at gets set
   // too (dashboard step machine reads both flags).
   const reason = window.prompt(
    'Reason for forcing this client live (skips Cal.com / forwarding / Stripe checks):',
    '',
   )
   if (!reason || reason.trim().length < 4) {
    throw new Error('reason_required')
   }
   const res = await fetchWithAuth(`/api/admin/clients/${client.id}/force-live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason.trim() }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j?.success) throw new Error(j?.error || 'force-live failed')
  })

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

 // Full reset to first-login state. Wipes onboarding flags + Cal.com
 // connection + calls/appointments/review_requests/notifications.
 // Keeps the account itself, login credentials, billing, Retell agent,
 // phone number, and agent personality (greeting/voice/speed).
 const resetOnboarding = () =>
  run('reset', async () => {
   const ok = confirm(
    `Reset "${client.business_name}" to first-login state?\n\n` +
    `This will:\n` +
    `  • Clear onboarding progress (calcom + forwarding + verify)\n` +
    `  • Disconnect Cal.com\n` +
    `  • Delete all calls, bookings, review requests, notifications\n\n` +
    `Login, billing, Retell agent, phone number, and agent voice/greeting are KEPT.`
   )
   if (!ok) throw new Error('cancelled')
   const reason = window.prompt('Reason for the audit trail (e.g. "demo reset"):', 'demo reset')
   if (!reason || reason.trim().length < 4) throw new Error('reason_required')
   const res = await fetchWithAuth(`/api/admin/clients/${client.id}/reset-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason.trim() }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j?.success) throw new Error(j?.error || 'reset failed')
   await onPatch({}) // refresh
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
         <FloppyDisk className="w-4 h-4" /> Save
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
     <GhostButton
      onClick={async () => {
       if (!client.owner) {
        alert('No owner account is linked to this business yet.')
        return
       }
       try {
        const r = await fetch(`/api/admin/clients/${client.id}/impersonate`, {
         method: 'POST',
         credentials: 'include',
        })
        const j = await r.json().catch(() => ({}))
        if (r.ok && j?.success) {
         // Scrub the admin's own localStorage so the impersonated
         // dashboard doesn't read stale cg.session.uid / user / business
         // blobs and trigger the session-guard reload loop.
         const { clearClientAuthState } = await import('@/lib/auth/session-guard')
         clearClientAuthState()
         window.location.href = j.redirect_url || '/dashboard'
        } else {
         alert(j?.error || 'Could not impersonate this client')
        }
       } catch {
        alert('Could not impersonate this client')
       }
      }}
      disabled={!client.owner}
     >
      <Key className="w-4 h-4" /> Sign in as this client
     </GhostButton>
     <GhostButton onClick={onSendCheckout}>
      <CreditCard className="w-4 h-4" /> Send checkout link
     </GhostButton>
     <a
      href={`/admin/customization/${client.id}`}
      className="inline-flex items-center gap-2 text-xs text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md px-2.5 py-1.5 transition-colors"
     >
      <Pencil className="w-4 h-4" /> Pre-fill customization
     </a>
     <GhostButton onClick={() => onResetPassword()} disabled={!client.owner}>
      <Key className="w-4 h-4" /> Random password
     </GhostButton>
     <GhostButton onClick={() => setCustomPwOpen((v) => !v)} disabled={!client.owner}>
      <Pencil className="w-4 h-4" /> Set password
     </GhostButton>
     <GhostButton onClick={toggleOnboarding} disabled={busy === 'onboarding'}>
      <ArrowCounterClockwise className="w-4 h-4" />
      {client.onboarding_completed ? 'Re-open onboarding' : 'Mark onboarding done'}
     </GhostButton>
     {client.calcom_connected && (
      <GhostButton onClick={disconnectCalcom} disabled={busy === 'calcom'}>
       <LinkBreak className="w-4 h-4" /> Disconnect Cal.com
      </GhostButton>
     )}
     <DangerButton onClick={resetOnboarding} disabled={busy === 'reset'}>
      <Trash className="w-4 h-4" /> Reset to first login
     </DangerButton>
    </div>

    {customPwOpen && (
     <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-3 space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
       Set custom password
      </div>
      <Input
       value={customPw}
       onChange={(e) => setCustomPw(e.target.value)}
       placeholder="Min 8 characters"
       autoFocus
      />
      <div className="flex items-center gap-2">
       <PrimaryButton
        onClick={async () => {
         if (customPw.length < 8) { alert('Password must be at least 8 characters'); return }
         await onResetPassword(customPw)
         setCustomPwOpen(false); setCustomPw('')
        }}
        disabled={customPw.length < 8 || !client.owner}
       >
        <Key className="w-4 h-4" /> Set password
       </PrimaryButton>
       <GhostButton onClick={() => { setCustomPwOpen(false); setCustomPw('') }}>
        Cancel
       </GhostButton>
      </div>
      <p className="text-[10px] text-gray-500">
       Replaces the current password immediately. The plaintext only shows once after save - copy it before closing.
      </p>
     </div>
    )}

    {savedFlag && (
     <div className="text-xs text-emerald-400 flex items-center gap-1.5">
      <CheckCircle className="w-3.5 h-3.5" /> Saved.
     </div>
    )}
    {error && error !== 'cancelled' && (
     <div className="text-xs text-rose-400 flex items-center gap-1.5">
      <WarningCircle className="w-3.5 h-3.5" /> {error}
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
      <Key className="w-4 h-4 text-sky-400" /> Temporary password
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
       <CheckCircle className="w-4 h-4" /> {copied ? 'Copied' : 'Copy'}
      </PrimaryButton>
     </div>
    </div>
   </motion.div>
  </motion.div>
 )
}

/* --------------------------- Checkout link modal --------------------------- */

function CheckoutLinkModal({
 clientId, businessName, onClose,
}: {
 clientId: string
 businessName: string
 onClose: () => void
}) {
 const [customMonthly, setCustomMonthly] = useState<string>('')
 const [setupFee, setSetupFee] = useState<string>('')
 const [platformOnly, setPlatformOnly] = useState<boolean>(true)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [result, setResult] = useState<{
  url: string; plan_label: string; amount: string; platform_only: boolean
 } | null>(null)
 const [copied, setCopied] = useState<'url' | 'sms' | null>(null)
 const [smsPhone, setSmsPhone] = useState<string>('')
 const [sendingSms, setSendingSms] = useState(false)
 const [smsStatus, setSmsStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 const generate = async () => {
  setBusy(true); setError('')
  try {
   const dollars = parseFloat(customMonthly)
   if (!Number.isFinite(dollars) || dollars < 50) {
    throw new Error('Enter a monthly amount (minimum $50).')
   }
   const body: Record<string, any> = {
    plan: 'custom',
    monthly_cents: Math.round(dollars * 100),
    platform_only: platformOnly,
   }
   const fee = parseFloat(setupFee || '0')
   if (Number.isFinite(fee) && fee > 0) {
    if (fee > 10000) throw new Error('Setup fee max is $10,000.')
    body.setup_fee_cents = Math.round(fee * 100)
   }

   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/checkout-link`, {
    method: 'POST',
    body: JSON.stringify(body),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   setResult({ url: j.url, plan_label: j.plan_label, amount: j.amount, platform_only: !!j.platform_only })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally {
   setBusy(false)
  }
 }

 const copy = async (kind: 'url' | 'sms', text: string) => {
  try {
   await navigator.clipboard?.writeText(text)
   setCopied(kind)
   setTimeout(() => setCopied(null), 1500)
  } catch {}
 }

 const sampleSms = result
  ? `Hey, this is the CloudGreet checkout link for ${businessName} - ${result.plan_label}, ${result.amount}. ${result.url}`
  : ''

 const sendSms = async () => {
  if (!result) return
  setSendingSms(true); setSmsStatus(null)
  try {
   const payload: Record<string, string> = { url: result.url, message: sampleSms }
   const trimmed = smsPhone.trim()
   if (trimmed) payload.phone = trimmed
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/send-checkout-sms`, {
    method: 'POST',
    body: JSON.stringify(payload),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) {
    setSmsStatus({ tone: 'err', text: j?.error || `Send failed (${res.status})` })
   } else {
    setSmsStatus({ tone: 'ok', text: `Sent to ${j.sent_to}.` })
   }
  } catch (e) {
   setSmsStatus({ tone: 'err', text: e instanceof Error ? e.message : 'Send failed' })
  } finally {
   setSendingSms(false)
  }
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
    className="relative bg-[#0c0c10] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
   >
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
     <div className="text-sm font-semibold text-white inline-flex items-center gap-2">
      <CreditCard className="w-4 h-4 text-sky-400" /> Checkout link
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] transition-colors">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-4">
     {!result ? (
      <>
       <p className="text-sm text-gray-400">
        Generate a Stripe Checkout URL for{' '}
        <span className="font-medium text-gray-200">{businessName}</span>. They land on
        a hosted Stripe page, pay, and the subscription activates automatically via webhook.
       </p>

       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
         Monthly amount (USD)
        </div>
        <Input
         value={customMonthly}
         onChange={(e) => setCustomMonthly(e.target.value.replace(/[^0-9.]/g, ''))}
         placeholder="2000"
        />
        <p className="text-[10px] text-gray-500 mt-1">
         Whole dollars, e.g. 2000 for $2,000/mo. Min $50. Negotiated per client.
        </p>
       </div>

       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
         Setup fee (one-time, optional)
        </div>
        <Input
         value={setupFee}
         onChange={(e) => setSetupFee(e.target.value.replace(/[^0-9.]/g, ''))}
         placeholder="500"
        />
        <p className="text-[10px] text-gray-500 mt-1">
         Whole dollars. Charged on the first invoice along with the first month.
         Leave blank to skip. Reps can drop this to close.
        </p>
       </div>

       <button
        type="button"
        onClick={() => setPlatformOnly((v) => !v)}
        className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-start gap-3 transition-colors ${
         platformOnly
          ? 'border-emerald-400/30 bg-emerald-500/[0.06]'
          : 'border-amber-400/30 bg-amber-500/[0.06]'
        }`}
       >
        <div
         className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
          platformOnly ? 'border-emerald-400 bg-emerald-400' : 'border-amber-400'
         }`}
        >
         {platformOnly && <span className="block w-2 h-2 bg-[#0c0c10] rounded-sm" />}
        </div>
        <div className="min-w-0">
         <div className="text-xs font-medium text-white">
          {platformOnly ? 'Platform only — 100% revenue to platform' : 'Standard split — 50% to assigned rep'}
         </div>
         <div className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
          {platformOnly
           ? 'No rep commission for this checkout, even if a rep_id is assigned to this client. Stamps cg_no_commission on the subscription metadata.'
           : 'Webhook will credit 50% of every payment to the rep assigned to this client.'}
         </div>
        </div>
       </button>

       {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
         <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
         <span>{error}</span>
        </div>
       )}

       <div className="flex items-center justify-end gap-2 pt-1">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={generate} loading={busy}>
         Generate link
        </PrimaryButton>
       </div>
      </>
     ) : (
      <>
       <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2 text-sm text-emerald-200 flex items-start gap-2">
        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
         Live link for <strong>{result.plan_label}</strong> · {result.amount}. Pasted into a message, the client clicks and pays.
        </span>
       </div>

       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Checkout URL</div>
        <div className="flex items-center gap-2">
         <div className="flex-1 bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2.5 font-mono text-xs text-gray-200 truncate">
          {result.url}
         </div>
         <PrimaryButton onClick={() => copy('url', result.url)}>
          <Copy className="w-4 h-4" /> {copied === 'url' ? 'Copied' : 'Copy'}
         </PrimaryButton>
        </div>
       </div>

       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Send to client</div>
        <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-gray-300 leading-relaxed mb-2">
         {sampleSms}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
         <input
          type="tel"
          value={smsPhone}
          onChange={(e) => setSmsPhone(e.target.value)}
          placeholder="Phone (leave blank = owner's saved phone)"
          className="flex-1 bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-400/40"
         />
         <PrimaryButton onClick={sendSms} loading={sendingSms}>
          Send SMS
         </PrimaryButton>
         <GhostButton onClick={() => copy('sms', sampleSms)}>
          <Copy className="w-4 h-4" /> {copied === 'sms' ? 'Copied' : 'Copy'}
         </GhostButton>
        </div>
        {smsStatus && (
         <p className={`text-[11px] mt-2 ${smsStatus.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {smsStatus.text}
         </p>
        )}
       </div>

       <div className={`text-[11px] px-3 py-2 rounded-xl border ${result.platform_only ? 'border-emerald-400/30 bg-emerald-500/[0.05] text-emerald-200' : 'border-amber-400/30 bg-amber-500/[0.05] text-amber-200'}`}>
        {result.platform_only
         ? '100% of revenue from this link goes to the platform. No rep commission.'
         : 'Standard 50/50 rep split applies if this client has a rep_id.'}
       </div>

       <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton onClick={onClose}>Done</GhostButton>
        <a
         href={result.url} target="_blank" rel="noreferrer"
         className="inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 hover:text-white px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.06] transition-all duration-300 ease-out"
        >
         <ArrowSquareOut className="w-4 h-4" /> Preview
        </a>
       </div>
      </>
     )}
    </div>
   </motion.div>
  </motion.div>
 )
}

/* ---------------------------- Sales rep card ---------------------------- */

type RepOption = { id: string; name: string; email: string; status: string }

/* ----------------------- SMS booking number ----------------------- */

function SmsBookingCard({ clientId }: { clientId: string | undefined }) {
 const [state, setState] = useState<{
  sms_phone_number: string | null
  sms_agent_enabled: boolean
  tfv: { status: string; reason: string | null } | null
 } | null>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
  if (!clientId) return
  fetchWithAuth(`/api/admin/clients/${clientId}/sms-number`)
   .then(r => r.json().catch(() => ({})))
   .then(j => { if (j?.success) setState(j) })
   .finally(() => setLoading(false))
 }, [clientId])

 if (loading) return (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-sm text-gray-500">Loading SMS line...</div>
 )

 const status = (state?.tfv?.status || '').toLowerCase()
 const isLive = status.includes('verified')
 const isPending = status.includes('waiting') || status.includes('pending')
 const isAction = status.includes('waiting for customer') || status.includes('action')
 const badgeTone =
  isLive ? 'border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200'
  : isAction ? 'border-rose-400/40 bg-rose-500/[0.08] text-rose-200'
  : isPending ? 'border-amber-400/40 bg-amber-500/[0.08] text-amber-200'
  : 'border-white/[0.08] bg-white/[0.02] text-gray-400'
 const badge =
  isLive ? 'Live'
  : isAction ? 'Action required'
  : isPending ? 'Pending review'
  : state?.sms_phone_number ? 'Not submitted'
  : 'Not provisioned'
 const hasLine = !!state?.sms_phone_number

 return (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
   <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
    <div>
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Text-to-book</div>
     <div className="text-sm text-gray-300">SMS line for this client</div>
    </div>
    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeTone}`}>
     {badge}
    </span>
   </div>

   {hasLine ? (
    <div className="mb-3 font-mono text-base text-white">{state!.sms_phone_number}</div>
   ) : (
    <div className="mb-3 text-xs text-gray-500">No SMS line provisioned yet.</div>
   )}

   {state?.tfv?.reason && !isLive && (
    <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.05] px-3 py-2 text-xs text-rose-200">
     <div className="font-medium mb-0.5">Telnyx feedback</div>
     <div className="text-rose-100/90">{state.tfv.reason}</div>
    </div>
   )}

   <Link
    href={`/admin/clients/${clientId}/sms-setup`}
    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
   >
    {hasLine ? 'Configure SMS line' : 'Add SMS line'}
   </Link>
  </div>
 )
}

function SalesRepAssignmentCard({
 client, clientId, onSaved,
}: {
 client: ClientDetail['client']
 clientId: string | undefined
 onSaved: () => void
}) {
 const [reps, setReps] = useState<RepOption[] | null>(null)
 const [selected, setSelected] = useState<string>('')
 const [saving, setSaving] = useState(false)
 const [err, setErr] = useState('')
 const [saved, setSaved] = useState(false)

 useEffect(() => {
  setSelected(client.rep_id || '')
 }, [client.rep_id])

 useEffect(() => {
  let cancelled = false
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/admin/sales/reps')
    const j = await res.json().catch(() => ({}))
    if (cancelled) return
    if (Array.isArray(j?.reps)) {
     setReps(
      j.reps
       .filter((r: any) => r.status !== 'terminated')
       .map((r: any) => ({
        id: r.id,
        name: r.name || r.email || 'Unnamed rep',
        email: r.email || '',
        status: r.status || 'active',
       })),
     )
    } else {
     setReps([])
    }
   } catch {
    if (!cancelled) setReps([])
   }
  })()
  return () => { cancelled = true }
 }, [])

 const dirty = (selected || null) !== (client.rep_id || null)

 const save = async () => {
  if (!clientId) return
  setSaving(true); setErr(''); setSaved(false)
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}`, {
    method: 'PATCH',
    body: JSON.stringify({ rep_id: selected || null }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok) {
    setErr(j?.error || 'Save failed')
   } else {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved()
   }
  } finally {
   setSaving(false)
  }
 }

 return (
  <Panel>
   <PanelHeader title="Sales rep" eyebrow="commission attribution" />
   {client.assigned_rep ? (
    <div className="text-sm text-gray-300 mb-3">
     Currently assigned to{' '}
     <span className="text-white font-medium">{client.assigned_rep.name}</span>
     {client.assigned_rep.email && (
      <span className="text-gray-500"> · {client.assigned_rep.email}</span>
     )}
    </div>
   ) : (
    <div className="text-sm text-gray-500 mb-3">
     No rep is currently attributed to this client. Commissions on
     paid invoices won&apos;t credit anyone until you set this.
    </div>
   )}

   <div className="flex items-end gap-2 flex-wrap">
    <div className="flex-1 min-w-[240px]">
     <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
      Assign to
     </label>
     <Select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={!reps}>
      <option value="">- Unassigned -</option>
      {(reps || []).map((r) => (
       <option key={r.id} value={r.id}>
        {r.name}{r.email ? ` · ${r.email}` : ''}{r.status !== 'active' ? ` (${r.status})` : ''}
       </option>
      ))}
     </Select>
    </div>
    <PrimaryButton onClick={save} disabled={!dirty || saving}>
     {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
     Save
    </PrimaryButton>
   </div>

   {err && (
    <div className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
     {err}
    </div>
   )}
   {saved && (
    <div className="mt-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
     <CheckCircle className="w-3.5 h-3.5" /> Saved · future invoice payments credit this rep
    </div>
   )}

   <p className="text-[11px] text-gray-500 mt-3">
    Changes only affect future commissions. Already-credited ledger
    rows stay attributed to whoever owned the rep_id at the time
    the invoice was paid.
   </p>
  </Panel>
 )
}

/* ------------------------- Stripe sync button -------------------------- */

function StripeSyncButton({
 clientId, onSynced,
}: {
 clientId: string | undefined
 onSynced: () => void
}) {
 const [busy, setBusy] = useState(false)
 const [flash, setFlash] = useState<string | null>(null)

 const run = async () => {
  if (!clientId) return
  setBusy(true); setFlash(null)
  try {
   const res = await fetchWithAuth(`/api/admin/clients/${clientId}/stripe-sync`, {
    method: 'POST',
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok) {
    setFlash(`Failed: ${j?.error || res.status}`)
   } else {
    setFlash(`Synced · status=${j.synced || 'unknown'}`)
    onSynced()
   }
  } finally {
   setBusy(false)
   setTimeout(() => setFlash(null), 4000)
  }
 }

 return (
  <div className="flex flex-col items-end gap-1">
   <GhostButton onClick={run} disabled={busy}>
    {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
    Sync from Stripe
   </GhostButton>
   {flash && (
    <span className="text-[11px] text-gray-400 font-mono">{flash}</span>
   )}
  </div>
 )
}
