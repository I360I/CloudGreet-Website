'use client'

import { useEffect, useRef, useState } from 'react'
import { PaperPlaneRight, ArrowRight } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

function getSessionId(businessId: string): string {
  const key = `cg_quote_sess_${businessId}`
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default function QuoteEmbed({ businessId, name }: { businessId: string; name: string }) {
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef<string>('')

  useEffect(() => { sessionRef.current = getSessionId(businessId) }, [businessId])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const callChat = async (text: string) => {
    setLoading(true)
    try {
      const r = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, sessionId: sessionRef.current, message: text }),
      })
      const j = await r.json().catch(() => ({}))
      const reply = r.ok ? (j.reply || 'Got it.') : 'Sorry, something went wrong. Try again.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection issue — give it a second and try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => chatInputRef.current?.focus(), 50)
    }
  }

  const submitQuote = async () => {
    const from = pickup.trim()
    const to = dropoff.trim()
    if (!from || !to) return
    const text = `I need a quote from ${from} to ${to}`
    setStep('chat')
    setMessages([{ role: 'user', content: text }])
    await callChat(text)
  }

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || loading) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setChatInput('')
    await callChat(text)
  }

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center justify-between bg-[#0a0a0b] px-5 py-4 text-white flex-shrink-0">
      <div>
        <div className="text-[15px] font-semibold tracking-tight">{name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          {subtitle}
        </div>
      </div>
      {step === 'chat' && (
        <button
          type="button"
          onClick={() => { setStep('form'); setMessages([]); setLoading(false) }}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1"
        >
          New quote
        </button>
      )}
    </div>
  )

  if (step === 'form') {
    return (
      <div className="flex h-screen flex-col bg-white">
        <Header subtitle="Instant price quote" />
        <div className="flex flex-1 flex-col justify-center px-6 gap-3">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Pickup
              </label>
              <input
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitQuote()}
                placeholder="e.g. 123 Main St, Columbus"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[16px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-800 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Destination
              </label>
              <input
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitQuote()}
                placeholder="e.g. Columbus Airport (CMH)"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[16px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-800 focus:bg-white"
              />
            </div>
          </div>
          <button
            onClick={submitQuote}
            disabled={!pickup.trim() || !dropoff.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0a0a0b] px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-black/80 disabled:opacity-35 mt-1"
          >
            Get Quote <ArrowRight weight="bold" className="w-4 h-4" />
          </button>
          <p className="text-center text-[11px] text-gray-400">Instant quote · no obligation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <Header subtitle="Online · replies in seconds" />
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); void sendChat() }}
        className="flex items-center gap-2 border-t border-black/[0.08] bg-white p-3 flex-shrink-0"
      >
        <input
          ref={chatInputRef}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-full border border-black/10 bg-[#fafafa] px-4 py-2.5 text-[16px] leading-snug text-[#101015] outline-none transition-colors placeholder:text-gray-400 focus:border-black/30 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading || !chatInput.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a0a0b] text-white transition-all hover:bg-black disabled:opacity-30"
        >
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
        </button>
      </form>
    </div>
  )
}
