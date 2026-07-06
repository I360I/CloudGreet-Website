import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { normalizePhone } from '@/lib/scrapers/normalize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/setters/[id]
 *   { weekly_demo_goal?: number, assigned_rep_id?: string | null,
 *     personal_cell?: string | null }
 *
 * Admin-only setter controls:
 * - weekly_demo_goal: the adjustable per-setter weekly demo target
 *   (defaults to 2 - see sql/setter-weekly-goal.sql). Hitting the goal 4
 *   weeks straight is the $50 bonus tier computed in /api/setter/overview -
 *   this route only changes the target, not the bonus math itself.
 * - personal_cell: where inbound return calls to the setter's dialer
 *   number get forwarded (rep-voice-webhook). Null clears it - callers
 *   then go straight to voicemail.
 * - assigned_rep_id: which sales rep this setter's booked demos flow to
 *   (closes rows land in that rep's pipeline - see mark-demo). Pass null
 *   to unassign. Must reference an active custom_users row with role
 *   'sales'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    weekly_demo_goal?: number
    assigned_rep_id?: string | null
    personal_cell?: string | null
  }

  const update: Record<string, unknown> = {}

  if (body.weekly_demo_goal !== undefined) {
    const goal = Number(body.weekly_demo_goal)
    if (!Number.isFinite(goal) || goal < 1 || goal > 50) {
      return NextResponse.json({ error: 'weekly_demo_goal must be a number between 1 and 50' }, { status: 400 })
    }
    update.weekly_demo_goal = Math.round(goal)
  }

  if (body.personal_cell !== undefined) {
    if (body.personal_cell === null || body.personal_cell === '') {
      update.personal_cell = null
    } else {
      const cell = normalizePhone(body.personal_cell)
      if (!cell) {
        return NextResponse.json({ error: 'personal_cell is not a valid US phone number' }, { status: 400 })
      }
      update.personal_cell = cell
    }
  }

  if (body.assigned_rep_id !== undefined) {
    if (body.assigned_rep_id === null || body.assigned_rep_id === '') {
      update.assigned_rep_id = null
    } else {
      const { data: rep } = await supabaseAdmin
        .from('custom_users')
        .select('id, role, is_active')
        .eq('id', body.assigned_rep_id)
        .maybeSingle()
      if (!rep || rep.role !== 'sales') {
        return NextResponse.json({ error: 'assigned_rep_id must be a sales rep account' }, { status: 400 })
      }
      if (rep.is_active === false) {
        return NextResponse.json({ error: 'That rep account is inactive' }, { status: 400 })
      }
      update.assigned_rep_id = rep.id
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('custom_users')
    .update(update)
    .eq('id', params.id)
    .eq('role', 'setter')
    .select('id, weekly_demo_goal, assigned_rep_id, personal_cell')
    .maybeSingle()

  if (error) {
    return NextResponse.json({
      error: `Couldn't update setter - if columns are missing run sql/setter-weekly-goal.sql and sql/setter-rep-assignment.sql. (${error.message})`,
    }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Setter not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    weekly_demo_goal: data.weekly_demo_goal,
    assigned_rep_id: data.assigned_rep_id ?? null,
    personal_cell: (data as any).personal_cell ?? null,
  })
}
