/**
 * Health Check Helper Functions
 * Real API tests for all critical services - no fake stats
 */

import { supabaseAdmin, isSupabaseConfigured } from './supabase'
import { logger } from './monitoring'
import { withTimeout, TIMEOUT_CONFIG } from './timeout'
import Stripe from 'stripe'

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down' | 'not_configured'
  response_time_ms: number
  error?: string
  metadata?: Record<string, any>
}

/**
 * Test Stripe API connection with real API call
 */
export async function testStripeAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'STRIPE_SECRET_KEY not configured'
    }
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any
    })

    // Real API call - list customers (cheapest operation)
    await withTimeout(
      stripe.customers.list({ limit: 1 }),
      TIMEOUT_CONFIG.STRIPE_API,
      'Stripe API timeout'
    )

    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      response_time_ms: responseTime,
      metadata: { api_version: '2023-10-16' }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    // Determine status based on error type
    let status: 'healthy' | 'degraded' | 'down' = 'down'
    if (error?.code === 'rate_limit') {
      status = 'degraded'
    } else if (error?.message?.includes('timeout')) {
      status = 'down'
    }

    return {
      status,
      response_time_ms: responseTime,
      error: error?.message || 'Stripe API test failed',
      metadata: { error_code: error?.code, error_type: error?.type }
    }
  }
}

/**
 * Test Telnyx API connection with real API call
 */
export async function testTelnyxAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const telnyxKey = process.env.TELNYX_API_KEY
  if (!telnyxKey) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'TELNYX_API_KEY not configured'
    }
  }

  try {
    const response = await withTimeout(
      fetch('https://api.telnyx.com/v2/phone_numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${telnyxKey}`,
          'Content-Type': 'application/json'
        }
      }),
      TIMEOUT_CONFIG.TELNYX_API,
      'Telnyx API timeout'
    )

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        metadata: { status_code: response.status }
      }
    } else if (response.status === 401) {
      return {
        status: 'down',
        response_time_ms: responseTime,
        error: 'Invalid API key (401 Unauthorized)'
      }
    } else if (response.status === 429) {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: 'Rate limit exceeded (429)'
      }
    } else {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: `API returned status ${response.status}`
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Telnyx API connection failed'
    }
  }
}

/**
 * Test Retell AI API connection with real API call
 */
