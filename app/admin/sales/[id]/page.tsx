'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
 Loader2, ArrowLeft, AlertCircle, CheckCircle2, Pause, RotateCcw, Trash2, KeyRound,
 Mail, MapPin, Hash, Copy, Send, ExternalLink,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel, PanelHeader, GhostButton, DangerButton, PrimaryButton, StatusPill } from '../../_components/ui'

type RepDetail = {
 success: true
 rep: {
  id: string
  email: string
  name: string
  first_name: string | null
  last_name: string | null
  status: 'active' | 'paused' | 'terminated'
  created_at: string | null
  last_login: string | null
  legal_name: string | null
  street_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  agreement_version: string | null
  agreement_signed_at: string | null
  stripe_connect_account_id: string | null
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
  terminated_at: string | null
  lead_scrape_limit: number
  max_monthly_cents: number
  max_setup_cents: number
  telnyx_outbound_number: string | null
  telnyx_provision_error: string | null
 }
 kpis: {
  mtd_commission_cents: number
  lifetime_commission_cents: number
  outstanding_commission_cents: number
  ytd_paid_cents: number
  tax_year: number
  ten99_required: boolean
  client_count: number
  close_count: number
 }
 clients: Array<{
  id: string
  business_name: string
  subscription_status: string | null
  monthly_price_cents: number | null
  setup_fee_cents: number | null
  created_at: string
 }>
 commissions: Array<{
  id: string
  business_id: string
  source_type: 'mrr' | 'setup_fee'
  gross_paid_cents: number
  commission_cents: number
  earned_at: string
  payout_id: string | null
 }>
 closes: Array<{
  id: string
  prospect_business_name: string
  agreed_monthly_cents: number
  agreed_setup_fee_cents: number | null
  status: string
  created_at: string
 }>
}

