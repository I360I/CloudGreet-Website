'use client'

import { useEffect, useState } from 'react'
import { Trophy, WarningCircle, Hourglass, Lightning } from '@phosphor-icons/react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import type { DecayTier } from '@/lib/sales/decay'

type Snapshot = {
  tier: DecayTier
  multiplier: number
  daysSinceLastClose: number
  daysUntilNextDrop: number | null
  nextTier: DecayTier | null
  nextDropAt: string | null
  anchorIsStartDate: boolean
}

const COPY: Record<DecayTier, { title: string; sub: string; tone: 'good' | 'warn' | 'bad' }> = {
  full: {
    title: 'Full commission · 50% MRR',
    sub: 'You earn 50% of MRR on every active client. Keep closing to stay here.',
    tone: 'good',
  },
  reduced: {
    title: 'MRR reduced to 25%',
    sub: 'Land one close to bump back to the full 50%.',
    tone: 'warn',
  },
  transferred: {
    title: 'Clients transferred',
    sub: 'Your accounts have rolled to CloudGreet. Close one to start earning again.',
    tone: 'bad',
  },
}

/**
 * Status banner shown on the rep's home page. Renders the rep's current
 * decay tier, days since last close, and a countdown to the next drop
 * (or to the 6-month transfer line). Single close resets it - we make
 * that consequence visible so reps stay motivated to keep closing.
 *
 * The banner is silent while the API call is in flight to avoid
 * flashing an inaccurate "transferred" state on slow networks.
 */
export function DecayBanner() {
  const [data, setData] = useState<Snapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth('/api/sales/decay-status')
        const j = await r.json().catch(() => ({}))
        if (!cancelled && j?.success) setData(j)
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [])

  if (!data) return null

  const c = COPY[data.tier]
  const styles = {
    good: 'bg-white border-emerald-200/70',
    warn: 'bg-amber-50 border-amber-200',
    bad:  'bg-rose-50 border-rose-200',
  }[c.tone]

  const accent = {
    good: 'text-emerald-700 bg-emerald-100',
    warn: 'text-amber-800 bg-amber-100',
    bad:  'text-rose-800 bg-rose-100',
  }[c.tone]

  const Icon = c.tone === 'good' ? Trophy : c.tone === 'warn' ? Hourglass : WarningCircle

  const dropDate = data.nextDropAt
    ? new Date(data.nextDropAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <div className={`rounded-2xl border ${styles} p-5 sm:p-6`}>
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={20} weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">
                Commission status
              </div>
              <div className="text-lg font-medium tracking-tight text-gray-900">{c.title}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
                {data.anchorIsStartDate ? 'Account age' : 'Last close'}
              </div>
              <div className="text-sm font-medium tabular-nums text-gray-900">
                {data.daysSinceLastClose}d ago
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-600">{c.sub}</p>

          {/* Progress bar - shows where the rep sits on the 0 → 90 → 180 line. */}
          <DecayBar daysSince={data.daysSinceLastClose} />

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
            {data.nextTier && data.daysUntilNextDrop !== null ? (
              <span className="flex items-center gap-1.5">
                <Lightning size={14} weight="fill" className="text-gray-400" />
                <span>
                  <strong className="font-medium text-gray-900 tabular-nums">{data.daysUntilNextDrop}d</strong>{' '}
                  until {data.nextTier === 'reduced' ? '25% drop' : 'transfer to CG'}
                  {dropDate ? ` · ${dropDate}` : ''}
                </span>
              </span>
            ) : null}
            <Link
              href="/sales/closes/new"
              className="ml-auto inline-flex items-center gap-1.5 text-gray-900 font-medium hover:underline"
            >
              Submit a close →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DecayBar({ daysSince }: { daysSince: number }) {
  // Anchor is 0d, midpoint is 90d (drop), end is 180d (transfer). Cap
  // visual at 180 so transferred reps still see a maxed-out bar.
  const pct = Math.min(100, (Math.max(0, daysSince) / 180) * 100)
  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-full bg-gray-200/70 overflow-hidden">
        {/* threshold marks at 50% (90d) */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300" />
        <div
          className={`h-full rounded-full transition-all ${
            daysSince < 90 ? 'bg-emerald-500' : daysSince < 180 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
        <span>0d</span>
        <span>90d · 25%</span>
        <span>180d · transfer</span>
      </div>
    </div>
  )
}
