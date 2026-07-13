'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, UserPlus, Envelope, Copy, WarningCircle, CheckCircle, PhoneCall, Key } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, Input } from '../_components/ui'

type WeeklyGoal = {
  target: number
  this_week: number
  met_this_week: boolean
  base_hourly_rate: number
  bonus_hourly_rate: number
  current_rate: number
}

type Setter = {
  id: string
  email: string
  name: string
  is_active: boolean
  last_login: string | null
  last_active: string | null
  created_at: string | null
  calls_today: { attempts: number; connects: number; talk_seconds: number }
  weekly_goal: WeeklyGoal
  personal_cell?: string | null
  assigned_rep_id: string | null
}

type Rep = { id: string; name: string; email: string }

type OpenInvite = {
  token: string
  email: string
  invited_at: string
  expires_at: string
}

export default function AdminSettersPage() {
  const [setters, setSetters] = useState<Setter[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [invites, setInvites] = useState<OpenInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth('/api/admin/setters')
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      setSetters(j.setters || [])
      setReps(j.reps || [])
      setInvites(j.open_invites || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const totalAttemptsToday = setters.reduce((s, r) => s + (r.calls_today?.attempts || 0), 0)

  return (
    <AdminShell activeLabel="Setters">
      <section className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="max-w-6xl space-y-6">
          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
                owner console
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
                Setters
              </h1>
              <p className="text-sm text-gray-400 mt-2 max-w-2xl">
                Cold-callers who qualify leads and book demos - they use the same dialer and
                scraper as sales reps but don&apos;t close deals or earn commission.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PrimaryButton onClick={() => setShowInvite(true)}>
                <UserPlus className="w-4 h-4" /> Invite setter
              </PrimaryButton>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 gap-3">
            <Stat label="Active setters" value={String(setters.filter((s) => s.is_active).length)} hint={`${setters.length} total`} />
            <Stat label="Dials today" value={String(totalAttemptsToday)} hint="Across all setters" />
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

          <Panel padding="none">
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-white/[0.06]">
              <PanelHeader title="Roster" eyebrow={`${setters.length} setter${setters.length === 1 ? '' : 's'}`} />
            </div>
            {loading && setters.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : setters.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No setters yet. Invite your first one with the button above - they&apos;ll get
                an email to set up their account and start dialing.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {setters.map((s) => (
                  <li key={s.id} className="px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
                          <Link href={`/admin/setters/${s.id}`} className="hover:text-sky-300 transition-colors">
                            {s.name}
                          </Link>
                          {s.weekly_goal.bonus_hourly_rate > s.weekly_goal.base_hourly_rate && s.weekly_goal.met_this_week && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                              on ${s.weekly_goal.bonus_hourly_rate}/hr this week
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-2 flex-wrap">
                          <span>{s.email}</span>
                          <span>·</span>
                          <LastActive iso={s.last_active} />
                          {!s.is_active && (
                            <>
                              <span>·</span>
                              <span className="text-rose-300/90">disabled</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-5 flex-wrap">
                        <RepAssigner
                          setterId={s.id}
                          reps={reps}
                          assignedRepId={s.assigned_rep_id}
                          onSaved={(repId) => setSetters((prev) => prev.map((row) =>
                            row.id === s.id ? { ...row, assigned_rep_id: repId } : row,
                          ))}
                        />
                        <CellEditor
                          setterId={s.id}
                          cell={s.personal_cell ?? null}
                          onSaved={(cell) => setSetters((prev) => prev.map((row) =>
                            row.id === s.id ? { ...row, personal_cell: cell } : row,
                          ))}
                        />
                        <GoalEditor
                          setterId={s.id}
                          target={s.weekly_goal.target}
                          baseRate={s.weekly_goal.base_hourly_rate}
                          bonusRate={s.weekly_goal.bonus_hourly_rate}
                          onSaved={(patch) => setSetters((prev) => prev.map((row) =>
                            row.id === s.id ? { ...row, weekly_goal: { ...row.weekly_goal,
                              ...(patch.target !== undefined ? { target: patch.target } : {}),
                              ...(patch.base !== undefined ? { base_hourly_rate: patch.base } : {}),
                              ...(patch.bonus !== undefined ? { bonus_hourly_rate: patch.bonus } : {}),
                            } } : row,
                          ))}
                        />
                        <div className="flex items-center gap-2 text-right">
                          <PhoneCall className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Dials today</div>
                            <div className="text-sm tabular-nums text-gray-200">{s.calls_today.attempts}</div>
                          </div>
                        </div>
                        <LoginAsSetter setterId={s.id} disabled={!s.is_active} />
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
      const res = await fetchWithAuth('/api/admin/setters', {
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
          <UserPlus className="w-4 h-4 text-sky-400" /> Invite a setter
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-400">
                We&apos;ll email them a one-time setup link. They pick a name and password,
                then land straight on their dashboard with the dialer, scraper, and leads.
              </p>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Email</div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="setter@example.com"
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
                    ? 'Invite email sent. Copy the link below if you also want to send via text.'
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
    ? `${window.location.origin}/setter/accept-invite?token=${encodeURIComponent(token)}`
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

/**
 * Inline editor for the setter's forwarding cell - where inbound return
 * calls to their dialer number ring (rep-voice-webhook). Empty = calls
 * go straight to voicemail.
 */
function CellEditor({ setterId, cell, onSaved }: {
  setterId: string
  cell: string | null
  onSaved: (cell: string | null) => void
}) {
  const [value, setValue] = useState(cell || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    const trimmed = value.trim()
    if (trimmed === (cell || '')) return
    setSaving(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/admin/setters/${setterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ personal_cell: trimmed || null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      onSaved(j.personal_cell ?? null)
      setValue(j.personal_cell || '')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      setValue(cell || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
        Inbound cell
      </div>
      <input
        type="tel"
        placeholder="voicemail only"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        disabled={saving}
        className="w-36 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-right text-gray-200 tabular-nums focus:outline-none focus:border-sky-400/50"
      />
      {err && <div className="text-[10px] text-rose-400 mt-0.5">{err}</div>}
    </div>
  )
}

/**
 * Inline editor for a setter's weekly demo goal and hourly pay. Setters are
 * paid `baseRate`/hr normally, bumped to `bonusRate`/hr for any week they
 * hold >= `target` demos (no streak - each week stands alone). All three are
 * per-setter and saved on blur.
 */
function GoalEditor({
  setterId, target, baseRate, bonusRate, onSaved,
}: {
  setterId: string
  target: number
  baseRate: number
  bonusRate: number
  onSaved: (patch: { target?: number; base?: number; bonus?: number }) => void
}) {
  const [goalVal, setGoalVal] = useState(String(target))
  const [baseVal, setBaseVal] = useState(String(baseRate))
  const [bonusVal, setBonusVal] = useState(String(bonusRate))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const patch = async (
    payload: Record<string, number>,
    revert: () => void,
    apply: (j: any) => void,
  ) => {
    setSaving(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/admin/setters/${setterId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      apply(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
      revert()
    } finally {
      setSaving(false)
    }
  }

  const saveGoal = () => {
    const n = Number(goalVal)
    if (!Number.isFinite(n) || n < 1 || n > 50 || n === target) return
    void patch({ weekly_demo_goal: n }, () => setGoalVal(String(target)), (j) => onSaved({ target: j.weekly_demo_goal }))
  }
  const saveBase = () => {
    const n = Number(baseVal)
    if (!Number.isFinite(n) || n < 0 || n > 1000 || n === baseRate) return
    void patch({ base_hourly_rate: n }, () => setBaseVal(String(baseRate)), (j) => onSaved({ base: j.base_hourly_rate }))
  }
  const saveBonus = () => {
    const n = Number(bonusVal)
    if (!Number.isFinite(n) || n < 0 || n > 1000 || n === bonusRate) return
    void patch({ bonus_hourly_rate: n }, () => setBonusVal(String(bonusRate)), (j) => onSaved({ bonus: j.bonus_hourly_rate }))
  }

  const rateInput = (value: string, setValue: (v: string) => void, save: () => void) => (
    <input
      type="number" min={0} max={1000} step={0.5}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      disabled={saving}
      className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-right text-gray-200 tabular-nums focus:outline-none focus:border-sky-400/50"
    />
  )

  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
        Weekly goal &amp; pay
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <input
          type="number" min={1} max={50}
          value={goalVal}
          onChange={(e) => setGoalVal(e.target.value)}
          onBlur={saveGoal}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          disabled={saving}
          className="w-14 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-right text-gray-200 tabular-nums focus:outline-none focus:border-sky-400/50"
        />
        <span className="text-xs text-gray-500">demos/wk</span>
      </div>
      <div className="flex items-center gap-1.5 justify-end mt-1.5">
        <span className="text-xs text-gray-500">$</span>
        {rateInput(baseVal, setBaseVal, saveBase)}
        <span className="text-xs text-gray-500">/hr &rarr; $</span>
        {rateInput(bonusVal, setBonusVal, saveBonus)}
        <span className="text-xs text-gray-500">/hr if hit</span>
      </div>
      {err && <div className="text-[10px] text-rose-300 mt-0.5">{err}</div>}
    </div>
  )
}

/**
 * Which sales rep this setter's booked demos flow to. Saving PATCHes
 * assigned_rep_id; mark-demo then creates the closes row under that rep
 * so the demo shows in their /sales pipeline.
 */
function RepAssigner({
  setterId, reps, assignedRepId, onSaved,
}: {
  setterId: string
  reps: Rep[]
  assignedRepId: string | null
  onSaved: (repId: string | null) => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async (repId: string) => {
    setSaving(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/admin/setters/${setterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_rep_id: repId || null }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
      onSaved(j.assigned_rep_id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
        Demos go to
      </div>
      <select
        value={assignedRepId || ''}
        onChange={(e) => void save(e.target.value)}
        disabled={saving}
        className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-sky-400/50 disabled:opacity-50"
      >
        <option value="">No rep (unrouted)</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      {err && <div className="text-[10px] text-rose-300 mt-0.5">{err}</div>}
    </div>
  )
}

/** Same flow as "Login as rep" on the rep detail page; setters land on /setter. */
function LoginAsSetter({ setterId, disabled }: { setterId: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <GhostButton
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true)
        try {
          const r = await fetch(`/api/admin/sales/reps/${setterId}/impersonate`, {
            method: 'POST', credentials: 'include',
          })
          const j = await r.json().catch(() => ({}))
          if (r.ok && j?.success) {
            // Scrub the admin's own localStorage so the setter portal doesn't
            // read stale session blobs and trip the session-guard reload.
            const { clearClientAuthState } = await import('@/lib/auth/session-guard')
            clearClientAuthState()
            window.location.href = j.redirect_url || '/setter'
          } else {
            alert(j?.error || 'Could not log in as this setter')
            setBusy(false)
          }
        } catch {
          alert('Could not log in as this setter')
          setBusy(false)
        }
      }}
    >
      <Key className="w-4 h-4" /> Login as
    </GhostButton>
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Active 2h ago" with a live dot when the setter was active in the last 10 minutes. */
function LastActive({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-600">Never signed in</span>
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 10) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor] animate-breathe" />
        Active now
      </span>
    )
  }
  const label = mins < 60
    ? `${mins}m ago`
    : mins < 1440
      ? `${Math.floor(mins / 60)}h ago`
      : mins < 10080
        ? `${Math.floor(mins / 1440)}d ago`
        : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const stale = mins >= 4320
  return <span className={stale ? 'text-amber-300/80' : 'text-gray-400'}>Active {label}</span>
}
