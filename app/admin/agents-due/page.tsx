'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { CircleNotch, WarningCircle, CheckCircle, Clock, Phone, Envelope, ArrowSquareOut, Robot, Calendar } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, Input } from '../_components/ui'
import { DraftBuilder } from './_DraftBuilder'

/**
 * /admin/agents-due
 *
 * Queue of demo agents I need to build before the rep's demo call.
 * For each row I get rep, prospect, the provisioned client business,
 * the login email of the client account, scraped info, Cal.com wiring
 * (if any), countdown to the demo, and a place to paste the Retell
 * test number.
 *
 * Typing/setting the test number flips status to 'ready' and the rep
 * sees it on their close in /sales/closes.
 */

type Item = {
  close_id: string
  created_at: string
  updated_at: string
  demo: {
    scheduled_at: string | null
    status: 'pending' | 'building' | 'ready' | 'skipped'
    test_phone: string | null
    built_at: string | null
    notes: string | null
  }
  rep: { id: string; name: string; email: string | null }
  prospect: {
    name: string | null
    email: string | null
    phone: string | null
    business_name: string | null
  }
  business: {
    id: string
    business_name: string | null
    address: string | null
    services: string[] | null
    business_hours: any
    website: string | null
    login_email: string | null
    cal_com_username: string | null
    cal_com_event_type_slug: string | null
    has_cal_api_key: boolean
    customization_status: string
    customization_submitted_at: string | null
  } | null
  agent_draft: {
    status: 'none' | 'generating' | 'ready' | 'failed' | 'approved'
    generated_at: string | null
  }
}

export default function AgentsDuePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      const r = await fetchWithAuth('/api/admin/agents-due')
      const j = await r.json().catch(() => ({}))
      if (j?.success) setItems(j.items || [])
      else setError(j?.error || 'Could not load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  return (
    <AdminShell activeLabel="Agents Due">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            Pre-demo queue
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Agents due</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Demo agents I need to build before each rep&apos;s demo. Paste the Retell test number to mark one ready - the rep sees it on their close instantly.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : items.length === 0 ? (
          <Panel>
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No agents due. When a rep sends a booking link, the close will show up here for build.
            </div>
          </Panel>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <ItemCard key={it.close_id} item={it} onChanged={reload} />
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  )
}

