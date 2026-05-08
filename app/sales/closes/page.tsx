'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, WarningCircle, Trophy, Link as LinkIcon, Copy, CheckCircle, CircleNotch, CaretRight } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { CloseDetailPanel, type CloseRow } from './_detail'

type Close = CloseRow

const STATUS_STYLE: Record<Close['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  invoice_sent: 'bg-sky-50 text-sky-800 border-sky-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<Close['status'], string> = {
  pending: 'Pending',
  invoice_sent: 'Invoice sent',
  paid: 'Signed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

function subscriptionPill(status: string | null): { label: string; cls: string } | null {
  if (!status) return null
  const s = status.toLowerCase()
  if (s === 'trialing' || s === 'trial') {
    return { label: 'trial', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
  }
  if (s === 'active') {
    return { label: 'active', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
  }
  if (s === 'past_due') {
    return { label: 'past due', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  }
  if (s === 'canceled' || s === 'cancelled') {
    return { label: 'cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
  return { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
}

export default function SalesClosesPage() {
  const [closes, setCloses] = useState<Close[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkBusy, setLinkBusy] = useState<string | null>(null)
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetchWithAuth('/api/sales/closes')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setError(j?.error || 'Failed to load closes')
      else setCloses(j.closes || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Poll while the page is visible so admin-side flips (Mark building,
  // Mark ready w/ test #, Customization status) reflect here within
  // ~20s without a manual refresh. Pause when the tab is backgrounded
  // so we don't burn requests.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      stop()
      timer = setInterval(() => { void load() }, 20_000)
    }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load() // refetch immediately on refocus
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  const generateLink = async (id: string) => {
    setLinkBusy(id); setError('')
    try {
      const res = await fetchWithAuth(`/api/sales/closes/${id}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Failed to generate payment link')
      } else {
        setLinkUrls((prev) => ({ ...prev, [id]: j.url }))
        try {
          await navigator.clipboard.writeText(j.url)
          setCopied(id)
          setTimeout(() => setCopied(null), 2500)
        } catch { /* clipboard may be denied; the URL is still visible */ }
      }
    } finally {
      setLinkBusy(null)
    }
  }

  const copyLink = async (id: string) => {
    const url = linkUrls[id]
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    } catch { /* noop */ }
  }

  return (
    <SalesShell activeLabel="Closes">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="closes"
          title="Your deals"
          action={
            <Link
              href="/sales/closes/new"
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800"
            >
              <Plus weight="bold" className="w-4 h-4" /> Submit close
            </Link>
          }
        />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : closes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <Trophy weight="duotone" className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              No closes yet. Submit one when you sign someone.
            </p>
            <Link
              href="/sales/closes/new"
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800"
            >
              <Plus weight="bold" className="w-4 h-4" /> Submit close
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <motion.ul
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
              className="divide-y divide-gray-100"
            >
              {closes.map((c) => {
                const url = linkUrls[c.id]
                return (
                <motion.li
                  key={c.id}
                  variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {c.prospect_business_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                          {c.prospect_contact_name && <span>{c.prospect_contact_name}</span>}
                          {c.prospect_email && <span>{c.prospect_email}</span>}
                          {c.prospect_phone && <span>{c.prospect_phone}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 tabular-nums">
                          ${(c.agreed_monthly_cents / 100).toFixed(2)}/mo
                          {c.agreed_setup_fee_cents
                            ? ` + $${(c.agreed_setup_fee_cents / 100).toFixed(2)} setup`
                            : ''}
                          <span className="text-gray-300 mx-2">·</span>
                          {new Date(c.created_at).toLocaleDateString()}
                        </div>
                        {/* Quick badges - the detail panel has the full picture. */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {c.demo_agent_status === 'ready' && c.demo_agent_test_phone && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2 py-0.5">
                              <Trophy className="w-3 h-3" weight="fill" /> Demo ready
                            </span>
                          )}
                          {c.demo_agent_status === 'building' && (
                            <span className="text-[11px] bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-2 py-0.5">
                              Demo building
                            </span>
                          )}
                          {c.customization_status === 'submitted' && (
                            <span className="text-[11px] bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-2 py-0.5">
                              Form submitted
                            </span>
                          )}
                          {c.business_phone_number && (
                            <span className="text-[11px] bg-gray-900 text-white rounded-lg px-2 py-0.5 font-mono">
                              Agent · {c.business_phone_number}
                            </span>
                          )}
                          {(c.status === 'pending' || c.status === 'invoice_sent') && url && (
                            <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2 py-0.5">
                              Payment link copied
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider rounded-full border px-2 py-0.5 whitespace-nowrap ${STATUS_STYLE[c.status]}`}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                        {(() => {
                          const sub = subscriptionPill(c.subscription_status)
                          return sub ? (
                            <span
                              className={`text-[10px] font-mono uppercase tracking-wider rounded-full border px-2 py-0.5 whitespace-nowrap ${sub.cls}`}
                            >
                              {sub.label}
                            </span>
                          ) : null
                        })()}
                        <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                </motion.li>
              )})}
            </motion.ul>
          </motion.div>
        )}
      </section>
      <AnimatePresence>
        {selectedId && (() => {
          const sel = closes.find((c) => c.id === selectedId)
          if (!sel) return null
          return (
            <CloseDetailPanel
              close={sel}
              paymentUrl={linkUrls[sel.id] || null}
              onClose={() => setSelectedId(null)}
              onPaymentLink={() => generateLink(sel.id)}
              onPaymentLinkBusy={linkBusy === sel.id}
              onCopy={() => copyLink(sel.id)}
            />
          )
        })()}
      </AnimatePresence>
    </SalesShell>
  )
}
