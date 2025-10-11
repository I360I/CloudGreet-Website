import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const healthChecks = {
    database: { status: 'unknown', responseTime: 0, error: null },
    stripe: { status: 'unknown', responseTime: 0, error: null },
    telnyx: { status: 'unknown', responseTime: 0, error: null },
    openai: { status: 'unknown', responseTime: 0, error: null },
    email: { status: 'unknown', responseTime: 0, error: null }
  }

  try {
    // Check database connection
    try {
      const dbStart = Date.now()
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase.from('businesses').select('count').limit(1)
      healthChecks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        error: null
      }
    } catch (error) {
      healthChecks.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check Stripe API
    try {
      const stripeStart = Date.now()
      const response = await fetch('https://api.stripe.com/v1/charges?limit=1', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      })
      healthChecks.stripe = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - stripeStart,
        error: response.ok ? null : `HTTP ${response.status}`
      }
    } catch (error) {
      healthChecks.stripe = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check Telnyx API
    try {
      const telnyxStart = Date.now()
      const response = await fetch('https://api.telnyx.com/v2/connections', {
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        },
      })
      healthChecks.telnyx = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - telnyxStart,
        error: response.ok ? null : `HTTP ${response.status}`
      }
    } catch (error) {
      healthChecks.telnyx = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check OpenAI API
    try {
      const openaiStart = Date.now()
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      })
      healthChecks.openai = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - openaiStart,
        error: response.ok ? null : `HTTP ${response.status}`
      }
    } catch (error) {
      healthChecks.openai = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Check email configuration
    try {
      const emailStart = Date.now()
      const { sendContactEmail } = await import('@/lib/email')
      // Test email configuration without sending
      healthChecks.email = {
        status: process.env.SMTP_USER && process.env.SMTP_PASS ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - emailStart,
        error: process.env.SMTP_USER && process.env.SMTP_PASS ? null : 'SMTP credentials not configured'
      }
    } catch (error) {
      healthChecks.email = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    const overallStatus = Object.values(healthChecks).every(check => check.status === 'healthy') ? 'healthy' : 'degraded'
    const totalResponseTime = Date.now() - startTime

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      dependencies: healthChecks
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      dependencies: healthChecks
    }, { status: 500 })
  }
}
