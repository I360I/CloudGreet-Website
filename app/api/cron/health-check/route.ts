import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Send Slack alert if critical services fail
 */
async function sendSlackAlert(
  failedServices: string[],
  healthScore: number,
  errors: Record<string, string>
): Promise<void> {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL
  if (!slackWebhook) {
    return // Slack not configured, skip alert
  }

  try {
    const message = {
      text: `🚨 CloudGreet Health Check Alert`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 CloudGreet Health Check Alert'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Health Score:* ${healthScore}%`
            },
            {
              type: 'mrkdwn',
              text: `*Failed Services:* ${failedServices.length}`
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:* ${new Date().toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Failed Services:*\n${failedServices.map(s => `• ${s}`).join('\n')}`
          }
        },
        ...(Object.keys(errors).length > 0 ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Errors:*\n${Object.entries(errors).map(([s, e]) => `• ${s}: ${e}`).join('\n')}`
          }
        }] : [])
      ]
    }

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })
  } catch (error) {
    logger.error('Failed to send Slack alert', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Get business metrics
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
    const { count: businessCount } = await supabaseAdmin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_completed', true)
    
    metrics.active_businesses = businessCount || 0

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
 * Vercel Cron Job: Automated Health Check
 * 
 * Runs every 12 hours (00:00 and 12:00 UTC)
 * Tests all critical services and stores results
 * Sends alerts if critical services fail
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt', {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting automated health check', {
      timestamp: new Date().toISOString()
    })

    // Run all health checks in parallel
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

    // Build checks object
    const checks: Record<string, HealthCheckResult> = {
      stripe: stripeResult,
      telnyx: telnyxResult,
      retell: retellResult,
      openai: openaiResult,
      resend: resendResult,
      redis: redisResult,
      database: databaseResult,
      transaction_functions: transactionResult,
      job_queue: jobQueueResult,
      tenant_isolation: tenantIsolationResult,
      webhook_signature_verification: webhookSignatureResult,
      jwt_validation: jwtValidationResult
    }

    // Store all results in database
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
    ])

    // Calculate health score
    const healthScore = calculateHealthScore(checks)
    const overallStatus = getOverallStatus(healthScore)

    // Get business metrics
    const metrics = await getBusinessMetrics()

    // Determine failed services (down status, excluding not_configured)
    const failedServices: string[] = []
    const errors: Record<string, string> = {}

    for (const [serviceName, result] of Object.entries(checks)) {
      if (result.status === 'down') {
        failedServices.push(serviceName)
        if (result.error) {
          errors[serviceName] = result.error
        }
      }
    }

    // Critical services that should trigger alerts
    const criticalServices = ['stripe', 'telnyx', 'retell', 'database']
    const criticalFailures = failedServices.filter(s => criticalServices.includes(s))

    // Send alert if critical services fail or health score is low
    if (criticalFailures.length > 0 || healthScore < 70) {
      await sendSlackAlert(failedServices, healthScore, errors)
    }

    logger.info('Automated health check completed', {
      healthScore,
      overallStatus,
      failedServices: failedServices.length,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      health_score: healthScore,
      failed_services: failedServices,
      metrics,
      alert_sent: criticalFailures.length > 0 || healthScore < 70
    })
  } catch (error) {
    logger.error('Cron health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}

