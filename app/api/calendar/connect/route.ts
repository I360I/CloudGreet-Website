import { NextRequest, NextResponse } from 'next/server'
import { generateAuthUrl } from '@/lib/calendar'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Google Calendar is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
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
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
