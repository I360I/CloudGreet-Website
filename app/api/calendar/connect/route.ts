import { NextRequest, NextResponse } from 'next/server'
import { generateAuthUrl } from '@/lib/calendar'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK: Use proper JWT authentication instead of weak header auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    
    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if Google Calendar is configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Google Calendar integration not configured' 
      }, { status: 500 })
    }

    const authUrl = generateAuthUrl(businessId)
    
    logger.info('Google Calendar auth URL generated', { userId, businessId })
    
    return NextResponse.json({
      success: true,
      authUrl
    })

  } catch (error) {
    logger.error('Calendar connect API error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
