import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/clients/[id]/impersonate
 *
 * Same flow as the admin impersonation endpoint, but scoped to reps:
 * a rep can only log into businesses they brought in (businesses.rep_id
 * matches their userId). Useful for the rep to walk a client through
 * their dashboard live, or troubleshoot setup without asking for the
 * password.
 *
 * Stashes the rep's original token in `impersonator_token` so they can
 * return to /sales without re-logging-in.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: business, error: bErr } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, owner_id, rep_id')
    .eq('id', params.id)
    .single()

  if (bErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Rep can only impersonate businesses they own. This is the key gate -
  // without it any rep could log into any client.
  if (business.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your client' }, { status: 403 })
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

  const originalToken =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null

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

  res.cookies.set('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  if (originalToken) {
    res.cookies.set('impersonator_token', originalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
  }

  void logComplianceEvent({
    channel: 'onboarding',
    eventType: 'rep_impersonate_start',
    path: `/api/sales/clients/${params.id}/impersonate`,
    tenantId: business.id,
    metadata: {
      rep_id: auth.userId,
      target_user_id: owner.id,
      target_email: owner.email,
      business_id: business.id,
      business_name: business.business_name,
    },
  })

  logger.info('rep impersonation started', {
    rep_id: auth.userId,
    target_user_id: owner.id,
    business_id: business.id,
  })

  return res
}
