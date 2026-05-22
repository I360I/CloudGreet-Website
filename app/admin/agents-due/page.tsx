'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleNotch, Clock, Calendar, ArrowSquareOut, Robot, Archive, ArrowUUpLeft, Trash } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel } from '../_components/ui'

/**
 * /admin/agents-due
 *
 * Compact list view of demo agents that need to be built before each
 * rep's demo. One row per close - status pill, countdown, prospect.
 * Click "Open workspace" to drill into the full build view at
 * /admin/agents-due/[closeId].
 */

type Item = {
  close_id: string
  created_at: string
  updated_at: string
  archived_at: string | null
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
  } | null
  agent_draft: {
    status: 'none' | 'generating' | 'ready' | 'failed' | 'approved'
  }
}

const STATUS_TONE: Record<Item['demo']['status'], { pill: string; label: string }> = {
  pending:  { pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20', label: 'pending' },
  building: { pill: 'bg-sky-500/10 text-sky-300 border-sky-500/20',     label: 'building' },
  ready:    { pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', label: 'ready' },
  skipped:  { pill: 'bg-gray-500/10 text-gray-400 border-gray-500/20',  label: 'skipped' },
}

export default function AgentsDuePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const reload = async (nextView: 'active' | 'archived' = view) => {
    setLoading(true)
    setError('')
    try {
      const r = await fetchWithAuth(`/api/admin/agents-due?view=${nextView}`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) setItems(j.items || [])
      else setError(j?.error || 'Could not load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload(view) /* eslint-disable-next-line */ }, [view])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelected = () => setSelected(new Set())

  const bulk = async (action: 'archive' | 'unarchive' | 'delete') => {
    if (selected.size === 0) return
    if (action === 'archive') {
      // Show the prospect names in the confirm so the admin can sanity-
      // check what's being swept off the queue. Sweeping demo-scheduled
      // rows off by accident has bitten this workspace before.
      const labels = sorted
        .filter((row) => selected.has(row.close_id))
        .map((row) => row.business?.business_name || row.prospect.business_name || '(unnamed)')
      const preview = labels.slice(0, 5).join(', ') + (labels.length > 5 ? `, +${labels.length - 5} more` : '')
      if (!confirm(`Archive ${selected.size} workshop${selected.size === 1 ? '' : 's'}? They'll disappear from the active queue.\n\n${preview}`)) return
    }
    if (action === 'delete') {
      if (!confirm(`Delete ${selected.size} archived workshop${selected.size === 1 ? '' : 's'}? Only the close row is removed - the client account, calls, and agent stay intact.`)) return
    }
    setBusy(true)
    try {
      const ids = Array.from(selected)
      const r = await fetchWithAuth('/api/admin/agents-due/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, close_ids: ids }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || `Bulk ${action} failed (${r.status})`)
      } else {
        clearSelected()
        await reload(view)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  // Sort: pending/building first (newest at top), then ready, then
  // skipped. Within each status group, newest-created at the top so
  // the row a rep just provisioned shows up immediately - which is
  // what an admin glancing at this queue actually wants to see. Demo
  // time is shown on the row as info, not used for sorting (the
  // previous "soonest demo first" sort buried fresh provisions
  // under stale rows).
  const sorted = useMemo(() => {
    const order = (s: Item['demo']['status']) =>
      s === 'skipped' ? 3 : s === 'ready' ? 2 : 0
    return [...items].sort((a, b) => {
      const oa = order(a.demo.status)
      const ob = order(b.demo.status)
      if (oa !== ob) return oa - ob
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [items])


  return (
    <AdminShell activeLabel="Agents Due">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
              Pre-demo queue
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-white">Agents due</h1>
            <p className="text-sm text-gray-400 mt-1.5">
              Demo agents to build before each rep&apos;s demo. Click a row to open its workspace.
            </p>
          </div>
          <div className="text-xs text-gray-500 font-mono tabular-nums">
            {sorted.length} {view === 'archived' ? 'archived' : 'in queue'}
          </div>
        </div>

        {/* View tabs */}
        <div className="mb-3 flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.18em]">
          {(['active', 'archived'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { if (v !== view) { clearSelected(); setView(v) } }}
              className={
                v === view
                  ? 'px-3 py-1.5 rounded-lg bg-white/10 text-white'
                  : 'px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }
            >
              {v === 'active' ? 'Active' : 'Archive'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Bulk action bar - appears when any row is selected. Mirrors
            the rep leads list pattern so admins use the same muscle
            memory. */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mb-3 px-3 py-2 bg-fuchsia-500/[0.08] border border-fuchsia-500/20 rounded-xl flex items-center gap-3 flex-wrap"
            >
              <span className="text-sm font-medium text-fuchsia-200 inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-fuchsia-500 text-white rounded-full text-[10px] font-mono tabular-nums">{selected.size}</span>
                selected
              </span>
              <button
                onClick={() => {
                  if (selected.size === sorted.length) clearSelected()
                  else setSelected(new Set(sorted.map((s) => s.close_id)))
                }}
                className="text-xs text-fuchsia-200/80 hover:text-fuchsia-100 underline-offset-2 hover:underline"
              >
                {selected.size === sorted.length ? 'Deselect all' : `Select all ${sorted.length}`}
              </button>
              <div className="flex-1" />
              {view === 'active' ? (
                <button
                  onClick={() => bulk('archive')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs text-fuchsia-100 bg-fuchsia-500/20 border border-fuchsia-500/30 hover:bg-fuchsia-500/30 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
              ) : (
                <>
                  <button
                    onClick={() => bulk('unarchive')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-200 bg-white/10 border border-white/20 hover:bg-white/15 rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <ArrowUUpLeft className="w-3.5 h-3.5" /> Unarchive
                  </button>
                  <button
                    onClick={() => bulk('delete')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <Trash className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              )}
              <button
                onClick={clearSelected}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : sorted.length === 0 ? (
          <Panel>
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {view === 'archived'
                ? 'Nothing in the archive. Archived closes show up here so you can restore or delete them.'
                : 'No agents due. When a rep submits a close, it lands here for build.'}
            </div>
          </Panel>
        ) : (
          <ul className="bg-white/[0.02] border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {sorted.map((it) => (
              <Row
                key={it.close_id}
                item={it}
                selected={selected.has(it.close_id)}
                onToggle={() => toggleSelected(it.close_id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  )
}

/**
 * Compact "5m ago", "3h ago", "2d ago" for the time-since-arrival
 * column. The admin needs to glance at the queue and see at-a-glance
 * which agents just landed vs which have been sitting there a while.
 */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return ''
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return `${Math.floor(day / 7)}w ago`
}

function Row({ item, selected, onToggle }: {
  item: Item
  selected: boolean
  onToggle: () => void
}) {
  const tone = STATUS_TONE[item.demo.status]
  const countdown = useCountdown(item.demo.scheduled_at)
  const businessName =
    item.business?.business_name || item.prospect.business_name || 'Unknown business'
  const isSkippedOrReady = item.demo.status === 'skipped' || item.demo.status === 'ready'

  return (
    <li className={selected ? 'bg-fuchsia-500/[0.08]' : ''}>
      <div className="flex items-stretch">
        <label
          className="flex items-center pl-5 pr-1 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-fuchsia-500 focus:ring-fuchsia-500 cursor-pointer"
            aria-label="Select close"
          />
        </label>
      <Link
        href={`/admin/agents-due/${item.close_id}`}
        className="group flex-1 flex items-center gap-4 pl-3 pr-5 py-3.5 hover:bg-white/[0.03] transition-colors"
      >
        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${tone.pill} flex-shrink-0`}
        >
          <Robot className="w-3 h-3" />
          {tone.label}
        </span>

        {/* Business + rep + prospect */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-sm font-medium text-white truncate group-hover:text-gray-200">
              {businessName}
            </div>
            {item.prospect.name && (
              <div className="text-[11px] text-gray-500 truncate">
                {item.prospect.name}
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-500 truncate mt-0.5">
            via {item.rep.name}
            {item.rep.email && <span className="text-gray-600"> · {item.rep.email}</span>}
            {item.agent_draft.status === 'ready' && (
              <span className="text-emerald-400/80"> · draft ready</span>
            )}
            <span className="text-gray-600"> · added {ago(item.created_at)}</span>
          </div>
        </div>

        {/* Countdown - hidden on mobile to keep the row tight */}
        <CountdownCell
          countdown={countdown}
          scheduledAt={item.demo.scheduled_at}
          dim={isSkippedOrReady}
        />

        {/* Open workspace */}
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-fuchsia-300 group-hover:text-fuchsia-200 px-2.5 py-1 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.06] flex-shrink-0">
          Open workspace
          <ArrowSquareOut className="w-3 h-3" />
        </span>
      </Link>
      </div>
    </li>
  )
}

function CountdownCell({
  countdown, scheduledAt, dim,
}: {
  countdown: { text: string; urgency: 'past' | 'soon' | 'normal' | 'far' | 'none' }
  scheduledAt: string | null
  dim: boolean
}) {
  if (!scheduledAt) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-600 font-mono tabular-nums w-44 flex-shrink-0">
        <Calendar className="w-3.5 h-3.5" />
        no demo time yet
      </div>
    )
  }
  const tone = dim
    ? 'text-gray-500'
    : countdown.urgency === 'past'
      ? 'text-gray-500'
      : countdown.urgency === 'soon'
        ? 'text-rose-300'
        : countdown.urgency === 'normal'
          ? 'text-amber-300'
          : 'text-gray-400'
  return (
    <div className={`hidden md:flex items-center gap-1.5 text-[11px] font-mono tabular-nums w-44 flex-shrink-0 ${tone}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{countdown.text}</span>
      <span className="text-gray-600 truncate">
        · {new Date(scheduledAt).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })}
      </span>
    </div>
  )
}

type CountdownResult = { text: string; urgency: 'past' | 'soon' | 'normal' | 'far' | 'none' }

function useCountdown(iso: string | null): CountdownResult {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!iso) return
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [iso])
  return useMemo<CountdownResult>(() => {
    if (!iso) return { text: '', urgency: 'none' }
    const ms = new Date(iso).getTime() - now
    if (Number.isNaN(ms)) return { text: '', urgency: 'none' }
    const past = ms < 0
    const abs = Math.abs(ms)
    const days = Math.floor(abs / 86_400_000)
    const hours = Math.floor((abs % 86_400_000) / 3_600_000)
    const mins = Math.floor((abs % 3_600_000) / 60_000)
    const head = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    const text = past ? `${head} ago` : `in ${head}`
    const urgency: CountdownResult['urgency'] = past
      ? 'past'
      : abs < 4 * 3_600_000
        ? 'soon'
        : abs < 24 * 3_600_000
          ? 'normal'
          : 'far'
    return { text, urgency }
  }, [iso, now])
}
