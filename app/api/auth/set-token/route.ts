import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Set authentication token in httpOnly cookie
 * This prevents XSS attacks by keeping tokens out of JavaScript-accessible storage
 */
export async function POST(request: NextRequest) {
 try {
 const body = await request.json()
 const { token } = body

 if (!token || typeof token !== 'string') {
 return NextResponse.json(
 { success: false, error: 'Token required' },
 { status: 400 }
 )
 }

 const response = NextResponse.json({ success: true })
 
 // Set httpOnly cookie (not accessible via JavaScript)
 response.cookies.set('token', token, {
 httpOnly: true,
 secure: process.env.NODE_ENV === 'production',
 sameSite: 'lax',
 maxAge: 60 * 60 * 24 * 7, // 7 days
 path: '/',
 })

 // A normal login must NEVER inherit a stale impersonation. If an admin
 // impersonated a client on this browser and didn't formally "Return to
 // admin" (closed the tab, shared/reused machine in a demo), the
 // impersonator_token could linger - which would (a) wrongly show the
 // "you're signed in as a client" banner to the real user, and (b) let
 // whoever logs in here click "Return to admin" and jump into the admin
 // session. Setting a fresh token = a fresh, non-impersonated session, so
 // clear the stash unconditionally.
 response.cookies.delete('impersonator_token')
 response.cookies.set('impersonator_token', '', {
 httpOnly: true,
 secure: process.env.NODE_ENV === 'production',
 sameSite: 'lax',
 maxAge: 0,
 path: '/',
 })

 return response
 } catch (error) {
 logger.error('Failed to set auth token', {
 error: error instanceof Error ? error.message : 'Unknown error',
 })
 return NextResponse.json(
 { success: false, error: 'Failed to set token' },
 { status: 500 }
 )
 }
}