function ItemCard({ item, onChanged }: { item: Item; onChanged: () => void }) {
  const [testPhone, setTestPhone] = useState(item.demo.test_phone || '')
  const [notes, setNotes] = useState(item.demo.notes || '')
  const [busy, setBusy] = useState<'submit' | 'building' | 'skip' | null>(null)
  const [err, setErr] = useState('')

  const countdown = useCountdown(item.demo.scheduled_at)

  const post = async (body: Record<string, any>, action: 'submit' | 'building' | 'skip') => {
    setErr(''); setBusy(action)
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${item.close_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) setErr(j?.error || 'Failed')
      else onChanged()
    } finally {
      setBusy(null)
    }
  }

  const flipCustomization = async (newStatus: 'building' | 'ready' | 'live') => {
    if (!item.business?.id) return
    setErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/customization/${item.business.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) setErr(j?.error || 'Failed')
      else onChanged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
  }

  const submit = () => {
    if (!testPhone.trim()) { setErr('Paste the Retell test number first.'); return }
    return post({ test_phone: testPhone.trim(), notes: notes.trim() || undefined }, 'submit')
  }

  const status = item.demo.status
  const statusTone = status === 'ready' ? 'emerald' : status === 'building' ? 'sky' : status === 'skipped' ? 'gray' : 'amber'

  return (
    <li className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-base font-medium text-white truncate">
              {item.business?.business_name || item.prospect.business_name || 'Unknown business'}
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-${statusTone}-500/10 text-${statusTone}-300 border border-${statusTone}-500/20`}>
              <Robot className="w-3 h-3" /> {status}
            </span>
            {item.business?.customization_status === 'submitted' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Form submitted
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            via {item.rep.name}
            {item.rep.email && <span className="text-gray-600"> · {item.rep.email}</span>}
          </div>

          {/* Countdown row */}
          <div className="mt-3 flex items-center gap-4 text-xs flex-wrap">
            {item.demo.scheduled_at ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                {countdown}
                <span className="text-gray-500">· {new Date(item.demo.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-3.5 h-3.5" /> No demo time on file yet
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/admin/agents-due/${item.close_id}`}
            className="text-xs text-fuchsia-300 hover:text-fuchsia-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.06]"
          >
            Open workspace <ArrowSquareOut className="w-3 h-3" />
          </Link>
          {item.business?.id && (
            <Link
              href={`/admin/clients/${item.business.id}`}
              className="text-xs text-sky-300 hover:text-sky-200 inline-flex items-center gap-1"
            >
              Open client <ArrowSquareOut className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 px-5 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {/* Prospect column */}
        <div>
          <SectionLabel>Prospect</SectionLabel>
          <KV label="Contact" value={item.prospect.name} />
          <KV label="Email" value={item.prospect.email} icon={<Envelope className="w-3 h-3 text-gray-500" />} />
          <KV label="Phone" value={item.prospect.phone} icon={<Phone className="w-3 h-3 text-gray-500" />} />
          {item.business?.login_email && (
            <KV label="Login" value={item.business.login_email} hint="Account already provisioned" />
          )}
          {item.business?.website && (
            <KV label="Website" value={
              <a href={item.business.website} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1">
                {item.business.website} <ArrowSquareOut className="w-3 h-3" />
              </a>
            } />
          )}
          {item.business?.address && <KV label="Address" value={item.business.address} />}
        </div>

        {/* Calendar / scraped column */}
        <div>
          <SectionLabel>Calendar wiring</SectionLabel>
          {item.business?.has_cal_api_key ? (
            <>
              <KV label="Cal.com user" value={item.business.cal_com_username || <em className="text-gray-500">not set</em>} />
              <KV label="Event slug" value={item.business.cal_com_event_type_slug || <em className="text-gray-500">not set</em>} />
              <div className="text-[10px] text-emerald-400 mt-1">API key on file</div>
            </>
          ) : (
            <div className="text-xs text-gray-500">No Cal.com key yet - the agent will text-only handoff.</div>
          )}

          {item.business?.services && item.business.services.length > 0 && (
            <>
              <div className="mt-3"><SectionLabel>Services</SectionLabel></div>
              <ul className="text-xs text-gray-300 space-y-0.5">
                {item.business.services.slice(0, 8).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </>
          )}

          {item.business?.business_hours && typeof item.business.business_hours === 'object' && Object.keys(item.business.business_hours).length > 0 && (
            <>
              <div className="mt-3"><SectionLabel>Hours</SectionLabel></div>
              <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(item.business.business_hours, null, 2)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI agent draft builder - Phase 1 from the agent-builder doc */}
      <DraftBuilder
        closeId={item.close_id}
        initialStatus={item.agent_draft.status}
        hasWebsite={!!(item.business?.website)}
        currentWebsite={item.business?.website || null}
        onChanged={onChanged}
      />

      {/* Customization pipeline - only meaningful once the client has submitted */}
      {item.business && ['submitted', 'building', 'ready', 'live'].includes(item.business.customization_status) && (
        <div className="border-t border-white/5 px-5 py-3 bg-violet-500/5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-violet-300 inline-flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-400">Customization</span>
              <span className="font-medium">{item.business.customization_status}</span>
              {item.business.customization_submitted_at && (
                <span className="text-gray-500">· submitted {new Date(item.business.customization_submitted_at).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {item.business.customization_status === 'submitted' && (
                <GhostButton onClick={() => flipCustomization('building')}>Mark building</GhostButton>
              )}
              {(item.business.customization_status === 'submitted' || item.business.customization_status === 'building') && (
                <PrimaryButton onClick={() => flipCustomization('ready')}>
                  Mark ready (emails client)
                </PrimaryButton>
              )}
              {item.business.customization_status === 'ready' && (
                <PrimaryButton onClick={() => flipCustomization('live')}>Mark live</PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit row */}
      <div className="border-t border-white/5 px-5 py-4">
        {status === 'ready' ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-emerald-300 inline-flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Ready · test #: <span className="font-mono">{item.demo.test_phone}</span>
            </div>
            <GhostButton onClick={() => post({ status: 'pending' }, 'building')} disabled={busy !== null}>
              Reopen
            </GhostButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
              Build the agent in Retell, then paste the test number
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="+1 555 123 4567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 font-mono"
              />
              <PrimaryButton onClick={submit} disabled={busy !== null}>
                {busy === 'submit' && <CircleNotch className="w-4 h-4 animate-spin" />}
                Mark ready
              </PrimaryButton>
            </div>
            <Input
              placeholder="Build notes (optional, internal)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-wrap">
              {status !== 'building' && (
                <GhostButton onClick={() => post({ status: 'building' }, 'building')} disabled={busy !== null}>
                  {busy === 'building' && <CircleNotch className="w-3 h-3 animate-spin" />}
                  Mark "building"
                </GhostButton>
              )}
              <GhostButton onClick={() => post({ status: 'skipped' }, 'skip')} disabled={busy !== null}>
                {busy === 'skip' && <CircleNotch className="w-3 h-3 animate-spin" />}
                Skip
              </GhostButton>
            </div>
          </div>
        )}
        {err && <div className="mt-2 text-xs text-rose-300">{err}</div>}
      </div>
    </li>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1.5">
      {children}
    </div>
  )
}

function KV({ label, value, icon, hint }: { label: string; value: any; icon?: React.ReactNode; hint?: string }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="text-xs text-gray-300 mb-1 flex items-baseline gap-2">
      <span className="text-gray-500 w-16 shrink-0">{label}</span>
      <span className="inline-flex items-center gap-1.5 break-all">{icon}{value}</span>
      {hint && <span className="text-[10px] text-gray-600">· {hint}</span>}
    </div>
  )
}

function useCountdown(iso: string | null): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!iso) return
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [iso])
  return useMemo(() => {
    if (!iso) return ''
    const ms = new Date(iso).getTime() - now
    if (Number.isNaN(ms)) return ''
    const sign = ms < 0 ? -1 : 1
    const abs = Math.abs(ms)
    const days = Math.floor(abs / 86_400_000)
    const hours = Math.floor((abs % 86_400_000) / 3_600_000)
    const mins = Math.floor((abs % 3_600_000) / 60_000)
    const head = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    return sign < 0 ? `${head} ago` : `in ${head}`
  }, [iso, now])
}
