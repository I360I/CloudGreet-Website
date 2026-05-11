'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CircleNotch,
  PaperPlaneTilt,
  Sparkle,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  Wrench,
  Globe,
  Stop,
} from '@phosphor-icons/react'
import { GhostButton, PrimaryButton } from '../_components/ui'

/**
 * Multi-turn chat with the CloudGreet Prompt Generator managed agent.
 *
 * The first message of a brand-new session is silently augmented
 * server-side with rich business context (website excerpts, GMB,
 * knowledge base entries, recent calls/appointments). So the admin can
 * literally just type "go" on a fresh session and the agent will run
 * the full generation workflow.
 *
 * On follow-up turns the admin can refine ("make it warmer", "swap the
 * name to Cole", "add weekend hours"). The same session persists across
 * page reloads via closes.agent_chat_session_id.
 *
 * When the agent emits a final AGENT PROMPT block, the admin clicks
 * "Use this prompt" - we extract the block, post it to the use-prompt
 * endpoint, and the existing DraftBuilder approve flow takes over.
 */

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input?: string }
  | { type: 'tool_result'; name?: string; ok: boolean; preview?: string }
  | { type: 'thinking'; text: string }
  | { type: 'error'; message: string }

type Msg = {
  role: 'user' | 'agent'
  blocks: Block[]
  ts: number
}