export default function RepDetailPage() {
 const params = useParams<{ id: string }>()
 const router = useRouter()
 const id = params?.id || ''
 const [data, setData] = useState<RepDetail | null>(null)
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(true)
 const [busy, setBusy] = useState<string | null>(null)

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth(`/api/admin/sales/reps/${id}`)
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   setData(j)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed')
  } finally { setLoading(false) }
 }
 useEffect(() => { if (id) load() /* eslint-disable-line */ }, [id])

 const setStatus = async (status: 'active' | 'paused' | 'terminated', confirmText?: string) => {
  if (confirmText && !confirm(confirmText)) return
  setBusy(status)
  try {
   const res = await fetchWithAuth(`/api/admin/sales/reps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   await load()
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Failed')
  } finally { setBusy(null) }
 }

 const saveScrapeLimit = async (limit: number) => {
  setBusy('limit')
  try {
   const res = await fetchWithAuth(`/api/admin/sales/reps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lead_scrape_limit: limit }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   await load()
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Failed')
  } finally { setBusy(null) }
 }

 const savePriceCaps = async (max_monthly_cents: number, max_setup_cents: number) => {
  setBusy('caps')
  try {
   const res = await fetchWithAuth(`/api/admin/sales/reps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ max_monthly_cents, max_setup_cents }),
   })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   await load()
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Failed')
  } finally { setBusy(null) }
 }

 const hardDelete = async () => {
  if (!confirm(
   `Permanently delete this rep? This is only allowed if they have no commission history.\n\n` +
   `If they have history, terminate them instead - that revokes their login but keeps the 1099 trail.`
  )) return
  setBusy('delete')
  try {
   const res = await fetchWithAuth(`/api/admin/sales/reps/${id}`, { method: 'DELETE' })
   const j = await res.json().catch(() => ({}))
   if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
   router.push('/admin/sales')
  } catch (e) {
   alert(e instanceof Error ? e.message : 'Failed')
   setBusy(null)
  }
 }

 if (loading && !data) {
  return (
   <AdminShell activeLabel="Sales">
    <div className="flex items-center justify-center py-32">
     <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
    </div>
   </AdminShell>
  )
 }
 if (error || !data) {
  return (
   <AdminShell activeLabel="Sales">
    <section className="px-4 lg:px-8 py-6 lg:py-10 max-w-3xl">
     <Link href="/admin/sales" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 mb-6">
      <ArrowLeft className="w-3.5 h-3.5" /> back to sales
     </Link>
     <Panel>
      <div className="flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
       <div>
        <h1 className="text-base font-medium text-white">Couldn&apos;t load rep</h1>
        <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
       </div>
      </div>
     </Panel>
    </section>
   </AdminShell>
  )
 }

 const { rep, kpis, clients, commissions, closes } = data

 return (
  <AdminShell activeLabel="Sales">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-5xl space-y-6">
     <Link href="/admin/sales" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300">
      <ArrowLeft className="w-3.5 h-3.5" /> back to sales
     </Link>

     <header className="flex items-end justify-between gap-4 flex-wrap">
      <div>
       <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
        {rep.name}
       </h1>
       <div className="text-xs text-gray-400 mt-2 inline-flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{rep.email}</span>
        <StatusPill status={rep.status} />
        {rep.stripe_payouts_enabled
         ? <span className="text-emerald-300/90">Stripe payouts ready</span>
         : <span className="text-amber-300/90">Stripe not connected</span>}
       </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
       {rep.status === 'active' && (
        <GhostButton
         onClick={() => setStatus('paused', 'Pause this rep? They can\'t sign in but commissions still accrue.')}
         disabled={busy === 'paused'}
        >
         <Pause className="w-4 h-4" /> Pause
        </GhostButton>
       )}
       {rep.status === 'paused' && (
        <GhostButton onClick={() => setStatus('active')} disabled={busy === 'active'}>
         <RotateCcw className="w-4 h-4" /> Reactivate
        </GhostButton>
       )}
       {rep.status !== 'terminated' ? (
        <DangerButton
         onClick={() => setStatus('terminated', 'Terminate this rep? This revokes their login and stops new commissions, but keeps the 1099 trail intact. Existing commissions still get paid out.')}
         disabled={busy === 'terminated'}
        >
         <Pause className="w-4 h-4" /> Terminate
        </DangerButton>
       ) : (
        <GhostButton onClick={() => setStatus('active')} disabled={busy === 'active'}>
         <RotateCcw className="w-4 h-4" /> Reinstate
        </GhostButton>
       )}
       <DangerButton onClick={hardDelete} disabled={busy === 'delete'}>
        <Trash2 className="w-4 h-4" /> Delete
       </DangerButton>
      </div>
     </header>

     <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <Stat label="MTD" value={fmtMoney(kpis.mtd_commission_cents)} hint="This month's commission" />
      <Stat label="Lifetime" value={fmtMoney(kpis.lifetime_commission_cents)} hint="Total earned" />
      <Stat label="Owed" value={fmtMoney(kpis.outstanding_commission_cents)} hint="Pending Friday payout" />
      <Stat
       label={`YTD ${kpis.tax_year}`}
       value={fmtMoney(kpis.ytd_paid_cents)}
       hint={kpis.ten99_required
        ? '1099-NEC required · Stripe files'
        : `${fmtMoney(60_000 - kpis.ytd_paid_cents)} from $600`}
      />
      <Stat label="Clients" value={String(kpis.client_count)} hint={`${kpis.close_count} closes total`} />
     </div>

     {/* Profile */}
     <Panel>
      <PanelHeader title="Profile" eyebrow="for 1099" />
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
       <Field label="Legal name" value={rep.legal_name} />
       <Field label="Agreement signed" value={rep.agreement_signed_at ? `${fmtDate(rep.agreement_signed_at)} · ${rep.agreement_version || 'v?'}` : null} />
       <Field
        label="Mailing address"
        value={[rep.street_address, [rep.city, rep.state, rep.zip_code].filter(Boolean).join(', ')]
         .filter(Boolean).join(' · ') || null}
       />
       <Field label="Stripe account" value={rep.stripe_connect_account_id} mono />
       <Field label="Created" value={rep.created_at ? fmtDate(rep.created_at) : null} />
       <Field label="Last login" value={rep.last_login ? relTime(rep.last_login) : 'never'} />
      </dl>
     </Panel>

     {/* Permissions */}
     <Panel>
      <PanelHeader title="Permissions" eyebrow="rep limits" />
      <ScrapeLimitField
       initial={rep.lead_scrape_limit}
       saving={busy === 'limit'}
       onSave={saveScrapeLimit}
      />
     </Panel>

     {/* Dialer caller-ID */}
     <Panel>
      <PanelHeader title="Dialer number" eyebrow="outbound caller id" />
      <DialerNumberField
       repId={rep.id}
       current={rep.telnyx_outbound_number}
       lastError={rep.telnyx_provision_error}
       onProvisioned={load}
      />
     </Panel>

     {/* Slack notifications */}
     <Panel>
      <PanelHeader title="Slack notifications" eyebrow="agent-complete pings" />
      <SlackSection repId={rep.id} repEmail={rep.email} repName={rep.name} />
     </Panel>

     {/* Clients */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
       <PanelHeader title="Clients brought in" eyebrow={`${clients.length}`} />
      </div>
      {clients.length === 0 ? (
       <div className="px-6 py-6 text-sm text-gray-500">No clients yet.</div>
      ) : (
       <ul className="divide-y divide-white/[0.04]">
        {clients.map((c) => (
         <li key={c.id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
           <Link href={`/admin/clients/${c.id}`} className="text-sm font-medium text-white hover:text-sky-300">
            {c.business_name}
           </Link>
           <div className="text-[11px] text-gray-500 mt-0.5">
            signed {fmtDate(c.created_at)} · {c.subscription_status || 'no sub'}
           </div>
          </div>
          <div className="text-right text-sm tabular-nums">
           <div className="text-gray-200">{c.monthly_price_cents ? `${fmtMoney(c.monthly_price_cents)}/mo` : '-'}</div>
           {c.setup_fee_cents ? <div className="text-[11px] text-gray-500">+ {fmtMoney(c.setup_fee_cents)} setup</div> : null}
          </div>
         </li>
        ))}
       </ul>
      )}
     </Panel>

     {/* Recent commissions */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
       <PanelHeader title="Recent commissions" eyebrow={`${commissions.length} shown`} />
      </div>
      {commissions.length === 0 ? (
       <div className="px-6 py-6 text-sm text-gray-500">No commissions yet - they appear after invoices pay.</div>
      ) : (
       <ul className="divide-y divide-white/[0.04]">
        {commissions.map((c) => (
         <li key={c.id} className="px-5 sm:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div>
           <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 bg-sky-400/5 border border-sky-400/20 rounded px-1.5 py-0.5 mr-2">
            {c.source_type === 'mrr' ? 'mrr' : 'setup'}
           </span>
           <span className="text-xs text-gray-400">{fmtDate(c.earned_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm tabular-nums">
           <span className="text-gray-500">{fmtMoney(c.gross_paid_cents)} gross</span>
           <span className="text-emerald-300">{fmtMoney(c.commission_cents)} earned</span>
           <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
            c.payout_id ? 'bg-emerald-400/5 text-emerald-300/80 border border-emerald-400/20' : 'bg-amber-400/5 text-amber-300/80 border border-amber-400/20'
           }`}>
            {c.payout_id ? 'paid' : 'owed'}
           </span>
          </div>
         </li>
        ))}
       </ul>
      )}
     </Panel>

     {/* Recent closes */}
     <Panel padding="none">
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
       <PanelHeader title="Recent submitted closes" eyebrow={`${closes.length} shown`} />
      </div>
      {closes.length === 0 ? (
       <div className="px-6 py-6 text-sm text-gray-500">No submitted closes yet.</div>
      ) : (
       <ul className="divide-y divide-white/[0.04]">
        {closes.map((cl) => (
         <li key={cl.id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
           <div className="text-sm text-white">{cl.prospect_business_name}</div>
           <div className="text-[11px] text-gray-500 mt-0.5">{fmtDate(cl.created_at)} · {cl.status}</div>
          </div>
          <div className="text-right text-sm tabular-nums">
           <div className="text-gray-200">{fmtMoney(cl.agreed_monthly_cents)}/mo</div>
           {cl.agreed_setup_fee_cents ? <div className="text-[11px] text-gray-500">+ {fmtMoney(cl.agreed_setup_fee_cents)} setup</div> : null}
          </div>
         </li>
        ))}
       </ul>
      )}
     </Panel>
    </div>
   </section>
  </AdminShell>
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

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
 return (
  <div>
   <dt className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">{label}</dt>
   <dd className={`text-gray-200 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</dd>
  </div>
 )
}

function fmtMoney(cents: number): string {
 return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(iso: string): string {
 return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function relTime(iso: string): string {
 const t = new Date(iso).getTime()
 const min = Math.floor((Date.now() - t) / 60000)
 if (min < 1) return 'just now'
 if (min < 60) return `${min}m ago`
 const h = Math.floor(min / 60)
 if (h < 24) return `${h}h ago`
 const d = Math.floor(h / 24)
 if (d < 30) return `${d}d ago`
 return new Date(iso).toLocaleDateString()
}

function ScrapeLimitField({
 initial, saving, onSave,
}: {
 initial: number
 saving: boolean
 onSave: (n: number) => void
}) {
 const [value, setValue] = useState(String(initial))
 useEffect(() => { setValue(String(initial)) }, [initial])
 const num = parseInt(value, 10)
 const dirty = Number.isFinite(num) && num !== initial && num >= 1 && num <= 10000
 return (
  <div className="flex items-end gap-3 flex-wrap">
   <div>
    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
     Scrape results per job
    </label>
    <input
     type="number"
     min={1}
     max={10000}
     value={value}
     onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
     className="w-32 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-400/50"
    />
    <p className="text-[11px] text-gray-500 mt-1.5">
     Default 100. Raise for power reps; cap is 10,000.
    </p>
   </div>
   <button
    onClick={() => onSave(num)}
    disabled={!dirty || saving}
    className="text-xs bg-sky-500/15 text-sky-300 border border-sky-400/20 hover:bg-sky-500/25 rounded-lg px-3 py-2 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
   >
    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
    Save
   </button>
  </div>
 )
}

function SlackSection({ repId, repEmail, repName }: {
 repId: string; repEmail: string; repName: string
}) {
 type State = {
  email: string | null
  slack_user_id: string | null
  mention_tag: string | null
  current_env: string
  suggested_env: string
  already_included: boolean
  bot_token_configured: boolean
  invite_url: string | null
  lookup_error: string | null
 }
 const [s, setS] = useState<State | null>(null)
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState<string | null>(null)
 const [manualId, setManualId] = useState('')
 const [copied, setCopied] = useState<'tag' | 'env' | null>(null)

 const load = async () => {
  setLoading(true); setErr(null)
  try {
   const r = await fetchWithAuth(`/api/admin/sales/${repId}/slack-id`)
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }
   setS(j)
  } finally {
   setLoading(false)
  }
 }
 useEffect(() => { void load() }, [repId])

 const copy = async (value: string, kind: 'tag' | 'env') => {
  try { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(null), 1500) } catch { /* non-fatal */ }
 }

 // Build a "suggested env" string from a manually-entered ID when the
 // bot lookup isn't available (no SLACK_BOT_TOKEN set).
 const manualTag = (() => {
  const raw = manualId.trim().replace(/^<@/, '').replace(/>$/, '')
  if (!raw) return null
  return `<@${raw}>`
 })()
 const manualSuggested = (() => {
  if (!manualTag || !s) return null
  const tokens = new Set(s.current_env.split(/\s+/).map((t) => t.trim()).filter(Boolean))
  tokens.add(manualTag)
  return Array.from(tokens).join(' ')
 })()
 const manualAlready = !!(s && manualTag && s.current_env.split(/\s+/).map((t) => t.trim()).includes(manualTag))

 if (loading) {
  return <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up Slack…</div>
 }
 if (err || !s) {
  return <div className="text-xs text-rose-300 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> {err || 'Could not load'}</div>
 }

 return (
  <div className="space-y-4 text-sm">
   {/* Invite (only if SLACK_INVITE_URL is set) */}
   {s.invite_url ? (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 flex items-center justify-between gap-3 flex-wrap">
     <div className="text-xs text-gray-400">
      Send {repName} a Slack workspace invite. They&apos;ll show up in the lookup below once they accept.
     </div>
     <div className="flex items-center gap-2 flex-wrap">
      <a
       href={`mailto:${repEmail}?subject=${encodeURIComponent('Join us on Slack')}&body=${encodeURIComponent(`Hey ${repName.split(' ')[0]} - join the CloudGreet Slack so you get the agent-complete pings:\n\n${s.invite_url}\n\nSee you in there.`)}`}
       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]"
      >
       <Send className="w-3.5 h-3.5" /> Email invite
      </a>
      <a
       href={s.invite_url}
       target="_blank"
       rel="noreferrer"
       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]"
      >
       Open invite link <ExternalLink className="w-3.5 h-3.5" />
      </a>
     </div>
    </div>
   ) : (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200/90">
     Set <span className="font-mono">SLACK_INVITE_URL</span> in Vercel to a workspace invite link (Slack admin → Invitations → Copy invite link) and an &quot;Email invite&quot; button shows up here.
    </div>
   )}

   {/* Lookup result */}
   {s.bot_token_configured ? (
    s.slack_user_id && s.mention_tag ? (
     <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
       <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-200 text-xs">Found in workspace</span>
        {s.already_included && (
         <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
          already in mention list
         </span>
        )}
       </div>
       <button onClick={load} className="text-[10px] text-gray-500 hover:text-gray-200">Refresh</button>
      </div>
      <div className="mt-2 grid sm:grid-cols-2 gap-2">
       <Field2 label="Member ID" value={s.slack_user_id} mono />
       <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Mention tag</div>
        <div className="flex items-center gap-2">
         <code className="font-mono text-xs text-gray-200 bg-black/40 border border-white/10 rounded px-2 py-1 flex-1 break-all">{s.mention_tag}</code>
         <GhostButton onClick={() => copy(s.mention_tag!, 'tag')}>
          {copied === 'tag' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          Copy
         </GhostButton>
        </div>
       </div>
      </div>
     </div>
    ) : (
     <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200/90">
      <div className="flex items-center gap-2 mb-1">
       <AlertCircle className="w-3.5 h-3.5" />
       <strong className="text-amber-200">Not in the Slack workspace yet</strong>
      </div>
      Looked up <span className="font-mono">{s.email || repEmail}</span> via Slack&apos;s API; they aren&apos;t a member.
      {s.lookup_error && <div className="mt-1 font-mono text-[11px] text-amber-300/70">{s.lookup_error}</div>}
      <div className="mt-2">Send the invite above, then click <button onClick={load} className="underline">refresh</button>.</div>
     </div>
    )
   ) : (
    /* Manual mode - no SLACK_BOT_TOKEN */
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 space-y-2">
     <div className="text-xs text-gray-400">
      <span className="font-mono">SLACK_BOT_TOKEN</span> isn&apos;t set, so we can&apos;t auto-lookup. Paste {repName.split(' ')[0]}&apos;s Slack member ID here (in Slack: click name → More → Copy member ID).
     </div>
     <div className="flex items-center gap-2">
      <div className="relative flex-1">
       <Hash className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
       <input
        value={manualId}
        onChange={(e) => setManualId(e.target.value)}
        placeholder="U01ABC234"
        spellCheck={false}
        className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-gray-200 focus:border-sky-400/40 focus:outline-none"
       />
      </div>
      {manualTag && (
       <GhostButton onClick={() => copy(manualTag, 'tag')}>
        {copied === 'tag' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        Copy tag
       </GhostButton>
      )}
     </div>
     {manualTag && (
      <div className="text-[11px] text-gray-500 font-mono">
       Tag: <span className="text-gray-300">{manualTag}</span>
       {manualAlready && <span className="text-emerald-300 ml-2">(already in env)</span>}
      </div>
     )}
    </div>
   )}

   {/* Suggested env value */}
   {(s.suggested_env || manualSuggested) && (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3">
     <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
      <div>
       <div className="text-xs text-sky-200 font-medium">Vercel env value</div>
       <div className="text-[11px] text-sky-300/70 mt-0.5">
        Set <span className="font-mono">SLACK_AGENT_COMPLETE_MENTIONS</span> in Vercel → Settings → Environment Variables, then redeploy.
       </div>
      </div>
      <GhostButton onClick={() => copy(manualSuggested || s.suggested_env, 'env')}>
       {copied === 'env' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
       {copied === 'env' ? 'Copied' : 'Copy for Vercel'}
      </GhostButton>
     </div>
     <code className="block font-mono text-[11px] text-gray-200 bg-black/40 border border-white/10 rounded px-2 py-1.5 break-all">
      {manualSuggested || s.suggested_env}
     </code>
    </div>
   )}

   {/* Current env (read-only display, helps debug) */}
   {s.current_env && (
    <div className="text-[11px] text-gray-500">
     Currently deployed: <code className="font-mono text-gray-400">{s.current_env}</code>
    </div>
   )}
  </div>
 )
}

function Field2({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
 return (
  <div>
   <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">{label}</div>
   <div className={`text-xs text-gray-200 ${mono ? 'font-mono' : ''} break-all`}>{value}</div>
  </div>
 )
}

function DialerNumberField({
 repId, current, lastError, onProvisioned,
}: {
 repId: string
 current: string | null
 lastError: string | null
 onProvisioned: () => void
}) {
 const [areaCode, setAreaCode] = useState('')
 const [busy, setBusy] = useState(false)
 const [err, setErr] = useState<string | null>(null)
 const [okMsg, setOkMsg] = useState<string | null>(null)

 const provision = async (force: boolean) => {
  setBusy(true); setErr(null); setOkMsg(null)
  try {
   const r = await fetchWithAuth(`/api/admin/sales/reps/${repId}/provision-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area_code: areaCode.trim() || undefined, force }),
   })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.success) {
    setErr(j?.error || `Failed (${r.status})`)
   } else {
    setOkMsg(j.reused ? `Already had ${j.phone_number}` : `Provisioned ${j.phone_number}`)
    onProvisioned()
   }
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Failed')
  } finally {
   setBusy(false)
  }
 }

 return (
  <div className="space-y-3">
   {current ? (
    <div className="flex items-center gap-2 text-sm">
     <span className="font-mono tabular-nums text-white">{current}</span>
     <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">active</span>
    </div>
   ) : (
    <div className="text-sm text-gray-400">No personal number yet · falling back to env default.</div>
   )}

   {lastError && !current && (
    <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
     Last attempt failed: {lastError}
    </div>
   )}

   <div className="flex items-end gap-3 flex-wrap">
    <div>
     <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
      Area code (optional)
     </label>
     <input
      type="text"
      inputMode="numeric"
      maxLength={3}
      placeholder="512"
      value={areaCode}
      onChange={(e) => setAreaCode(e.target.value.replace(/[^0-9]/g, ''))}
      className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-400/50"
     />
     <p className="text-[11px] text-gray-500 mt-1.5">
      Telnyx will pick from this area code first; falls back to any US local if none free.
     </p>
    </div>
    <button
     onClick={() => provision(current ? true : false)}
     disabled={busy}
     className="text-xs bg-sky-500/15 text-sky-300 border border-sky-400/20 hover:bg-sky-500/25 rounded-lg px-3 py-2 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
    >
     {busy && <Loader2 className="w-3 h-3 animate-spin" />}
     {current ? 'Replace number' : 'Provision number'}
    </button>
   </div>

   {err && <div className="text-[11px] text-rose-300">{err}</div>}
   {okMsg && <div className="text-[11px] text-emerald-300">{okMsg}</div>}
  </div>
 )
}

