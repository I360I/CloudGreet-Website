import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/impersonate
 *
 * Issues a JWT for the target business's owner and swaps the auth
 * cookie. Stashes the admin's original token in `impersonator_token`
 * (httpOnly cookie) so the admin can swap back via the return endpoint
 * without re-logging-in.
 *
 * Why impersonate instead of "show the password":
 *   Passwords are bcrypted in the DB. There is no plain-text copy
 *   anywhere. Even if there were, exposing it on an admin page would
 *   be insecure - one screenshot leaks credentials. Impersonation is
 *   auditable, scoped, and reversible.
 *
 * Audit: every impersonation start logs a compliance_events row with
 * impersonator_id and target_user_id, so we always have a trail of
 * who logged in as whom.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up the business + owner.
  const { data: business, error: bErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, owner_id')
    .eq('id', params.id)
    .single()

  if (bErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (!business.owner_id) {
    return NextResponse.json({
      error: 'No owner account is linked to this business yet.',
    }, { status: 400 })
  }

  const { data: owner, error: oErr } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, role, business_id')
    .eq('id', business.owner_id)
    .single()

  if (oErr || !owner) {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
  }

  // Capture the admin's existing token from the request so we can stash
  // it for the return-from-impersonation flow. Cookie name is 'token'
  // (matches the rest of the app).
  const originalToken =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null

  // Mint a JWT for the target user.
  const role = owner.role || 'owner'
  const newToken = JWTManager.createUserToken(
    owner.id,
    owner.business_id || business.id,
    owner.email,
    role,
  )

  const res = NextResponse.json({
    success: true,
    redirect_url: '/dashboard',
    impersonating: {
      user_id: owner.id,
      email: owner.email,
      name: [owner.first_name, owner.last_name].filter(Boolean).join(' ') || null,
      business_id: business.id,
      business_name: business.business_name,
    },
  })

  // Auth cookie for the impersonated session.
  res.cookies.set('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // shorter than a normal session - 8 hours
  })

  // Stash the admin's token so they can return without logging in again.
  // Same-site / httpOnly so it's protected.
  if (originalToken) {
    res.cookies.set('impersonator_token', originalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
  }

  // Audit trail - non-fatal if the compliance table is missing.
  void logComplianceEvent({
    channel: 'onboarding',
    eventType: 'admin_impersonate_start',
    path: `/api/admin/clients/${params.id}/impersonate`,
    tenantId: business.id,
    metadata: {
      admin_id: auth.userId,
      target_user_id: owner.id,
      target_email: owner.email,
      business_id: business.id,
      business_name: business.business_name,
    },
  })

  logger.info('admin impersonation started', {
    admin_id: auth.userId,
    target_user_id: owner.id,
    business_id: business.id,
  })

  return res
}
