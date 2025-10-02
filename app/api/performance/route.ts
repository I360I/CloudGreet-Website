import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/performance-monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
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
