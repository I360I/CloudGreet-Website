'use client'

import { useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; text: string }

const ACCENT = '#2563eb'

// Inline styles throughout so the widget renders identically no matter what
// CSS the host WordPress theme ships - the iframe gives us a clean document,
// and we don't rely on Tailwind being present at this route.
const S = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#111827' } as const,
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #eceef2', flexShrink: 0 } as const,
  dot: { width: 8, height: 8, borderRadius: 999, background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.18)' } as const,
  body: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f7f8fa' } as const,
  inputBar: { display: 'flex', gap: 8, padding: '12px', borderTop: '1px solid #eceef2', flexShrink: 0, background: '#fff' } as const,
  input: { flex: 1, border: '1px solid #d8dce2', borderRadius: 10, padding: '10px 12px', fontSize: 15, outline: 'none', fontFamily: 'inherit', color: '#111827' } as const,
  send: { border: 'none', background: ACCENT, color: '#fff', borderRadius: 10, padding: '0 16px', fontSize: 15, fontWeight: 600, cursor: 'pointer' } as const,
  poweredBy: { textAlign: 'center', fontSize: 11, color: '#9aa3af', padding: '6px 0 8px' } as const,
}

function bubbleStyle(role: 'user' | 'assistant'): React.CSSProperties {
  const base: React.CSSProperties = {
    maxWidth: '82%', padding: '9px 12px', borderRadius: 14, fontSize: 14.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }
  return role === 'user'
    ? { ...base, alignSelf: 'flex-end', background: ACCENT, color: '#fff', borderBottomRightRadius: 4 }
    : { ...base, alignSelf: 'flex-start', background: '#fff', color: '#111827', border: '1px solid #e7e9ee', borderBottomLeftRadius: 4 }
}

export default function EmbedChat({ businessId, name }: { businessId: string; name: string }) {
  const [phase, setPhase] = useState<'intro' | 'chat'>('intro')
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Remember the visitor so they skip the intro next time.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cg_embed_${businessId}`) || 'null')
      if (saved?.name && saved?.phone) {
        setVisitorName(saved.name); setVisitorPhone(saved.phone)
        setPhase('chat')
        setMessages([{ role: 'assistant', text: `Hey${saved.name ? ' ' + saved.name.split(' ')[0] : ''}, welcome back to ${name}. How can I help?` }])
      }
    } catch { /* ignore */ }
  }, [businessId, name])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, sending])

  const startChat = (e: React.FormEvent) => {
    e.preventDefault()
    const digits = visitorPhone.replace(/\D/g, '')
    if (!visitorName.trim()) { setFormError('Please enter your name.'); return }
    if (digits.length !== 10 && !(digits.length === 11 && digits.startsWith('1'))) {
      setFormError('Please enter a valid US mobile number.'); return
    }
    setFormError('')
    try { localStorage.setItem(`cg_embed_${businessId}`, JSON.stringify({ name: visitorName.trim(), phone: visitorPhone })) } catch { /* ignore */ }
    setPhase('chat')
    setMessages([{ role: 'assistant', text: `Hi ${visitorName.trim().split(' ')[0]}! Thanks for reaching out to ${name}. What can I help you with?` }])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setMessages((m) => [...m, { role: 'user', text }])
    setSending(true)
    try {
      const r = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name: visitorName, phone: visitorPhone, message: text }),
      })
      const j = await r.json().catch(() => ({}))
      const reply = r.ok ? (j.reply || 'Got it.') : (j.error || 'Sorry, I hit a snag. Please try again.')
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Connection issue. Please try again in a moment.' }])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.dot} />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Online now, replies instantly</div>
        </div>
      </div>

      {phase === 'intro' ? (
        <form onSubmit={startChat} style={{ ...S.body, justifyContent: 'flex-start', gap: 12 }}>
          <div style={{ ...bubbleStyle('assistant'), maxWidth: '100%' }}>
            Hi! I&apos;m the {name} assistant. I can answer questions and book you in. First, who am I chatting with?
          </div>
          <input
            style={S.input}
            placeholder="Your name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            autoFocus
          />
          <input
            style={S.input}
            placeholder="Mobile number (so we can text you back)"
            inputMode="tel"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
          />
          {formError && <div style={{ color: '#dc2626', fontSize: 13 }}>{formError}</div>}
          <button type="submit" style={{ ...S.send, padding: '11px 16px' }}>Start chat</button>
          <div style={{ fontSize: 11.5, color: '#9aa3af' }}>We only use your number to follow up about your request.</div>
        </form>
      ) : (
        <>
          <div ref={bodyRef} style={S.body}>
            {messages.map((m, i) => (
              <div key={i} style={bubbleStyle(m.role)}>{m.text}</div>
            ))}
            {sending && (
              <div style={{ ...bubbleStyle('assistant'), color: '#9aa3af' }}>typing…</div>
            )}
          </div>
          <div style={S.inputBar}>
            <input
              ref={inputRef}
              style={S.input}
              placeholder="Type your message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              disabled={sending}
            />
            <button style={{ ...S.send, opacity: sending || !draft.trim() ? 0.5 : 1 }} onClick={send} disabled={sending || !draft.trim()}>Send</button>
          </div>
        </>
      )}
      <div style={S.poweredBy}>Powered by CloudGreet</div>
    </div>
  )
}
