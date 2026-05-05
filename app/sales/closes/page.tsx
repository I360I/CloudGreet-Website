'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, WarningCircle, Trophy } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Close = {
  id: string
  prospect_business_name: string
  prospect_contact_name: string | null
  prospect_email: string | null
  prospect_phone: string | null
  agreed_monthly_cents: number
  agreed_setup_fee_cents: number | null
  status: 'pending' | 'invoice_sent' | 'paid' | 'cancelled' | 'rejected'
  created_at: string
  notes: string | null
}

const STATUS_STYLE: Record<Close['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  invoice_sent: 'bg-sky-50 text-sky-800 border-sky-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABEL: Record<Close['status'], string> = {
  pending: 'Pending review',
  invoice_sent: 'Invoice sent',
  paid: 'Paid',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export default function SalesClosesPage() {
  const [closes, setCloses] = useState<Close[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/sales/closes')
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setError(j?.error || 'Failed to load closes')
        else setCloses(j.closes || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

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
              {closes.map((c) => (
                <motion.li
                  key={c.id}
                  variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
                  className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
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
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider rounded-full border px-2 py-0.5 whitespace-nowrap ${STATUS_STYLE[c.status]}`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </section>
    </SalesShell>
  )
}
