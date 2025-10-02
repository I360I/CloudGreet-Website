import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Mock system health data - in production, check actual system status
    const systemHealth = {
      services: {
        api: {
          status: 'healthy',
          responseTime: 120,
          uptime: 99.9,
          lastCheck: new Date().toISOString()
        },
        database: {
          status: 'healthy',
          connectionCount: 45,
          queryTime: 25,
          uptime: 99.8,
          lastCheck: new Date().toISOString()
        },
        telynyx: {
          status: 'healthy',
          callsProcessed: 2340,
          smsProcessed: 3240,
          uptime: 99.7,
          lastCheck: new Date().toISOString()
        },
        openai: {
          status: 'healthy',
          requestsProcessed: 1890,
          averageResponseTime: 850,
          uptime: 99.5,
          lastCheck: new Date().toISOString()
        },
        supabase: {
          status: 'healthy',
          activeConnections: 23,
          storageUsed: '2.4GB',
          uptime: 99.9,
          lastCheck: new Date().toISOString()
        }
      },
      alerts: [
        {
          id: 'alert_1',
          type: 'warning',
          message: 'High memory usage detected on API server',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          resolved: false
        }
      ],
      metrics: {
        totalRequests: 45600,
        errorRate: 0.1,
        averageResponseTime: 180,
        activeUsers: 127,
        systemLoad: 65
      }
    }

    return NextResponse.json({
      success: true,
      data: systemHealth
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check system health' 
    }, { status: 500 })
  }
}

