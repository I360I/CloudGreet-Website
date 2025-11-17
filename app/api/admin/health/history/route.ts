import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/health/history
 * Get historical health check data for chart
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get hours parameter (default 24)
    const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24', 10)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // Get health checks grouped by timestamp (average health score per hour)
    const { data: healthChecks, error } = await supabaseAdmin
      .from('health_checks')
      .select('created_at, status')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch health check history', {
        error: error.message
      })
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      )
    }

    // Group by hour and calculate average health score
    const hourlyData = new Map<string, { healthy: number; total: number }>()

    healthChecks?.forEach(check => {
      const date = new Date(check.created_at)
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00:00`
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { healthy: 0, total: 0 })
      }
      
      const data = hourlyData.get(hourKey)!
      data.total++
      if (check.status === 'healthy') {
        data.healthy++
      }
    })

    // Convert to array format for chart
    const history = Array.from(hourlyData.entries()).map(([timestamp, data]) => ({
      timestamp,
      health_score: data.total > 0 ? Math.round((data.healthy / data.total) * 100) : 0
    }))

    return NextResponse.json({
      success: true,
      history,
      hours
    })
  } catch (error) {
    logger.error('Health history endpoint failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

