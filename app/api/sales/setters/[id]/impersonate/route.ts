import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/setters/[id]/impersonate
 *
 * "Login as setter" for a sales rep - scoped HARD to setters assigned
 * to THIS rep (custom_users.assigned_rep_id === auth.userId). Same
 * cookie-swap pattern as the admin impersonation: issue a setter token,
 * stash the rep's own token in `impersonator_token` for the return trip.
 * Lands on /setter. Audited.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: setter } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, role, is_active, assigned_rep_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!setter || setter.role !== 'setter') {
    return NextResponse.json({ error: 'Setter not found' }, { status: 404 })
  }
  if (setter.assigned_rep_id !== auth.userId) {
    return NextResponse.json({ error: 'That setter is not assigned to you.' }, { status: 403 })
  }
  if (setter.is_active === false) {
    return NextResponse.json({ error: 'That setter account is inactive.' }, { status: 400 })
  }

  const originalToken =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null

  const newToken = JWTManager.createUserToken(setter.id, '', setter.email, 'setter')

  const res = NextResponse.json({
    success: true,
    redirect_url: '/setter',
    impersonating: {
      user_id: setter.id,
      email: setter.email,
      name: [setter.first_name, setter.last_name].filter(Boolean).join(' ') || null,
      role: 'setter',
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
    eventType: 'rep_impersonate_setter_start',
    path: `/api/sales/setters/${params.id}/impersonate`,
    tenantId: null,
    metadata: { rep_id: auth.userId, target_setter_id: setter.id, target_email: setter.email },
  })
  logger.info('rep impersonating setter', { repId: auth.userId, setterId: setter.id })

  return res
}
