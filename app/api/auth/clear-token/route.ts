import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Clear authentication token cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  
  // Clear httpOnly cookie
  response.cookies.delete('token')
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}

