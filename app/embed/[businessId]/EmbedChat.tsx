'use client'

import { useEffect, useRef, useState } from 'react'
import { X, PaperPlaneRight } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

// Quick-reply chips (transport-flavored for Smart Ride, the first tenant).
const QUICK = ['Book a ride', 'Airport pickup quote', 'What areas do you serve?']

function getSessionId(businessId: string): string {
  const key = `cg_embed_sess_${businessId}`
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

// Matches the look of the landing ChatWidget: dark header, dark user bubbles,
// white assistant bubbles, typing dots, pill input + dark send button. Renders
// as the full panel inside the widget iframe (no intro form - it just chats).
export default function EmbedChat({ businessId, name, autoOpen }: { businessId: string; name: string; autoOpen?: boolean }) {
  const greeting: Msg = {
    role: 'assistant',
    content: `Hi! Thanks for visiting ${name}. I can answer questions and get you booked. How can I help?`,
  }
  const [messages, setMessages] = useState<Msg[]>([greeting])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef<string>('')

  useEffect(() => { sessionRef.current = getSessionId(businessId) }, [businessId])
  useEffect(() => {
    if (autoOpen) setTimeout(() => { try { window.parent?.postMessage({ type: 'cg-widget-autoopen' }, '*') } catch { /* ignore */ } }, 600)
  }, [autoOpen])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200) }, [])

  const send = async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, sessionId: sessionRef.current, message: text }),
      })
      const j = await r.json().catch(() => ({}))
      const reply = r.ok ? (j.reply || 'Got it.') : (j.error || 'Sorry, I hit a snag. Please try again.')
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I lost connection. Try again in a moment.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // Closing the panel is owned by the launcher (widget.js) on the host page;
  // tell it to close via postMessage when the visitor taps the X.
  const close = () => { try { window.parent?.postMessage({ type: 'cg-widget-close' }, '*') } catch { /* ignore */ } }

  const showChips = messages.length <= 1 && !loading

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="relative flex items-center justify-between bg-[#0a0a0b] px-5 py-4 text-white">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">{name}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" /> Online · replies in seconds
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="-mr-1.5 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[84%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'rounded-2xl rounded-br-md bg-[#0a0a0b] text-white'
                : 'rounded-2xl rounded-bl-md border border-black/[0.08] bg-white text-[#101015] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-black/[0.08] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          </div>
        )}

        {showChips && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-black/[0.12] bg-white px-3 py-1.5 text-xs font-medium text-[#101015] transition-colors hover:border-black/25 hover:bg-black/[0.04]">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2 border-t border-black/[0.08] bg-white p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-full border border-black/10 bg-[#fafafa] px-4 py-2.5 text-[16px] leading-snug text-[#101015] outline-none transition-colors placeholder:text-gray-400 focus:border-black/30 focus:bg-white"
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a0a0b] text-white transition-all hover:bg-black disabled:opacity-30">
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
        </button>
      </form>
    </div>
  )
}
