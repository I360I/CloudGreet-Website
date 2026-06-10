import { NextRequest, NextResponse } from 'next/server'
import { JWTManager } from '@/lib/jwt-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/me/impersonation-status
 *
 * Light read for the impersonation banner. The httpOnly impersonator
 * cookie can't be read from JS, so the dashboard hits this endpoint
 * on mount to figure out if it should render the "Return to admin"
 * banner.
 *
 * Only report impersonating=true when the stashed token is a CURRENTLY
 * VALID admin JWT. A stale/expired/non-admin cookie (e.g. left over on a
 * shared demo machine) must not show the banner to a real client - and we
 * actively clear it so it can never stick across sessions.
 */
export async function GET(request: NextRequest) {
  const stashed = request.cookies.get('impersonator_token')?.value
  let impersonating = false
  if (stashed) {
    const v = JWTManager.verifyToken(stashed)
    impersonating = !!(v.success && v.payload?.role === 'admin')
  }

  const res = NextResponse.json({ impersonating })

  // Self-heal: a present-but-invalid stash is noise (or a security risk via
  // the return-to-admin button). Drop it so the next read is clean.
  if (stashed && !impersonating) {
    res.cookies.set('impersonator_token', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' })
  }
  return res
}
