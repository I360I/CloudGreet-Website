'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, RisingFade } from '../_components/ui'
import { ArrowSquareOut, CircleNotch } from '@phosphor-icons/react'

type Convo = {
  id: string
  businessName: string
  customerPhone: string
  reportToken: string | null
  messageCount: number
  inboundCount: number
  lastMessage: { direction: string; body: string; at: string } | null
  lastActivity: string
  outcome: 'booked' | 'dispatch' | null
}

function fmtPhone(p: string): string {
  const d = (p || '').replace(/\D/g, '')
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
  return p
}

function relTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminConversationsPage() {
  const [convos, setConvos] = useState<Convo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/admin/conversations')
        const j = await res.json()
        if (!alive) return
        if (!res.ok) { setError(j.error || 'Failed to load'); return }
        setConvos(j.conversations || [])
      } catch { if (alive) setError('Failed to load') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const badge = (o: Convo['outcome']) =>
    o === 'booked'
      ? <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">booked</span>
      : o === 'dispatch'
      ? <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/20">dispatch</span>
      : null

  return (
    <AdminShell activeLabel="Texts">
      <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto">
        <RisingFade>
          <Panel>
            <PanelHeader eyebrow="Text-to-book" title="SMS conversations" />
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-sm text-rose-300 py-6">{error}</div>
            ) : convos.length === 0 ? (
              <div className="text-sm text-gray-500 py-10 text-center">No text-to-book conversations yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {convos.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{fmtPhone(c.customerPhone)}</span>
                        <span className="text-[11px] text-gray-500">{c.businessName}</span>
                        {badge(c.outcome)}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {c.lastMessage
                          ? `${c.lastMessage.direction === 'inbound' ? '' : 'Agent: '}${c.lastMessage.body}`
                          : 'No messages'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-gray-500">{relTime(c.lastActivity)}</div>
                      <div className="text-[11px] text-gray-600">{c.messageCount} msgs · {c.inboundCount} in</div>
                    </div>
                    {c.reportToken && (
                      <a
                        href={`/r/${c.reportToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                      >
                        Report <ArrowSquareOut className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </RisingFade>
      </div>
    </AdminShell>
  )
}
