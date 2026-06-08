'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatCircle, X, PaperPlaneRight } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

const GREETING: Msg = {
 role: 'assistant',
 content:
  "Hey! I'm the CloudGreet assistant. Ask me anything, or I can book you a quick demo or have our AI call your phone so you can hear it live. What's up?",
}

export function ChatWidget() {
 const [open, setOpen] = useState(false)
 const [messages, setMessages] = useState<Msg[]>([GREETING])
 const [input, setInput] = useState('')
 const [loading, setLoading] = useState(false)
 const scrollRef = useRef<HTMLDivElement>(null)
 const inputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
 }, [messages, loading, open])

 useEffect(() => {
  if (open) inputRef.current?.focus()
 }, [open])

 const send = async (e?: React.FormEvent) => {
  e?.preventDefault()
  const text = input.trim()
  if (!text || loading) return
  const next = [...messages, { role: 'user' as const, content: text }]
  setMessages(next)
  setInput('')
  setLoading(true)
  try {
   const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: next }),
   })
   const j = await r.json().catch(() => ({}))
   setMessages((m) => [...m, { role: 'assistant', content: j?.reply || 'Sorry, I hit a snag. Try booking a demo and the team will reach out.' }])
  } catch {
   setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I lost connection. Try again in a moment.' }])
  } finally {
   setLoading(false)
  }
 }

 return (
  <>
   {/* Launcher */}
   <button
    type="button"
    onClick={() => setOpen((v) => !v)}
    aria-label={open ? 'Close assistant' : 'Open assistant'}
    className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_16px_40px_-10px_rgba(37,99,235,0.6)] transition-transform hover:scale-105 active:scale-95"
   >
    {open ? <X className="h-6 w-6" weight="bold" /> : <ChatCircle className="h-7 w-7" weight="fill" />}
   </button>

   {/* Panel */}
   {open && (
    <div className="fixed bottom-24 right-5 z-[70] flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]">
     <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-950 px-5 py-4 text-white">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
       <ChatCircle className="h-5 w-5" weight="fill" />
      </span>
      <div className="leading-tight">
       <div className="text-sm font-semibold">CloudGreet assistant</div>
       <div className="text-[11px] text-gray-300">Answers fast. Books demos.</div>
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto text-gray-400 hover:text-white">
       <X className="h-5 w-5" />
      </button>
     </div>

     <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((m, i) => (
       <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
         className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
         }`}
        >
         {m.content}
        </div>
       </div>
      ))}
      {loading && (
       <div className="flex justify-start">
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3.5 py-3">
         <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
         <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
         <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
        </div>
       </div>
      )}
     </div>

     <form onSubmit={send} className="flex items-center gap-2 border-t border-gray-100 p-3">
      <input
       ref={inputRef}
       value={input}
       onChange={(e) => setInput(e.target.value)}
       placeholder="Ask anything, or say 'book a demo'..."
       className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
      />
      <button
       type="submit"
       disabled={loading || !input.trim()}
       aria-label="Send"
       className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
       <PaperPlaneRight className="h-4 w-4" weight="fill" />
      </button>
     </form>
    </div>
   )}
  </>
 )
}
