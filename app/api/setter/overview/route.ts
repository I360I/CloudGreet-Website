import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { getRepCallStats } from '@/lib/sales/dialer-stats'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/setter/overview
 *
 * Setter-only (not shared with 'sales' via REP_TOOL_ROLES - this is the
 * one surface that's genuinely specific to the setter role). Feeds
 * /setter's Overview page: today's + this week's call activity, plus
 * lead-pipeline counts so a setter can see their queue and their
 * headline output metric (demos booked).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'setter') {
    return NextResponse.json({ error: 'Setter role required' }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - 6) // rolling 7-day window incl. today

    const [today, week] = await Promise.all([
      getRepCallStats(auth.userId, { since: todayStart }),
      getRepCallStats(auth.userId, { since: weekStart }),
    ])

    const { data: assignments } = await supabaseAdmin
      .from('lead_assignments')
      .select('status, last_touched_at')
      .eq('rep_id', auth.userId)

    const rows = (assignments || []) as any[]
    const counts = {
      total: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      interested: rows.filter((r) => r.status === 'interested').length,
      dead_or_dnc: rows.filter((r) => r.status === 'dead' || r.status === 'do_not_call').length,
    }
    const demosScheduledSince = (since: Date) => rows.filter((r) =>
      r.status === 'demo_scheduled' && r.last_touched_at && r.last_touched_at >= since.toISOString(),
    ).length

    return NextResponse.json({
      success: true,
      calls: { today, week },
      leads: {
        ...counts,
        demos_booked_today: demosScheduledSince(todayStart),
        demos_booked_week: demosScheduledSince(weekStart),
      },
    })
  } catch (e) {
    logger.error('setter overview failed', { userId: auth.userId, error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
  }
}
