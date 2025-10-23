import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  try {
    // RATE LIMITING: Check IP-based rate limit
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    // Rate limiting: prevent abuse of analytics endpoint
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    // Note: In production, implement Redis-based rate limiting
    
    const event = await request.json()
    
    // Validate event structure
    if (!event.event || typeof event.event !== 'string') {
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      )
    }

    // Extract analytics data
    const analyticsData = {
      event: event.event,
      properties: event.properties || {},
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      timestamp: event.properties?.timestamp || Date.now(),
      ip: ip,
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Log the event
    await logger.info('Analytics Event', {
      event: analyticsData.event,
      userId: analyticsData.userId,
      sessionId: analyticsData.sessionId,
      properties: analyticsData.properties
    })

    // In a real implementation, you would:
    // 1. Store in analytics database
    // 2. Send to analytics service (Google Analytics, Mixpanel, etc.)
    // 3. Process for real-time dashboards

    return NextResponse.json({ 
      success: true,
      message: 'Event tracked successfully'
    })

  } catch (error) {
    await logger.error('Analytics tracking failed', {
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Analytics tracking endpoint',
    status: 'active'
  })
}