function PriceCapField({
 initialMonthly, initialSetup, saving, onSave,
}: {
 initialMonthly: number
 initialSetup: number
 saving: boolean
 onSave: (monthly: number, setup: number) => void
}) {
 const [monthly, setMonthly] = useState(String(Math.round(initialMonthly / 100)))
 const [setup, setSetup] = useState(String(Math.round(initialSetup / 100)))
 useEffect(() => { setMonthly(String(Math.round(initialMonthly / 100))) }, [initialMonthly])
 useEffect(() => { setSetup(String(Math.round(initialSetup / 100))) }, [initialSetup])
 const m = parseInt(monthly, 10)
 const s = parseInt(setup, 10)
 const dirty =
  Number.isFinite(m) && Number.isFinite(s) &&
  (m * 100 !== initialMonthly || s * 100 !== initialSetup) &&
  m >= 50 && m <= 50000 && s >= 0 && s <= 50000
 return (
  <div>
   <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
    Self-serve payment-link caps
   </div>
   <div className="flex items-end gap-3 flex-wrap">
    <div>
     <label className="block text-[11px] text-gray-400 mb-1">Max monthly $</label>
     <div className="flex items-center gap-1">
      <span className="text-gray-500 text-sm">$</span>
      <input
       type="number" min={50} max={50000}
       value={monthly}
       onChange={(e) => setMonthly(e.target.value.replace(/[^0-9]/g, ''))}
       className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-400/50"
      />
     </div>
    </div>
    <div>
     <label className="block text-[11px] text-gray-400 mb-1">Max setup $</label>
     <div className="flex items-center gap-1">
      <span className="text-gray-500 text-sm">$</span>
      <input
       type="number" min={0} max={50000}
       value={setup}
       onChange={(e) => setSetup(e.target.value.replace(/[^0-9]/g, ''))}
       className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-400/50"
      />
     </div>
    </div>
    <button
     onClick={() => onSave(m * 100, s * 100)}
     disabled={!dirty || saving}
     className="text-xs bg-sky-500/15 text-sky-300 border border-sky-400/20 hover:bg-sky-500/25 rounded-lg px-3 py-2 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
    >
     {saving && <Loader2 className="w-3 h-3 animate-spin" />}
     Save
    </button>
   </div>
   <p className="text-[11px] text-gray-500 mt-2">
    Reps generating self-serve payment links can&apos;t go above these. Defaults: $1500 / $1500.
   </p>
  </div>
 )
}
