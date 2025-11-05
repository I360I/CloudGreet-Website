import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'

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

    const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
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



