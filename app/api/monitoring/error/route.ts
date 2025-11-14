import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Log Error for Monitoring
 * Sends errors to Sentry if configured, otherwise logs locally
 */
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { error, context, severity } = body || {}

    if (!error) {
      return NextResponse.json(
        { success: false, message: 'Error information is required' },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    // Log error with context
    logger.error('Client-side error reported', {
      error: errorMessage,
      stack: errorStack,
      context: context || {},
      severity: severity || 'error',
      timestamp: new Date().toISOString()
    })

    // Send to Sentry if configured
    let sentryCaptured = false
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Dynamic import to avoid loading Sentry if not configured
        const Sentry = await import('@sentry/nextjs')
        
        Sentry.captureException(error instanceof Error ? error : new Error(errorMessage), {
          level: severity === 'warning' ? 'warning' : severity === 'info' ? 'info' : 'error',
          tags: {
            source: 'client-side',
            ...(context?.userId && { userId: context.userId }),
            ...(context?.businessId && { businessId: context.businessId })
          },
          extra: {
            context: context || {},
            userAgent: request.headers.get('user-agent'),
            url: context?.url || 'unknown'
          }
        })
        
        sentryCaptured = true
        logger.info('Error sent to Sentry', { error: errorMessage, severity })
      } catch (sentryError) {
        logger.warn('Failed to send error to Sentry', {
          error: sentryError instanceof Error ? sentryError.message : String(sentryError)
        })
        // Continue - local logging still works
      }
    } else {
      logger.debug('Sentry not configured, error logged locally only', { error: errorMessage })
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      sentryCaptured
    })
  } catch (error) {
    logger.error('Error logging error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to log error' },
      { status: 500 }
    )
  }
}

