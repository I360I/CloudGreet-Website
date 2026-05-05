import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/earnings
 *
 * Returns the rep's earnings rollup:
 *   · totals: lifetime / MTD / owed (unpaid) / paid out
 *   · ledger: most-recent commission rows joined to business name
 *   · payouts: history of Friday batch transfers
 *   · payouts_enabled: pulled from sales_reps so the dashboard can
 *     surface "bank not connected" inline.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const [{ data: ledgerRows }, { data: payoutRows }, { data: rep }] = await Promise.all([
      supabaseAdmin
        .from('commission_ledger')
        .select('id, source_type, gross_paid_cents, commission_cents, earned_at, payout_id, business_id, businesses:business_id(business_name)')
        .eq('rep_id', auth.userId)
        .order('earned_at', { ascending: false })
        .limit(200),
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
    ])

    const ledger = (ledgerRows ?? []).map((r: any) => ({
      id: r.id,
      source_type: r.source_type,
      gross_paid_cents: r.gross_paid_cents,
      commission_cents: r.commission_cents,
      earned_at: r.earned_at,
      paid: !!r.payout_id,
      business_name: r.businesses?.business_name || null,
    }))

    const lifetime = ledger.reduce((s, r) => s + (r.commission_cents || 0), 0)
    const owed = ledger.filter((r) => !r.paid).reduce((s, r) => s + (r.commission_cents || 0), 0)
    const paidOut = lifetime - owed

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const mtd = ledger
      .filter((r) => r.earned_at >= monthStart)
      .reduce((s, r) => s + (r.commission_cents || 0), 0)

    return NextResponse.json({
      success: true,
      totals: {
        lifetime_cents: lifetime,
        mtd_cents: mtd,
        owed_cents: owed,
        paid_out_cents: paidOut,
      },
      ledger,
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
