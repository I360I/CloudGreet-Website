'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PaperPlaneRight, ArrowRight, ArrowCounterClockwise } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

// Ride categories. Optional - lets a visitor signal what the trip is for,
// which both reinforces that the widget handles any ride (not just airports)
// and gives the AI context to tailor the conversation from the first message.
const RIDE_TYPES = [
  'Airport',
  'Wedding',
  'Medical',
  'Event / Concert',
  'Business',
  'Cruise Port',
  'Senior Transportation',
  'Hourly / As Directed',
  'Other',
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
  radius = '12px',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  onSubmit?: () => void
  onFocused?: () => void
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
      {label && (
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
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
    </div>
  )
}

function RideTypeSelect({
  value,
  onChange,
  onFocused,
  radius = '12px',
}: {
  value: string
  onChange: (v: string) => void
  onFocused?: () => void
  radius?: string
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
        What kind of ride?
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocused}
        className="w-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[16px] text-gray-900 outline-none transition-colors focus:border-gray-400 focus:bg-white"
        style={{ borderRadius: radius }}
      >
        <option value="">Any ride</option>
        {RIDE_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
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
  layout = 'stacked',
  expandOnFocus = true,
}: {
  businessId: string
  name: string
  accent?: string
  bg?: string
  radius?: number
  label?: string
  showHeader?: boolean
  layout?: 'stacked' | 'side'
  expandOnFocus?: boolean
}) {
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [rideType, setRideType] = useState('')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef<string>('')

  // Hourly/As Directed rides are priced by the hour, not by destination, so
  // the widget shouldn't collect (or require) a dropoff for this ride type -
  // the AI asks how many hours instead once the conversation starts.
  const isHourly = rideType === 'Hourly / As Directed'
  useEffect(() => { if (isHourly) setDropoff('') }, [isHourly])

  useEffect(() => { sessionRef.current = getSessionId(businessId) }, [businessId])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    if (step === 'chat') {
      const h = document.documentElement.scrollHeight + 8
      try { window.parent?.postMessage({ type: 'cg-quote-height', height: h }, '*') } catch { /* ignore */ }
    }
  }, [messages, loading, step])

  // Tell the parent iframe what height we need so it never clips content
  useEffect(() => {
    if (step === 'chat') return // chat resize is handled by submitQuote
    const narrow = window.innerWidth < 380
    const headerH = showHeader ? 56 : 0
    // Extra row for the optional "What kind of ride?" select (~56px).
    const formH = narrow || layout === 'stacked' ? 420 : 260
    postToParent('cg-quote-resize-form')
    try { window.parent?.postMessage({ type: 'cg-quote-height', height: headerH + formH }, '*') } catch { /* ignore */ }
  }, [step, layout, showHeader])

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
    if (!from || (!isHourly && !to)) return
    // Fold the ride type into the opening message so the AI has context from
    // the first turn (e.g. "a Wedding ride"). Hourly has no destination - the
    // AI asks how many hours once the conversation starts.
    const text = isHourly
      ? `I need a quote for an Hourly / As Directed ride, pickup at ${from}`
      : rideType
        ? `I need a quote for a ${rideType} ride from ${from} to ${to}`
        : `I need a quote from ${from} to ${to}`
    setStep('chat')
    postToParent('cg-quote-resize-chat')
    setMessages([{ role: 'user', content: text }])
    await callChat(text)
  }

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center gap-2 px-4 py-3 text-white flex-shrink-0" style={{ background: accent }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold tracking-tight truncate">{name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
          {subtitle}
        </div>
      </div>
      {step === 'chat' && (
        <button
          type="button"
          onClick={() => { setStep('form'); setMessages([]); setLoading(false); postToParent('cg-quote-collapse'); postToParent('cg-quote-resize-form') }}
          aria-label="New quote"
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowCounterClockwise weight="bold" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  const r = `${radius}px`

  const expand = () => { if (expandOnFocus) postToParent('cg-quote-expand') }

  if (step === 'form' && layout === 'side') {
    return (
      <div className="flex h-screen flex-col" style={{ background: bg }}>
        {showHeader && <Header subtitle="Instant price quote" />}
        <div className="flex flex-1 flex-col overflow-y-scroll px-4 py-4 gap-3" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <RideTypeSelect value={rideType} onChange={setRideType} onFocused={expand} radius={r} />
          <div className={isHourly ? '' : 'grid grid-cols-1 min-[380px]:grid-cols-2 gap-2'}>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Pickup</p>
              <AddressInput
                label=""
                value={pickup}
                onChange={setPickup}
                placeholder="Pickup location"
                onSubmit={submitQuote}
                onFocused={expand}
                radius={r}
              />
            </div>
            {!isHourly && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                <AddressInput
                  label=""
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="Where to?"
                  onSubmit={submitQuote}
                  onFocused={expand}
                  radius={r}
                />
              </div>
            )}
          </div>

          <button
            onClick={submitQuote}
            disabled={!pickup.trim() || (!isHourly && !dropoff.trim())}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-35"
            style={{ background: accent, borderRadius: r }}
          >
            {label} <ArrowRight weight="bold" className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-gray-400">Instant quote · no obligation</p>
        </div>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div className="flex h-screen flex-col" style={{ background: bg }}>
        {showHeader && <Header subtitle="Instant price quote" />}
        <div className="flex-1 overflow-y-scroll" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        <div className="flex flex-col px-4 py-4 gap-1.5">
          <div className="space-y-2.5">
            <RideTypeSelect value={rideType} onChange={setRideType} onFocused={expand} radius={r} />
            <AddressInput
              label="Pickup"
              value={pickup}
              onChange={setPickup}
              placeholder="e.g. 123 Main St, Columbus"
              onSubmit={submitQuote}
              onFocused={expand}
              radius={r}
            />
            {!isHourly && (
              <AddressInput
                label="Destination"
                value={dropoff}
                onChange={setDropoff}
                placeholder="e.g. 456 High St, Dublin"
                onSubmit={submitQuote}
                onFocused={expand}
                radius={r}
              />
            )}
          </div>
          <button
            onClick={submitQuote}
            disabled={!pickup.trim() || (!isHourly && !dropoff.trim())}
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
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-scroll px-3 py-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] min-w-0 whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed ${
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
      <div
        className="flex items-end gap-2 border-t border-black/[0.08] p-3 flex-shrink-0"
        style={{ background: bg }}
      >
        <textarea
          ref={chatInputRef as any}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void sendChat()
            }
          }}
          placeholder="Type a message… Shift+Enter for new line"
          rows={1}
          className="min-w-0 flex-1 resize-none rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-2.5 text-[16px] leading-snug text-[#101015] outline-none transition-colors placeholder:text-gray-400 focus:border-black/30 focus:bg-white"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="button"
          onClick={() => void sendChat()}
          disabled={loading || !chatInput.trim()}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-30 mb-0.5"
          style={{ background: accent }}
        >
          <PaperPlaneRight className="h-3.5 w-3.5" weight="fill" />
        </button>
      </div>
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
