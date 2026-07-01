'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PaperPlaneRight, ArrowRight } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

const AIRPORTS = [
  { label: 'CMH', value: 'John Glenn Columbus International Airport (CMH), Columbus, OH' },
  { label: 'Rickenbacker', value: 'Rickenbacker International Airport (LCK), Columbus, OH' },
]

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

function postToParent(type: string) {
  try { window.parent?.postMessage({ type }, '*') } catch { /* ignore */ }
}

function AddressInput({
  label,
  value,
  onChange,
  placeholder,
  onSubmit,
  onFocused,
  accent,
  radius = '12px',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  onSubmit?: () => void
  onFocused?: () => void
  accent: string
  radius?: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/embed/places?input=${encodeURIComponent(q)}`)
        const j = await r.json().catch(() => ({ predictions: [] }))
        setSuggestions(j.predictions || [])
        setOpen((j.predictions || []).length > 0)
        setActive(-1)
      } catch { /* ignore */ }
    }, 280)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (s: string) => { onChange(s); setOpen(false); setSuggestions([]); setActive(-1) }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'Enter') onSubmit?.()
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && suggestions[active]) pick(suggestions[active])
      else { setOpen(false); onSubmit?.() }
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef}>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); fetchSuggestions(e.target.value) }}
          onKeyDown={onKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); onFocused?.() }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[16px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
          style={{ borderRadius: radius }}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={s}
                onMouseDown={() => pick(s)}
                className={`px-3.5 py-2 text-[13px] text-gray-800 cursor-pointer leading-snug transition-colors ${i === active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {AIRPORTS.map((a) => (
          <button
            key={a.label}
            type="button"
            onMouseDown={() => pick(a.value)}
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
            style={
              value === a.value
                ? { background: accent, borderColor: accent, color: '#fff' }
                : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }
            }
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function QuoteEmbed({
  businessId,
  name,
  accent = '#0a0a0b',
  bg = '#ffffff',
  radius = 12,
  label = 'Get Quote',
  showHeader = true,
}: {
  businessId: string
  name: string
  accent?: string
  bg?: string
  radius?: number
  label?: string
  showHeader?: boolean
}) {
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

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0" style={{ background: accent }}>
      <div>
        <div className="text-[14px] font-semibold tracking-tight">{name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          {subtitle}
        </div>
      </div>
      {step === 'chat' && (
        <button
          type="button"
          onClick={() => { setStep('form'); setMessages([]); setLoading(false); postToParent('cg-quote-collapse') }}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1"
        >
          New quote
        </button>
      )}
    </div>
  )

  const r = `${radius}px`

  if (step === 'form') {
    return (
      <div className="flex h-screen flex-col" style={{ background: bg }}>
        {showHeader && <Header subtitle="Instant price quote" />}
        <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col min-h-full justify-center px-4 py-3 gap-1.5">
          <div className="space-y-2.5">
            <AddressInput
              label="Pickup"
              value={pickup}
              onChange={setPickup}
              placeholder="e.g. 123 Main St, Columbus"
              onSubmit={submitQuote}
              onFocused={() => postToParent('cg-quote-expand')}
              accent={accent}
              radius={r}
            />
            <AddressInput
              label="Destination"
              value={dropoff}
              onChange={setDropoff}
              placeholder="e.g. Columbus Airport (CMH)"
              onSubmit={submitQuote}
              onFocused={() => postToParent('cg-quote-expand')}
              accent={accent}
              radius={r}
            />
          </div>
          <button
            onClick={submitQuote}
            disabled={!pickup.trim() || !dropoff.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-35 mt-1"
            style={{ background: accent, borderRadius: r }}
          >
            {label} <ArrowRight weight="bold" className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-gray-400">Instant quote · no obligation</p>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: bg }}>
      {showHeader && <Header subtitle="Online · replies in seconds" />}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[84%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-2xl rounded-br-md text-white'
                  : 'rounded-2xl rounded-bl-md border border-black/[0.08] bg-white text-[#101015] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              }`}
              style={m.role === 'user' ? { background: accent } : {}}
            >
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
        className="flex items-center gap-2 border-t border-black/[0.08] p-3 flex-shrink-0"
        style={{ background: bg }}
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-30"
          style={{ background: accent }}
        >
          <PaperPlaneRight className="h-4 w-4" weight="fill" />
        </button>
      </form>
    </div>
  )

  function sendChat() {
    const text = chatInput.trim()
    if (!text || loading) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setChatInput('')
    return callChat(text)
  }
}
