'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleNotch, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { firaCode } from './fonts'

/**
 * SMS conversation with one lead: message bubbles + composer. Shared by
 * the dialer cockpit (under the live call card) and /setter/messages.
 * Polls the thread every 15s while mounted and marks inbound messages
 * read on view - the nav badge and inbox unread counts drain as the
 * setter actually reads threads.
 *
 * v5 tokens: outbound right in brand blue, inbound left on slate,
 * Fira Code timestamps.
 */

export type SmsMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
}

const POLL_MS = 15000

export function SmsThread({
  leadId,
  templates,
  placeholder,
  onSent,
}: {
  leadId: string | null
  /** Optional quick-fill chips (cockpit passes its script templates, already variable-filled). */
  templates?: { id: string; title: string; body: string }[]
  placeholder?: string
  /** Fires after a successful send (cockpit uses it to bump session state). */
  onSent?: () => void
}) {
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [sendError, setSendError] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastCountRef = useRef(0)

  const fetchThread = useCallback(async (id: string, opts?: { markRead?: boolean }) => {
    try {
      const r = await fetchWithAuth(`/api/sales/dialer/sms?lead_id=${encodeURIComponent(id)}${opts?.markRead ? '&mark_read=1' : ''}`)
      const j = await r.json().catch(() => ({}))
      if (j?.success) setMessages(j.messages || [])
    } catch { /* poll again next tick */ }
  }, [])

  // Load + mark read when the lead changes; poll while mounted.
  useEffect(() => {
    setMessages([])
    setDraft('')
    setSendState('idle')
    if (!leadId) return
    setLoading(true)
    void fetchThread(leadId, { markRead: true }).finally(() => setLoading(false))
    const t = setInterval(() => { void fetchThread(leadId, { markRead: true }) }, POLL_MS)
    return () => clearInterval(t)
  }, [leadId, fetchThread])

  // Pin the scroll to the newest message when the thread grows.
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || !leadId || sendState === 'sending') return
    setSendState('sending'); setSendError('')
    try {
      const r = await fetchWithAuth('/api/sales/dialer/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, body: text }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setSendState('error'); setSendError(j?.error || `Failed (${r.status})`)
        return
      }
      setSendState('idle'); setDraft('')
      onSent?.()
      void fetchThread(leadId)
    } catch {
      setSendState('error'); setSendError('Network error')
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-56 overflow-y-auto px-1 pb-2 space-y-1.5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs leading-snug ${
                m.direction === 'outbound'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-[#F1F5F9] text-slate-800 rounded-bl-sm'
              }`}>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-0.5 text-[9px] ${firaCode.className} ${
                  m.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'
                }`}>
                  {new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {loading && messages.length === 0 && (
        <div className="text-xs text-slate-400 px-1 pb-2">Loading messages…</div>
      )}

      {templates && templates.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pb-2 px-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setDraft(t.body)}
              className="text-[10px] rounded-full border border-[#E3EAF4] px-2 py-0.5 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors duration-150"
            >
              {t.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
          }}
          rows={2}
          placeholder={placeholder || 'Type a text… (Enter to send)'}
          disabled={!leadId}
          className="flex-1 min-w-0 bg-[#F8FAFC] border border-[#E3EAF4] rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-400 focus:bg-white disabled:opacity-50"
        />
        <button
          onClick={() => void send()}
          disabled={!draft.trim() || !leadId || sendState === 'sending'}
          className="inline-flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors duration-200 disabled:opacity-50"
        >
          {sendState === 'sending'
            ? <CircleNotch className="w-3.5 h-3.5 animate-spin" />
            : <PaperPlaneTilt weight="fill" className="w-3.5 h-3.5" />}
          Send
        </button>
      </div>
      {sendState === 'error' && (
        <div className="mt-1.5 text-[11px] text-rose-700 flex items-start gap-1">
          <WarningCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {sendError}
        </div>
      )}
    </div>
  )
}
