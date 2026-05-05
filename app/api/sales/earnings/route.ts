import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/earnings
 *
 * Returns the rep's earnings rollup for the dashboard:
 *   · totals: lifetime / MRR / owed / paid_out
 *   · customers: closes with status in ('invoice_sent','paid') joined to
 *     business + per-business commission rollup (your active accounts)
 *   · chart: weekly cumulative commission, last 12 weeks
 *   · payouts: history of Friday transfers
 *   · payouts_enabled: from sales_reps; surfaces the "bank not connected" nag
 *
 * MRR is the sum of agreed_monthly_cents across the rep's active deals
 * (anything past pending). The actual commission ledger is still the
 * source of truth for what we owe - MRR is forward-looking signal.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const [
      { data: ledgerRows },
      { data: payoutRows },
      { data: rep },
      { data: closeRows },
    ] = await Promise.all([
      supabaseAdmin
        .from('commission_ledger')
        .select('id, source_type, gross_paid_cents, commission_cents, earned_at, payout_id, business_id, businesses:business_id(business_name)')
        .eq('rep_id', auth.userId)
        .order('earned_at', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('payouts')
        .select('*')
        .eq('rep_id', auth.userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('sales_reps')
        .select('stripe_connect_payouts_enabled, stripe_connect_account_id')
        .eq('id', auth.userId)
        .maybeSingle(),
      supabaseAdmin
        .from('closes')
        .select('id, business_id, prospect_business_name, agreed_monthly_cents, agreed_setup_fee_cents, status, created_at, businesses:business_id(business_name, account_status, subscription_status)')
        .eq('rep_id', auth.userId)
        .in('status', ['invoice_sent', 'paid'])
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const ledger = (ledgerRows ?? []).map((r: any) => ({
      id: r.id,
      source_type: r.source_type,
      gross_paid_cents: r.gross_paid_cents,
      commission_cents: r.commission_cents,
      earned_at: r.earned_at,
      paid: !!r.payout_id,
      business_id: r.business_id,
      business_name: r.businesses?.business_name || null,
    }))

    const lifetime = ledger.reduce((s, r) => s + (r.commission_cents || 0), 0)
    const owed = ledger.filter((r) => !r.paid).reduce((s, r) => s + (r.commission_cents || 0), 0)
    const paidOut = lifetime - owed

    // YTD payouts - what Stripe actually moved to the rep's bank in
    // the current calendar year. This is what matters for the
    // 1099-NEC threshold ($600+).
    const todayForYtd = new Date()
    const yearStart = new Date(todayForYtd.getFullYear(), 0, 1).toISOString()
    const ytdPaid = (payoutRows ?? [])
      .filter((p: any) => p.status === 'transferred' && p.transferred_at && p.transferred_at >= yearStart)
      .reduce((s: number, p: any) => s + (p.amount_cents || 0), 0)

    // MRR = sum of monthly across closes that have actually paid at
    // least once (close.status === 'paid'), excluding any whose linked
    // business has since been deactivated. Closes still in
    // 'invoice_sent' (link sent, prospect hasn't paid yet) show up in
    // the customer list flagged "awaiting first payment" - they don't
    // count toward MRR until money lands.
    const mrr = (closeRows ?? []).reduce((sum: number, c: any) => {
      if (c.status !== 'paid') return sum
      const acctStatus = c.businesses?.account_status
      if (acctStatus && acctStatus !== 'active' && acctStatus !== 'trial' && acctStatus !== null) return sum
      return sum + (c.agreed_monthly_cents || 0)
    }, 0)

    // Customer list: roll up commissions per business so reps see what
    // each account has paid them so far.
    const byBiz = new Map<string, {
      business_id: string | null
      business_name: string
      monthly_cents: number
      setup_fee_cents: number
      status: string
      subscription_status: string | null
      account_status: string | null
      started_at: string
      commission_total_cents: number
      commission_owed_cents: number
    }>()

    for (const c of (closeRows ?? []) as any[]) {
      const id = c.business_id || `close:${c.id}`
      const existing = byBiz.get(id)
      const name = c.businesses?.business_name || c.prospect_business_name || 'Unknown'
      if (existing) continue
      byBiz.set(id, {
        business_id: c.business_id,
        business_name: name,
        monthly_cents: c.agreed_monthly_cents || 0,
        setup_fee_cents: c.agreed_setup_fee_cents || 0,
        status: c.status,
        subscription_status: c.businesses?.subscription_status || null,
        account_status: c.businesses?.account_status || null,
        started_at: c.created_at,
        commission_total_cents: 0,
        commission_owed_cents: 0,
      })
    }
    for (const r of ledger) {
      if (!r.business_id) continue
      const cust = byBiz.get(r.business_id)
      if (!cust) continue
      cust.commission_total_cents += r.commission_cents || 0
      if (!r.paid) cust.commission_owed_cents += r.commission_cents || 0
    }
    const customers = Array.from(byBiz.values()).sort(
      (a, b) => b.commission_total_cents - a.commission_total_cents,
    )

    // Monthly buckets - last 12 months - with two series:
    //   · mrr_cents      : the rep's MRR at the end of that month, computed
    //                      as the sum of agreed_monthly_cents across closes
    //                      that paid an MRR commission in that month.
    //   · earned_cents   : commission earned that month (any source_type).
    //   · cumulative_cents: running total of earned_cents (lifetime line).
    const now = new Date()
    const months: Array<{
      label: string
      iso: string
      mrr_cents: number
      earned_cents: number
      cumulative_cents: number
    }> = []
    const buckets: Array<{ start: Date; end: Date; mrrBiz: Set<string>; earned: number }> = []
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({ start, end, mrrBiz: new Set<string>(), earned: 0 })
    }
    for (const r of ledger) {
      const t = new Date(r.earned_at).getTime()
      const hit = buckets.find((b) => t >= b.start.getTime() && t < b.end.getTime())
      if (!hit) continue
      hit.earned += r.commission_cents || 0
      if (r.source_type === 'mrr' && r.business_id) hit.mrrBiz.add(r.business_id)
    }
    // Build a quick lookup: business_id → agreed_monthly_cents (from
    // the closes we already pulled above).
    const monthlyByBiz = new Map<string, number>()
    for (const c of (closeRows ?? []) as any[]) {
      if (c.business_id) monthlyByBiz.set(c.business_id, c.agreed_monthly_cents || 0)
    }

    let running = 0
    for (const b of buckets) {
      running += b.earned
      let mrr = 0
      Array.from(b.mrrBiz).forEach((bizId) => {
        mrr += monthlyByBiz.get(bizId) || 0
      })
      months.push({
        label: b.start.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        iso: b.start.toISOString(),
        mrr_cents: mrr,
        earned_cents: b.earned,
        cumulative_cents: running,
      })
    }

    return NextResponse.json({
      success: true,
      totals: {
        lifetime_cents: lifetime,
        mrr_cents: mrr,
        owed_cents: owed,
        paid_out_cents: paidOut,
        ytd_paid_cents: ytdPaid,
        tax_year: now.getFullYear(),
      },
      customers,
      chart: months,
      payouts: payoutRows ?? [],
      payouts_enabled: !!rep?.stripe_connect_payouts_enabled,
      has_connect_account: !!rep?.stripe_connect_account_id,
    })
  } catch (e) {
    logger.error('Earnings load failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 })
  }
}
