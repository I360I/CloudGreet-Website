'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, FileText, Video, ExternalLink, CheckCircle2, AlertCircle, Mail, Phone, Calendar, UserPlus, Copy } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, Select } from '../../_components/ui'

type App = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string | null
  state: string | null
  linkedin_url: string | null
  years_sales_experience: number | null
  previous_role: string | null
  industries_sold: string | null
  biggest_deal_cents: number | null
  prior_commission_only: boolean | null
  prior_b2b: boolean | null
  about_yourself: string | null
  why_commission_only: string | null
  why_cloudgreet: string | null
  monthly_goal_deals: number | null
  why_can_hit_goal: string | null
  earliest_start_date: string | null
  hours_per_week: number | null
  has_workspace: boolean | null
  resume_url: string | null
  video_url: string | null
  resume_path: string | null
  resume_filename: string | null
  video_path: string | null
  video_filename: string | null
  resume_signed_url: string | null
  video_signed_url: string | null
  status: string
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

const STATUSES = [
  'new', 'reviewing', 'interview_scheduled', 'offered', 'hired', 'rejected', 'withdrawn',
] as const

export default function AdminApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [app, setApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!params?.id) return
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/admin/applications/${params.id}`)
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
        setApp(j.application)
        setStatus(j.application.status)
        setNotes(j.application.admin_notes || '')
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed')
      } finally {
        setLoading(false)
      }
    })()
  }, [params?.id])

  const [interviewBusy, setInterviewBusy] = useState(false)
  const [hireBusy, setHireBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewUrl, setInterviewUrl] = useState('')
  const [interviewNote, setInterviewNote] = useState('')

  const sendInterview = async () => {
    if (!app) return
    setInterviewBusy(true); setActionMsg(null)
    try {
      const res = await fetchWithAuth(`/api/admin/applications/${app.id}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduling_url: interviewUrl.trim() || undefined,
          note: interviewNote.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      setActionMsg({ tone: 'ok', text: `Interview invite emailed to ${app.email}` })
      setShowInterviewModal(false)
      setInterviewNote('')
      // Refresh
      const r2 = await fetchWithAuth(`/api/admin/applications/${app.id}`)
      const j2 = await r2.json().catch(() => ({}))
      if (j2.success) {
        setApp(j2.application)
        setStatus(j2.application.status)
      }
    } catch (e) {
      setActionMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setInterviewBusy(false)
    }
  }

  const sendHire = async () => {
    if (!app) return
    if (!confirm(`Send rep invite to ${app.email}? They'll get an email with a link to set up their account, sign the contractor agreement, and connect Stripe.`)) return
    setHireBusy(true); setActionMsg(null)
    try {
      const res = await fetchWithAuth(`/api/admin/applications/${app.id}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      setActionMsg({
        tone: 'ok',
        text: j.email_sent
          ? `Rep invite emailed to ${app.email}`
          : `Invite created. Email send failed - copy this link to send manually: ${j.accept_url}`,
      })
      // Refresh
      const r2 = await fetchWithAuth(`/api/admin/applications/${app.id}`)
      const j2 = await r2.json().catch(() => ({}))
      if (j2.success) {
        setApp(j2.application)
        setStatus(j2.application.status)
      }
    } catch (e) {
      setActionMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setHireBusy(false)
    }
  }

  const save = async (patch: { status?: string; admin_notes?: string }) => {
    if (!app) return
    setSaving(true)
    try {
      const res = await fetchWithAuth(`/api/admin/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      setApp(j.application)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell activeLabel="Applications">
      <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1100px] mx-auto">
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All applications
        </Link>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {err && !app && <div className="text-sm text-rose-300">{err}</div>}

        {app && (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-5">
              <Panel>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
                      Applicant
                    </div>
                    <h1 className="text-2xl font-medium text-white">
                      {app.first_name} {app.last_name}
                    </h1>
                    <div className="mt-3 space-y-1 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <a href={`mailto:${app.email}`} className="hover:text-sky-300">{app.email}</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <a href={`tel:${app.phone}`} className="hover:text-sky-300">{app.phone}</a>
                      </div>
                      {(app.city || app.state) && (
                        <div className="text-xs text-gray-500">
                          {[app.city, app.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {app.linkedin_url && (
                        <a
                          href={app.linkedin_url}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                        >
                          LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-right font-mono">
                    Submitted<br />
                    <span className="text-gray-300">
                      {new Date(app.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader eyebrow="Materials" title="Resume + intro video" />
                {(app.video_signed_url || app.video_url) && (
                  <div className="mb-3">
                    <video
                      src={app.video_signed_url || app.video_url || undefined}
                      controls
                      preload="metadata"
                      className="w-full max-h-[420px] bg-black rounded-xl"
                    />
                    {app.video_filename && (
                      <div className="text-[11px] text-gray-500 mt-1.5 font-mono">
                        {app.video_filename}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <MaterialLink
                    icon={<FileText className="w-4 h-4" />}
                    label={app.resume_filename || 'Resume'}
                    url={app.resume_signed_url || app.resume_url}
                  />
                  <MaterialLink
                    icon={<Video className="w-4 h-4" />}
                    label={app.video_filename || '90-second intro'}
                    url={app.video_signed_url || app.video_url}
                  />
                </div>
              </Panel>

              <Panel>
                <PanelHeader eyebrow="Sales experience" title="Background" />
                <Grid>
                  <KV label="Years selling" value={app.years_sales_experience != null ? `${app.years_sales_experience}` : '-'} />
                  <KV label="Biggest deal" value={app.biggest_deal_cents ? `$${(app.biggest_deal_cents / 100).toLocaleString()}` : '-'} />
                  <KV label="Commission-only before" value={fmtBool(app.prior_commission_only)} />
                  <KV label="B2B before" value={fmtBool(app.prior_b2b)} />
                </Grid>
                <KVBlock label="Previous role" value={app.previous_role} />
                <KVBlock label="Industries sold to" value={app.industries_sold} />
              </Panel>

              {app.about_yourself && (
                <Panel>
                  <PanelHeader eyebrow="About" title="Tell me about yourself" />
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {app.about_yourself}
                  </div>
                </Panel>
              )}

              {(app.why_commission_only || app.why_cloudgreet) && (
                <Panel>
                  <PanelHeader eyebrow="Why this role" title="Motivation" />
                  <KVBlock label="Why commission-only" value={app.why_commission_only} />
                  <KVBlock label="Why CloudGreet" value={app.why_cloudgreet} />
                </Panel>
              )}

              <Panel>
                <PanelHeader eyebrow="Goals + setup" title="Plan + capacity" />
                <Grid>
                  <KV label="Monthly goal" value={app.monthly_goal_deals != null ? `${app.monthly_goal_deals} deals/mo` : '-'} />
                  <KV label="Hours/week" value={app.hours_per_week != null ? `${app.hours_per_week}` : '-'} />
                  <KV label="Earliest start" value={app.earliest_start_date || '-'} />
                  <KV label="Has workspace" value={fmtBool(app.has_workspace)} />
                </Grid>
                <KVBlock label="Why they can hit the goal" value={app.why_can_hit_goal} />
              </Panel>
            </div>

            {/* Side column */}
            <div className="space-y-5">
              <Panel>
                <PanelHeader eyebrow="Actions" title="Move them forward" />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowInterviewModal(true)}
                    disabled={interviewBusy || hireBusy}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-100 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.06] transition-colors disabled:opacity-40"
                  >
                    {interviewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Send interview invite
                  </button>
                  <button
                    type="button"
                    onClick={sendHire}
                    disabled={interviewBusy || hireBusy}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-400/20 transition-colors disabled:opacity-40"
                  >
                    {hireBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Send rep invite
                  </button>
                </div>
                {actionMsg && (
                  <div className={`mt-3 text-xs leading-relaxed ${actionMsg.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {actionMsg.text}
                  </div>
                )}
              </Panel>

              <Panel>
                <PanelHeader eyebrow="Review" title="Status" />
                <div className="space-y-3">
                  <Select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value)
                      save({ status: e.target.value })
                    }}
                    disabled={saving}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </Select>
                  {app.reviewed_at && (
                    <div className="text-[11px] text-gray-500 font-mono">
                      Last reviewed {new Date(app.reviewed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </Panel>

              <Panel>
                <PanelHeader eyebrow="Internal" title="Notes" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Private notes - only admins see this."
                  className="w-full px-3 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm resize-y"
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-[11px] text-gray-500">
                    {savedFlash && (
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>
                  <PrimaryButton
                    onClick={() => save({ admin_notes: notes })}
                    loading={saving}
                  >
                    Save notes
                  </PrimaryButton>
                </div>
              </Panel>

              {err && (
                <Panel>
                  <div className="flex items-start gap-2 text-rose-300 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    {err}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {showInterviewModal && app && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => !interviewBusy && setShowInterviewModal(false)}
          >
            <div
              className="bg-[#101015] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Interview</div>
              <h3 className="text-base font-medium text-white mb-4">
                Send interview invite to {app.first_name}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Scheduling link
                  </label>
                  <input
                    type="url"
                    value={interviewUrl}
                    onChange={(e) => setInterviewUrl(e.target.value)}
                    placeholder="https://calendly.com/... (or leave blank to use ADMIN_INTERVIEW_URL)"
                    className="w-full px-3 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Personal note (optional)
                  </label>
                  <textarea
                    value={interviewNote}
                    onChange={(e) => setInterviewNote(e.target.value)}
                    rows={3}
                    placeholder="A line or two to add above the scheduling link."
                    className="w-full px-3 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  disabled={interviewBusy}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <PrimaryButton onClick={sendInterview} loading={interviewBusy}>
                  Send invite
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function fmtBool(v: boolean | null) {
  if (v === null || v === undefined) return '-'
  return v ? 'Yes' : 'No'
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mb-3">{children}</div>
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  )
}

function KVBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">{label}</div>
      <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{value}</div>
    </div>
  )
}

function MaterialLink({ icon, label, url }: { icon: React.ReactNode; label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
        {icon} {label} - not provided
      </div>
    )
  }
  return (
    <a
      href={url}
      target="_blank" rel="noreferrer"
      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-3 py-3 text-sm text-white flex items-center gap-2 transition-colors group"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-sky-300" />
    </a>
  )
}
