import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '@/lib/validation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check system health
    const healthChecks = {
      database: { status: 'unknown', response_time: 0 },
      telnyx: { status: 'unknown', response_time: 0 },
      openai: { status: 'unknown', response_time: 0 },
      stripe: { status: 'unknown', response_time: 0 },
      resend: { status: 'unknown', response_time: 0 }
    }

    // Test database connection
    const dbStart = Date.now()
    try {
      const { error } = await supabase.from('businesses').select('id').limit(1)
      healthChecks.database.status = error ? 'error' : 'healthy'
      healthChecks.database.response_time = Date.now() - dbStart
    } catch (error) {
      healthChecks.database.status = 'error'
    }

    // Test Telnyx API
    const telnyxStart = Date.now()
    try {
      const response = await fetch('https://api.telnyx.com/v2/connections', {
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      healthChecks.telnyx.status = response.ok ? 'healthy' : 'error'
      healthChecks.telnyx.response_time = Date.now() - telnyxStart
    } catch (error) {
      healthChecks.telnyx.status = 'error'
    }

    // Test OpenAI API
    const openaiStart = Date.now()
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      healthChecks.openai.status = response.ok ? 'healthy' : 'error'
      healthChecks.openai.response_time = Date.now() - openaiStart
    } catch (error) {
      healthChecks.openai.status = 'error'
    }

    // Test Stripe API
    const stripeStart = Date.now()
    try {
      const response = await fetch('https://api.stripe.com/v1/charges?limit=1', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      healthChecks.stripe.status = response.ok ? 'healthy' : 'error'
      healthChecks.stripe.response_time = Date.now() - stripeStart
    } catch (error) {
      healthChecks.stripe.status = 'error'
    }

    // Test Resend API
    const resendStart = Date.now()
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      healthChecks.resend.status = response.ok ? 'healthy' : 'error'
      healthChecks.resend.response_time = Date.now() - resendStart
    } catch (error) {
      healthChecks.resend.status = 'error'
    }

    // Calculate overall health score
    const healthyServices = Object.values(healthChecks).filter(check => check.status === 'healthy').length
    const totalServices = Object.keys(healthChecks).length
    const healthScore = Math.round((healthyServices / totalServices) * 100)

    return NextResponse.json({
      health_score: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'unhealthy',
      services: healthChecks,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health monitoring API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
