'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, Key, ArrowLeft, PhoneCall, ChatText, Voicemail, WarningCircle, CheckCircle, Play, Pause } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel, PanelHeader, GhostButton } from '../../_components/ui'

type CallStats = { attempts: number; connects: number; talk_seconds: number }

type Detail = {
  setter: {
    id: string; email: string; name: string; is_active: boolean
    created_at: string | null; last_active: string | null
    assigned_rep_id: string | null; weekly_demo_goal: number
    personal_cell: string | null; has_vm_recording: boolean; has_vm_script: boolean
  }
  calls: { today: CallStats; week: CallStats; all_time: CallStats }
  daily: { date: string; dials: number; connects: number }[]
  weekly_goal: { target: number; this_week: number; streak_weeks: number; streak_target: number; bonus_earned: boolean; bonus_amount: number }
  pipeline: Record<string, number>
  demos_set: { id: string; business: string | null; status: string; demo_at: string | null; created_at: string }[]
  recent_calls: { id: string; at: string; status: string; seconds: number; to: string; lead: string | null; has_recording?: boolean }[]
  messages: { sent: number; received: number; failed: number }
  numbers: { phone_number: string; label: string | null; is_active: boolean; is_sms_line: boolean }[]
  reps: { id: string; name: string }[]
}

const fmtTalk = (s: number) => {
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
const fmtWhen = (iso: string | null) => iso
  ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—'
const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, '').replace(/^1/, '')
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p
}

