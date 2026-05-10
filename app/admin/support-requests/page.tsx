'use client'

/**
 * /admin/support-requests
 *
 * Triage queue for contractor-submitted change requests + messages.
 * Default view: open + in_progress. Click a row to expand, mark
 * status, drop admin notes.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, ArrowsClockwise, WarningCircle, CheckCircle, Wrench, ChatCircle, ArrowSquareOut } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton } from '../_components/ui'

type Item = {
  id: string
  business_id: string | null
  business_name: string | null
  user: { name: string; email: string } | null
  kind: 'change_request' | 'message'
  subject: string
  body: string
  status: 'open' | 'in_progress' | 'resolved' | 'wontfix'
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_OPTS = ['open_or_in_progress', 'open', 'in_progress', 'resolved', 'wontfix', 'all'] as const

export default function SupportRequestsPage() {
  const [filter, setFilter] = useState<typeof STATUS_OPTS[number]>('open_or_in_progress')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchWithAuth(`/api/admin/support-requests?status=${filter}`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) setItems(j.items || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [filter])

  const update = async (id: string, patch: Partial<Pick<Item, 'status' | 'admin_notes'>>) => {
    const r = await fetchWithAuth('/api/admin/support-requests', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...patch }),
    })
    if (r.ok) await load()
  }

  return (
    <AdminShell activeLabel="Tools">
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">Operator</div>
            <h1 className="text-2xl font-medium tracking-tight text-white">Support requests</h1>
            <p className="text-sm text-gray-400 mt-1.5">
              Contractor-submitted change requests and messages from the dashboard sidebar. Slack pings on every new submission.
            </p>
          </div>
          <GhostButton onClick={load}><ArrowsClockwise className="w-3 h-3" /> Refresh</GhostButton>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-md border ${
                filter === s
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-transparent text-gray-300 border-white/10 hover:border-white/30'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><CircleNotch className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <Panel>
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              {filter === 'open_or_in_progress' ? 'Inbox zero. Nothing pending.' : `No requests with status "${filter.replace(/_/g, ' ')}".`}
            </div>
          </Panel>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id}>
                <Panel padding="none">
                  <button
                    onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      {it.kind === 'change_request'
                        ? <Wrench className="w-4 h-4 text-amber-400" />
                        : <ChatCircle className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{it.subject}</span>
                        <StatusPill status={it.status} />
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {it.business_name || <em>unknown business</em>}
                        {it.user && <> · {it.user.name}</>}
                        {' · '}
                        {timeAgo(it.created_at)}
                      </div>
                    </div>
                  </button>

                  {expandedId === it.id && (
                    <div className="border-t border-white/5 px-5 py-4 space-y-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Body</div>
                        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{it.body}</pre>
                      </div>

                      {it.user?.email && (
                        <div className="text-[11px]">
                          Reply at{' '}
                          <a href={`mailto:${it.user.email}?subject=${encodeURIComponent('Re: ' + it.subject)}`} className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1">
                            {it.user.email} <ArrowSquareOut className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {it.business_id && (
                        <div className="text-[11px]">
                          <Link href={`/admin/clients/${it.business_id}`} className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1">
                            Open client workspace <ArrowSquareOut className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Admin notes</div>
                        <textarea
                          defaultValue={it.admin_notes || ''}
                          onBlur={(e) => {
                            const next = e.target.value.trim()
                            if ((it.admin_notes || '') !== next) {
                              void update(it.id, { admin_notes: next })
                            }
                          }}
                          rows={2}
                          placeholder="Triage notes - saves on blur"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mr-1">Mark</span>
                        <StatusButton current={it.status} target="open" onClick={() => update(it.id, { status: 'open' })} />
                        <StatusButton current={it.status} target="in_progress" onClick={() => update(it.id, { status: 'in_progress' })} />
                        <StatusButton current={it.status} target="resolved" onClick={() => update(it.id, { status: 'resolved' })} />
                        <StatusButton current={it.status} target="wontfix" onClick={() => update(it.id, { status: 'wontfix' })} />
                      </div>
                    </div>
                  )}
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  )
}

function StatusPill({ status }: { status: Item['status'] }) {
  const m: Record<Item['status'], string> = {
    open: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    in_progress: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    wontfix: 'bg-white/5 text-gray-400 border-white/10',
  }
  return (
    <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${m[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function StatusButton({ current, target, onClick }: { current: Item['status']; target: Item['status']; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={current === target}
      className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
        current === target
          ? 'bg-white/[0.04] text-gray-400 border-white/[0.06] cursor-default'
          : 'bg-transparent text-gray-300 border-white/15 hover:bg-white/[0.05]'
      }`}
    >
      {target.replace(/_/g, ' ')}
    </button>
  )
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
