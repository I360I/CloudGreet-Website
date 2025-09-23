import { NextRequest, NextResponse } from 'next/server'
import { healthChecker, logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const healthChecks = await healthChecker.checkExternalServices()
    const isHealthy = Object.values(healthChecks).every(check => check === true)
    
    const status = isHealthy ? 'healthy' : 'unhealthy'
    const statusCode = isHealthy ? 200 : 503
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    }, { status: statusCode })
    
  } catch (error) {
    logger.error('Health check failed', error as Error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log errors from client-side
    if (body.type === 'error') {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'client_error',
          details: {
            error: body.error,
            stack: body.stack,
            componentStack: body.componentStack,
            url: body.url || 'unknown',
            userAgent: body.userAgent || 'unknown'
          },
          created_at: new Date().toISOString()
        })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to log client error', error as Error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
