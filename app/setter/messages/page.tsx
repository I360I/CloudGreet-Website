'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChatText, ArrowLeft, WarningCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SetterLoadingState } from '../_components/SetterShell'
import { SmsThread } from '../_components/SmsThread'
import { firaCode } from '../_components/fonts'

const NAVY = '#1E3A8A'

type Thread = {
  lead_id: string | null
  business_name: string | null
  contact_name: string | null
  phone: string | null
  last_body: string
  last_direction: 'inbound' | 'outbound'
  last_at: string
  unread: number
}

// Threads are keyed by lead when the sender matched one, otherwise by
// the counterpart phone number (unknown numbers still show up).
const threadKey = (t: Thread) => t.lead_id || `phone:${t.phone}`

const POLL_MS = 20000

/**
 * SMS inbox: every text conversation with this setter's leads, unread
 * counts, and the shared thread view (same component the cockpit uses).
 * Replies land here via the Telnyx rep-sms-webhook.
 */
export default function SetterMessagesPage() {
  return <MessagesBody />
}

function MessagesBody() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState<Thread | null>(null)

  const fetchInbox = useCallback(async () => {
    try {
      const r = await fetchWithAuth('/api/sales/dialer/sms?inbox=1')
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || 'Failed to load messages'); return }
      setErr('')
      setThreads(j.threads || [])
    } catch {
      setErr('Failed to load messages')
    }
  }, [])

  useEffect(() => {
    void fetchInbox().finally(() => setLoading(false))
    const t = setInterval(() => { void fetchInbox() }, POLL_MS)
    return () => clearInterval(t)
  }, [fetchInbox])

  // Opening a thread marks it read server-side (SmsThread does that);
  // zero the local badge immediately so the list doesn't lag the read.
  const open = (t: Thread) => {
    setSelected(t)
    if (t.unread > 0) {
      setThreads((prev) => prev.map((x) => (threadKey(x) === threadKey(t) ? { ...x, unread: 0 } : x)))
    }
  }

  if (loading) return <SetterLoadingState />

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Texts with your leads - replies to your follow-ups land here. STOP replies flip the lead to Do Not Call automatically.
        </p>
      </div>

      {err && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {threads.length === 0 && !err ? (
        <div className="bg-white rounded-xl border border-[#E3EAF4] p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-4">
            <ChatText weight="duotone" className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium text-slate-700 mb-1">No conversations yet</div>
          <div className="text-sm text-slate-500">
            Send a follow-up text from the dialer and the thread will show up here.
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[340px,1fr] gap-4 items-start">
          {/* Conversation list - hidden on mobile once a thread is open */}
          <div className={`bg-white rounded-xl border border-[#E3EAF4] overflow-hidden ${selected ? 'hidden lg:block' : ''}`}>
            <ul className="divide-y divide-[#F5F8FC] max-h-[70vh] overflow-y-auto">
              {threads.map((t) => (
                <li key={threadKey(t)}>
                  <button
                    onClick={() => open(t)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      selected && threadKey(selected) === threadKey(t) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {t.business_name || t.contact_name || t.phone || 'Unknown'}
                      </span>
                      <span className={`text-[10px] text-slate-400 shrink-0 ${firaCode.className}`}>
                        {new Date(t.last_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 truncate">
                        {t.last_direction === 'outbound' ? 'You: ' : ''}{t.last_body}
                      </span>
                      {t.unread > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-semibold px-1">
                          {t.unread}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Thread */}
          <div className={`bg-white rounded-xl border border-[#E3EAF4] p-4 ${selected ? '' : 'hidden lg:block'}`}>
            {selected ? (
              <>
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#EEF2F7]">
                  <button
                    onClick={() => setSelected(null)}
                    className="lg:hidden inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-[#F8FAFC]"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                      {selected.business_name || selected.contact_name || 'Unknown'}
                    </div>
                    {selected.phone && (
                      <div className={`text-[11px] text-slate-500 ${firaCode.className}`}>{selected.phone}</div>
                    )}
                  </div>
                </div>
                <SmsThread leadId={selected.lead_id} phone={selected.phone} onSent={() => void fetchInbox()} />
              </>
            ) : (
              <div className="py-16 text-center text-sm text-slate-400">
                Pick a conversation to read the thread.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
