'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, ArrowLeft, ArrowSquareOut, Phone, Envelope, Calendar, Robot, Globe, Buildings, Star, PencilSimple, Check, X as XIcon, CaretDown, CaretRight, Sparkle, Plugs } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel } from '../../_components/ui'
import { DraftBuilder } from '../_DraftBuilder'
import { AgentChat } from '../_AgentChat'

type Item = {
  close_id: string
  created_at: string
  updated_at: string
  agent_draft: {
    status: 'none' | 'generating' | 'ready' | 'failed' | 'approved'
    generated_at: string | null
    approved_at: string | null
  }
  demo: {
    scheduled_at: string | null
    status: 'pending' | 'building' | 'ready' | 'skipped'
    test_phone: string | null
    built_at: string | null
    notes: string | null
  }
  rep: { id: string; name: string; email: string | null }
  prospect: {
    name: string | null; email: string | null; phone: string | null
    business_name: string | null
  }
  business: {
    id: string; business_name: string | null; address: string | null
    services: string[] | null; business_hours: any; website: string | null
    owner_name: string | null
    login_email: string | null; cal_com_username: string | null
    cal_com_event_type_slug: string | null; has_cal_api_key: boolean
    customization_status: string; customization_submitted_at: string | null
    retell_agent_id: string | null
    google_rating: number | null; google_review_count: number | null
  } | null
}

