import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import {
  testStripeAPI,
  testTelnyxAPI,
  testRetellAPI,
  testOpenAIAPI,
  testResendAPI,
  testRedisConnection,
  testDatabaseConnection,
  testTransactionFunctions,
  testJobQueue,
  testTenantIsolation,
  testWebhookSignatureVerification,
  testJWTValidation,
  storeHealthCheck,
  calculateHealthScore,
  getOverallStatus,
  type HealthCheckResult
} from '@/lib/health-check'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// In-memory cache for health check results (60s TTL)
interface CachedResult {
  data: any
  timestamp: number
}

let cache: CachedResult | null = null
const CACHE_TTL_MS = 60000 // 60 seconds

/**
 * Get business metrics (active businesses, subscriptions, failed jobs)
 */
async function getBusinessMetrics(): Promise<{
  active_businesses: number
  active_subscriptions: number
  failed_jobs: number
}> {
  const metrics = {
    active_businesses: 0,
    active_subscriptions: 0,
    failed_jobs: 0
  }

  try {
    // Count active businesses
    const { count: businessCount } = await supabaseAdmin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_completed', true)
    
    metrics.active_businesses = businessCount || 0

    // Count active Stripe subscriptions
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any })
        const subscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100
        })
        metrics.active_subscriptions = subscriptions.data.length
      }
    } catch (error) {
      logger.warn('Failed to fetch Stripe subscriptions count', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Count failed jobs
    const { count: failedJobsCount } = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
    
    metrics.failed_jobs = failedJobsCount || 0
  } catch (error) {
    logger.error('Failed to fetch business metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return metrics
}

/**
 * Run all health checks in parallel
 */
async function runAllHealthChecks(storeResults: boolean = false): Promise<{
  checks: Record<string, HealthCheckResult & { last_checked: string }>
  metrics: { active_businesses: number; active_subscriptions: number; failed_jobs: number }
  health_score: number
  overall_status: 'healthy' | 'degraded' | 'down'
}> {
  // Run all Tier 1-3 tests in parallel
  const [
    stripeResult,
    telnyxResult,
    retellResult,
    openaiResult,
    resendResult,
    redisResult,
    databaseResult,
    transactionResult,
    jobQueueResult,
    tenantIsolationResult,
    webhookSignatureResult,
    jwtValidationResult
  ] = await Promise.all([
    testStripeAPI(),
    testTelnyxAPI(),
    testRetellAPI(),
    testOpenAIAPI(),
    testResendAPI(),
    testRedisConnection(),
    testDatabaseConnection(),
    testTransactionFunctions(),
    testJobQueue(),
    testTenantIsolation(),
    testWebhookSignatureVerification(),
    testJWTValidation()
  ])

  const timestamp = new Date().toISOString()

  // Build checks object
  const checks: Record<string, HealthCheckResult & { last_checked: string }> = {
    stripe: { ...stripeResult, last_checked: timestamp },
    telnyx: { ...telnyxResult, last_checked: timestamp },
    retell: { ...retellResult, last_checked: timestamp },
    openai: { ...openaiResult, last_checked: timestamp },
    resend: { ...resendResult, last_checked: timestamp },
    redis: { ...redisResult, last_checked: timestamp },
    database: { ...databaseResult, last_checked: timestamp },
    transaction_functions: { ...transactionResult, last_checked: timestamp },
    job_queue: { ...jobQueueResult, last_checked: timestamp },
    tenant_isolation: { ...tenantIsolationResult, last_checked: timestamp },
    webhook_signature_verification: { ...webhookSignatureResult, last_checked: timestamp },
    jwt_validation: { ...jwtValidationResult, last_checked: timestamp }
  }

  // Get business metrics
  const metrics = await getBusinessMetrics()

  // Calculate health score
  const health_score = calculateHealthScore(checks)
  const overall_status = getOverallStatus(health_score)

  // Store results in database if requested
  if (storeResults) {
    await Promise.all([
      storeHealthCheck('stripe', stripeResult, 'api'),
      storeHealthCheck('telnyx', telnyxResult, 'api'),
      storeHealthCheck('retell', retellResult, 'api'),
      storeHealthCheck('openai', openaiResult, 'api'),
      storeHealthCheck('resend', resendResult, 'api'),
      storeHealthCheck('redis', redisResult, 'api'),
      storeHealthCheck('database', databaseResult, 'api'),
      storeHealthCheck('transaction_functions', transactionResult, 'workflow'),
      storeHealthCheck('job_queue', jobQueueResult, 'performance'),
      storeHealthCheck('tenant_isolation', tenantIsolationResult, 'security'),
      storeHealthCheck('webhook_signature_verification', webhookSignatureResult, 'security'),
      storeHealthCheck('jwt_validation', jwtValidationResult, 'security')
    ]).catch(error => {
      logger.error('Failed to store some health checks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    })
  }

  return {
    checks,
    metrics,
    health_score,
    overall_status
  }
}

/**
 * GET /api/admin/health
 * Comprehensive health check endpoint with real API tests
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if we should bypass cache
    const bypassCache = request.nextUrl.searchParams.get('force') === 'true'
    const now = Date.now()

    // Check cache (if not bypassing)
    if (!bypassCache && cache && (now - cache.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        cache_age_ms: now - cache.timestamp
      }, {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-Cache': 'HIT'
        }
      })
    }

    // Run all health checks
    const result = await runAllHealthChecks(false) // Don't store on every API call, only on cron

    const response = {
      timestamp: new Date().toISOString(),
      overall_status: result.overall_status,
      health_score: result.health_score,
      checks: result.checks,
      metrics: result.metrics,
      cached: false
    }

    // Update cache
    cache = {
      data: response,
      timestamp: now
    }
    // Note: In a real multi-instance environment, use Redis for cache
    // For now, in-memory cache works for single-instance deployments

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Health check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/health
 * Force run health checks and store results (bypasses cache)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run all health checks and store results
    const result = await runAllHealthChecks(true)

    const response = {
      timestamp: new Date().toISOString(),
      overall_status: result.overall_status,
      health_score: result.health_score,
      checks: result.checks,
      metrics: result.metrics,
      stored: true
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Health check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

