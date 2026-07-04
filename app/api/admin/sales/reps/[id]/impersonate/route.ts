import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/sales/reps/[id]/impersonate
 *
 * "Login as rep": issues a JWT for the rep-tool user and swaps the auth
 * cookie, stashing the admin's original token in `impersonator_token` so
 * they can swap back via the end-impersonation endpoint. Mirrors the
 * admin->client impersonation flow. Covers both rep-tool roles: sales
 * reps land in /sales, setters land in /setter. Neither has a
 * business_id (createUserToken takes '' just like login does). Audited.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The rep id is the custom_users id (sales_reps.id == custom_users.id).
  const { data: rep, error: rErr } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, role, business_id, is_active')
    .eq('id', params.id)
    .single()

  if (rErr || !rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
  }
  if (rep.role !== 'sales' && rep.role !== 'setter') {
    return NextResponse.json({ error: 'This account is not a sales rep or setter.' }, { status: 400 })
  }
  if (rep.is_active === false) {
    return NextResponse.json({ error: 'This rep account is inactive.' }, { status: 400 })
  }

  const originalToken =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null

  const newToken = JWTManager.createUserToken(
    rep.id,
    rep.business_id || '', // reps have no business, same as login-simple
    rep.email,
    rep.role || 'sales',
  )

  const res = NextResponse.json({
    success: true,
    redirect_url: rep.role === 'setter' ? '/setter' : '/sales',
    impersonating: {
      user_id: rep.id,
      email: rep.email,
      name: [rep.first_name, rep.last_name].filter(Boolean).join(' ') || null,
      role: rep.role,
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
    eventType: 'admin_impersonate_start',
    path: `/api/admin/sales/reps/${params.id}/impersonate`,
    tenantId: null,
    metadata: {
      admin_id: auth.userId,
      target_user_id: rep.id,
      target_email: rep.email,
      target_role: rep.role,
    },
  })

  logger.info('admin rep impersonation started', {
    admin_id: auth.userId,
    target_user_id: rep.id,
  })

  return res
}