export default function AgentWorkspacePage({ params }: { params: { closeId: string } }) {
  const { closeId } = params
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = async () => {
    setError('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}`)
      const j = await r.json().catch(() => ({}))
      if (j?.success && j.item) setItem(j.item)
      else setError(j?.error || 'Could not load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [closeId])

  return (
    <AdminShell activeLabel="Agents Due">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-[1600px]">
        <Link
          href="/admin/agents-due"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back to queue
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <CircleNotch className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <Panel><div className="px-6 py-12 text-sm text-rose-300">{error}</div></Panel>
        ) : item ? (
          <Workspace item={item} onChanged={reload} />
        ) : null}
      </div>
    </AdminShell>
  )
}

function Workspace({ item, onChanged }: { item: Item; onChanged: () => void }) {
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
            Agent workspace
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">
            {item.business?.business_name || item.prospect.business_name || 'Unknown business'}
          </h1>
          <div className="text-xs text-gray-500 mt-1">
            via {item.rep.name}{item.rep.email && ` · ${item.rep.email}`}
            {item.demo.scheduled_at && (
              <> · demo {new Date(item.demo.scheduled_at).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.business?.id && (
            <Link
              href={`/admin/clients/${item.business.id}`}
              className="text-xs text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03]"
            >
              Open client <ArrowSquareOut className="w-3 h-3" />
            </Link>
          )}
          <a
            href="https://app.retellai.com/dashboard/agents"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-fuchsia-300 hover:text-fuchsia-200 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.06]"
          >
            Retell dashboard <ArrowSquareOut className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Top action bar: website + retell agent ID in a horizontal row
          so they don't eat the chat's vertical real estate. */}
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <WebsiteCard
          closeId={item.close_id}
          currentWebsite={item.business?.website || null}
          onChanged={onChanged}
        />
        <RetellAgentCard
          businessId={item.business?.id || null}
          currentAgentId={item.business?.retell_agent_id || null}
          onChanged={onChanged}
        />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        {/* Main column - chat is the star. Takes most of viewport
            height; pipeline + submission live below it as compact
            footer sections. */}
        <div className="space-y-3 min-w-0">
          <Panel padding="none">
            <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <Sparkle className="w-3.5 h-3.5 text-fuchsia-300" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-300">
                  Agent builder · chat
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">
                v2.1 · web_fetch + DB context
              </span>
            </div>
            <div className="p-3">
              <AgentChat
                closeId={item.close_id}
                hasWebsite={!!item.business?.website}
                onPromptAdopted={onChanged}
              />
            </div>
          </Panel>

          <AdvancedPipeline
            closeId={item.close_id}
            initialStatus={item.agent_draft.status}
            hasWebsite={!!item.business?.website}
            currentWebsite={item.business?.website || null}
            onChanged={onChanged}
          />

          <SubmissionCard
            closeId={item.close_id}
            demo={item.demo}
            prospectBusinessName={item.prospect.business_name || item.business?.business_name || null}
            onChanged={onChanged}
          />
        </div>

        {/* Sidebar - everything we know about this prospect, glanceable. */}
        <aside className="space-y-3 text-xs">
          <Side title="Prospect" icon={<Buildings className="w-3.5 h-3.5 text-gray-500" />}>
            <Row label="Contact" value={item.prospect.name} />
            <Row label="Email" value={item.prospect.email} icon={<Envelope className="w-3 h-3" />} />
            <Row label="Phone" value={item.prospect.phone} icon={<Phone className="w-3 h-3" />} />
            {item.business?.owner_name && item.business.owner_name !== item.prospect.name && (
              <Row label="Owner" value={item.business.owner_name} hint="from scrape" />
            )}
            {item.business?.login_email && (
              <Row label="Login" value={item.business.login_email} hint="Account provisioned" />
            )}
          </Side>

          {(item.business?.google_rating != null || item.business?.google_review_count != null) && (
            <Side title="Google" icon={<Star className="w-3.5 h-3.5 text-gray-500" />}>
              <Row
                label="Rating"
                value={
                  item.business?.google_rating != null
                    ? `${item.business.google_rating.toFixed(1)} ★`
                    : null
                }
              />
              <Row
                label="Reviews"
                value={
                  item.business?.google_review_count != null
                    ? item.business.google_review_count.toLocaleString()
                    : null
                }
              />
            </Side>
          )}

          <Side title="Calendar" icon={<Calendar className="w-3.5 h-3.5 text-gray-500" />}>
            {item.business?.has_cal_api_key ? (
              <>
                <Row label="User" value={item.business.cal_com_username || '—'} />
                <Row label="Event" value={item.business.cal_com_event_type_slug || '—'} />
                <div className="text-[10px] text-emerald-400 mt-1">API key on file</div>
              </>
            ) : (
              <div className="text-gray-500">No Cal.com key — agent will text-handoff.</div>
            )}
          </Side>

          {item.business?.services && item.business.services.length > 0 && (
            <Side title="Services" icon={<Robot className="w-3.5 h-3.5 text-gray-500" />}>
              <ul className="text-gray-300 space-y-0.5">
                {item.business.services.slice(0, 12).map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </Side>
          )}

          {item.business?.address && (
            <Side title="Address">
              <div className="text-gray-300">{item.business.address}</div>
            </Side>
          )}

          <Side title="Demo">
            <Row label="Status" value={item.demo.status} />
            {item.demo.test_phone && <Row label="Test #" value={item.demo.test_phone} />}
            {item.demo.notes && <Row label="Notes" value={item.demo.notes} />}
          </Side>
        </aside>
      </div>
    </>
  )
}

/**
 * Website card - prominent, editable, lives above the chat so the
 * admin can correct/paste a URL in one click. The website is the most
 * important input to the chat (agent uses web_fetch on it) so it gets
 * top billing instead of being buried inside the draft builder.
 */
function WebsiteCard({ closeId, currentWebsite, onChanged }: {
  closeId: string; currentWebsite: string | null; onChanged: () => void
}) {
  const [editing, setEditing] = useState(!currentWebsite)
  const [draft, setDraft] = useState(currentWebsite || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setDraft(currentWebsite || '') }, [currentWebsite])

  const save = async () => {
    setBusy(true); setErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/business`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: draft.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        const detail = j?.detail ? ` (${j.detail})` : ''
        setErr(`${j?.error || `Save failed (${r.status})`}${detail}`)
      } else {
        if (typeof j?.saved?.website === 'string') setDraft(j.saved.website)
        setEditing(false)
        onChanged()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel padding="none">
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <Globe className="w-4 h-4 text-gray-500 shrink-0" />
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 shrink-0">
          Website
        </div>
        {editing ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void save() }}
              placeholder="example.com or https://example.com"
              autoFocus
              className="flex-1 min-w-[200px] bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 focus:border-fuchsia-400/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft.trim()}
              className="inline-flex items-center gap-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-200 px-3 py-1.5 rounded-lg text-xs hover:bg-fuchsia-500/30 disabled:opacity-50"
            >
              {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            {currentWebsite && (
              <button
                type="button"
                onClick={() => { setEditing(false); setDraft(currentWebsite); setErr('') }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-lg text-xs"
              >
                <XIcon className="w-3 h-3" /> Cancel
              </button>
            )}
          </>
        ) : currentWebsite ? (
          <>
            <a
              href={currentWebsite}
              target="_blank"
              rel="noreferrer"
              className="flex-1 truncate font-mono text-xs text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 min-w-0"
            >
              {currentWebsite.replace(/^https?:\/\//, '')}
              <ArrowSquareOut className="w-3 h-3 shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-lg text-xs"
            >
              <PencilSimple className="w-3 h-3" /> Edit
            </button>
          </>
        ) : (
          <span className="flex-1 text-xs text-amber-300/80">
            No website yet — paste one so the agent has something to fetch.
          </span>
        )}
      </div>
      {err && (
        <div className="px-4 pb-3 pt-0">
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5 whitespace-pre-wrap break-words">
            {err}
          </div>
        </div>
      )}
    </Panel>
  )
}

/**
 * The original one-shot pipeline (scrape + Claude + validation) lives
 * here as a collapsible "Advanced" section. The chat above is the
 * primary tool; this is for when the admin wants the validation
 * scorecard + structured draft state.
 */
function AdvancedPipeline({ closeId, initialStatus, hasWebsite, currentWebsite, onChanged }: {
  closeId: string
  initialStatus: any
  hasWebsite: boolean
  currentWebsite: string | null
  onChanged: () => void
}) {
  const [open, setOpen] = useState(initialStatus !== 'none' && initialStatus !== 'approved')
  return (
    <Panel padding="none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/[0.02]"
      >
        <div className="inline-flex items-center gap-2">
          {open ? <CaretDown className="w-3 h-3 text-gray-500" /> : <CaretRight className="w-3 h-3 text-gray-500" />}
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
            One-shot pipeline · advanced
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-600">
          scrape + Claude + validation
        </span>
      </button>
      {open && (
        <div>
          <DraftBuilder
            closeId={closeId}
            initialStatus={initialStatus}
            hasWebsite={hasWebsite}
            currentWebsite={currentWebsite}
            onChanged={onChanged}
          />
        </div>
      )}
    </Panel>
  )
}

function Side({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 inline-flex items-center gap-1.5">
        {icon}{title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

/**
 * Paste the Retell agent ID for this client. Saves to
 * businesses.retell_agent_id and triggers the full wire-up:
 *  - Validates the agent exists in Retell
 *  - Patches post_call_analysis_data (8 extraction fields)
 *  - Attaches all five tools (book_appointment, send_booking_sms,
 *    lookup_availability, end_call, transfer_call) to the LLM
 *  - Sets the agent's webhook_url
 *  - Re-publishes + re-binds bound phone numbers
 *
 * Surface toolsError visibly when present so a silent wire-up failure
 * can't go unnoticed (the previous version returned success: true even
 * when the agent ended up with zero tools).
 */
function RetellAgentCard({ businessId, currentAgentId, onChanged }: {
  businessId: string | null
  currentAgentId: string | null
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(!currentAgentId)
  const [draft, setDraft] = useState(currentAgentId || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')

  useEffect(() => {
    setDraft(currentAgentId || '')
    setEditing(!currentAgentId)
  }, [currentAgentId])

  const save = async () => {
    if (!businessId) { setErr('No business linked to this close yet.'); return }
    setBusy(true); setErr(''); setFlash('')
    try {
      const r = await fetchWithAuth(`/api/admin/clients/${businessId}/retell-agent`, {
        method: 'PUT',
        body: JSON.stringify({ agentId: draft.trim() || null }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || `Save failed (${r.status})`)
      } else if (j.toolsError) {
        setErr(`Linked, but tool attach failed: ${j.toolsError}`)
        onChanged()
      } else {
        setFlash(`Linked${j.agentName ? ` to ${j.agentName}` : ''} - tools, extractions, webhook all wired`)
        setEditing(false)
        onChanged()
        setTimeout(() => setFlash(''), 6000)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    if (!window.confirm('Unlink this Retell agent? CloudGreet will lose its connection to the live agent (calls keep working in Retell, just disconnected from this client record).')) return
    setBusy(true); setErr(''); setFlash('')
    try {
      const r = await fetchWithAuth(`/api/admin/clients/${businessId}/retell-agent`, {
        method: 'PUT',
        body: JSON.stringify({ agentId: null }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || 'Unlink failed')
      } else {
        setDraft('')
        setEditing(true)
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel padding="none">
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <Plugs className="w-4 h-4 text-gray-500 shrink-0" />
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 shrink-0">
          Retell agent ID
        </div>
        {editing ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void save() }}
              placeholder="agent_..."
              autoFocus
              className="flex-1 min-w-[280px] bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 focus:border-fuchsia-400/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft.trim() || !businessId}
              className="inline-flex items-center gap-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-200 px-3 py-1.5 rounded-lg text-xs hover:bg-fuchsia-500/30 disabled:opacity-50"
            >
              {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Link + wire tools
            </button>
            {currentAgentId && (
              <button
                type="button"
                onClick={() => { setEditing(false); setDraft(currentAgentId); setErr('') }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-lg text-xs"
              >
                <XIcon className="w-3 h-3" /> Cancel
              </button>
            )}
          </>
        ) : currentAgentId ? (
          <>
            <a
              href={`https://dashboard.retellai.com/agents/${currentAgentId}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 truncate font-mono text-xs text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 min-w-0"
              title={currentAgentId}
            >
              {currentAgentId}
              <ArrowSquareOut className="w-3 h-3 shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-lg text-xs"
            >
              <PencilSimple className="w-3 h-3" /> Edit
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="text-xs text-rose-400/70 hover:text-rose-300 disabled:opacity-50"
            >
              Unlink
            </button>
          </>
        ) : (
          <span className="flex-1 text-xs text-amber-300/80">
            No agent linked yet — paste the Retell agent ID once you&apos;ve created it there.
          </span>
        )}
      </div>
      {err && (
        <div className="px-4 pb-3 pt-0">
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5 whitespace-pre-wrap break-words">
            {err}
          </div>
        </div>
      )}
      {flash && (
        <div className="px-4 pb-3 pt-0">
          <div className="text-xs text-emerald-300">{flash}</div>
        </div>
      )}
    </Panel>
  )
}

