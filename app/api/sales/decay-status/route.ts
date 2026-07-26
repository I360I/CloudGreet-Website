import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { computeDecayState, getRepDecayAnchor } from '@/lib/sales/decay'
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

    // Anchor: most recent FIRST payment across the rep's closes (new
    // money, not recurring invoices) - the exact same helper the payout
    // wiring uses, so the banner always matches what actually pays.
    const lastCloseAt = await getRepDecayAnchor(supabaseAdmin, auth.userId)

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
