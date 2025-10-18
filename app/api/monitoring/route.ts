import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK: Monitoring endpoints should be protected
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }
    
    // Get system metrics
    const startTime = Date.now()
    
    // Test database connection
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('businesses')
      .select('count(*)')
      .limit(1)

    // Test critical services
    const services = {
      database: !dbError ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development'
    }

    // Check recent errors from audit logs
    const { data: recentErrors, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action_type', 'error')
      .order('created_at', { ascending: false })
      .limit(10)

    const response = NextResponse.json({
      success: true,
      status: 'operational',
      services,
      recentErrors: recentErrors || [],
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    })

    // Add monitoring headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Monitoring endpoints should be protected
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, data, severity = 'info' } = body

    // Log monitoring event
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: null,
        business_id: null,
        action_type: 'monitoring',
        action_details: {
          action,
          data,
          severity,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log monitoring event:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Monitoring event logged',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
