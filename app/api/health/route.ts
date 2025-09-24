import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check without external dependencies
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        server: true,
        api: true
      }
    }, { status: 200 })
    
  } catch (error) {
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
