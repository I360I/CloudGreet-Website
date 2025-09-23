import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/performance-monitoring'

export async function GET(request: NextRequest) {
  try {
    const summary = performanceMonitor.getPerformanceSummary()
    const activeAlerts = performanceMonitor.getActiveAlerts()
    const recentMetrics = performanceMonitor.getMetrics(3600000) // Last hour

    return NextResponse.json({
      success: true,
      data: {
        summary,
        activeAlerts,
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
    const { alertId } = body

    if (alertId) {
      performanceMonitor.resolveAlert(alertId)
      return NextResponse.json({
        success: true,
        message: 'Alert resolved'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Alert ID required'
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to resolve alert'
    }, { status: 500 })
  }
}
