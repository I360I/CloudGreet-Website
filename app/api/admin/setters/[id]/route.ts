import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/setters/[id]  { weekly_demo_goal: number }
 *
 * Admin-only control for the adjustable per-setter weekly demo goal
 * (defaults to 2 - see sql/setter-weekly-goal.sql). Hitting the goal 4
 * weeks straight is the $50 bonus tier computed in
 * /api/setter/overview - this route only changes the target, not the
 * bonus math itself.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { weekly_demo_goal?: number }
  const goal = Number(body.weekly_demo_goal)
  if (!Number.isFinite(goal) || goal < 1 || goal > 50) {
    return NextResponse.json({ error: 'weekly_demo_goal must be a number between 1 and 50' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('custom_users')
    .update({ weekly_demo_goal: Math.round(goal) })
    .eq('id', params.id)
    .eq('role', 'setter')
    .select('id, weekly_demo_goal')
    .maybeSingle()

  if (error) {
    return NextResponse.json({
      error: `Couldn't update goal - run sql/setter-weekly-goal.sql if this is the first time. (${error.message})`,
    }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Setter not found' }, { status: 404 })

  return NextResponse.json({ success: true, weekly_demo_goal: data.weekly_demo_goal })
}