/**
 * Final step in the workshop: paste the Retell test number, optionally
 * add notes, hit "Mark agent ready". Triggers POST .../submit which:
 *  - Saves the test phone on the close
 *  - Propagates it to phone_numbers / ai_agents / businesses so the
 *    contractor's dashboard onboarding flips from "agent being built"
 *  - Slacks "Agent complete" and notifies the rep their demo is live
 *
 * After ready, the card switches to a status display showing the live
 * test number and a "Re-edit" button if something changes.
 */
function SubmissionCard({ closeId, demo, prospectBusinessName, onChanged }: {
  closeId: string
  demo: Item['demo']
  prospectBusinessName: string | null
  onChanged: () => void
}) {
  const alreadyReady = demo.status === 'ready' && !!demo.test_phone
  const [editing, setEditing] = useState(!alreadyReady)
  const [testPhone, setTestPhone] = useState(demo.test_phone || '')
  const [agentId, setAgentId] = useState('')
  const [notes, setNotes] = useState(demo.notes || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')

  useEffect(() => {
    setTestPhone(demo.test_phone || '')
    setNotes(demo.notes || '')
    setEditing(!(demo.status === 'ready' && !!demo.test_phone))
  }, [demo.status, demo.test_phone, demo.notes])

  const submit = async () => {
    const tp = testPhone.trim()
    if (!tp) { setErr('Paste the Retell test number first.'); return }
    const aid = agentId.trim()
    setBusy(true); setErr(''); setFlash('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_phone: tp,
          agent_id: aid || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || `Submit failed (${r.status})`)
      } else {
        setFlash(`Marked ready · Slack pinged · rep notified${prospectBusinessName ? ` for ${prospectBusinessName}` : ''}`)
        setEditing(false)
        onChanged()
        setTimeout(() => setFlash(''), 6000)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  const skip = async () => {
    if (!window.confirm('Mark this agent as skipped? The rep will see it as not-built and the demo will proceed without a test number.')) return
    setBusy(true); setErr(''); setFlash('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due/${closeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setErr(j?.error || `Skip failed (${r.status})`)
      } else {
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel padding="none">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          {alreadyReady && !editing ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Phone className="w-3.5 h-3.5 text-fuchsia-300" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-300">
            {alreadyReady && !editing ? 'Agent ready · live for demo' : 'Submit · mark agent ready'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">
          test phone → flips status, pings rep
        </span>
      </div>

      {alreadyReady && !editing ? (
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-gray-400">
              <div className="text-[10px] uppercase tracking-wider mb-1">Test number</div>
              <div className="font-mono text-emerald-300">{demo.test_phone}</div>
            </div>
            <div className="text-gray-400">
              <div className="text-[10px] uppercase tracking-wider mb-1">Built</div>
              <div className="text-gray-300">{demo.built_at ? new Date(demo.built_at).toLocaleString() : '-'}</div>
            </div>
          </div>
          {demo.notes && (
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Notes</div>
              <div className="text-gray-300 whitespace-pre-wrap">{demo.notes}</div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-lg text-xs"
            >
              <PencilSimple className="w-3 h-3" /> Edit
            </button>
          </div>
          {flash && <div className="text-xs text-emerald-300">{flash}</div>}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <div className="text-xs text-gray-400 leading-relaxed">
            Paste the Retell test number that was assigned to this agent. Submitting flips the demo status to <span className="font-mono text-fuchsia-300">ready</span>, propagates the number into the contractor&apos;s dashboard, and Slacks the rep so they can run the demo.
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mb-1.5">
              Retell test number
            </label>
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+17372960084"
              autoFocus
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:border-fuchsia-400/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mb-1.5">
              Retell agent ID
            </label>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:border-fuchsia-400/40 focus:outline-none"
            />
            <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Optional. Pasting here also stamps it on the business + wires the webhook/tools so calls log to the client dashboard.
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything the rep should know before calling…"
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-fuchsia-400/40 focus:outline-none resize-y"
            />
          </div>

          {err && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
              {err}
            </div>
          )}
          {flash && <div className="text-xs text-emerald-300">{flash}</div>}

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy || !testPhone.trim()}
                className="inline-flex items-center gap-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-200 px-4 py-2 rounded-lg text-xs font-medium hover:bg-fuchsia-500/30 disabled:opacity-50"
              >
                {busy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Mark agent ready
              </button>
              {alreadyReady && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setTestPhone(demo.test_phone || ''); setNotes(demo.notes || ''); setErr('') }}
                  className="text-xs text-gray-500 hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>
            {!alreadyReady && (
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="text-[11px] text-gray-500 hover:text-rose-300"
              >
                Skip (don&apos;t build for this demo)
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

function Row({ label, value, icon, hint }: {
  label: string; value: any; icon?: React.ReactNode; hint?: string
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline gap-2 text-gray-300">
      <span className="text-gray-500 w-12 shrink-0">{label}</span>
      <span className="inline-flex items-center gap-1 break-all flex-1 min-w-0">{icon}{value}</span>
      {hint && <span className="text-[10px] text-gray-600">· {hint}</span>}
    </div>
  )
}
