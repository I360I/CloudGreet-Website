import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    
    // Validate error data
    if (!errorData.message || !errorData.errorId) {
      return NextResponse.json(
        { error: 'Invalid error data structure' },
        { status: 400 }
      )
    }

    // Extract error information
    const errorInfo = {
      message: errorData.message,
      stack: errorData.stack || null,
      componentStack: errorData.componentStack || null,
      errorId: errorData.errorId,
      timestamp: errorData.timestamp || new Date().toISOString(),
      url: errorData.url || null,
      userAgent: errorData.userAgent || request.headers.get('user-agent') || 'unknown',
      retryCount: errorData.retryCount || 0,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    }

    // Log the error with high priority
    await logger.error('Client Error', {
      message: errorInfo.message,
      errorId: errorInfo.errorId,
      stack: errorInfo.stack,
      componentStack: errorInfo.componentStack,
      url: errorInfo.url,
      retryCount: errorInfo.retryCount,
      userAgent: errorInfo.userAgent
    })

    // In a real implementation, you would:
    // 1. Store in error tracking database
    // 2. Send to error monitoring service (Sentry, Bugsnag, etc.)
    // 3. Alert development team for critical errors
    // 4. Aggregate error statistics
    
    console.log('Client Error Received:', {
      errorId: errorInfo.errorId,
      message: errorInfo.message,
      url: errorInfo.url,
      retryCount: errorInfo.retryCount,
      timestamp: errorInfo.timestamp
    })

    return NextResponse.json({ 
      success: true,
      message: 'Error logged successfully',
      errorId: errorInfo.errorId
    })

  } catch (error) {
    console.error('Failed to log client error:', error)
    
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Error monitoring endpoint',
    status: 'active'
  })
}
