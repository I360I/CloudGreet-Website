'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, FileText, VideoCamera, ArrowSquareOut } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader } from '../_components/ui'

type App = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string | null
  state: string | null
  years_sales_experience: number | null
  biggest_deal_cents: number | null
  monthly_goal_deals: number | null
  resume_url: string | null
  video_url: string | null
  status: string
  created_at: string
}

const STATUSES = [
  'new', 'reviewing', 'interview_scheduled', 'offered', 'hired', 'rejected', 'withdrawn',
] as const

const STATUS_TONE: Record<string, string> = {
  new: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  reviewing: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  interview_scheduled: 'bg-violet-400/10 text-violet-300 border-violet-400/20',
  offered: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  hired: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  withdrawn: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
}

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth('/api/admin/applications')
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j.success) throw new Error(j?.error || 'Failed')
        setApps(j.applications || [])
        setCounts(j.counts || {})
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return apps
    return apps.filter((a) => a.status === filter)
  }, [apps, filter])

  return (
    <AdminShell activeLabel="Applications">
      <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1400px] mx-auto">
        <Panel>
          <PanelHeader
            eyebrow="Hiring"
            title="Rep applications"
            trailing={
              <div className="text-xs text-gray-500 font-mono">
                {apps.length} total
              </div>
            }
          />

          <div className="flex flex-wrap gap-1.5 mb-4">
            <FilterPill label="All" count={apps.length} active={filter === 'all'} onClick={() => setFilter('all')} />
            {STATUSES.map((s) => (
              <FilterPill
                key={s}
                label={s.replace(/_/g, ' ')}
                count={counts[s] || 0}
                active={filter === s}
                onClick={() => setFilter(s)}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
              <CircleNotch className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {err && <div className="text-sm text-rose-300">{err}</div>}

          {!loading && !err && filtered.length === 0 && (
            <div className="text-sm text-gray-500 py-12 text-center">No applications.</div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 border-b border-white/[0.06]">
                    <th className="text-left px-5 sm:px-6 py-2.5 font-normal">Applicant</th>
                    <th className="text-left py-2.5 font-normal">Location</th>
                    <th className="text-left py-2.5 font-normal">Experience</th>
                    <th className="text-left py-2.5 font-normal">Goal</th>
                    <th className="text-left py-2.5 font-normal">Materials</th>
                    <th className="text-left py-2.5 font-normal">Status</th>
                    <th className="text-left py-2.5 px-5 sm:px-6 font-normal">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 sm:px-6 py-3">
                        <Link href={`/admin/applications/${a.id}`} className="block">
                          <div className="text-white font-medium">{a.first_name} {a.last_name}</div>
                          <div className="text-xs text-gray-500">{a.email}</div>
                        </Link>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {[a.city, a.state].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {a.years_sales_experience != null ? `${a.years_sales_experience}y` : '-'}
                        {a.biggest_deal_cents ? ` · $${(a.biggest_deal_cents / 100).toLocaleString()}` : ''}
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {a.monthly_goal_deals != null ? `${a.monthly_goal_deals}/mo` : '-'}
                      </td>
                      <td className="py-3 text-xs">
                        <div className="flex items-center gap-2">
                          {a.resume_url && (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <FileText className="w-3 h-3" /> Resume
                            </span>
                          )}
                          {a.video_url && (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <VideoCamera className="w-3 h-3" /> VideoCamera
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${STATUS_TONE[a.status] || STATUS_TONE.new}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-5 sm:px-6 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  )
}

function FilterPill({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider border transition-colors ${
        active
          ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
          : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
      }`}
    >
      {label} <span className="text-gray-500">{count}</span>
    </button>
  )
}
