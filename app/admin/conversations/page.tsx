'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, RisingFade } from '../_components/ui'
import {
  ArrowSquareOut,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowClockwise,
} from '@phosphor-icons/react'
import type { SmsHealthReport, HealthIssue } from '@/lib/sms-health'

const STEVE_ID = '650406c3-5585-446e-958d-0fbcccf54795'

type Convo = {
  id: string
  businessName: string
  customerPhone: string
  reportToken: string | null
  messageCount: number
  inboundCount: number
  lastMessage: { direction: string; body: string; at: string } | null
  lastActivity: string
  outcome: 'booked' | 'dispatch' | null
}

function fmtPhone(p: string): string {
  const d = (p || '').replace(/\D/g, '')
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
  return p
}

function relTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function IssueBadge({ issue }: { issue: HealthIssue }) {
  const critical = issue.severity === 'critical'
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${critical ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300'}`}>
      <div className="flex items-center gap-1.5 font-medium mb-0.5">
        {critical
          ? <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          : <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="uppercase tracking-wider text-[10px]">{issue.type.replace(/_/g, ' ')}</span>
        <span className="text-gray-500 ml-auto">{issue.businessName}</span>
      </div>
      <div className="text-gray-400">{fmtPhone(issue.customerPhone) || issue.customerPhone} — {issue.detail}</div>
    </div>
  )
}

type PingResult = { ok: true; reply: string; ms: number } | { ok: false; error: string; ms: number } | null

function HealthPanel({ businessId, label }: { businessId?: string; label: string }) {
  const [report, setReport] = useState<SmsHealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ping, setPing] = useState<PingResult>(null)
  const [pinging, setPinging] = useState(false)

  const runPing = async () => {
    if (!businessId) return
    setPinging(true)
    setPing(null)
    try {
      const res = await fetchWithAuth(`/api/admin/sms-ping?businessId=${businessId}`)
      const j = await res.json()
      setPing(j)
    } catch (e) {
      setPing({ ok: false, error: e instanceof Error ? e.message : 'Failed', ms: 0 })
    } finally {
      setPinging(false)
    }
  }

  const run = async () => {
    setLoading(true)
    setError('')
    setReport(null)
    const pingPromise = businessId ? runPing() : Promise.resolve()
    try {
      const params = new URLSearchParams({ windowHours: '24' })
      if (businessId) params.set('businessId', businessId)
      const res = await fetchWithAuth(`/api/admin/sms-health?${params}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      setReport(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
    await pingPromise
  }

  const criticals = report?.issues.filter((i) => i.severity === 'critical') || []
  const warnings = report?.issues.filter((i) => i.severity === 'warning') || []
  const isRunning = loading || pinging

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <button
          onClick={run}
          disabled={isRunning}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          {isRunning
            ? <CircleNotch className="w-3.5 h-3.5 animate-spin" />
            : <ArrowClockwise className="w-3.5 h-3.5" />}
          {isRunning ? 'Checking...' : 'Run check'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Live ping result — only shown for client-specific panels */}
      {businessId && ping && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${ping.ok ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          {ping.ok
            ? <CheckCircle className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <span className={`font-medium ${ping.ok ? 'text-sky-300' : 'text-red-300'}`}>
              {ping.ok ? `Agent live (${ping.ms}ms)` : `Agent unreachable · ${ping.error}`}
            </span>
            {ping.ok && (
              <p className="text-gray-500 truncate mt-0.5">&ldquo;{ping.reply}&rdquo;</p>
            )}
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {/* Status bar */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${report.healthy ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            {report.healthy
              ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            <span className={`text-sm font-medium ${report.healthy ? 'text-emerald-300' : 'text-red-300'}`}>
              {report.healthy ? 'All clear' : `${criticals.length} critical issue${criticals.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Convos', value: report.totalConversations },
              { label: 'Msgs', value: report.totalMessages },
              { label: 'Booked', value: report.bookings },
              { label: 'Dispatch', value: report.dispatches },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] rounded-lg px-2 py-2 text-center">
                <div className="text-lg font-semibold text-white">{s.value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI summary */}
          <p className="text-xs text-gray-400 leading-relaxed">{report.aiSummary}</p>

          {/* Issues */}
          {report.issues.length > 0 && (
            <div className="space-y-1.5">
              {[...criticals, ...warnings].map((issue, i) => (
                <IssueBadge key={i} issue={issue} />
              ))}
            </div>
          )}

          {report.reviewRequestsFailed > 0 && (
            <p className="text-xs text-yellow-400">{report.reviewRequestsFailed} review SMS failed to send.</p>
          )}

          <p className="text-[10px] text-gray-600">Last 24h · checked {relTime(report.generatedAt)}</p>
        </div>
      )}
    </div>
  )
}

export default function AdminConversationsPage() {
  const [convos, setConvos] = useState<Convo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/admin/conversations')
        const j = await res.json()
        if (!alive) return
        if (!res.ok) { setError(j.error || 'Failed to load'); return }
        setConvos(j.conversations || [])
      } catch { if (alive) setError('Failed to load') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const badge = (o: Convo['outcome']) =>
    o === 'booked'
      ? <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">booked</span>
      : o === 'dispatch'
      ? <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/20">dispatch</span>
      : null

  return (
    <AdminShell activeLabel="Texts">
      <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <RisingFade>
          {/* Health checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <Panel>
              <PanelHeader eyebrow="SmartRide / Steve" title="Text-to-book health" />
              <HealthPanel businessId={STEVE_ID} label="Last 24h for Steve" />
            </Panel>
            <Panel>
              <PanelHeader eyebrow="All clients" title="Network SMS health" />
              <HealthPanel label="Last 24h across all businesses" />
            </Panel>
          </div>

          {/* Conversation list */}
          <Panel>
            <PanelHeader eyebrow="Text-to-book" title="SMS conversations" />
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-sm text-rose-300 py-6">{error}</div>
            ) : convos.length === 0 ? (
              <div className="text-sm text-gray-500 py-10 text-center">No text-to-book conversations yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {convos.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{fmtPhone(c.customerPhone)}</span>
                        <span className="text-[11px] text-gray-500">{c.businessName}</span>
                        {badge(c.outcome)}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {c.lastMessage
                          ? `${c.lastMessage.direction === 'inbound' ? '' : 'Agent: '}${c.lastMessage.body}`
                          : 'No messages'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-gray-500">{relTime(c.lastActivity)}</div>
                      <div className="text-[11px] text-gray-600">{c.messageCount} msgs · {c.inboundCount} in</div>
                    </div>
                    {c.reportToken && (
                      <a
                        href={`/r/${c.reportToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                      >
                        Report <ArrowSquareOut className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </RisingFade>
      </div>
    </AdminShell>
  )
}
