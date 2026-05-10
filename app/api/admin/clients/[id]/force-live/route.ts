import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/force-live
 *
 * Launch escape hatch. Flips a business from onboarding-incomplete to
 * "live and answering" without waiting on the verification chain
 * (Cal.com connect + forwarding test + Stripe sub active). Use when
 * one of those silently failed and the client is stuck.
 *
 * Body:
 *   { reason: string }   - required, recorded for the audit trail
 *
 * Sets:
 *   - forwarding_verified_at = now() (so the dashboard step machine
 *     reads "done")
 *   - onboarding_completed = true
 * Does NOT touch subscription_status - if Stripe says they're not
 * paid, we don't fake it. Pair with a manual /admin/billing fix if
 * the issue is on the billing side.
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

  const { data: biz, error: readErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, onboarding_completed, forwarding_verified_at, subscription_status')
    .eq('id', params.id)
    .maybeSingle()
  if (readErr || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('businesses')
    .update({
      forwarding_verified_at: biz.forwarding_verified_at || now,
      onboarding_completed: true,
      updated_at: now,
    })
    .eq('id', params.id)
  if (updErr) {
    logger.error('force-live update failed', { businessId: params.id, error: updErr.message })
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Audit row. Best-effort: if the table doesn't exist in this env,
  // we log the override and move on so the operator isn't blocked.
  try {
    await supabaseAdmin.from('admin_audit_events').insert({
      actor_user_id: auth.userId || null,
      action: 'force_live',
      target_type: 'business',
      target_id: params.id,
      reason,
      metadata: {
        previous_onboarding_completed: !!biz.onboarding_completed,
        previous_forwarding_verified_at: biz.forwarding_verified_at,
        subscription_status: biz.subscription_status,
      },
    })
  } catch (e) {
    logger.warn('force-live audit insert failed (non-fatal)', {
      businessId: params.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  logger.info('Admin force-live executed', {
    businessId: params.id,
    businessName: biz.business_name,
    reason,
    actor: auth.userId,
  })

  return NextResponse.json({
    success: true,
    business_id: params.id,
    onboarding_completed: true,
  })
}
