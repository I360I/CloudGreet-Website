import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get authentication token from httpOnly cookie
 * This is safe to expose since the cookie is httpOnly
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  return NextResponse.json({
    success: true,
    token: token || null,
  })
}

