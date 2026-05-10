'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, Plus, UserPlus, Envelope, Copy, ArrowSquareOut, WarningCircle, CheckCircle, Trophy, CurrencyDollar, Eye, X } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, Input } from '../_components/ui'

type Rep = {
 id: string
 email: string
 name: string
 status: 'active' | 'paused' | 'terminated'
 last_login: string | null
 created_at: string | null
 stripe_connect_account_id: string | null
 payouts_enabled: boolean
 agreement_signed_at: string | null
 mtd_commission_cents: number
 lifetime_commission_cents: number
 mtd_closes_paid: number
 outstanding_commission_cents: number
 decay?: {
  tier: 'full' | 'reduced' | 'transferred'
  multiplier: number
  days_since_last_close: number
  days_until_next_drop: number | null
  last_close_at: string | null
 }
}

type OpenInvite = {
 token: string
 email: string
 invited_at: string
 expires_at: string
}

export default function AdminSalesPage() {
 const [reps, setReps] = useState<Rep[]>([])
 const [invites, setInvites] = useState<OpenInvite[]>([])
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState('')
 const [showInvite, setShowInvite] = useState(false)
 const [runningPayouts, setRunningPayouts] = useState(false)
 const [payoutResult, setPayoutResult] = useState<string | null>(null)
 const [preview, setPreview] = useState<null | {
  rep_count: number
  total_would_pay_cents: number
  results: Array<{
   rep_id: string
   rep_email: string | null
   rep_name: string | null
   status: 'would_transfer' | 'skipped_too_small' | 'skipped_no_connect' | 'skipped_terminated' | 'skipped_no_owed'
   amount_cents: number
   ledger_count: number
   stripe_payouts_enabled: boolean
  }>
 }>(null)
 const [previewLoading, setPreviewLoading] = useState(false)
 const [previewErr, setPreviewErr] = useState('')

 const loadPreview = async () => {
  setPreviewLoading(true); setPreviewErr('')
  try {
   const res = await fetchWithAuth('/api/admin/sales/payouts/preview')
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   setPreview({
    rep_count: j.rep_count,
    total_would_pay_cents: j.total_would_pay_cents,
    results: j.results || [],
   })
  } catch (e) {
   setPreviewErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setPreviewLoading(false)
  }
 }

 const runPayouts = async () => {
  if (!confirm(
    'Run the weekly payout sweep now?\n\n' +
    'Sums every rep\'s unpaid commission_ledger rows and fires a Stripe Connect transfer per rep. ' +
    'Idempotent - safe to run more than once; reps already paid this week won\'t be paid again.',
  )) return
  setRunningPayouts(true)
  setPayoutResult(null)
  try {
   const res = await fetchWithAuth('/api/admin/sales/payouts/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok) {
    setPayoutResult(`Failed: ${j?.error || res.status}`)
   } else {
    const transferred = (j.results || []).filter((r: any) => r.status === 'transferred').length
    setPayoutResult(
     `Swept ${j.rep_count} rep${j.rep_count === 1 ? '' : 's'} · ${transferred} transferred · $${(j.total_paid_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} total`,
    )
    await load()
   }
  } catch (e) {
   setPayoutResult(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`)
  } finally {
   setRunningPayouts(false)
  }
 }

 const load = async () => {
  setLoading(true); setErr('')
  try {
   const res = await fetchWithAuth('/api/admin/sales/reps')
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   setReps(j.reps || [])
   setInvites(j.open_invites || [])
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
  }
 }
 useEffect(() => { load() }, [])

 const totalOutstanding = reps.reduce((s, r) => s + (r.outstanding_commission_cents || 0), 0)
 const totalMtd = reps.reduce((s, r) => s + (r.mtd_commission_cents || 0), 0)

 return (
  <AdminShell activeLabel="Sales">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-6xl space-y-6">
     <header className="flex items-end justify-between gap-4 flex-wrap">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
        owner console
       </div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        Sales team
       </h1>
       <p className="text-sm text-gray-400 mt-2 max-w-2xl">
        Commission-only reps who hunt and close clients on your behalf.
        Each rep keeps 50% of every paid invoice from the clients they bring in,
        paid out automatically every Friday via Stripe Connect.
       </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
       <button
        onClick={loadPreview}
        disabled={previewLoading}
        title="Dry-run: shows what each rep would receive without firing transfers"
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 disabled:opacity-60 transition-colors"
       >
        {previewLoading ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
        Preview payouts
       </button>
       <button
        onClick={runPayouts}
        disabled={runningPayouts}
        title="Friday cron runs this automatically - manual trigger for off-cycle payouts"
        className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10 rounded-lg px-3 py-2 disabled:opacity-60 transition-colors"
       >
        {runningPayouts ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CurrencyDollar className="w-4 h-4" />}
        Run payouts
       </button>
       <Link
        href="/admin/sales/closes"
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-2"
       >
        <Trophy className="w-4 h-4" /> Review closes
       </Link>
       <PrimaryButton onClick={() => setShowInvite(true)}>
        <UserPlus className="w-4 h-4" /> Invite rep
       </PrimaryButton>
      </div>
      {payoutResult && (
       <div className="w-full text-xs text-gray-300 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 mt-2">
        {payoutResult}
       </div>
      )}
     </header>

     {(preview || previewErr) && (
      <Panel padding="none">
       <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div>
         <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Dry-run</div>
         <div className="text-sm text-white mt-0.5">
          {preview
           ? `${preview.results.filter((r) => r.status === 'would_transfer').length} of ${preview.rep_count} reps would transfer · ${fmtMoney(preview.total_would_pay_cents)} total`
           : 'Preview failed'}
         </div>
        </div>
        <button
         onClick={() => { setPreview(null); setPreviewErr('') }}
         className="p-1 text-gray-400 hover:text-white"
         aria-label="Close"
        >
         <X className="w-4 h-4" />
        </button>
       </div>
       {previewErr ? (
        <div className="px-5 sm:px-6 py-4 text-sm text-rose-300">{previewErr}</div>
       ) : preview && preview.results.length === 0 ? (
        <div className="px-5 sm:px-6 py-6 text-sm text-gray-500">
         No reps have unpaid commission. Pressing Run payouts would do nothing.
        </div>
       ) : (
        <ul className="divide-y divide-white/[0.04]">
         {preview!.results.map((r) => (
          <li key={r.rep_id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
           <div className="min-w-0">
            <div className="text-sm text-gray-200 truncate">
             {r.rep_name || r.rep_email || r.rep_id}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
             {r.ledger_count} ledger row{r.ledger_count === 1 ? '' : 's'}
             {' · '}
             {r.stripe_payouts_enabled ? 'Connect ready' : 'Connect not ready'}
            </div>
           </div>
           <div className="text-right">
            <div className="text-sm text-white">
             {r.status === 'would_transfer' ? fmtMoney(r.amount_cents) : '—'}
            </div>
            <div className={`text-[11px] mt-0.5 ${
             r.status === 'would_transfer' ? 'text-emerald-300'
              : r.status === 'skipped_no_owed' ? 'text-gray-500'
              : 'text-amber-300'
            }`}>
             {previewStatusLabel(r.status, r.amount_cents)}
            </div>
           </div>
          </li>
         ))}
        </ul>
       )}
      </Panel>
     )}

     {/* KPI strip */}
     <div className="grid sm:grid-cols-3 gap-3">
      <Stat label="Active reps" value={String(reps.filter((r) => r.status === 'active').length)} hint={`${reps.length} total`} />
      <Stat label="Commission this month" value={fmtMoney(totalMtd)} hint="Across all reps · earned" />
      <Stat label="Outstanding" value={fmtMoney(totalOutstanding)} hint="Owed but not yet paid out" />
     </div>

     {err && (
      <Panel>
       <div className="flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load roster</h3>
         <p className="text-sm text-gray-500 mt-1">{err}</p>
        </div>
       </div>
      </Panel>
     )}

     {/* Open invites */}
     {invites.length > 0 && (
      <Panel padding="none">
       <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
        <PanelHeader title="Open invites" eyebrow="awaiting acceptance" />
       </div>
       <ul className="divide-y divide-white/[0.04]">
        {invites.map((i) => (
         <li key={i.token} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
           <div className="text-sm text-gray-200">{i.email}</div>
           <div className="text-[11px] text-gray-500 mt-0.5">
            invited {fmtDate(i.invited_at)} · expires {fmtDate(i.expires_at)}
           </div>
          </div>
          <CopyInviteLink token={i.token} />
         </li>
        ))}
       </ul>
      </Panel>
     )}

     {/* Roster */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
       <PanelHeader title="Roster" eyebrow={`${reps.length} rep${reps.length === 1 ? '' : 's'}`} />
      </div>
      {loading && reps.length === 0 ? (
       <div className="flex items-center justify-center py-10">
        <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      ) : reps.length === 0 ? (
       <div className="px-6 py-10 text-center text-sm text-gray-500">
        No reps yet. Invite your first one with the button above - they&apos;ll get an email to set up
        their account, sign the agreement, and connect their bank.
       </div>
      ) : (
       <ul className="divide-y divide-white/[0.04]">
        {reps.map((r) => (
         <li key={r.id} className="px-5 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
           <div className="min-w-0">
            <Link href={`/admin/sales/${r.id}`} className="text-sm font-medium text-white hover:text-sky-300">
             {r.name}
            </Link>
            <div className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-2 flex-wrap">
             <span>{r.email}</span>
             <span>·</span>
             <span className={r.payouts_enabled ? 'text-emerald-300/90' : 'text-amber-300/90'}>
              {r.payouts_enabled ? 'Stripe payouts ready' : 'Stripe not connected'}
             </span>
             {r.status !== 'active' && (
              <>
               <span>·</span>
               <span className="text-rose-300/90">{r.status}</span>
              </>
             )}
             {r.decay && (
              <>
               <span>·</span>
               <span className={
                r.decay.tier === 'full' ? 'text-emerald-300/90'
                : r.decay.tier === 'reduced' ? 'text-amber-300/90'
                : 'text-rose-300/90'
               }>
                {r.decay.tier === 'full' && `${r.decay.days_since_last_close}d since close`}
                {r.decay.tier === 'reduced' && `25% MRR · ${r.decay.days_until_next_drop ?? 0}d to transfer`}
                {r.decay.tier === 'transferred' && 'Clients transferred'}
               </span>
              </>
             )}
            </div>
           </div>
           <div className="flex items-center gap-6 text-right">
            <div>
             <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">MTD</div>
             <div className="text-sm tabular-nums text-gray-200">{fmtMoney(r.mtd_commission_cents)}</div>
            </div>
            <div>
             <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Lifetime</div>
             <div className="text-sm tabular-nums text-gray-200">{fmtMoney(r.lifetime_commission_cents)}</div>
            </div>
            <div>
             <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Owed</div>
             <div className="text-sm tabular-nums text-amber-300/90">{fmtMoney(r.outstanding_commission_cents)}</div>
            </div>
           </div>
          </div>
         </li>
        ))}
       </ul>
      )}
     </Panel>
    </div>
   </section>

   {showInvite && (
    <InviteModal
     onClose={() => setShowInvite(false)}
     onSent={() => { setShowInvite(false); load() }}
    />
   )}
  </AdminShell>
 )
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
 const [email, setEmail] = useState('')
 const [busy, setBusy] = useState(false)
 const [err, setErr] = useState('')
 const [result, setResult] = useState<{ acceptUrl: string; emailSent: boolean } | null>(null)

 const submit = async () => {
  setBusy(true); setErr('')
  try {
   const res = await fetchWithAuth('/api/admin/sales/reps', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   setResult({ acceptUrl: j.acceptUrl, emailSent: !!j.emailSent })
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setBusy(false)
  }
 }

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
   <button onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close" />
   <div className="relative bg-[#0c0c10] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md">
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2 text-sm font-semibold text-white">
     <UserPlus className="w-4 h-4 text-sky-400" /> Invite a sales rep
    </div>
    <div className="px-6 py-5 space-y-4">
     {!result ? (
      <>
       <p className="text-sm text-gray-400">
        We&apos;ll email them a one-time setup link. They pick a password,
        sign the contractor agreement, then connect their bank via Stripe
        so weekly commissions auto-deposit.
       </p>
       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Email</div>
        <Input
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         placeholder="rep@example.com"
         autoFocus
        />
       </div>
       {err && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl px-3 py-2 text-sm">{err}</div>
       )}
       <div className="flex justify-end gap-2 pt-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={submit} disabled={busy || !email.includes('@')}>
         {busy && <CircleNotch className="w-4 h-4 animate-spin" />}
         <Envelope className="w-4 h-4" /> Send invite
        </PrimaryButton>
       </div>
      </>
     ) : (
      <>
       <div className="bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 rounded-xl px-3 py-2 text-sm flex items-start gap-2">
        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
         {result.emailSent
          ? 'Invite email sent. Copy the link below if you also want to send via Signal/SMS.'
          : "Invite created. RESEND_API_KEY isn't set, so no email was sent - copy this link and send it manually."}
        </span>
       </div>
       <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Setup link</div>
        <div className="flex items-center gap-2">
         <input
          readOnly value={result.acceptUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-200"
         />
         <button
          onClick={() => navigator.clipboard?.writeText(result.acceptUrl)}
          className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
         >
          <Copy className="w-3 h-3" /> copy
         </button>
        </div>
       </div>
       <div className="flex justify-end gap-2 pt-1">
        <PrimaryButton onClick={onSent}>Done</PrimaryButton>
       </div>
      </>
     )}
    </div>
   </div>
  </div>
 )
}

function CopyInviteLink({ token }: { token: string }) {
 const [copied, setCopied] = useState(false)
 const url = typeof window !== 'undefined'
  ? `${window.location.origin}/sales/accept-invite?token=${encodeURIComponent(token)}`
  : ''
 return (
  <button
   onClick={async () => {
    if (!url) return
    await navigator.clipboard?.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
   }}
   className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
  >
   <Copy className="w-3 h-3" /> {copied ? 'copied' : 'copy link'}
  </button>
 )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
 return (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
   <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">{label}</div>
   <div className="text-2xl font-medium text-white tabular-nums">{value}</div>
   <div className="text-xs text-gray-500 mt-1">{hint}</div>
  </div>
 )
}

function fmtMoney(cents: number): string {
 return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(iso: string): string {
 return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function previewStatusLabel(status: string, amount_cents: number): string {
 switch (status) {
  case 'would_transfer': return 'Would transfer'
  case 'skipped_too_small': return `Below $1.00 minimum (${fmtMoney(amount_cents)} rolls over)`
  case 'skipped_no_connect': return 'Stripe Connect not set up'
  case 'skipped_terminated': return 'Rep terminated'
  case 'skipped_no_owed': return 'Nothing owed'
  default: return status
 }
}
