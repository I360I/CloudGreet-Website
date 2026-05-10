import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { computeDecayState } from '@/lib/sales/decay'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/decay-status
 *
 * Returns the calling rep's current decay snapshot - tier, multiplier,
 * days since last close, days until next drop, next tier. Used by the
 * banner on the rep dashboard so a rep can see at a glance how close
 * they are to the 25% drop or the 6-month transfer.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data: rep } = await supabaseAdmin
      .from('sales_reps')
      .select('created_at')
      .eq('id', auth.userId)
      .maybeSingle()

    // Anchor "last close" to the most recent PAID commission, not to
    // close-form submission. A rep clicking "Submit close" doesn't
    // reset the decay clock — only money actually landing in Stripe
    // (which writes a commission_ledger row from the invoice.paid
    // webhook) does. Keeps the incentive honest: pending paperwork
    // doesn't count.
    const { data: row } = await supabaseAdmin
      .from('commission_ledger')
      .select('earned_at')
      .eq('rep_id', auth.userId)
      .order('earned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastCloseAt: string | null = row?.earned_at ?? null

    const repStartedAt = (rep as any)?.created_at ?? new Date().toISOString()
    const state = computeDecayState({ lastCloseAt, repStartedAt })

    return NextResponse.json({ success: true, ...state })
  } catch (e) {
    logger.error('Sales decay-status failed', {
      userId: auth.userId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
