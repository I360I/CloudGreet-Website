'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarCheck,
  DownloadCloud,
  Headphones,
  Loader2,
  Mic,
  PhoneCall,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type UsageAnalytics = {
  summary: {
    calls30: number
    calls7: number
    avgCallDuration: number
    appointments30: number
    outreach30: number
    pipelineRevenue: number
    conversionRate: number
  }
  trends: Array<{
    label: string
    calls: number
    outreach: number
    appointments: number
  }>
  churn: {
    riskLevel: 'low' | 'medium' | 'high'
    healthScore: number
    drivers: string[]
  }
  recentCalls: Array<{
    id: string
    createdAt: string
    duration: number
    outcome: string | null
    recordingUrl: string | null
    transcript: string | null
    serviceRequested: string | null
  }>
}

const RISK_COLORS: Record<UsageAnalytics['churn']['riskLevel'], string> = {
  low: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10',
  medium: 'text-amber-200 border-amber-400/40 bg-amber-500/10',
  high: 'text-rose-200 border-rose-400/40 bg-rose-500/10'
}

export default function UsageAnalyticsPage() {
  const { showError, showSuccess } = useToast()
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/admin/analytics/usage', {
        headers: {
        }
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to load usage analytics (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to load usage analytics')
      }
      setAnalytics(data.analytics)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage analytics'
      showError('Analytics unavailable', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [showError])

  const trendMax = useMemo(() => {
    if (!analytics) return 1
    return Math.max(
      1,
      ...analytics.trends.map((point) => Math.max(point.calls, point.outreach, point.appointments))
    )
  }, [analytics])

  const exportAnalytics = async () => {
    try {
      setExporting(true)
      const response = await fetchWithAuth('/api/admin/analytics/usage/export', {
        headers: {
        }
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string })?.error ?? 'Failed to export analytics')
      }

      const blob = await response.blob()
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Browser APIs not available')
      }
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'usage-analytics.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showSuccess('Export ready', 'Usage analytics exported.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export analytics'
      showError('Export failed', message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-8">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Usage analytics
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Voice, outreach, and revenue telemetry</h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Quantify how CloudGreet is performing in the field. Every chart is powered by production data so you
              can coach the AI, defend ROI, and ship improvements fast.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : analytics ? (
            <div className="grid gap-6 md:grid-cols-4">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">Calls (30d)</h2>
                  <PhoneCall className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="mt-3 text-4xl font-semibold text-white">{analytics.summary.calls30}</p>
                <p className="mt-1 text-sm text-slate-300">{analytics.summary.calls7} in the last 7 days</p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">Appointments (30d)</h2>
                  <CalendarCheck className="h-5 w-5 text-blue-300" />
                </div>
                <p className="mt-3 text-4xl font-semibold text-white">{analytics.summary.appointments30}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Conversion rate {analytics.summary.conversionRate}% from calls
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">Outreach touches</h2>
                  <Activity className="h-5 w-5 text-violet-300" />
                </div>
                <p className="mt-3 text-4xl font-semibold text-white">{analytics.summary.outreach30}</p>
                <p className="mt-1 text-sm text-slate-300">Sequenced emails/SMS in the last 30 days</p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline revenue</h2>
                  <TrendingUp className="h-5 w-5 text-amber-300" />
                </div>
                <p className="mt-3 text-4xl font-semibold text-white">${analytics.summary.pipelineRevenue}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Avg. call duration {analytics.summary.avgCallDuration} seconds
                </p>
              </article>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
              Usage analytics unavailable. Try refreshing.
            </div>
          )}
        </section>

        {analytics && (
          <>
            <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Churn risk</h2>
                  <p className="text-sm text-slate-300">
                    Weighted across voice engagement, outreach cadence, and pipeline generation.
                  </p>
                </div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${RISK_COLORS[analytics.churn.riskLevel]}`}
                >
                  {analytics.churn.riskLevel} risk · health {analytics.churn.healthScore}
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {analytics.churn.drivers.map((driver) => (
                  <li
                    key={driver}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                  >
                    <Mic className="mt-1 h-4 w-4 flex-shrink-0 text-blue-300" />
                    {driver}
                  </li>
                ))}
                {analytics.churn.drivers.length === 0 && (
                  <li className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    No churn risk drivers detected. Keep logging QA reviews weekly.
                  </li>
                )}
              </ul>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">6-week engagement trend</h2>
                  <p className="text-sm text-slate-300">Calls · outreach · appointments per week</p>
                </div>
                <button
                  type="button"
                  onClick={exportAnalytics}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                  Export CSV
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {analytics.trends.map((point) => (
                  <div key={point.label} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{point.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-emerald-200">
                          <PhoneCall className="h-3.5 w-3.5" />
                          {point.calls}
                        </span>
                        <span className="inline-flex items-center gap-1 text-violet-200">
                          <Activity className="h-3.5 w-3.5" />
                          {point.outreach}
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-200">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {point.appointments}
                        </span>
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-emerald-500/20">
                        <div
                          className="h-full rounded-full bg-emerald-400/80"
                          style={{ width: `${(point.calls / trendMax) * 100}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-violet-500/20">
                        <div
                          className="h-full rounded-full bg-violet-400/80"
                          style={{ width: `${(point.outreach / trendMax) * 100}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-amber-500/20">
                        <div
                          className="h-full rounded-full bg-amber-400/80"
                          style={{ width: `${(point.appointments / trendMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Recent calls & transcripts</h2>
                  <p className="text-sm text-slate-300">
                    Audit conversations directly from the dashboard. These entries power the QA workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAnalytics}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {analytics.recentCalls.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                    No call transcripts yet. Run a test call from the QA workspace after onboarding.
                  </div>
                ) : (
                  analytics.recentCalls.map((call) => (
                    <details
                      key={call.id}
                      className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-blue-400/40"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm text-slate-200">
                        <span className="flex flex-col gap-1">
                          <span className="text-base font-semibold text-white">
                            {call.serviceRequested ?? 'Inbound call'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(call.createdAt).toLocaleString()} · {call.duration}s · outcome{' '}
                            {call.outcome ?? 'n/a'}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                          <Headphones className="h-3.5 w-3.5" />
                          Transcript
                        </span>
                      </summary>
                      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200">
                        {call.recordingUrl && (
                          <a
                            href={call.recordingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                          >
                            <Headphones className="h-3.5 w-3.5" />
                            Listen to recording
                          </a>
                        )}
                        <p className="whitespace-pre-wrap">
                          {call.transcript ?? 'Transcript not available yet. Check Retell processing status.'}
                        </p>
                      </div>
                    </details>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

