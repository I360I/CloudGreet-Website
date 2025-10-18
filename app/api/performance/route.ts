import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/performance-monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // ADMIN AUTH: Performance metrics should only be visible to admins
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }
    
    const systemHealth = await performanceMonitor.getHealth()
    const recentMetrics = await performanceMonitor.getMetrics()

    return NextResponse.json({
      success: true,
      data: {
        systemHealth,
        recentMetrics: recentMetrics.slice(-100), // Last 100 requests
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get performance metrics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ADMIN AUTH: Only admins should submit performance metrics
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }
    
    const body = await request.json()
    const { metrics } = body

    if (metrics) {
      await performanceMonitor.recordMetrics('performance', metrics)
      return NextResponse.json({
        success: true,
        message: 'Metrics recorded'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Metrics required'
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to record metrics'
    }, { status: 500 })
  }
}
