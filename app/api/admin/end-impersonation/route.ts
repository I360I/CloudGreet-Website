import { NextRequest, NextResponse } from 'next/server'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/end-impersonation
 *
 * Swaps the impersonated session back to the original admin token
 * stashed in `impersonator_token`. Verifies the stashed token is
 * still valid + admin-roled before swapping.
 *
 * Returns redirect_url so the caller can route back to /admin or
 * wherever they came from. We default to /admin but accept a
 * `return_to` body for the client picker case.
 */
export async function POST(request: NextRequest) {
  const stashed = request.cookies.get('impersonator_token')?.value
  if (!stashed) {
    return NextResponse.json({
      error: 'Not currently impersonating - no stashed admin token.',
    }, { status: 400 })
  }

  const verified = JWTManager.verifyToken(stashed)
  const payload = verified.success ? verified.payload : null
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({
      error: 'Stashed token is invalid or expired - sign in again.',
    }, { status: 401 })
  }

  let returnTo = '/admin'
  try {
    const body = await request.json()
    if (body && typeof body.return_to === 'string' && body.return_to.startsWith('/')) {
      returnTo = body.return_to
    }
  } catch { /* no body, default */ }

  const res = NextResponse.json({ success: true, redirect_url: returnTo })

  // Restore the admin token + clear the stash.
  res.cookies.set('token', stashed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  res.cookies.delete('impersonator_token')

  void logComplianceEvent({
    channel: 'onboarding',
    eventType: 'admin_impersonate_end',
    path: '/api/admin/end-impersonation',
    tenantId: null,
    metadata: { admin_id: payload.userId },
  })

  logger.info('admin impersonation ended', { admin_id: payload.userId })
  return res
}
