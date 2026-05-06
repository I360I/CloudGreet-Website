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
      .select('created_at, last_close_at')
      .eq('id', auth.userId)
      .maybeSingle()

    // last_close_at column may be missing on older deployments; fall
    // back to a live MAX() over closes so the banner still works.
    let lastCloseAt: string | null = (rep as any)?.last_close_at ?? null
    if (!lastCloseAt) {
      const { data: row } = await supabaseAdmin
        .from('closes')
        .select('created_at')
        .eq('rep_id', auth.userId)
        .not('status', 'in', '(cancelled,rejected)')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastCloseAt = row?.created_at ?? null
    }

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
