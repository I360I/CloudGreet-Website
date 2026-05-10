'use client'

/**
 * /admin/system-health
 *
 * Operator dashboard. Shows real signal across configuration, pipeline,
 * money, trouble, and schedule. Sections that can't be computed render
 * as "not available" with a reason, never zeroes-as-fact.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, ArrowsClockwise, CheckCircle, WarningCircle, ArrowSquareOut, Phone } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader } from '../_components/ui'

type Section<T> = { available: true; data: T } | { available: false; reason: string }
type EnvFlags = Record<string, boolean>
type TelnyxBalance = { balance_dollars: number; currency: string } | null

type Health = {
  success: boolean
  generated_at: string
  config: { env: EnvFlags; telnyx_balance: Section<TelnyxBalance> }
  pipeline: {
    closes_by_status: Section<Record<string, number>>
    closes_pending_agent: Section<number>
    closes_stuck_after_paid: Section<Array<{ close_id: string; business_name: string; updated_at: string; missing: string[] }>>
    onboardings_abandoned: Section<Array<{ business_id: string; business_name: string; created_at: string; calcom_done: boolean; forwarding_done: boolean }>>
    active_businesses: Section<number>
  }
  schedule: {
    upcoming_demos: Section<Array<{ close_id: string; business_name: string; scheduled_at: string; rep_name: string | null; agent_status: string | null }>>
  }
  money: {
    recent_dunning: Section<Array<{ id: string; business_id: string; event_type: string; amount_cents: number | null; created_at: string }>>
    reps_with_stuck_stripe: Section<Array<{ id: string; name: string; email: string; created_at: string }>>
    recent_paid_closes: Section<Array<{ close_id: string; business_name: string; monthly_cents: number | null; paid_at: string }>>
  }
  trouble: {
    calls_last_24h: Section<{ total: number; avg_duration_secs: number; very_short_count: number; very_short_pct: number }>
    failed_review_last_24h: Section<Array<{ id: string; phone: string; reason: string | null; when: string }>>
    cron_alive: Section<{ latest_activity_at: string | null; latest_status: string | null }>
  }
}

export default function SystemHealthPage() {
  const [data, setData] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)

  const load = async () => {
    setReloading(true)
    try {
      const r = await fetchWithAuth('/api/admin/system-health')
      const j = await r.json().catch(() => ({}))
      if (j?.success) setData(j)
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }
  useEffect(() => { void load() }, [])

  if (loading || !data) {
    return (
      <AdminShell activeLabel="Tools">
        <div className="px-5 sm:px-8 py-6 sm:py-8">
          <CircleNotch className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">Operator</div>
            <h1 className="text-2xl font-medium tracking-tight text-white">System health</h1>
            <p className="text-sm text-gray-400 mt-1.5">
              Real signal only. Sections that can&apos;t be computed say so explicitly — no fake zeros.
            </p>
          </div>
          <button
            onClick={load}
            disabled={reloading}
            className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
          >
            {reloading ? <CircleNotch className="w-3 h-3 animate-spin" /> : <ArrowsClockwise className="w-3 h-3" />}
            Refresh
          </button>
        </div>

        {/* Coming up - top because it's time-sensitive */}
        <Panel>
          <PanelHeader title="Demos in the next 24 hours" eyebrow="schedule" />
          <SectionRender section={data.schedule.upcoming_demos}>
            {(rows) => rows.length === 0 ? (
              <p className="text-xs text-gray-500">Nothing booked. Calm before the storm.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((d) => (
                  <li key={d.close_id} className="flex items-center justify-between gap-3 flex-wrap text-sm">
                    <div className="min-w-0">
                      <div className="text-gray-200 truncate">{d.business_name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {new Date(d.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {d.rep_name && ` · ${d.rep_name}`}
                        {d.agent_status && ` · agent: ${d.agent_status}`}
                      </div>
                    </div>
                    <Link href={`/admin/agents-due/${d.close_id}`} className="text-xs text-fuchsia-300 hover:text-fuchsia-200 inline-flex items-center gap-1">
                      Open <ArrowSquareOut className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionRender>
        </Panel>

        {/* Configuration */}
        <div className="mt-4 grid lg:grid-cols-[2fr_1fr] gap-4">
          <Panel>
            <PanelHeader title="Environment configuration" eyebrow={`${countSet(data.config.env)} / ${Object.keys(data.config.env).length} set`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.entries(data.config.env).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {v ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <WarningCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className={`font-mono ${v ? 'text-gray-300' : 'text-rose-300'}`}>{k}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Telnyx balance" eyebrow="live" />
            <SectionRender section={data.config.telnyx_balance}>
              {(b) => b ? (
                <>
                  <div className={`text-3xl font-mono ${b.balance_dollars < 20 ? 'text-rose-300' : b.balance_dollars < 100 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    ${b.balance_dollars.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {b.balance_dollars < 20 ? 'Low — top up before the next batch fires.' : b.balance_dollars < 100 ? 'Watch this.' : 'Healthy.'}
                  </div>
                </>
              ) : <p className="text-xs text-gray-500">No Telnyx API key — set TELNYX_API_KEY.</p>}
            </SectionRender>
          </Panel>
        </div>

        {/* Pipeline */}
        <div className="mt-4">
          <Panel>
            <PanelHeader title="Active pipeline" eyebrow="where work is queued" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label="Active businesses" value={getValue(data.pipeline.active_businesses)} />
              <Stat label="Pending agent build" value={getValue(data.pipeline.closes_pending_agent)} link="/admin/agents-due" tone={isPositive(data.pipeline.closes_pending_agent) ? 'sky' : 'gray'} />
              <Stat label="Stuck after paid" value={countOf(data.pipeline.closes_stuck_after_paid)} tone={countOf(data.pipeline.closes_stuck_after_paid) > 0 ? 'rose' : 'gray'} />
              <Stat label="Onboard >7d abandoned" value={countOf(data.pipeline.onboardings_abandoned)} tone={countOf(data.pipeline.onboardings_abandoned) > 0 ? 'amber' : 'gray'} />
            </div>

            <SectionRender section={data.pipeline.closes_stuck_after_paid}>
              {(rows) => rows.length > 0 && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-3 mb-3">
                  <div className="text-xs font-medium text-rose-200 mb-2">Closes paid &gt;24h ago, agent still missing</div>
                  <ul className="space-y-1 text-[11px]">
                    {rows.map((c) => (
                      <li key={c.close_id} className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-gray-200 font-mono">{c.business_name}</span>
                        <span className="text-rose-300">missing: {c.missing.join(', ')}</span>
                        <Link href={`/admin/clients/${c.business_id || ''}`} className="text-xs text-sky-300 hover:text-sky-200">Open</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionRender>

            <SectionRender section={data.pipeline.onboardings_abandoned}>
              {(rows) => rows.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
                  <div className="text-xs font-medium text-amber-200 mb-2">Abandoned onboardings (created &gt;7 days ago, never finished)</div>
                  <ul className="space-y-1 text-[11px]">
                    {rows.map((b) => (
                      <li key={b.business_id} className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-gray-200">{b.business_name}</span>
                        <span className="text-gray-500 font-mono">cal {b.calcom_done ? '✓' : '✗'} · fwd {b.forwarding_done ? '✓' : '✗'}</span>
                        <Link href={`/admin/clients/${b.business_id}`} className="text-xs text-sky-300 hover:text-sky-200">Open</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionRender>
          </Panel>
        </div>

        {/* Money */}
        <div className="mt-4">
          <Panel>
            <PanelHeader title="Money" eyebrow="dunning + reps + recent revenue" />
            <div className="grid lg:grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Recent failed payments (7d)</div>
                <SectionRender section={data.money.recent_dunning}>
                  {(rows) => rows.length === 0 ? (
                    <p className="text-xs text-gray-500">None — clean.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {rows.slice(0, 5).map((d) => (
                        <li key={d.id} className="text-rose-300 font-mono">
                          {d.event_type} · ${d.amount_cents ? (d.amount_cents / 100).toFixed(2) : '?'} · {timeAgo(d.created_at)}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionRender>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Reps with stuck Stripe Connect</div>
                <SectionRender section={data.money.reps_with_stuck_stripe}>
                  {(rows) => rows.length === 0 ? (
                    <p className="text-xs text-gray-500">All set up.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {rows.slice(0, 5).map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <span className="text-amber-300">{r.name}</span>
                          <Link href={`/admin/sales/${r.id}`} className="text-xs text-sky-300 hover:text-sky-200 ml-auto">Open</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionRender>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Recent paid closes</div>
                <SectionRender section={data.money.recent_paid_closes}>
                  {(rows) => rows.length === 0 ? (
                    <p className="text-xs text-gray-500">No paid closes yet.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {rows.map((c) => (
                        <li key={c.close_id} className="text-emerald-200">
                          {c.business_name} · ${c.monthly_cents ? (c.monthly_cents / 100).toFixed(0) : '?'}/mo · {timeAgo(c.paid_at)}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionRender>
              </div>
            </div>
          </Panel>
        </div>

        {/* Trouble */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <Panel>
            <PanelHeader title="Calls (last 24h)" eyebrow="quality signal" />
            <SectionRender section={data.trouble.calls_last_24h}>
              {(d) => d.total === 0 ? (
                <p className="text-xs text-gray-500">No calls in the last 24h.</p>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <Stat label="Total" value={d.total} />
                    <Stat label="Avg duration" value={`${d.avg_duration_secs}s`} />
                    <Stat label="<30s (likely failed)" value={`${d.very_short_pct}%`} tone={d.very_short_pct > 30 ? 'rose' : d.very_short_pct > 15 ? 'amber' : 'gray'} />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Calls under 30 seconds usually mean the agent confused the caller and they hung up. Watch this number daily.
                  </p>
                </div>
              )}
            </SectionRender>
          </Panel>

          <Panel>
            <PanelHeader title="Failed review SMS (last 24h)" eyebrow="cron worker" />
            <SectionRender section={data.trouble.failed_review_last_24h}>
              {(rows) => rows.length === 0 ? (
                <p className="text-xs text-gray-500">No failures.</p>
              ) : (
                <ul className="space-y-1 text-[11px]">
                  {rows.map((r) => (
                    <li key={r.id} className="text-rose-300 font-mono break-all">
                      +{r.phone} · {r.reason || '(no reason)'} · {timeAgo(r.when)}
                    </li>
                  ))}
                </ul>
              )}
            </SectionRender>
          </Panel>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <Panel>
            <PanelHeader title="Closes by status" eyebrow="sales pipeline" />
            <SectionRender section={data.pipeline.closes_by_status}>
              {(counts) => (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(counts).map(([status, n]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono">{status}</span>
                      <span className="text-gray-200 font-mono">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionRender>
          </Panel>

          <Panel>
            <PanelHeader title="Cron heartbeat (review worker)" eyebrow="last activity" />
            <SectionRender section={data.trouble.cron_alive}>
              {(d) => d.latest_activity_at ? (
                <div>
                  <div className="text-sm text-gray-200">
                    Last review_requests update: <span className="font-mono">{timeAgo(d.latest_activity_at)}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Latest status: <span className="font-mono">{d.latest_status}</span>. Cron fires daily at 9am ET. If &gt;30h ago and you have queued rows, something&apos;s off.
                  </div>
                </div>
              ) : <p className="text-xs text-gray-500">No review_requests rows yet — cron has nothing to do.</p>}
            </SectionRender>
          </Panel>
        </div>

        <div className="mt-6 text-[10px] font-mono text-gray-600 text-right">
          generated {new Date(data.generated_at).toLocaleString()}
        </div>
      </div>
    </AdminShell>
  )
}

/* -------------------- helpers -------------------- */

function SectionRender<T>({ section, children }: { section: Section<T>; children: (data: T) => React.ReactNode }) {
  if (!section.available) {
    return (
      <div className="text-[11px] text-gray-500 inline-flex items-center gap-1.5">
        <WarningCircle className="w-3 h-3 text-amber-400" />
        not available · <span className="font-mono">{section.reason}</span>
      </div>
    )
  }
  return <>{children(section.data)}</>
}

function Stat({ label, value, tone = 'gray', link }: { label: string; value: string | number; tone?: 'gray' | 'sky' | 'rose' | 'amber'; link?: string }) {
  const color = tone === 'rose' ? 'text-rose-300' : tone === 'amber' ? 'text-amber-300' : tone === 'sky' ? 'text-sky-300' : 'text-gray-200'
  const inner = (
    <div className="bg-black/30 border border-white/5 rounded-lg p-3">
      <div className={`text-2xl font-medium font-mono ${color}`}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
  return link ? <Link href={link} className="block hover:opacity-80 transition-opacity">{inner}</Link> : inner
}

function countSet(env: EnvFlags): number {
  return Object.values(env).filter(Boolean).length
}

function getValue<T>(s: Section<T>): T | string {
  return s.available ? s.data : '?'
}

function isPositive<T>(s: Section<T>): boolean {
  return s.available && typeof s.data === 'number' && (s.data as unknown as number) > 0
}

function countOf<T>(s: Section<T[]>): number {
  return s.available ? s.data.length : 0
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
