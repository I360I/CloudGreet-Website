import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { nextBusinessSlot, clampToBusinessHours } from '@/lib/sales/business-hours'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set([
  'new', 'called', 'voicemail', 'interested', 'demo_scheduled',
  'proposal_sent', 'closed', 'dead', 'do_not_call',
])

/**
 * GET /api/sales/leads/[id] - full lead + workflow + note thread.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id, status, disposition, follow_up_at, last_touched_at, touch_count, assigned_at')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })

  const [{ data: lead }, { data: notes }, { data: rep }] = await Promise.all([
    supabaseAdmin.from('leads').select('*').eq('id', params.id).maybeSingle(),
    supabaseAdmin
      .from('lead_notes')
      .select('id, body, created_at')
      .eq('lead_id', params.id)
      .eq('rep_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('sales_reps')
      .select('booking_url')
      .eq('id', auth.userId)
      .maybeSingle(),
  ])
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    lead: {
      ...lead,
      claimed_at: assignment.assigned_at,
      status: assignment.status,
      disposition: assignment.disposition,
      follow_up_at: assignment.follow_up_at,
      last_touched_at: assignment.last_touched_at,
      touch_count: assignment.touch_count,
    },
    notes: notes ?? [],
    booking_url: rep?.booking_url || null,
  })
}

/**
 * PATCH /api/sales/leads/[id]
 *   { status?, disposition?, follow_up_at?: string|null,
 *     touched?: boolean }
 *
 * `touched: true` bumps touch_count and stamps last_touched_at - call
 * it whenever the rep dials or messages the lead.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const update: Record<string, unknown> = {}

  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  // When a call is marked as voicemail, auto-schedule a follow-up
  // in 2 days at 9am Central - unless the rep is also setting
  // follow_up_at explicitly in this request, or one is already on
  // the row. Previously this used setHours(9) which is server-local
  // (UTC on Vercel), so reps were seeing 4am callbacks.
  if (update.status === 'voicemail' && body.follow_up_at === undefined) {
    const { data: cur } = await supabaseAdmin
      .from('lead_assignments')
      .select('follow_up_at')
      .eq('rep_id', auth.userId)
      .eq('lead_id', params.id)
      .maybeSingle()
    if (!cur?.follow_up_at) {
      update.follow_up_at = nextBusinessSlot({ daysFromNow: 2 }).toISOString()
    }
  }
  if (typeof body.disposition === 'string') {
    update.disposition = body.disposition.trim().slice(0, 200) || null
  } else if (body.disposition === null) {
    update.disposition = null
  }
  if (body.follow_up_at !== undefined) {
    if (body.follow_up_at === null) {
      update.follow_up_at = null
    } else if (typeof body.follow_up_at === 'string') {
      const d = new Date(body.follow_up_at)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid follow_up_at' }, { status: 400 })
      }
      // Clamp to business hours (Mon-Fri 9am-6pm Central). If a rep
      // somehow picks 4am, push it to 9am same day. If they pick a
      // weekend, push to Monday morning. Stops "Tmrw 4:00 AM" callbacks.
      update.follow_up_at = clampToBusinessHours(d).toISOString()
    }
  }

  if (body.touched === true) {
    // Read-modify-write touch_count; fine for our concurrency.
    const { data: cur } = await supabaseAdmin
      .from('lead_assignments')
      .select('touch_count')
      .eq('rep_id', auth.userId)
      .eq('lead_id', params.id)
      .maybeSingle()
    update.touch_count = (cur?.touch_count ?? 0) + 1
    update.last_touched_at = new Date().toISOString()
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('lead_assignments')
    .update(update)
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
  if (error) {
    logger.error('Lead workflow patch failed', {
      userId: auth.userId, leadId: params.id, error: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/sales/leads/[id] - drop the assignment so the lead
 * disappears from the rep's list. Doesn't delete the underlying lead
 * row (other reps / admin views may reference it).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const { error } = await supabaseAdmin
    .from('lead_assignments')
    .delete()
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