export function AgentChat({
  closeId,
  hasWebsite,
  onPromptAdopted,
}: {
  closeId: string
  hasWebsite: boolean
  onPromptAdopted: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [err, setErr] = useState('')
  const [sessionFresh, setSessionFresh] = useState<boolean | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [messages, streaming])

  const send = async (text: string) => {
    if (!text.trim() || streaming) return
    setErr('')
    const userMsg: Msg = { role: 'user', blocks: [{ type: 'text', text }], ts: Date.now() }
    const agentMsg: Msg = { role: 'agent', blocks: [], ts: Date.now() + 1 }
    setMessages((prev) => [...prev, userMsg, agentMsg])
    setInput('')
    setStreaming(true)

    const ac = new AbortController()
    abortRef.current = ac

    try {
      // We use fetch + manual SSE parsing rather than EventSource since
      // EventSource doesn't support POST + admin auth cookies behave
      // weirdly with credentialed cross-origin EventSource in some browsers.
      const res = await fetch(`/api/admin/agents-due/${closeId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by \n\n. Each frame is one or more
        // "data: ..." lines.
        let split: number
        while ((split = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, split)
          buffer = buffer.slice(split + 2)
          const dataLines = frame.split('\n').filter((l) => l.startsWith('data:'))
          for (const line of dataLines) {
            const payload = line.slice(5).trim()
            if (!payload) continue
            let obj: any
            try { obj = JSON.parse(payload) } catch { continue }

            if (obj.type === 'session') {
              setSessionFresh(obj.fresh === true)
              continue
            }
            if (obj.type === 'done') {
              setStreaming(false)
              continue
            }
            if (obj.type === 'error') {
              setErr(obj.message || 'Agent error')
              setStreaming(false)
              continue
            }

            // Append the block to the last agent message. Text blocks
            // merge with the trailing text block (Anthropic streams text
            // in many small pieces).
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (!last || last.role !== 'agent') return prev
              const lastBlock = last.blocks[last.blocks.length - 1]
              if (obj.type === 'text' && lastBlock?.type === 'text') {
                last.blocks = [
                  ...last.blocks.slice(0, -1),
                  { type: 'text', text: lastBlock.text + obj.text },
                ]
              } else {
                last.blocks = [...last.blocks, obj as Block]
              }
              return next
            })
          }
        }
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setErr(e instanceof Error ? e.message : 'Chat failed')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const interrupt = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const resetSession = async () => {
    if (!window.confirm('Start a fresh chat? The current conversation is forgotten on both sides.')) return
    setResetting(true); setErr('')
    try {
      await fetch(`/api/admin/agents-due/${closeId}/chat`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setMessages([])
      setSessionFresh(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  /**
   * Pull the most recent AGENT PROMPT block out of the agent's
   * messages. The system prompt instructs the model to emit
   *   --- # AGENT PROMPT (paste into Retell ... ) ---
   *   [prompt body]
   *   --- # KNOWLEDGE BASE ... ---
   * so we slice between those delimiters.
   */
  const extractPrompt = (): string | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role !== 'agent') continue
      const text = m.blocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text as string)
        .join('\n')
      const match = text.match(
        /---\s*\n#\s*AGENT PROMPT[^\n]*\n---\s*([\s\S]*?)(?:\n---\s*\n#\s*KNOWLEDGE BASE|\n---\s*\n#\s*DEPLOYMENT|\n---\s*\n#\s*NEEDS REVIEW|$)/,
      )
      if (match) return match[1].trim()
    }
    return null
  }

  const adopt = async () => {
    const prompt = extractPrompt()
    if (!prompt) {
      setErr('No AGENT PROMPT block in the chat yet. Tell the agent to "give me the final prompt" first.')
      return
    }
    setAdopting(true); setErr('')
    try {
      const res = await fetch(`/api/admin/agents-due/${closeId}/chat/use-prompt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) throw new Error(j?.error || `HTTP ${res.status}`)
      onPromptAdopted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save prompt')
    } finally {
      setAdopting(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const empty = messages.length === 0

  return (
    <div className="rounded-lg border border-fuchsia-500/20 bg-gradient-to-b from-fuchsia-500/[0.03] to-transparent overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-fuchsia-300" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fuchsia-300">
            Chat with prompt generator
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!empty && (
            <GhostButton onClick={resetSession} disabled={resetting || streaming}>
              {resetting ? <CircleNotch className="w-3 h-3 animate-spin" /> : <ArrowsClockwise className="w-3 h-3" />}
              New chat
            </GhostButton>
          )}
          <GhostButton onClick={adopt} disabled={adopting || streaming || messages.length === 0}>
            {adopting ? <CircleNotch className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Use this prompt
          </GhostButton>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="h-[60vh] min-h-[420px] overflow-y-auto px-4 py-4 space-y-4 bg-black/20"
      >
        {empty && (
          <div className="text-xs text-gray-400 space-y-2">
            <p>
              Chat with the CloudGreet Prompt Generator about this client. The first message you send is silently
              augmented with the client&apos;s pre-fetched website + CloudGreet DB context, so you can literally just type
              <span className="font-mono text-fuchsia-300"> go </span>
              and it&apos;ll run the full workflow.
            </p>
            <p>
              Follow-ups: <span className="font-mono">&quot;swap the agent name to Cole&quot;</span>,{' '}
              <span className="font-mono">&quot;add weekend hours&quot;</span>,{' '}
              <span className="font-mono">&quot;make the tone warmer&quot;</span>,{' '}
              <span className="font-mono">&quot;give me the final prompt&quot;</span>.
            </p>
            {!hasWebsite && (
              <p className="text-amber-300/80">
                No website on file — paste one above first or the agent will have nothing to fetch.
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <ChatMessage key={i} msg={m} />
        ))}

        {streaming && messages[messages.length - 1]?.role === 'agent' &&
          messages[messages.length - 1].blocks.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CircleNotch className="w-3 h-3 animate-spin" /> Thinking…
            </div>
          )}
      </div>

      {err && (
        <div className="px-4 py-2 border-t border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
          <WarningCircle className="w-3.5 h-3.5 shrink-0" /> {err}
        </div>
      )}

      <div className="border-t border-white/5 p-3 bg-black/30">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={empty ? 'Type "go" to start, or describe overrides…' : 'Refine, or ask for the final prompt…'}
            rows={2}
            disabled={streaming}
            className="flex-1 bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-fuchsia-400/40 focus:outline-none resize-y disabled:opacity-50"
          />
          {streaming ? (
            <button
              type="button"
              onClick={interrupt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs hover:bg-rose-500/30"
            >
              <Stop className="w-3.5 h-3.5" /> Stop
            </button>
          ) : (
            <PrimaryButton onClick={() => send(input)} disabled={!input.trim()}>
              <PaperPlaneTilt className="w-3.5 h-3.5" /> Send
            </PrimaryButton>
          )}
        </div>
        {sessionFresh != null && (
          <div className="mt-1.5 text-[10px] text-gray-500 font-mono">
            {sessionFresh ? 'session: fresh (context auto-included)' : 'session: continued'}
          </div>
        )}
      </div>
    </div>
  )
}

function ChatMessage({ msg }: { msg: Msg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
          msg.role === 'user'
            ? 'bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-100'
            : 'bg-white/[0.04] border border-white/10 text-gray-200'
        }`}
      >
        {msg.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </div>
  )
}

function Block({ block }: { block: Block }) {
  if (block.type === 'text') {
    return <div className="whitespace-pre-wrap font-sans">{block.text}</div>
  }
  if (block.type === 'thinking') {
    return (
      <div className="my-1 px-2 py-1 rounded bg-black/30 border border-white/5 text-gray-500 text-[11px] italic whitespace-pre-wrap">
        {block.text}
      </div>
    )
  }
  if (block.type === 'tool_use') {
    const isFetch = block.name === 'web_fetch' || block.name === 'web_search'
    const Icon = isFetch ? Globe : Wrench
    return (
      <div className="my-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-sky-200 text-[11px] font-mono">
        <Icon className="w-3 h-3" /> {block.name}
        {block.input && <span className="text-sky-300/70 truncate max-w-[300px]">{block.input}</span>}
      </div>
    )
  }
  if (block.type === 'tool_result') {
    return (
      <div className={`my-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono ${
        block.ok
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
          : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
      }`}>
        {block.ok ? <CheckCircle className="w-3 h-3" /> : <WarningCircle className="w-3 h-3" />}
        {block.name || 'tool'} {block.ok ? 'ok' : 'failed'}
      </div>
    )
  }
  if (block.type === 'error') {
    return (
      <div className="my-1 text-rose-300 text-[11px] font-mono">⚠ {block.message}</div>
    )
  }
  return null
}
