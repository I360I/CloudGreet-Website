import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health Check Endpoint
 * 
 * Returns application health status including:
 * - Application status
 * - Database connectivity
 * - External service status (optional)
 * 
 * Used by:
 * - Vercel health checks
 * - Monitoring systems
 * - Load balancers
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const checks: Record<string, unknown> = {
    SUPABASE: isSupabaseConfigured(),
    RETELL_API_KEY: !!(process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY),
    TELNYX_API_KEY: !!process.env.TELNYX_API_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  }

  // Test database connectivity
  let dbStatus = 'unknown'
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin.from('businesses').select('id').limit(1)
      dbStatus = error ? 'error' : 'connected'
      if (error) {
        checks.DATABASE_ERROR = error.message
      }
    } else {
      dbStatus = 'not_configured'
    }
  } catch (error) {
    dbStatus = 'error'
    checks.DATABASE_ERROR = error instanceof Error ? error.message : 'Unknown error'
  }

  checks.DATABASE = dbStatus

  // Check Redis (optional)
  if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
    checks.REDIS = 'configured'
  } else {
    checks.REDIS = 'not_configured'
  }

  // Check Sentry (optional)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    checks.SENTRY = 'configured'
  } else {
    checks.SENTRY = 'not_configured'
  }

  // Determine overall health
  const isHealthy = 
    checks.SUPABASE === true &&
    dbStatus === 'connected' &&
    checks.RETELL_API_KEY === true &&
    checks.TELNYX_API_KEY === true &&
    checks.STRIPE_SECRET_KEY === true

  const responseTime = Date.now() - startTime

  const response = {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    responseTime: `${responseTime}ms`,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }

  // Log health check
  logger.info('Health check', {
    status: response.status,
    dbStatus,
    responseTime
  })

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${responseTime}ms`
    }
  })
}
