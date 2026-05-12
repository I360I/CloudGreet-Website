import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/reset-onboarding
 *
 * Full reset to "first login" state for demos / re-runs. Wipes
 * onboarding progress AND clears activity data so the next login
 * walks through the wizard fresh.
 *
 * Body:
 *   { reason: string }   - required, for the audit trail
 *
 * What this DOES clear on the business row:
 *   - onboarding_completed       -> false
 *   - onboarding_step            -> null
 *   - forwarding_verified_at     -> null
 *   - forwarding_carrier         -> null
 *   - forwarding_line_type       -> null
 *   - forwarding_mode            -> null
 *   - calcom_connected           -> false
 *   - calcom_connected_at        -> null
 *   - cal_com_api_key            -> null
 *   - cal_com_user_id            -> null
 *   - cal_com_username           -> null
 *   - cal_com_event_type_id      -> null
 *   - cal_com_event_type_slug    -> null
 *   - cal_com_webhook_id         -> null
 *   - cal_com_webhook_secret     -> null
 *
 * What this DOES delete (scoped to this business):
 *   - calls
 *   - appointments
 *   - review_requests
 *   - notifications
 *
 * What this DOES NOT touch:
 *   - business_id, business_name, owner (account still exists)
 *   - email + password (login still works)
 *   - subscription_status + stripe_customer_id (billing relationship)
 *   - retell_agent_id + phone_number (so admin doesn't have to re-provision)
 *   - greeting_message, voice_id, voice_speed (agent personality)
 *   - review_opt_outs (global by phone; opt-outs are sticky on purpose)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try { body = await request.json() } catch { /* allow empty */ }
  const reason: string = String(body?.reason || '').trim()
  if (reason.length < 4) {
    return NextResponse.json(
      { error: 'reason is required (min 4 chars) for the audit trail' },
      { status: 400 },
    )
  }

  // Read current state for the audit row.
  const { data: biz, error: readErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, onboarding_completed, forwarding_verified_at, calcom_connected')
    .eq('id', params.id)
    .maybeSingle()
  if (readErr || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // Clear onboarding + Cal.com + forwarding flags on the business row.
  // Done as one update so it's atomic for the dashboard's next read.
  const { error: updErr } = await supabaseAdmin
    .from('businesses')
    .update({
      onboarding_completed: false,
      onboarding_step: null,
      forwarding_verified_at: null,
      forwarding_carrier: null,
      forwarding_line_type: null,
      forwarding_mode: null,
      calcom_connected: false,
      calcom_connected_at: null,
      cal_com_api_key: null,
      cal_com_user_id: null,
      cal_com_username: null,
      cal_com_event_type_id: null,
      cal_com_event_type_slug: null,
      cal_com_webhook_id: null,
      cal_com_webhook_secret: null,
      updated_at: now,
    })
    .eq('id', params.id)
  if (updErr) {
    logger.error('reset-onboarding update failed', { businessId: params.id, error: updErr.message })
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Delete activity scoped to this business. Counts captured for the
  // response so the admin sees exactly what was wiped. Each delete is
  // best-effort: a failure on one table shouldn't leave the row half-reset.
  const counts: Record<string, number> = {}
  const wipeTable = async (table: string) => {
    const { data, error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('business_id', params.id)
      .select('id')
    if (error) {
      logger.warn(`reset-onboarding: ${table} wipe failed`, {
        businessId: params.id, error: error.message,
      })
      counts[table] = -1
      return
    }
    counts[table] = data?.length || 0
  }
  await wipeTable('calls')
  await wipeTable('appointments')
  await wipeTable('review_requests')
  await wipeTable('notifications')

  // Audit row. Best-effort: if the table doesn't exist in this env, log and move on.
  try {
    await supabaseAdmin.from('admin_audit_events').insert({
      actor_user_id: auth.userId || null,
      action: 'reset_onboarding',
      target_type: 'business',
      target_id: params.id,
      reason,
      metadata: {
        previous_onboarding_completed: !!biz.onboarding_completed,
        previous_forwarding_verified_at: biz.forwarding_verified_at,
        previous_calcom_connected: !!biz.calcom_connected,
        wiped: counts,
      },
    })
  } catch (e) {
    logger.warn('reset-onboarding audit insert failed (non-fatal)', {
      businessId: params.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  logger.info('Admin reset-onboarding executed', {
    businessId: params.id,
    businessName: biz.business_name,
    reason,
    actor: auth.userId,
    wiped: JSON.stringify(counts),
  })

  return NextResponse.json({
    success: true,
    business_id: params.id,
    wiped: counts,
  })
}
