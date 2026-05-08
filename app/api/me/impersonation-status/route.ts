import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/me/impersonation-status
 *
 * Light read for the impersonation banner. The httpOnly impersonator
 * cookie can't be read from JS, so the dashboard hits this endpoint
 * on mount to figure out if it should render the "Return to admin"
 * banner.
 */
export async function GET(request: NextRequest) {
  const stashed = request.cookies.get('impersonator_token')?.value
  return NextResponse.json({
    impersonating: !!stashed,
  })
}
