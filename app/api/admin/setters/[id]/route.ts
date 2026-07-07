import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { normalizeE164Loose } from '@/lib/scrapers/normalize'
import { getRepCallStats, getRepDailySeries, getWeeklyDemoGoalStatus } from '@/lib/sales/dialer-stats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/setters/[id]
 *
 * Everything the owner needs about one setter in a single payload:
 * identity + account state, call stats (today / week / all-time),
 * 14-day activity series, lead pipeline counts, demos set (closes
 * attribution), recent calls, messaging health, and phone numbers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, name, is_active, created_at, last_login, last_active_at, assigned_rep_id, weekly_demo_goal, personal_cell, vm_drop_audio_url, vm_drop_script')
    .eq('id', params.id)
    .eq('role', 'setter')
    .maybeSingle()
  if (!user) return NextResponse.json({ error: 'Setter not found' }, { status: 404 })

  const epoch = new Date(0)
  const now = new Date()
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  weekStart.setUTCDate(weekStart.getUTCDate() - 6)

  const [today, week, allTime, daily, goal, { data: assignments }, { data: numbers }, { data: closes }] = await Promise.all([
    getRepCallStats(params.id),
    getRepCallStats(params.id, { since: weekStart }),
    getRepCallStats(params.id, { since: epoch }),
    getRepDailySeries(params.id, 14),
    getWeeklyDemoGoalStatus(params.id, (user as any).weekly_demo_goal ?? 2),
    supabaseAdmin.from('lead_assignments').select('status, last_touched_at, follow_up_at').eq('rep_id', params.id),
    supabaseAdmin.from('sales_rep_phone_numbers').select('phone_number, label, is_active, is_sms_line').eq('rep_id', params.id),
    supabaseAdmin
      .from('closes')
      .select('id, prospect_business_name, status, demo_scheduled_at, created_at')
      .eq('set_by_setter_id', params.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const rows = (assignments || []) as { status: string; last_touched_at: string | null; follow_up_at: string | null }[]
  const countBy = (s: string) => rows.filter((r) => r.status === s).length
  // Pipeline-building leading indicator: interested + scheduled callbacks.
  const callbacksPending = rows.filter((r) => r.follow_up_at).length
  const pipeline = {
    total: rows.length,
    new: countBy('new'),
    called: countBy('called'),
    voicemail: countBy('voicemail'),
    interested: countBy('interested'),
    demo_scheduled: countBy('demo_scheduled'),
    demo_showed: countBy('demo_showed'),
    not_available: countBy('not_available'),
    not_interested: countBy('not_interested'),
    wrong_dm: countBy('wrong_dm'),
    dead: countBy('dead'),
    do_not_call: countBy('do_not_call'),
    untouched: rows.filter((r) => !r.last_touched_at).length,
  }

  // Recent calls with lead names (manual join, same pattern as elsewhere).
  const { data: recentCalls } = await supabaseAdmin
    .from('rep_calls')
    .select('id, started_at, status, duration_seconds, to_number, lead_id, recording_status')
    .eq('rep_id', params.id)
    .order('started_at', { ascending: false })
    .limit(15)
  const callLeadIds = Array.from(new Set((recentCalls || []).map((c: any) => c.lead_id).filter(Boolean)))
  const leadNames = new Map<string, string>()
  if (callLeadIds.length > 0) {
    const { data: leadRows } = await supabaseAdmin
      .from('leads').select('id, business_name').in('id', callLeadIds)
    for (const l of (leadRows || []) as any[]) leadNames.set(l.id, l.business_name)
  }

  // Messaging health.
  const msgCount = async (apply: (q: any) => any) => {
    const q = apply(
      supabaseAdmin.from('rep_messages').select('id', { count: 'exact', head: true }).eq('rep_id', params.id),
    )
    const { count } = await q
    return count || 0
  }
  const [msgSent, msgReceived, msgFailed] = await Promise.all([
    msgCount((q) => q.eq('direction', 'outbound')),
    msgCount((q) => q.eq('direction', 'inbound')),
    msgCount((q) => q.eq('direction', 'outbound').eq('status', 'delivery_failed')),
  ])

  // Rep options for the assignment dropdown.
  const { data: repRows } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, name, is_active')
    .eq('role', 'sales')
  const reps = (repRows || [])
    .filter((r: any) => r.is_active !== false)
    .map((r: any) => ({
      id: r.id,
      name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email,
    }))

  return NextResponse.json({
    success: true,
    setter: {
      id: user.id,
      email: user.email,
      name: (user as any).name || [(user as any).first_name, (user as any).last_name].filter(Boolean).join(' ').trim() || user.email,
      is_active: !!(user as any).is_active,
      created_at: (user as any).created_at,
      last_active: [(user as any).last_active_at, (user as any).last_login].filter(Boolean).sort().pop() || null,
      assigned_rep_id: (user as any).assigned_rep_id || null,
      weekly_demo_goal: (user as any).weekly_demo_goal ?? 2,
      personal_cell: (user as any).personal_cell || null,
      has_vm_recording: !!(user as any).vm_drop_audio_url,
      has_vm_script: !!(user as any).vm_drop_script,
    },
    calls: { today, week, all_time: allTime },
    signals: {
      week_dials: week.attempts,
      week_conversations: week.conversations,
      conversation_rate: week.attempts ? Math.round((week.conversations / week.attempts) * 100) : 0,
      interested: countBy('interested'),
      callbacks_pending: callbacksPending,
      demos: countBy('demo_scheduled') + countBy('demo_showed'),
    },
    daily,
    weekly_goal: goal,
    pipeline,
    demos_set: (closes || []).map((c: any) => ({
      id: c.id,
      business: c.prospect_business_name,
      status: c.status,
      demo_at: c.demo_scheduled_at,
      created_at: c.created_at,
    })),
    recent_calls: (recentCalls || []).map((c: any) => ({
      id: c.id,
      at: c.started_at,
      status: c.status,
      seconds: c.duration_seconds || 0,
      to: c.to_number,
      lead: c.lead_id ? (leadNames.get(c.lead_id) || null) : null,
      has_recording: (c.recording_status || '').startsWith('saved'),
    })),
    messages: { sent: msgSent, received: msgReceived, failed: msgFailed },
    numbers: numbers || [],
    reps,
  })
}

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
      const cell = normalizeE164Loose(body.personal_cell)
      if (!cell) {
        return NextResponse.json({ error: 'personal_cell is not a valid phone number (include country code, e.g. +63...)' }, { status: 400 })
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
