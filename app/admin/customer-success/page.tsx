'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  Mail,
  PhoneIncoming,
  Rocket,
  Users
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Snapshot = {
  businessId: string
  businessName: string
  ownerName: string | null
  ownerEmail: string | null
  subscriptionStatus: string | null
  accountAgeDays: number
  onboardingLagDays: number
  healthScore: number
  alerts: string[]
  activation: {
    onboardingCompleted: boolean
    onboardingStep: number
    calendarConnected: boolean
    numberProvisioned: boolean
    outreachRunning: boolean
    firstCallHandled: boolean
    createdAt: string
    lastCallAt: string | null
    lastOutreachAt: string | null
    callsLast7Days: number
    outreachLast7Days: number
  }
}

export default function CustomerSuccessPage() {
  const { showError, showSuccess } = useToast()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadSnapshot = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/admin/customer-success', {
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
        throw new Error(errorData?.error || `Failed to load customer success snapshot (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to load customer success snapshot')
      }
      setSnapshot(data.snapshot)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load customer success snapshot'
      showError('Customer success dashboard unavailable', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSnapshot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const milestones = useMemo(() => {
    if (!snapshot || !snapshot.activation) return []
    return [
      {
        title: 'Onboarding complete',
        complete: snapshot.activation.onboardingCompleted,
        description:
          snapshot.activation.onboardingCompleted
            ? `Completed in ${snapshot.onboardingLagDays} day(s)`
            : 'Finish the onboarding wizard to unlock automations',
        icon: Rocket
      },
      {
        title: 'Calendar connected',
        complete: snapshot.activation.calendarConnected,
        description: snapshot.activation.calendarConnected
          ? 'Scheduling is live'
          : 'Connect Google/Microsoft calendar to book appointments',
        icon: CalendarCheck
      },
      {
        title: 'Number provisioned',
        complete: snapshot.activation.numberProvisioned,
        description: snapshot.activation.numberProvisioned
          ? 'Dedicated CloudGreet number is ready'
          : 'Assign a toll-free number from the inventory',
        icon: PhoneIncoming
      },
      {
        title: 'Outreach running',
        complete: snapshot.activation.outreachRunning,
        description:
          snapshot.activation.outreachRunning && snapshot.activation.outreachLast7Days > 0
            ? `${snapshot.activation.outreachLast7Days} outreach touches in last 7 days`
            : 'Launch a sequence to keep pipeline warm',
        icon: Activity
      },
      {
        title: 'Calls handled',
        complete: snapshot.activation.firstCallHandled,
        description: snapshot.activation.firstCallHandled
          ? `Last call ${snapshot.activation.lastCallAt ? new Date(snapshot.activation.lastCallAt).toLocaleString() : 'recently'}`
          : 'Run a live test call to QA the receptionist',
        icon: Users
      }
    ]
  }, [snapshot])

  const exportHealthReport = async () => {
    try {
      setExporting(true)
      const response = await fetchWithAuth('/api/admin/customer-success/export', {
        headers: {
        }
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string })?.error ?? 'Failed to export')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customer-health-${snapshot?.businessId}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      showSuccess('Export ready', 'Health snapshot downloaded.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export health report'
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
            Customer success cockpit
          </span>
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
              Activation health for {snapshot?.businessName ?? 'your team'}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Track onboarding milestones, catch stalled accounts before they churn, and share exportable health
              reports with success and revops. Everything is computed from live product usage—zero spreadsheets.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : snapshot ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">Health score</h2>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-tight">{snapshot.healthScore}</span>
                  <span className="text-sm text-slate-400">/100</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Weighted across onboarding, activation, outreach, and usage.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">Account age</h2>
                  <CalendarCheck className="h-5 w-5 text-blue-300" />
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-tight">{snapshot.accountAgeDays}</span>
                  <span className="text-sm text-slate-400">days</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Onboarding lag: {snapshot.onboardingLagDays} day(s) from signup to completed wizard.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">Owner</h2>
                  <Mail className="h-5 w-5 text-purple-300" />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-lg font-semibold text-white">{snapshot.ownerName ?? 'Unassigned'}</p>
                  <p className="text-sm text-slate-300">{snapshot.ownerEmail ?? 'No owner email'}</p>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                    Subscription: {snapshot.subscriptionStatus ?? 'unknown'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 text-center text-slate-400">
              Unable to load customer success metrics right now.
            </div>
          )}
        </section>

        {snapshot && snapshot.activation && (
          <>
            <section className="grid gap-5 md:grid-cols-2">
              {milestones.map((milestone) => (
                <article
                  key={milestone.title}
                  className={`rounded-3xl border ${
                    milestone.complete ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                  } p-6`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-2xl p-3 ${
                        milestone.complete ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      <milestone.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-white">{milestone.title}</h3>
                      <p className="text-sm text-slate-300">{milestone.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-white/10 bg-black/40 p-4 md:p-6 shadow-2xl shadow-blue-900/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Alerts & playbook follow-ups</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Use the success playbook to resolve these before they become churn risks.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exportHealthReport}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                    Export health report
                  </button>
                  <button
                    type="button"
                    onClick={loadSnapshot}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {snapshot.alerts.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-100">
                    No open alerts. Keep recording QA reviews weekly to maintain conversational quality.
                  </div>
                ) : (
                  snapshot.alerts.map((alert, index) => (
                    <div
                      key={`${alert}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-100"
                    >
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{alert}</p>
                    </div>
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

