'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, RisingFade } from '../_components/ui'
import { CircleNotch, CalendarCheck, ChatCircle, PhoneOutgoing } from '@phosphor-icons/react'

type DemoItem = {
 id: string
 kind: 'cal_booking' | 'chat_lead' | 'demo_call'
 name: string | null
 email: string | null
 phone: string | null
 when: string
 status: string | null
 detail: string | null
 source: string
}
type Stats = { total: number; bookings: number; leads: number; calls: number }

function fmtPhone(p: string | null): string {
 if (!p) return ''
 const d = p.replace(/\D/g, '')
 const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
 if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
 return p
}
function when(iso: string, kind: string): string {
 if (!iso) return ''
 const d = new Date(iso)
 if (kind === 'cal_booking') {
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
 }
 const diff = Date.now() - d.getTime()
 const m = Math.floor(diff / 60000)
 if (m < 1) return 'just now'
 if (m < 60) return `${m}m ago`
 const h = Math.floor(m / 60)
 if (h < 24) return `${h}h ago`
 return `${Math.floor(h / 24)}d ago`
}

const KIND = {
 cal_booking: { label: 'Booked', icon: CalendarCheck, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
 chat_lead: { label: 'Chat lead', icon: ChatCircle, cls: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
 demo_call: { label: 'AI call', icon: PhoneOutgoing, cls: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
} as const

export default function AdminDemosPage() {
 const [items, setItems] = useState<DemoItem[]>([])
 const [stats, setStats] = useState<Stats | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 useEffect(() => {
  let alive = true
  ;(async () => {
   try {
    const res = await fetchWithAuth('/api/admin/demos')
    const j = await res.json()
    if (!alive) return
    if (!res.ok) { setError(j.error || 'Failed to load'); return }
    setItems(j.items || [])
    setStats(j.stats || null)
   } catch { if (alive) setError('Failed to load') }
   finally { if (alive) setLoading(false) }
  })()
  return () => { alive = false }
 }, [])

 return (
  <AdminShell activeLabel="Demos">
   <RisingFade>
    <PanelHeader eyebrow="Inbound demos" title="Every demo signal from the website" />

    {stats && (
     <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
       { k: 'Total', v: stats.total },
       { k: 'Booked', v: stats.bookings },
       { k: 'Chat leads', v: stats.leads },
       { k: 'AI calls', v: stats.calls },
      ].map((s) => (
       <Panel key={s.k} padding="tight">
        <div className="text-2xl font-semibold text-white tabular-nums">{s.v}</div>
        <div className="text-xs text-gray-500">{s.k}</div>
       </Panel>
      ))}
     </div>
    )}

    {loading ? (
     <div className="flex items-center gap-2 py-16 text-gray-400"><CircleNotch className="h-5 w-5 animate-spin" /> Loading…</div>
    ) : error ? (
     <Panel className="text-sm text-amber-300">{error}</Panel>
    ) : items.length === 0 ? (
     <Panel className="text-center text-sm text-gray-500">No demo activity yet. When visitors book, chat, or ask for an AI call, they'll show up here.</Panel>
    ) : (
     <Panel padding="none" className="divide-y divide-white/[0.06]">
      {items.map((it) => {
       const meta = KIND[it.kind]
       const Icon = meta.icon
       return (
        <div key={it.id} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
         <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}>
          <Icon className="h-3.5 w-3.5" weight="fill" /> {meta.label}
         </span>
         <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">
           {it.name || fmtPhone(it.phone) || it.email || 'Visitor'}
          </div>
          <div className="truncate text-xs text-gray-500">
           {[it.email, it.name ? fmtPhone(it.phone) : null, it.detail].filter(Boolean).join(' · ')}
          </div>
         </div>
         <div className="shrink-0 text-right">
          <div className="text-xs text-gray-300">{when(it.when, it.kind)}</div>
          {it.status && <div className="text-[11px] capitalize text-gray-600">{it.status}</div>}
         </div>
        </div>
       )
      })}
     </Panel>
    )}
   </RisingFade>
  </AdminShell>
 )
}