export default function AdminSetterDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Detail | null>(null)
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const r = await fetchWithAuth(`/api/admin/setters/${params.id}`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.success) setErr(j?.error || 'Failed to load')
      else setData(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    }
  }
  useEffect(() => { void load() }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (body: Record<string, unknown>) => {
    const r = await fetchWithAuth(`/api/admin/setters/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) void load()
  }

  if (err) {
    return (
      <AdminShell activeLabel="Setters">
        <div className="px-8 py-10 text-sm text-rose-400">{err}</div>
      </AdminShell>
    )
  }
  if (!data) {
    return (
      <AdminShell activeLabel="Setters">
        <div className="flex justify-center py-20"><CircleNotch className="w-5 h-5 animate-spin opacity-60" /></div>
      </AdminShell>
    )
  }

  const { setter, calls, daily, weekly_goal: goal, pipeline, demos_set, recent_calls, messages, numbers, reps } = data
  const connectRate = (s: CallStats) => s.attempts > 0 ? `${Math.round((s.connects / s.attempts) * 100)}%` : '—'
  const maxDials = Math.max(1, ...daily.map((d) => d.dials))

  return (
    <AdminShell activeLabel="Setters">
      <section className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="max-w-6xl space-y-6">
          <Link href="/admin/setters" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft className="w-3.5 h-3.5" /> All setters
          </Link>

          {/* Header */}
          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-medium tracking-tight text-white flex items-center gap-3">
                {setter.name}
                {!setter.is_active && <span className="text-xs text-rose-300/90 font-sans">disabled</span>}
                {goal.bonus_earned && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                    ${goal.bonus_amount} bonus earned
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {setter.email} · joined {setter.created_at ? new Date(setter.created_at).toLocaleDateString() : '—'} · last active {fmtWhen(setter.last_active)}
              </p>
            </div>
            <GhostButton
              disabled={!setter.is_active}
              onClick={async () => {
                try {
                  const r = await fetch(`/api/admin/sales/reps/${setter.id}/impersonate`, { method: 'POST', credentials: 'include' })
                  const j = await r.json().catch(() => ({}))
                  if (r.ok && j?.success) {
                    const { clearClientAuthState } = await import('@/lib/auth/session-guard')
                    clearClientAuthState()
                    window.location.href = j.redirect_url || '/setter'
                  } else alert(j?.error || 'Could not log in as this setter')
                } catch { alert('Could not log in as this setter') }
              }}
            >
              <Key className="w-4 h-4" /> Login as
            </GhostButton>
          </header>

          {/* Call stats: today / week / all-time */}
          <div className="grid sm:grid-cols-3 gap-3">
            {([['Today', calls.today], ['This week', calls.week], ['All-time', calls.all_time]] as [string, CallStats][]).map(([label, s]) => (
              <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">{label}</div>
                <div className="text-2xl font-medium text-white tabular-nums">{s.attempts} <span className="text-sm text-gray-500 font-normal">dials</span></div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.connects} connects ({connectRate(s)}) · {fmtTalk(s.talk_seconds)} talk
                </div>
              </div>
            ))}
          </div>

          {/* 14-day activity + goal/settings */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel className="lg:col-span-2">
              <div className="text-sm font-semibold text-white mb-4">Last 14 days</div>
              <div className="space-y-1.5">
                {daily.map((d) => (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="w-14 shrink-0 font-mono text-gray-500">
                      {new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </span>
                    <div className="flex-1 h-3.5 bg-white/[0.03] rounded overflow-hidden flex">
                      <div className="h-full bg-sky-500/70" style={{ width: `${(d.dials / maxDials) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-gray-400 tabular-nums">
                      {d.dials} dials · {d.connects} conn
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="text-sm font-semibold text-white mb-4">Setup & goal</div>
              <div className="space-y-3 text-sm">
                <Row label="Demos go to">
                  <select
                    value={setter.assigned_rep_id || ''}
                    onChange={(e) => void patch({ assigned_rep_id: e.target.value || null })}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none"
                  >
                    <option value="">No rep (unrouted)</option>
                    {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Row>
                <Row label="Weekly goal">
                  <input
                    type="number" min={1} max={50} defaultValue={setter.weekly_demo_goal}
                    onBlur={(e) => { const n = Number(e.target.value); if (n >= 1 && n <= 50 && n !== setter.weekly_demo_goal) void patch({ weekly_demo_goal: n }) }}
                    className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-right text-gray-200 tabular-nums focus:outline-none"
                  />
                </Row>
                <Row label="This week">
                  <span className="text-gray-200 tabular-nums">{goal.this_week}/{goal.target} demos held · streak {goal.streak_weeks}/{goal.streak_target} wks</span>
                </Row>
                <Row label="Voicemail drop">
                  {setter.has_vm_recording
                    ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle weight="fill" className="w-3.5 h-3.5" /> recorded</span>
                    : setter.has_vm_script
                      ? <span className="text-amber-300">script only (AI voice)</span>
                      : <span className="inline-flex items-center gap-1 text-amber-300"><WarningCircle className="w-3.5 h-3.5" /> default script</span>}
                </Row>
                <Row label="Inbound cell">
                  <span className="text-gray-200">{setter.personal_cell ? fmtPhone(setter.personal_cell) : 'none (voicemail)'}</span>
                </Row>
                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Numbers</div>
                  {numbers.length === 0 && <div className="text-xs text-gray-500">none</div>}
                  {numbers.map((n) => (
                    <div key={n.phone_number} className="text-xs text-gray-300 flex items-center gap-2">
                      {n.is_sms_line ? <ChatText className="w-3.5 h-3.5 text-gray-500" /> : <PhoneCall className="w-3.5 h-3.5 text-gray-500" />}
                      <span className="tabular-nums">{fmtPhone(n.phone_number)}</span>
                      <span className="text-gray-500">{n.label || (n.is_sms_line ? 'SMS' : '')}{n.is_active ? ' · active' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* Pipeline + messages */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel className="lg:col-span-2">
              <div className="text-sm font-semibold text-white mb-4">Lead pipeline ({pipeline.total})</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {([
                  ['New', pipeline.new], ['Called', pipeline.called], ['Voicemail', pipeline.voicemail],
                  ['Interested', pipeline.interested], ['Demo set', pipeline.demo_scheduled],
                  ['Demo held', pipeline.demo_showed], ['Not avail', pipeline.not_available],
                  ['Not interested', pipeline.not_interested], ['Wrong DM', pipeline.wrong_dm],
                  ['Dead', pipeline.dead], ['DNC', pipeline.do_not_call], ['Untouched', pipeline.untouched],
                ] as [string, number][]).map(([label, n]) => (
                  <div key={label}>
                    <div className="text-lg text-white tabular-nums">{n}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <div className="text-sm font-semibold text-white mb-4">Texts</div>
              <div className="space-y-2 text-sm">
                <Row label="Sent"><span className="text-gray-200 tabular-nums">{messages.sent}</span></Row>
                <Row label="Received"><span className="text-gray-200 tabular-nums">{messages.received}</span></Row>
                <Row label="Failed">
                  <span className={`tabular-nums ${messages.failed > 0 ? 'text-rose-300' : 'text-gray-200'}`}>{messages.failed}</span>
                </Row>
              </div>
            </Panel>
          </div>

          {/* Demos set + recent calls */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel padding="none">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
                <PanelHeader title="Demos set" eyebrow={`${demos_set.length} in rep pipeline`} />
              </div>
              {demos_set.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">No demos booked yet.</div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {demos_set.map((d) => (
                    <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-200 truncate">{d.business || 'Unknown'}</div>
                        <div className="text-[11px] text-gray-500">demo {fmtWhen(d.demo_at)}</div>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 shrink-0">{d.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel padding="none">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
                <PanelHeader title="Recent calls" eyebrow="last 15" />
              </div>
              {recent_calls.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">No calls yet.</div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {recent_calls.map((c, i) => (
                    <li key={c.id || i} className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        {c.has_recording && <RecordingButton callId={c.id} />}
                        <span className="text-gray-200 truncate">{c.lead || fmtPhone(c.to)}</span>
                        <span className="text-gray-500">{fmtWhen(c.at)}</span>
                      </div>
                      <span className="shrink-0 tabular-nums text-gray-400">
                        {c.status}{c.seconds > 0 ? ` · ${c.seconds}s` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </section>
    </AdminShell>
  )
}

/** Play a call recording: fetches a signed URL on first play, then
 *  toggles an inline audio element. Admin-only surface. */
function RecordingButton({ callId }: { callId: string }) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)

  const toggle = async () => {
    if (audio) {
      if (playing) { audio.pause(); setPlaying(false) }
      else { void audio.play(); setPlaying(true) }
      return
    }
    setLoading(true)
    try {
      const r = await fetchWithAuth(`/api/admin/rep-calls/${callId}/recording`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.url) { alert(j?.error || 'Recording unavailable'); return }
      const a = new Audio(j.url)
      a.onended = () => setPlaying(false)
      a.onpause = () => setPlaying(false)
      a.onplay = () => setPlaying(true)
      setAudio(a)
      void a.play()
    } catch { alert('Could not load recording') }
    finally { setLoading(false) }
  }

  return (
    <button
      onClick={() => void toggle()}
      title="Play recording"
      className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
    >
      {loading ? <CircleNotch className="w-3 h-3 animate-spin" /> : playing ? <Pause weight="fill" className="w-3 h-3" /> : <Play weight="fill" className="w-3 h-3" />}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  )
}