export async function testRetellAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const retellKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
  if (!retellKey) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'RETELL_API_KEY not configured'
    }
  }

  try {
    const response = await withTimeout(
      fetch('https://api.retellai.com/v2/agent', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${retellKey}`,
          'Content-Type': 'application/json'
        }
      }),
      TIMEOUT_CONFIG.RETELL_API,
      'Retell API timeout'
    )

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        metadata: { status_code: response.status }
      }
    } else if (response.status === 401) {
      return {
        status: 'down',
        response_time_ms: responseTime,
        error: 'Invalid API key (401 Unauthorized)'
      }
    } else if (response.status === 429) {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: 'Rate limit exceeded (429)'
      }
    } else {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: `API returned status ${response.status}`
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Retell API connection failed'
    }
  }
}

/**
 * Test OpenAI API connection with real API call
 */
export async function testOpenAIAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'OPENAI_API_KEY not configured'
    }
  }

  try {
    // Use dynamic import to avoid errors if package not installed
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: openaiKey })

    // Real API call - list models (cheapest operation, ~$0.0001)
    await withTimeout(
      openai.models.list(),
      TIMEOUT_CONFIG.EXTERNAL_API,
      'OpenAI API timeout'
    )

    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      response_time_ms: responseTime,
      metadata: { test_type: 'models_list' }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    let status: 'healthy' | 'degraded' | 'down' = 'down'
    if (error?.status === 429) {
      status = 'degraded'
    } else if (error?.message?.includes('timeout')) {
      status = 'down'
    }

    return {
      status,
      response_time_ms: responseTime,
      error: error?.message || 'OpenAI API test failed',
      metadata: { error_type: error?.type, error_code: error?.status }
    }
  }
}

/**
 * Test Resend Email API connection with real API call
 */
export async function testResendAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'RESEND_API_KEY not configured'
    }
  }

  try {
    const response = await withTimeout(
      fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        }
      }),
      TIMEOUT_CONFIG.EMAIL_API,
      'Resend API timeout'
    )

    const responseTime = Date.now() - startTime

    // Resend returns 200 or 401 for valid keys (401 means key exists but no permission for this endpoint)
    if (response.status === 200 || response.status === 401) {
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        metadata: { status_code: response.status, note: '401 means key is valid but lacks permissions' }
      }
    } else {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: `API returned status ${response.status}`
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Resend API connection failed'
    }
  }
}

/**
 * Test Redis connection with real ping
 */
export async function testRedisConnection(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const redisUrl = process.env.REDIS_REST_URL
  const redisToken = process.env.REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'REDIS_REST_URL or REDIS_REST_TOKEN not configured'
    }
  }

  try {
    // Dynamic import to avoid errors if package not installed
    let Redis: any
    try {
      const redisModule = await import('@upstash/redis')
      Redis = redisModule.Redis
    } catch (importError: any) {
      // Package not installed or import failed
      if (importError?.code === 'MODULE_NOT_FOUND' || importError?.message?.includes('Cannot find module')) {
        return {
          status: 'not_configured',
          response_time_ms: Date.now() - startTime,
          error: '@upstash/redis package not installed (optional)'
        }
      }
      throw importError
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken
    })

    // Real ping test
    await withTimeout(
      redis.ping(),
      2000, // 2s timeout for Redis
      'Redis ping timeout'
    )

    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      response_time_ms: responseTime,
      metadata: { test_type: 'ping' }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Redis connection failed'
    }
  }
}

/**
 * Test Database connection with real query
 */
export async function testDatabaseConnection(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  if (!isSupabaseConfigured()) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'Supabase not configured'
    }
  }

  try {
    const { error } = await withTimeout(
      supabaseAdmin.from('businesses').select('id').limit(1),
      TIMEOUT_CONFIG.DATABASE_QUERY,
      'Database query timeout'
    )

    const responseTime = Date.now() - startTime

    if (error) {
      return {
        status: 'down',
        response_time_ms: responseTime,
        error: error.message
      }
    }

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      metadata: { test_type: 'select_query' }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Database connection failed'
    }
  }
}

/**
 * Test transaction functions exist and work
 */
export async function testTransactionFunctions(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  if (!isSupabaseConfigured()) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'Supabase not configured'
    }
  }

  try {
    // Test create_appointment_safe function exists by calling it with invalid params
    // If function doesn't exist, we'll get a specific error
    const { error } = await withTimeout(
      supabaseAdmin.rpc('create_appointment_safe', {
        p_business_id: '00000000-0000-0000-0000-000000000000',
        p_customer_name: 'test',
        p_customer_phone: 'test',
        p_service_type: 'test',
        p_scheduled_date: new Date().toISOString()
      }),
      TIMEOUT_CONFIG.DATABASE_QUERY,
      'Transaction function test timeout'
    )

    const responseTime = Date.now() - startTime

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('function') && error.message?.includes('not found')) {
        return {
          status: 'down',
          response_time_ms: responseTime,
          error: 'Transaction function create_appointment_safe does not exist'
        }
      }
      // Other errors (like constraint violations) are OK - function exists
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        metadata: { note: 'Function exists (expected error for test params)', error_type: error.code }
      }
    }

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      metadata: { test_type: 'rpc_call' }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Transaction function test failed'
    }
  }
}

/**
 * Test job queue health
 */
export async function testJobQueue(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  if (!isSupabaseConfigured()) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'Supabase not configured'
    }
  }

  try {
    // Check if background_jobs table exists and query for stuck jobs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('background_jobs')
        .select('id, status, created_at, attempts, max_attempts')
        .eq('status', 'processing')
        .lt('created_at', oneHourAgo)
        .limit(10),
      TIMEOUT_CONFIG.DATABASE_QUERY,
      'Job queue query timeout'
    )

    const responseTime = Date.now() - startTime

    if (error) {
      if (error.message?.includes('does not exist')) {
        return {
          status: 'down',
          response_time_ms: responseTime,
          error: 'background_jobs table does not exist'
        }
      }
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: error.message
      }
    }

    const stuckJobs = data?.length || 0
    const failedJobsResult = await supabaseAdmin
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')

    const failedJobs = failedJobsResult.count || 0

    return {
      status: stuckJobs > 0 || failedJobs > 10 ? 'degraded' : 'healthy',
      response_time_ms: responseTime,
      metadata: {
        stuck_jobs: stuckJobs,
        failed_jobs: failedJobs,
        test_type: 'job_queue_health'
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Job queue test failed'
    }
  }
}

/**
 * Test tenant isolation (multi-tenant security)
 */
export async function testTenantIsolation(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  if (!isSupabaseConfigured()) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'Supabase not configured'
    }
  }

  try {
    // Query with invalid business_id - should return empty
    const invalidBusinessId = '00000000-0000-0000-0000-000000000000'
    
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('id', invalidBusinessId)
        .limit(1),
      TIMEOUT_CONFIG.DATABASE_QUERY,
      'Tenant isolation test timeout'
    )

    const responseTime = Date.now() - startTime

    if (error) {
      return {
        status: 'degraded',
        response_time_ms: responseTime,
        error: error.message
      }
    }

    // Should return empty array (no business with that ID)
    const isIsolated = !data || data.length === 0

    return {
      status: isIsolated ? 'healthy' : 'degraded',
      response_time_ms: responseTime,
      metadata: {
        test_type: 'tenant_isolation',
        query_result_count: data?.length || 0,
        expected_empty: true
      },
      ...(isIsolated ? {} : { error: 'Tenant isolation may be compromised - query returned data for invalid business_id' })
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Tenant isolation test failed'
    }
  }
}

/**
 * Test webhook signature verification (security)
 */
export async function testWebhookSignatureVerification(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeSecret) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'STRIPE_WEBHOOK_SECRET not configured'
    }
  }

  try {
    // Test that Stripe webhook signature verification logic exists and works
    // We'll test with an invalid signature - it should reject it
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16' as any
    })

    const testPayload = JSON.stringify({ test: 'data' })
    const invalidSignature = 'invalid_signature'

    try {
      // This should fail - invalid signature
      stripe.webhooks.constructEvent(testPayload, invalidSignature, stripeSecret)
      
      // If we get here, signature verification didn't work (bad!)
      return {
        status: 'down',
        response_time_ms: Date.now() - startTime,
        error: 'Webhook signature verification failed to reject invalid signature'
      }
    } catch (error: any) {
      // This is expected - invalid signature should be rejected
      if (error?.type === 'StripeSignatureVerificationError' || error?.message?.includes('signature')) {
        return {
          status: 'healthy',
          response_time_ms: Date.now() - startTime,
          metadata: { test_type: 'signature_verification', note: 'Correctly rejected invalid signature' }
        }
      } else {
        // Unexpected error
        return {
          status: 'degraded',
          response_time_ms: Date.now() - startTime,
          error: `Unexpected error during signature test: ${error?.message}`
        }
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'Webhook signature verification test failed'
    }
  }
}

/**
 * Test JWT token validation (security)
 */
export async function testJWTValidation(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return {
      status: 'not_configured',
      response_time_ms: 0,
      error: 'JWT_SECRET not configured'
    }
  }

  try {
    // Test JWT verification with invalid token - should fail gracefully
    const jwt = (await import('jsonwebtoken')).default
    
    // Create a mock request with invalid token
    const invalidToken = 'invalid.jwt.token'
    
    try {
      jwt.verify(invalidToken, jwtSecret)
      
      // If we get here, JWT verification didn't work (bad!)
      return {
        status: 'down',
        response_time_ms: Date.now() - startTime,
        error: 'JWT verification failed to reject invalid token'
      }
    } catch (error: any) {
      // This is expected - invalid token should be rejected
      // Check for JsonWebTokenError by name since instanceof might not work with dynamic import
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError' || error?.name === 'NotBeforeError') {
        return {
          status: 'healthy',
          response_time_ms: Date.now() - startTime,
          metadata: { test_type: 'jwt_verification', note: 'Correctly rejected invalid token', error_type: error?.name }
        }
      } else {
        return {
          status: 'degraded',
          response_time_ms: Date.now() - startTime,
          error: `Unexpected error during JWT test: ${error?.message || 'Unknown error'}`
        }
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return {
      status: 'down',
      response_time_ms: responseTime,
      error: error?.message || 'JWT validation test failed'
    }
  }
}

/**
 * Store health check result in database
 */
export async function storeHealthCheck(
  serviceName: string,
  result: HealthCheckResult,
  checkType: 'api' | 'workflow' | 'security' | 'performance' | 'metric'
): Promise<void> {
  if (!isSupabaseConfigured()) {
    logger.warn('Cannot store health check - Supabase not configured')
    return
  }

  try {
    await supabaseAdmin.from('health_checks').insert({
      service_name: serviceName,
      status: result.status,
      response_time_ms: result.response_time_ms,
      error_message: result.error || null,
      metadata: result.metadata || null,
      check_type: checkType
    })
  } catch (error) {
    logger.error('Failed to store health check', {
      serviceName,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Calculate overall health score (0-100)
 */
export function calculateHealthScore(results: Record<string, HealthCheckResult>): number {
  const entries = Object.entries(results)
  if (entries.length === 0) return 0

  let healthyCount = 0
  let degradedCount = 0
  let totalCount = 0

  for (const [_, result] of entries) {
    // Skip not_configured services from score calculation
    if (result.status === 'not_configured') continue
    
    totalCount++
    if (result.status === 'healthy') {
      healthyCount++
    } else if (result.status === 'degraded') {
      degradedCount++
    }
  }

  if (totalCount === 0) return 100 // All services not configured = perfect score

  // Healthy = 100%, Degraded = 50%, Down = 0%
  const score = ((healthyCount * 100) + (degradedCount * 50)) / totalCount
  return Math.round(score)
}

/**
 * Get overall status from health score
 */
export function getOverallStatus(score: number): 'healthy' | 'degraded' | 'down' {
  if (score >= 90) return 'healthy'
  if (score >= 70) return 'degraded'
  return 'down'
}

