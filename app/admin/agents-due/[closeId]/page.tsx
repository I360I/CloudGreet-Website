'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, ExternalLink, Phone, Mail, Calendar, Bot, Globe, Building2,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../_components/Shell'
import { Panel } from '../../_components/ui'
import { DraftBuilder } from '../_DraftBuilder'

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
    login_email: string | null; cal_com_username: string | null
    cal_com_event_type_slug: string | null; has_cal_api_key: boolean
    customization_status: string; customization_submitted_at: string | null
  } | null
}

export default function AgentWorkspacePage({ params }: { params: Promise<{ closeId: string }> }) {
  const { closeId } = use(params)
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
      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-5xl">
        <Link
          href="/admin/agents-due"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back to queue
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
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
              Open client <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <a
            href="https://app.retellai.com/dashboard/agents"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-fuchsia-300 hover:text-fuchsia-200 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.06]"
          >
            Retell dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3">
          {/* The shared builder is the meat of this page. */}
          <Panel padding="none">
            <DraftBuilder
              closeId={item.close_id}
              initialStatus={item.agent_draft.status}
              hasWebsite={!!item.business?.website}
              currentWebsite={item.business?.website || null}
              onChanged={onChanged}
            />
          </Panel>
        </div>

        <aside className="space-y-3 text-xs">
          <Side title="Prospect" icon={<Building2 className="w-3.5 h-3.5 text-gray-500" />}>
            <Row label="Contact" value={item.prospect.name} />
            <Row label="Email" value={item.prospect.email} icon={<Mail className="w-3 h-3" />} />
            <Row label="Phone" value={item.prospect.phone} icon={<Phone className="w-3 h-3" />} />
            {item.business?.login_email && (
              <Row label="Login" value={item.business.login_email} hint="Account provisioned" />
            )}
          </Side>

          {item.business?.website && (
            <Side title="Website" icon={<Globe className="w-3.5 h-3.5 text-gray-500" />}>
              <a
                href={item.business.website}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 hover:text-sky-200 break-all inline-flex items-center gap-1"
              >
                {item.business.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
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
            <Side title="Services" icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}>
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
