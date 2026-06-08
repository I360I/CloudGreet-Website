'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PaperPlaneRight } from '@phosphor-icons/react'

type Msg = { role: 'user' | 'assistant'; content: string }

const GREETING: Msg = {
 role: 'assistant',
 content:
  "Hey! I'm the CloudGreet assistant. I can answer questions, book you a quick demo, or have our AI call your phone so you can hear it live. What can I help with?",
}

const QUICK = [
 'Book me a demo',
 'Have your AI call my phone',
 'How much does it cost?',
 'Does it work for my business?',
]

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
  if (open) setTimeout(() => inputRef.current?.focus(), 250)
 }, [open])

 const send = async (override?: string) => {
  const text = (override ?? input).trim()
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

 const showChips = messages.length <= 1 && !loading

 return (
  <>
   {/* Launcher */}
   <motion.button
    type="button"
    onClick={() => setOpen((v) => !v)}
    aria-label={open ? 'Close assistant' : 'Chat with CloudGreet AI'}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.6, type: 'spring', stiffness: 320, damping: 22 }}
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.94 }}
    className="fixed bottom-5 right-5 z-[70] relative flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white shadow-[0_18px_44px_-10px_rgba(37,99,235,0.55)]"
   >
    {!open && (
     <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30 [animation-duration:2.5s]" />
    )}
    {open ? (
     <X className="relative h-6 w-6 text-gray-700" weight="bold" />
    ) : (
     <span className="relative h-full w-full overflow-hidden rounded-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/chat-agent.png" alt="Chat with CloudGreet AI" className="h-full w-full object-cover" />
     </span>
    )}
   </motion.button>

   {/* Panel */}
   <AnimatePresence>
    {open && (
     <motion.div
      key="chat-panel"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: 'bottom right' }}
      className="fixed bottom-24 right-5 z-[70] flex h-[min(72vh,600px)] w-[min(93vw,392px)] flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_40px_90px_-25px_rgba(15,23,42,0.55)]"
     >
      {/* Header */}
      <div className="relative flex items-center gap-3 bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-4 text-white">
       <span className="h-10 w-10 overflow-hidden rounded-full border border-white/40 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/chat-agent.png" alt="" className="h-full w-full object-cover" />
       </span>
       <div className="leading-tight">
        <div className="text-sm font-semibold">CloudGreet AI</div>
        <div className="flex items-center gap-1.5 text-[11px] text-blue-100">
         <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online · replies in seconds
        </div>
       </div>
       <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
        <X className="h-5 w-5" />
       </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-4 py-4">
       {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
         <div
          className={`max-w-[84%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
           m.role === 'user'
            ? 'rounded-2xl rounded-br-md bg-blue-600 text-white'
            : 'rounded-2xl rounded-bl-md border border-gray-100 bg-white text-gray-800'
          }`}
         >
          {m.content}
         </div>
        </div>
       ))}

       {loading && (
        <div className="flex justify-start">
         <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
         </div>
        </div>
       )}

       {showChips && (
        <div className="flex flex-wrap gap-2 pt-1">
         {QUICK.map((q) => (
          <button
           key={q}
           type="button"
           onClick={() => send(q)}
           className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
          >
           {q}
          </button>
         ))}
        </div>
       )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
       <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300 focus:bg-white"
       />
       <button
        type="submit"
        disabled={loading || !input.trim()}
        aria-label="Send"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:opacity-40"
       >
        <PaperPlaneRight className="h-4 w-4" weight="fill" />
       </button>
      </form>
     </motion.div>
    )}
   </AnimatePresence>
  </>
 )
}
