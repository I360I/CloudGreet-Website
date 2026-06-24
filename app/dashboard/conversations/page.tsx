'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretLeft,
  CaretRight,
  ChatTeardropDots,
  CircleNotch,
  DeviceMobile,
  GlobeSimple,
  Lock,
  MagnifyingGlass,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { DashShell } from '../_components/Shell'

const EASE = [0.22, 1, 0.36, 1] as const
const PAGE_SIZE = 25

type Channel = 'sms' | 'web'
type Outcome = 'booked' | 'dispatch' | null
type Filter = 'all' | 'sms' | 'web' | 'booked'

type ConvoSummary = {
  id: string
  channel: Channel
  customerPhone: string
  customerName: string | null
  messageCount: number
  lastMessage: { direction: string; body: string; at: string } | null
  lastActivity: string
  outcome: Outcome
  createdAt: string
}

type Message = {
  id: string
  direction: string
  body: string
  createdAt: string
  toolNames: string[]
}

type ConvoDetail = {
  conversation: { id: string; channel: Channel; customerPhone: string; createdAt: string }
  messages: Message[]
}

function fmtPhone(raw: string): string {
  if (!raw || raw.startsWith('web-')) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return raw
}

function relTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmtTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function CustomerLabel({ c }: { c: ConvoSummary }) {
  if (c.channel === 'web') return <span className="text-sm font-medium text-gray-900">Web visitor</span>
  if (c.customerName) {
    return (
      <div>
        <div className="text-sm font-medium text-gray-900">{c.customerName}</div>
        <div className="text-xs text-gray-400">{fmtPhone(c.customerPhone) || c.customerPhone}</div>
      </div>
    )
  }
  return <span className="text-sm font-medium text-gray-900">{fmtPhone(c.customerPhone) || c.customerPhone}</span>
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null
  if (outcome === 'booked') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Booked
      </span>
    )
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
      Dispatch
    </span>
  )
}

