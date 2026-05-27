import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/clients/[id]/owner-email
 *   body: { email: string }
 *
 * Updates the email on the OWNER's custom_users row. Used when an
 * onboarding client mistyped their email (or gave their personal
 * one) and we need to swap to the real business email mid-call so
 * Stripe receipts, password resets, and our outreach all land in
 * the right inbox.
 *
 * Email is the login identifier - changing it changes how the
 * client logs in. We do NOT send any verification email; admin
 * action is trusted.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { email?: string }
  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (email.length > 254) {
    return NextResponse.json({ error: 'Email is too long' }, { status: 400 })
  }

  const { data: biz, error: bizErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, owner_id')
    .eq('id', params.id)
    .maybeSingle()
  if (bizErr || !biz) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  const ownerId = (biz as any).owner_id
  if (!ownerId) return NextResponse.json({ error: 'Client has no owner_id on file' }, { status: 400 })

  // Refuse if the email is already used by a different user - email is
  // the login identifier, so a collision would silently break login
  // for one of them.
  const { data: collision } = await supabaseAdmin
    .from('custom_users')
    .select('id')
    .eq('email', email)
    .neq('id', ownerId)
    .limit(1)
    .maybeSingle()
  if ((collision as any)?.id) {
    return NextResponse.json({
      error: 'That email is already used by another CloudGreet account.',
    }, { status: 409 })
  }

  const { data: prev } = await supabaseAdmin
    .from('custom_users')
    .select('email')
    .eq('id', ownerId)
    .maybeSingle()
  const prevEmail = (prev as any)?.email || null

  const { error: updErr } = await supabaseAdmin
    .from('custom_users')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('id', ownerId)
  if (updErr) {
    logger.error('admin owner-email update failed', { businessId: params.id, error: updErr.message })
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  logger.info('admin updated owner email', {
    businessId: params.id, ownerId, from: prevEmail, to: email,
  })

  // Best-effort audit row so we can trace email swaps later.
  try {
    await supabaseAdmin.from('admin_audit_events').insert({
      type: 'owner_email_change',
      business_id: params.id,
      metadata: { owner_id: ownerId, previous_email: prevEmail, new_email: email },
    })
  } catch { /* audit table may not exist on fresh deploys */ }

  return NextResponse.json({ success: true, owner_id: ownerId, email, previous_email: prevEmail })
}
