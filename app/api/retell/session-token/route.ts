import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
 try {
 // Verify authentication (session tokens should be protected)
 const authResult = await verifyJWT(request)
 if (!authResult.user) {
 return NextResponse.json(
 { success: false, error: 'Unauthorized' },
 { status: 401 }
 )
 }

 // Rate limit: 10 tokens per user per minute. Each Retell session
 // token is short-lived but still costs and counts against quota;
 // a buggy or malicious client could otherwise mint thousands a minute.
 const rateOk = rateLimit(
  `retell-session-token:${(authResult.user as any).userId || (authResult.user as any).id || 'anon'}`,
  10,
  60_000,
 )
 if (!rateOk) {
  return NextResponse.json(
   { success: false, error: 'too_many_requests' },
   { status: 429 },
  )
 }

 const apiKey = process.env.RETELL_API_KEY
 if (!apiKey) {
 return NextResponse.json({ success: false, error: 'RETELL_API_KEY missing' }, { status: 500 })
 }

 // Create a short-lived web token for Retell WebRTC (endpoint subject to change by provider)
 const resp = await fetch('https://api.retellai.com/session-tokens', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${apiKey}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ ttl_seconds: 300 })
 })

 if (!resp.ok) {
 const txt = await resp.text().catch(() => 'unknown')
 logger.error('Retell session token failed', { status: resp.status, txt })
 return NextResponse.json({ success: false, error: 'retell_session_failed' }, { status: 502 })
 }

 const data = await resp.json()
 return NextResponse.json({ success: true, token: data?.token || null })
 } catch (error) {
 logger.error('Retell session token error', { error: (error as Error).message })
 return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
 }
}