function ChannelDot({ channel }: { channel: Channel }) {
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${
        channel === 'sms' ? 'bg-sky-500' : 'bg-violet-500'
      }`}
    />
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
        active ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function ConvoDrawer({ convoId, onClose }: { convoId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ConvoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const res = await fetchWithAuth(`/api/dashboard/conversations/${convoId}`)
        const j = await res.json()
        if (!alive) return
        if (!res.ok) { setError(j.error || 'Failed to load'); return }
        setDetail(j)
      } catch { if (alive) setError('Failed to load') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [convoId])

  useEffect(() => {
    if (!loading && detail) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, detail])

  const convo = detail?.conversation
  const msgs = detail?.messages || []
  const isWeb = convo?.channel === 'web'
  const title = isWeb ? 'Web visitor' : fmtPhone(convo?.customerPhone || '') || convo?.customerPhone || ''

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="relative bg-white w-full max-w-xl h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            {isWeb
              ? <GlobeSimple className="w-4 h-4 text-violet-500 flex-shrink-0" />
              : <DeviceMobile className="w-4 h-4 text-sky-500 flex-shrink-0" />
            }
            <div>
              <div className="text-sm font-semibold text-gray-900">{title}</div>
              {convo && (
                <div className="text-xs text-gray-500">{fmtDateTime(convo.createdAt)} · {msgs.length} messages</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 py-8">
              <WarningCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{error}</span>
            </div>
          ) : msgs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No messages in this conversation.</p>
          ) : (
            msgs.map((m) => {
              const inbound = m.direction === 'inbound'
              return (
                <div key={m.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[78%] flex flex-col ${inbound ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words leading-relaxed ${
                        inbound
                          ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          : 'bg-sky-500 text-white rounded-br-sm'
                      }`}
                    >
                      {m.body}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[11px] text-gray-400">{fmtTime(m.createdAt)}</span>
                      {m.toolNames.length > 0 && (
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {m.toolNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </motion.aside>
    </motion.div>
  )
}

export default function ConversationsPage() {
  const [convos, setConvos] = useState<ConvoSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        })
        const res = await fetchWithAuth(`/api/dashboard/conversations?${params}`)
        const j = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`)
        setFeatureEnabled(j.feature_enabled !== false)
        setConvos(j.conversations || [])
        setTotal(j.total ?? 0)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page])

  const filtered = (convos || []).filter((c) => {
    if (filter === 'sms' && c.channel !== 'sms') return false
    if (filter === 'web' && c.channel !== 'web') return false
    if (filter === 'booked' && c.outcome !== 'booked') return false
    if (search) {
      const q = search.toLowerCase()
      const phone = fmtPhone(c.customerPhone).toLowerCase()
      const body = (c.lastMessage?.body || '').toLowerCase()
      if (!phone.includes(q) && !body.includes(q)) return false
    }
    return true
  })

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <DashShell activeLabel="Conversations">
      <section className="px-4 lg:px-8 py-6 lg:py-10">
        <div className="max-w-6xl">
          <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">Conversations</h1>
            {total > 0 && <span className="text-sm text-gray-500 font-mono">{total} total</span>}
          </div>

          {featureEnabled === false && !loading && (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Text-to-book not active</h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  SMS and web chat conversations will appear here once your text-to-book number is set up.
                  Contact us to add it to your plan.
                </p>
              </div>
              <a
                href="mailto:hello@cloudgreet.com?subject=Add text-to-book"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Contact us to get started
              </a>
            </div>
          )}

          {featureEnabled !== false && <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Filters */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
                <Pill active={filter === 'sms'} onClick={() => setFilter('sms')}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                    SMS
                  </span>
                </Pill>
                <Pill active={filter === 'web'} onClick={() => setFilter('web')}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                    Web Chat
                  </span>
                </Pill>
                <Pill active={filter === 'booked'} onClick={() => setFilter('booked')}>Booked</Pill>
                <div className="ml-auto relative">
                  <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search by number or message…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-gray-400 w-full sm:w-64 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="px-6 py-16 flex items-center justify-center">
                <CircleNotch className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="px-6 py-12 flex items-start gap-3">
                <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Couldn&apos;t load conversations</h3>
                  <p className="text-sm text-gray-500 mt-1">{error}</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <Empty hasSearch={!!search || filter !== 'all'} hasAny={(convos?.length ?? 0) > 0} />
            ) : (
              <motion.ul
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } } }}
                className="divide-y divide-gray-100"
              >
                {filtered.map((c) => (
                  <motion.li
                    key={c.id}
                    variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
                  >
                    <button
                      onClick={() => setOpenId(c.id)}
                      className="w-full text-left px-4 lg:px-6 py-3.5 lg:py-4 hover:bg-gray-50/60 flex items-start gap-3 lg:gap-4 group transition-all duration-300 ease-out"
                    >
                      <ChannelDot channel={c.channel} />
                      <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-baseline">
                        <div className="lg:col-span-3 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <div className="min-w-0 truncate flex-1">
                              <CustomerLabel c={c} />
                            </div>
                            <span className="lg:hidden text-xs text-gray-400 flex-shrink-0">{relTime(c.lastActivity)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <OutcomeBadge outcome={c.outcome} />
                          </div>
                        </div>
                        <div className="lg:col-span-7 mt-1 lg:mt-0 text-xs text-gray-500 truncate">
                          {c.lastMessage
                            ? <>
                                {c.lastMessage.direction !== 'inbound' && <span className="text-gray-400 mr-1">Agent:</span>}
                                {c.lastMessage.body}
                              </>
                            : <span className="text-gray-400">No messages</span>
                          }
                        </div>
                        <div className="hidden lg:block lg:col-span-2 text-right text-xs text-gray-500 flex-shrink-0">
                          <div>{relTime(c.lastActivity)}</div>
                          <div className="text-gray-400 mt-0.5">{c.messageCount} msgs</div>
                        </div>
                      </div>
                      <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all duration-300 ease-out mt-0.5" />
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}

            {/* Pagination */}
            {!loading && !error && total > PAGE_SIZE && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Page {page + 1} of {pageCount}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <CaretLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <CaretRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>}
        </div>
      </section>

      <AnimatePresence>
        {openId && <ConvoDrawer key={openId} convoId={openId} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </DashShell>
  )
}

function Empty({ hasSearch, hasAny }: { hasSearch: boolean; hasAny: boolean }) {
  if (hasSearch || hasAny) {
    return (
      <div className="px-6 py-8 flex flex-col items-center gap-2 text-center">
        <ChatTeardropDots className="w-8 h-8 text-gray-300" />
        <p className="text-sm text-gray-500">No conversations match your filters.</p>
      </div>
    )
  }
  return (
    <div className="px-6 py-8 flex flex-col items-center gap-2 text-center">
      <ChatTeardropDots className="w-8 h-8 text-gray-300" />
      <p className="text-sm text-gray-700 font-medium">No conversations yet</p>
      <p className="text-sm text-gray-500">SMS and web chat sessions will appear here once customers start reaching out.</p>
    </div>
  )
}
