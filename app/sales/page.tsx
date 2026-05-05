'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertCircle, ListChecks, Trophy, DollarSign } from 'lucide-react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from './_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Summary = {
  available_leads: number
  my_leads: number
  pending_closes: number
  mtd_commission_cents: number
  owed_cents: number
}

export default function SalesHome() {
  const [name, setName] = useState<string>('')
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [meRes, conRes, leadsRes, closesRes, earningsRes] = await Promise.all([
          fetchWithAuth('/api/me/profile'),
          fetchWithAuth('/api/sales/connect-onboarding'),
          fetchWithAuth('/api/sales/leads'),
          fetchWithAuth('/api/sales/closes'),
          fetchWithAuth('/api/sales/earnings'),
        ])
        if (cancelled) return
        const me = await meRes.json().catch(() => ({}))
        const con = await conRes.json().catch(() => ({}))
        const leads = await leadsRes.json().catch(() => ({}))
        const closes = await closesRes.json().catch(() => ({}))
        const earnings = await earningsRes.json().catch(() => ({}))
        setName(me?.profile?.name || me?.profile?.first_name || me?.profile?.email || '')
        setPayoutsEnabled(con?.ok ? !!con.payouts_enabled : false)
        setSummary({
          available_leads: (leads?.available || []).length,
          my_leads: (leads?.claimed || []).length,
          pending_closes: (closes?.closes || []).filter((c: any) => c.status === 'pending').length,
          mtd_commission_cents: earnings?.totals?.mtd_cents ?? 0,
          owed_cents: earnings?.totals?.owed_cents ?? 0,
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SalesShell activeLabel="Overview">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="overview"
          title={name ? `Welcome, ${name}` : 'Welcome'}
        />

        {payoutsEnabled === false && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Bank not connected yet</p>
              <p className="text-xs text-amber-800 mt-1">
                Finish your Stripe Connect setup so Friday auto-payouts can deposit.
              </p>
              <Link
                href="/sales/onboarding"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-900 hover:text-amber-700"
              >
                Finish setup <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/sales/leads"
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
            >
              <ListChecks className="w-5 h-5 text-gray-400 mb-3" strokeWidth={1.75} />
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Leads</div>
              <div className="text-2xl font-medium text-gray-900 tabular-nums mt-1">
                {summary?.available_leads ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                unclaimed in pool · {summary?.my_leads ?? 0} yours
              </div>
            </Link>

            <Link
              href="/sales/closes"
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
            >
              <Trophy className="w-5 h-5 text-gray-400 mb-3" strokeWidth={1.75} />
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Closes</div>
              <div className="text-2xl font-medium text-gray-900 tabular-nums mt-1">
                {summary?.pending_closes ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">awaiting review</div>
            </Link>

            <Link
              href="/sales/earnings"
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
            >
              <DollarSign className="w-5 h-5 text-gray-400 mb-3" strokeWidth={1.75} />
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Owed</div>
              <div className="text-2xl font-medium text-gray-900 tabular-nums mt-1">
                ${(((summary?.owed_cents ?? 0)) / 100).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">pays Friday</div>
            </Link>
          </div>
        )}
      </section>
    </SalesShell>
  )
}
