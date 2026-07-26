import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/sales/goals - a sales rep edits their own targets.
 *
 * Body: { weekly_demo_goal?: number, daily_dial_goal?: number }
 * Both optional; values are clamped to sane ranges. Sales role only -
 * setter weekly goals stay admin-managed because the $50 streak bonus
 * pays off them.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const patch: Record<string, number> = {}

    if (body.weekly_demo_goal !== undefined) {
      const v = Math.round(Number(body.weekly_demo_goal))
      if (!Number.isFinite(v) || v < 1 || v > 50) {
        return NextResponse.json({ error: 'Weekly demo goal must be between 1 and 50' }, { status: 400 })
      }
      patch.weekly_demo_goal = v
    }
    if (body.daily_dial_goal !== undefined) {
      const v = Math.round(Number(body.daily_dial_goal))
      if (!Number.isFinite(v) || v < 5 || v > 500) {
        return NextResponse.json({ error: 'Daily dial goal must be between 5 and 500' }, { status: 400 })
      }
      patch.daily_dial_goal = v
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('custom_users')
      .update(patch)
      .eq('id', auth.userId)
    if (error) throw error

    return NextResponse.json({ success: true, ...patch })
  } catch (e) {
    logger.error('sales goals update failed', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'Failed to save goals' }, { status: 500 })
  }
}
