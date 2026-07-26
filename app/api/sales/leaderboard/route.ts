import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leaderboard
 *
 * This week's board across all active sales reps: dials, demos set,
 * commission earned. Rolling 7 days. Small team - one pass, no paging.
 * Every rep can see it (friendly competition is the point); the caller
 * gets `is_me` on their own row.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  try {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    const [{ data: reps }, { data: calls }, { data: demos }, { data: earns }] = await Promise.all([
      supabaseAdmin
        .from('custom_users')
        .select('id, first_name, last_name, name, email')
        .eq('role', 'sales'),
      supabaseAdmin
        .from('rep_calls')
        .select('rep_id, status, duration_seconds')
        .gte('started_at', weekAgo)
        .or('direction.eq.outbound,direction.is.null')
        .limit(20000),
      supabaseAdmin
        .from('closes')
        .select('rep_id')
        .gte('demo_scheduled_at', weekAgo)
        .limit(2000),
      supabaseAdmin
        .from('commission_ledger')
        .select('rep_id, commission_cents')
        .gte('earned_at', weekAgo)
        .limit(5000),
    ])

    const rows = (reps || []).map((r: any) => {
      const myCalls = (calls || []).filter((c: any) => c.rep_id === r.id)
      const dials = myCalls.length
      const connects = myCalls.filter((c: any) => c.status === 'completed' && (c.duration_seconds || 0) > 30).length
      const demosSet = (demos || []).filter((d: any) => d.rep_id === r.id).length
      const earned = (earns || []).filter((e: any) => e.rep_id === r.id)
        .reduce((s: number, e: any) => s + (e.commission_cents || 0), 0)
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || r.email
      return { rep_id: r.id, name, dials, connects, demos_set: demosSet, earned_cents: earned, is_me: r.id === auth.userId }
    })
      // Rank: demos set first (the metric that matters), then dials.
      .sort((a, b) => (b.demos_set - a.demos_set) || (b.dials - a.dials))
      // Hide reps with zero activity so the board stays motivating, but
      // never hide the caller's own row.
      .filter((r) => r.dials > 0 || r.demos_set > 0 || r.earned_cents > 0 || r.is_me)

    return NextResponse.json({ success: true, week: rows })
  } catch (e) {
    logger.error('sales leaderboard failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
