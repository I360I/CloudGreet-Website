'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, WarningCircle } from '@phosphor-icons/react'
import { SalesShell, SalesLoadingState } from '../../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { CloseDetailContent, type CloseRow } from '../_detail'
import type { PaymentLinkOverrides } from '../_detail'

type Close = CloseRow & {
  demo_scheduled_at?: string | null
  demo_result?: 'pending' | 'won' | 'lost' | 'no_show' | 'needs_followup' | 'reschedule' | 'ghosted' | null
  demo_result_at?: string | null
  demo_result_notes?: string | null
}

/**
 * Full-page detail for a single prospect (close). Mirrors the slide-in
 * panel's content via the shared CloseDetailContent, but as its own page
 * so prospects open the same way linked clients do (/sales/clients/[id]).
 */
export default function SalesCloseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [close, setClose] = useState<Close | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetchWithAuth('/api/sales/closes')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j?.error || 'Failed to load prospect'); return }
      const found = ((j.closes || []) as Close[]).find((c) => c.id === id) || null
      if (!found) { setNotFound(true); return }
      setClose(found)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line

  // Poll while visible so admin-side flips (agent building/ready, payment)
  // reflect here within ~20s, matching the list page.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => { stop(); timer = setInterval(() => { void load() }, 20_000) }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    const onVis = () => {
      if (document.visibilityState === 'visible') { void load(); start() } else { stop() }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [id]) // eslint-disable-line

  const generateLink = async (overrides?: PaymentLinkOverrides) => {
    setLinkBusy(true); setError('')
    try {
      const res = await fetchWithAuth(`/api/sales/closes/${id}/payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides || {}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j?.error || 'Failed to generate payment link'); return }
      setPaymentUrl(j.url)
      try { await navigator.clipboard.writeText(j.url) } catch { /* still visible */ }
    } finally {
      setLinkBusy(false)
    }
  }

  const copyLink = async () => {
    if (!paymentUrl) return
    try { await navigator.clipboard.writeText(paymentUrl) } catch { /* noop */ }
  }

  const backLink = (
    <Link
      href="/sales/closes"
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-3"
    >
      <ArrowLeft className="w-3 h-3" /> Prospects
    </Link>
  )

  return (
    <SalesShell activeLabel="Prospects">
      <section className="max-w-3xl mx-auto px-6 py-10">
        {backLink}

        {loading ? (
          <SalesLoadingState />
        ) : notFound ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">This prospect no longer exists.</p>
          </div>
        ) : close ? (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <CloseDetailContent
                close={close}
                paymentUrl={paymentUrl}
                onPaymentLink={generateLink}
                onPaymentLinkBusy={linkBusy}
                onCopy={copyLink}
                paymentError={error}
                variant="page"
              />
            </div>
          </>
        ) : null}
      </section>
    </SalesShell>
  )
}
