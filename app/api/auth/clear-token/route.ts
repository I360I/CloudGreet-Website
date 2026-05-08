import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Clear authentication token cookie
 */
export async function POST() {
 const response = NextResponse.json({ success: true })

 // Clear every auth-related cookie. Both `token` (the live session)
 // and `impersonator_token` (admin's stashed token while impersonating
 // a client) must go; otherwise an admin who logs out mid-impersonation
 // can come back later and resume into a client session they no longer
 // intended to be in.
 for (const name of ['token', 'impersonator_token']) {
  response.cookies.delete(name)
  response.cookies.set(name, '', {
   httpOnly: true,
   secure: process.env.NODE_ENV === 'production',
   sameSite: 'lax',
   maxAge: 0,
   path: '/',
  })
 }

 return response
}

