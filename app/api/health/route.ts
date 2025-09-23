import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Test database connection
    const { error: dbError } = await supabaseAdmin()
      .from('businesses')
      .select('count')
      .limit(1)
    
    const dbStatus = dbError ? 'unhealthy' : 'healthy'
    const dbResponseTime = Date.now() - startTime
    
    // Test basic system health
    const healthChecks = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        error: dbError?.message || null
      },
      api: {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        error: null
      }
    }
    
    const isHealthy = healthChecks.database.status === 'healthy'
    
    return NextResponse.json({
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      responseTime: Date.now() - startTime
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // POST endpoint for health checks with additional data
  try {
    const body = await request.json()
    
    // Store health check data if provided
    if (body.healthData) {
      await supabaseAdmin()
        .from('system_health')
        .insert({
          status: body.healthData.status || 'unknown',
          details: body.healthData.details || {},
          created_at: new Date().toISOString()
        } as any)
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Health check recorded',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to record health check'
    }, { status: 500 })
  }
}
