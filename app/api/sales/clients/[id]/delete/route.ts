import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/clients/[id]/delete
 *
 * Full disconnect for a rep-owned client. Use when a prospect account
 * didn't pan out and the rep wants the client gone - frees up the
 * lead, removes the owner user, deletes the business and its
 * activity, and marks any open closes cancelled.
 *
 * Rep can only delete businesses they brought in (businesses.rep_id
 * matches their userId). Body must include a `reason` (audit).
 *
 * What this deletes (scoped to the business):
 *   - calls, appointments, review_requests, notifications, ai_agents,
 *     phone_numbers (provider=retell), review_opt_outs are NOT touched
 *     (global by phone)
 *   - The custom_users owner row
 *   - The businesses row itself
 *   - Closes belonging to this rep+business get status='cancelled'
 *     (kept for audit, not deleted)
 *   - lead_assignments for the originating lead get reset to 'cold' so
 *     the rep can re-pitch later
 *
 * What this does NOT do:
 *   - Cancel a Stripe subscription. If the client was paying, that
 *     keeps billing until cancelled in Stripe directly. The endpoint
 *     refuses to proceed when subscription_status is 'active' or
 *     'trialing' unless body.force === true.
 *   - Touch the lead row itself (kept for re-pitching).
 *
 * Logged to compliance_events.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let body: any = {}
  try { body = await request.json() } catch { /* allow empty */ }
  const reason = String(body?.reason || '').trim()
  const force = body?.force === true
  if (reason.length < 4) {
    return NextResponse.json(
      { error: 'reason is required (min 4 chars)' },
      { status: 400 },
    )
  }

  const { data: business, error: bErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, owner_id, rep_id, subscription_status, stripe_customer_id')
    .eq('id', params.id)
    .maybeSingle()
  if (bErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (business.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your client' }, { status: 403 })
  }

  const subActive =
    business.subscription_status === 'active' ||
    business.subscription_status === 'trialing'
  if (subActive && !force) {
    return NextResponse.json({
      error: 'subscription_active',
      detail: `This client has an active subscription (${business.subscription_status}). Cancel in Stripe first, or re-submit with force=true to proceed anyway.`,
      stripe_customer_id: business.stripe_customer_id,
    }, { status: 409 })
  }

  // Wipe activity scoped to this business. Best-effort per table - a
  // failure on one shouldn't abort the others; we log and continue.
  const wiped: Record<string, number> = {}
  const wipeTable = async (table: string) => {
    const { data, error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('business_id', params.id)
      .select('id')
    if (error) {
      logger.warn(`delete-client: ${table} wipe failed`, {
        businessId: params.id, error: error.message,
      })
      wiped[table] = -1
      return
    }
    wiped[table] = data?.length || 0
  }
  await wipeTable('calls')
  await wipeTable('appointments')
  await wipeTable('review_requests')
  await wipeTable('notifications')
  await wipeTable('ai_agents')
  await wipeTable('phone_numbers')

  // Cancel any closes belonging to this business + this rep. Don't
  // delete - they're commission/audit-relevant.
  const { data: cancelledCloses } = await supabaseAdmin
    .from('closes')
    .update({
      status: 'cancelled',
      notes: `Rep deleted client account. Reason: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', params.id)
    .eq('rep_id', auth.userId)
    .select('id')
  wiped.closes_cancelled = cancelledCloses?.length || 0

  // Find the originating lead via the most recent close prospect_email
  // matching the owner's email - lets us reset the assignment so the
  // rep can rework the lead later if it changes mind. Non-fatal.
  if (business.owner_id) {
    const { data: ownerUser } = await supabaseAdmin
      .from('custom_users')
      .select('email')
      .eq('id', business.owner_id)
      .maybeSingle()
    const email = ownerUser?.email
    if (email) {
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (lead?.id) {
        await supabaseAdmin
          .from('lead_assignments')
          .update({
            status: 'cold',
            last_touched_at: new Date().toISOString(),
          })
          .eq('rep_id', auth.userId)
          .eq('lead_id', lead.id)
        wiped.lead_assignments_reset = 1
      }
    }
  }

  // Delete the owner user row.
  if (business.owner_id) {
    const { error: uErr } = await supabaseAdmin
      .from('custom_users')
      .delete()
      .eq('id', business.owner_id)
    if (uErr) {
      logger.warn('delete-client: owner user delete failed', {
        ownerId: business.owner_id, error: uErr.message,
      })
    } else {
      wiped.owner_user = 1
    }
  }

  // Finally delete the business row.
  const { error: deleteBizErr } = await supabaseAdmin
    .from('businesses')
    .delete()
    .eq('id', params.id)
  if (deleteBizErr) {
    logger.error('delete-client: business delete failed', {
      businessId: params.id, error: deleteBizErr.message,
    })
    return NextResponse.json({
      error: deleteBizErr.message,
      partially_wiped: wiped,
    }, { status: 500 })
  }
  wiped.business = 1

  void logComplianceEvent({
    channel: 'onboarding',
    eventType: 'rep_client_deleted',
    path: `/api/sales/clients/${params.id}/delete`,
    tenantId: params.id,
    metadata: {
      rep_id: auth.userId,
      business_id: params.id,
      business_name: business.business_name,
      reason,
      forced_active_subscription: subActive && force,
      wiped: JSON.stringify(wiped),
    },
  })

  logger.info('rep deleted client', {
    rep_id: auth.userId,
    business_id: params.id,
    business_name: business.business_name,
    wiped: JSON.stringify(wiped),
  })

  return NextResponse.json({
    success: true,
    business_id: params.id,
    wiped,
  })
}
