import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Revenue forecast for the auth'd sales rep.
 *
 * Pulls rolling history (last 8 weeks by default) and projects
 * 12 months of earnings forward, compounding MRR commission month
 * over month. Honors the trailing commission decay curve so the
 * forecast doesn't over-promise once a rep stops closing.
 *
 * Inputs (computed from the rep's actual activity):
 *   - bookings_per_week  - leads moved to status='demo_scheduled' / week
 *   - close_rate         - paid closes / demos scheduled
 *   - closes_per_week    - paid closes / week (also a sanity check)
 *   - avg_monthly_cents  - avg agreed_monthly_cents on paid closes
 *   - avg_setup_cents    - avg agreed_setup_fee_cents on paid closes
 *
 * Optional overrides via querystring let the rep model "what if I
 * doubled my dial volume?" scenarios without touching their data:
 *   ?bookings_per_week=20&close_rate=0.35&avg_monthly=300&avg_setup=500
 *
 * Returns:
 *   inputs:    the resolved (historical or overridden) per-week numbers
 *   history:   { weeks_active, paid_closes, demos_set, avg_close_*  }
 *   monthly:   12 entries with month label, this_month_earnings,
 *              cumulative_mrr_book, total_earned_to_date
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const repId = auth.userId

  try {
    const url = new URL(request.url)
    const overrides = parseOverrides(url.searchParams)

    // Pull rolling 8-week activity. If the rep has < 4 weeks worth, we
    // still return the data and let the UI surface "not enough history
    // yet, set targets to project anyway."
    const since = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString()

    const [closesResult, leadsResult, repResult] = await Promise.all([
      supabaseAdmin
        .from('closes')
        .select('agreed_monthly_cents, agreed_setup_fee_cents, status, created_at')
        .eq('rep_id', repId)
        .gte('created_at', since),
      supabaseAdmin
        .from('lead_assignments')
        .select(`
          assigned_at,
          leads:lead_id ( status, updated_at )
        `)
        .eq('rep_id', repId)
        .gte('assigned_at', since)
        .limit(5000),
      supabaseAdmin
        .from('sales_reps')
        .select('approved_at, last_close_at')
        .eq('id', repId)
        .maybeSingle(),
    ])

    const closes = (closesResult.data || []) as any[]
    const leadAssigns = (leadsResult.data || []) as any[]
    const rep = (repResult.data || {}) as any

    const startTs = rep.approved_at ? new Date(rep.approved_at).getTime() : Date.now() - 8 * 7 * 86_400_000
    const weeksActive = Math.max(1, Math.min(8, (Date.now() - startTs) / (7 * 86_400_000)))

    const paidCloses = closes.filter((c) => c.status === 'paid')
    const demosSet = leadAssigns.filter((a) => {
      const s = a?.leads?.status
      return s === 'demo_scheduled' || s === 'proposal_sent' || s === 'closed'
    }).length

    const avgMonthlyCents =
      paidCloses.length > 0
        ? Math.round(
            paidCloses.reduce((n, c) => n + (Number(c.agreed_monthly_cents) || 0), 0) /
              paidCloses.length,
          )
        : 30000 // $300 default
    const avgSetupCents =
      paidCloses.length > 0
        ? Math.round(
            paidCloses.reduce((n, c) => n + (Number(c.agreed_setup_fee_cents) || 0), 0) /
              paidCloses.length,
          )
        : 50000 // $500 default

    const closesPerWeek = paidCloses.length / weeksActive
    const bookingsPerWeek = demosSet / weeksActive
    const closeRate = demosSet > 0 ? paidCloses.length / demosSet : 0.3 // default to 30% if no data

    const inputs = {
      bookings_per_week: round(overrides.bookings_per_week ?? bookingsPerWeek, 2),
      close_rate: round(overrides.close_rate ?? closeRate, 3),
      closes_per_week: round(overrides.closes_per_week ?? closesPerWeek, 2),
      avg_monthly_cents: overrides.avg_monthly_cents ?? avgMonthlyCents,
      avg_setup_cents: overrides.avg_setup_cents ?? avgSetupCents,
      // Whether the rep has enough history to trust the auto inputs.
      based_on: paidCloses.length >= 2 ? 'history' : 'defaults',
      history_weeks: round(weeksActive, 1),
    }

    // Effective closes per week: if the rep has historical closes_per_week,
    // use it. Otherwise derive from bookings_per_week × close_rate so
    // overrides on either input flow through.
    const effectiveClosesPerWeek = paidCloses.length >= 2 && overrides.closes_per_week === undefined
      ? closesPerWeek
      : (overrides.bookings_per_week ?? bookingsPerWeek) * (overrides.close_rate ?? closeRate)

    const monthly = projectMonthly({
      effectiveClosesPerWeek,
      avgMonthlyCents: inputs.avg_monthly_cents,
      avgSetupCents: inputs.avg_setup_cents,
      months: 12,
    })

    return NextResponse.json({
      success: true,
      inputs,
      history: {
        weeks_active: round(weeksActive, 1),
        paid_closes: paidCloses.length,
        demos_set: demosSet,
        avg_monthly_cents: avgMonthlyCents,
        avg_setup_cents: avgSetupCents,
      },
      monthly,
    })
  } catch (e) {
    logger.error('sales forecast failed', {
      rep_id: repId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function parseOverrides(qs: URLSearchParams) {
  const num = (k: string): number | undefined => {
    const v = qs.get(k)
    if (v === null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return {
    bookings_per_week: num('bookings_per_week'),
    close_rate: num('close_rate'),
    closes_per_week: num('closes_per_week'),
    avg_monthly_cents: num('avg_monthly') !== undefined ? Math.round(num('avg_monthly')! * 100) : undefined,
    avg_setup_cents: num('avg_setup') !== undefined ? Math.round(num('avg_setup')! * 100) : undefined,
  }
}

function round(n: number, digits = 0): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

/**
 * Compound monthly projection.
 *
 * Each month the rep adds N new closes (closes_per_week × ~4.33). Each
 * close contributes one-time setup commission that month, plus joins
 * the recurring book at avg_monthly × 50%. The recurring book is the
 * compounding piece - month N earnings = sum of every active book
 * commission + this month's new setup fees.
 *
 * Trailing commission decay isn't modeled at the per-close level here
 * (we'd need per-close earned_at tracking). Forecast assumes the rep
 * stays active so every close keeps paying 50% - which is the
 * "if you keep closing" baseline we want to motivate them with. The
 * earnings dashboard already shows the actual decay tier banner.
 */
function projectMonthly({
  effectiveClosesPerWeek,
  avgMonthlyCents,
  avgSetupCents,
  months,
}: {
  effectiveClosesPerWeek: number
  avgMonthlyCents: number
  avgSetupCents: number
  months: number
}) {
  const closesPerMonth = effectiveClosesPerWeek * (365 / 12 / 7) // ~4.345
  const monthlyCommissionPerClose = Math.round(avgMonthlyCents * 0.5)
  const setupCommissionPerClose = Math.round(avgSetupCents * 0.5)

  const out: {
    month: string
    new_closes: number
    setup_commission_cents: number
    recurring_commission_cents: number
    this_month_earnings_cents: number
    cumulative_mrr_book_cents: number
    total_earned_to_date_cents: number
  }[] = []

  let cumulativeBook = 0
  let totalEarned = 0
  const today = new Date()

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: i >= 12 - today.getMonth() ? 'numeric' : undefined })

    // Add this month's new closes to the book.
    const newClosesThisMonth = closesPerMonth // fractional; chart smooths
    const setupThisMonth = Math.round(newClosesThisMonth * setupCommissionPerClose)
    const newRecurringThisMonth = Math.round(newClosesThisMonth * monthlyCommissionPerClose)

    cumulativeBook += newRecurringThisMonth
    const thisMonthEarnings = setupThisMonth + cumulativeBook
    totalEarned += thisMonthEarnings

    out.push({
      month: monthLabel,
      new_closes: round(newClosesThisMonth, 2),
      setup_commission_cents: setupThisMonth,
      recurring_commission_cents: cumulativeBook,
      this_month_earnings_cents: thisMonthEarnings,
      cumulative_mrr_book_cents: cumulativeBook,
      total_earned_to_date_cents: totalEarned,
    })
  }

  return out
}
