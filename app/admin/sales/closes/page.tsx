'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, WarningCircle, ArrowLeft, CheckCircle, XCircle, ArrowSquareOut, Trash } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel, PanelHeader } from '../../_components/ui'

type Close = {
  id: string
  rep_id: string
  business_id: string | null
  prospect_business_name: string
  prospect_contact_name: string | null
  prospect_email: string | null
  prospect_phone: string | null
  agreed_monthly_cents: number
  agreed_setup_fee_cents: number | null
  notes: string | null
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  created_at: string
  rep: { id: string; email: string; first_name: string | null; last_name: string | null } | null
  business: { id: string; business_name: string } | null
}

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'invoice_sent', label: 'Invoice sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function AdminClosesPage() {
  const [tab, setTab] = useState<typeof STATUS_TABS[number]['key']>('pending')
  const [closes, setCloses] = useState<Close[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = async () => {
    setLoading(true)
    setErr('')
    try {
      const res = await fetchWithAuth(`/api/admin/sales/closes?status=${tab}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Failed to load')
      else setCloses(j.closes || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const counts = useMemo(() => ({ [tab]: closes.length }), [tab, closes.length])

  const convert = async (id: string) => {
    if (!confirm(
      `Convert to client?\n\n` +
      `· Creates a custom_users + businesses row\n` +
      `· Stamps rep_id + agreed pricing on the business\n` +
      `· Links close → business and advances status to invoice_sent\n` +
      `· Returns a temp password (you'll see it next)\n\n` +
      `After this, the Stripe invoice.paid webhook will credit the rep automatically.`,
    )) return
    setWorking(id)
    try {
      const res = await fetchWithAuth(`/api/admin/sales/closes/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Convert failed')
      } else {
        const pwd = j.temp_password
        const url = `/admin/clients/${j.business.id}`
        prompt(
          `Client created.\n\n` +
          `Email: ${j.user.email}\n` +
          `Temp password (copy now - won't be shown again):`,
          pwd,
        )
        await load()
        // Open the client detail in a new tab so admin can finish onboarding.
        window.open(url, '_blank')
      }
    } finally {
      setWorking(null)
    }
  }

  const setStatus = async (id: string, status: Close['status']) => {
    setWorking(id)
    try {
      const res = await fetchWithAuth(`/api/admin/sales/closes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error || 'Update failed')
      } else {
        await load()
      }
    } finally {
      setWorking(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this close? This is only for spam - use Reject for normal cases.')) return
    setWorking(id)
    try {
      const res = await fetchWithAuth(`/api/admin/sales/closes/${id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Delete failed')
      else await load()
    } finally {
      setWorking(null)
    }
  }

  return (
    <AdminShell activeLabel="Sales">
      <section className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="max-w-6xl space-y-6">
          <Link
            href="/admin/sales"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-3 h-3" /> Sales team
          </Link>

          <header>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
              owner console
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
              Closes
            </h1>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Reps submit deals here. Approve to mark the invoice as sent, reject if
              it's not real. The Stripe webhook flips a close to <em className="not-italic font-mono">paid</em> and writes the commission ledger when the client pays.
            </p>
          </header>

          {err && (
            <Panel>
              <div className="flex items-start gap-3">
                <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">{err}</p>
              </div>
            </Panel>
          )}

          <div className="flex items-center gap-1 border-b border-white/[0.06]">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'text-white border-sky-400'
                    : 'text-gray-500 border-transparent hover:text-gray-200'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <span className="ml-1.5 text-[10px] text-gray-500 tabular-nums">
                    {counts[tab] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Panel padding="none">
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
              <PanelHeader
                title={STATUS_TABS.find((s) => s.key === tab)?.label || ''}
                eyebrow={`${closes.length} close${closes.length === 1 ? '' : 's'}`}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : closes.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                Nothing here.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {closes.map((c) => {
                  const repName = c.rep
                    ? [c.rep.first_name, c.rep.last_name].filter(Boolean).join(' ') || c.rep.email
                    : '-'
                  const busy = working === c.id
                  return (
                    <li key={c.id} className="px-5 sm:px-6 py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">
                            {c.prospect_business_name}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>by <span className="text-gray-300">{repName}</span></span>
                            <span>·</span>
                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {fmtMoney(c.agreed_monthly_cents)}/mo
                              {c.agreed_setup_fee_cents
                                ? ` + ${fmtMoney(c.agreed_setup_fee_cents)} setup`
                                : ''}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap gap-x-3">
                            {c.prospect_contact_name && <span>{c.prospect_contact_name}</span>}
                            {c.prospect_email && <span>{c.prospect_email}</span>}
                            {c.prospect_phone && <span>{c.prospect_phone}</span>}
                          </div>
                          {c.notes && (
                            <div className="mt-2 text-xs text-gray-300 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 whitespace-pre-wrap">
                              {c.notes}
                            </div>
                          )}
                          {c.business && (
                            <div className="mt-2 text-[11px]">
                              <Link
                                href={`/admin/clients/${c.business.id}`}
                                className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                              >
                                <ArrowSquareOut className="w-3 h-3" /> {c.business.business_name}
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          {c.status === 'pending' && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => convert(c.id)}
                                className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 rounded-lg px-3 py-1.5 disabled:opacity-60 font-medium"
                              >
                                {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Convert to client
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setStatus(c.id, 'rejected')}
                                className="inline-flex items-center gap-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg px-3 py-1.5 disabled:opacity-60"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {c.status === 'invoice_sent' && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => setStatus(c.id, 'paid')}
                                className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg px-3 py-1.5 disabled:opacity-60"
                              >
                                {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Mark paid
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setStatus(c.id, 'cancelled')}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {(c.status === 'rejected' || c.status === 'cancelled') && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => setStatus(c.id, 'pending')}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-60"
                              >
                                Reopen
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => remove(c.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 border border-rose-500/20 rounded-lg px-2.5 py-1.5 disabled:opacity-60"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {c.status === 'paid' && (
                            <span className="text-[10px] font-mono uppercase tracking-wider rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20 px-2 py-0.5">
                              commission earned
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </AdminShell>
  )
}
