import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authCheck = requireAdmin(request)
    if (authCheck.error) return authCheck.response

    const startTime = Date.now()

    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('businesses')
      .select('count')
      .limit(1)

    const dbStatus = dbError ? 'error' : 'healthy'
    const dbResponseTime = Date.now() - startTime

    // Check external services
    const serviceChecks = await Promise.allSettled([
      checkOpenAI(),
      checkTelnyx(),
      checkStripe()
    ])

    const [openaiStatus, telnyxStatus, stripeStatus] = serviceChecks.map(result => 
      result.status === 'fulfilled' ? result.value : { status: 'error', error: 'Check failed' }
    )

    // Get system metrics
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, created_at')
    
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const metrics = {
      totalBusinesses: businesses?.length || 0,
      activeBusinesses: businesses?.filter(b => b.subscription_status === 'active').length || 0,
      callsLast24h: calls?.length || 0,
      appointmentsLast24h: appointments?.length || 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }

    const overallStatus = [dbStatus, openaiStatus.status, telnyxStatus.status, stripeStatus.status]
      .every(status => status === 'healthy') ? 'healthy' : 'degraded'

    return NextResponse.json(createSuccessResponse({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbStatus, responseTime: dbResponseTime },
        openai: openaiStatus,
        telnyx: telnyxStatus,
        stripe: stripeStatus
      },
      metrics
    }))

  } catch (error) {
    logger.error('System health check error', { error })
    return NextResponse.json(createErrorResponse('Health check failed'), { status: 500 })
  }
}

async function checkOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    })
    
    return {
      status: response.ok ? 'healthy' : 'error',
      responseTime: Date.now(),
      error: response.ok ? null : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkTelnyx() {
  try {
    const response = await fetch('https://api.telnyx.com/v2/phone_numbers', {
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`
      }
    })
    
    return {
      status: response.ok ? 'healthy' : 'error',
      responseTime: Date.now(),
      error: response.ok ? null : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkStripe() {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    await stripe.customers.list({ limit: 1 })
    
    return {
      status: 'healthy',
      responseTime: Date.now()
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
