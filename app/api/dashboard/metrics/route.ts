import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAuth } from '@/lib/auth-middleware'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId || !authResult.businessId) {
      return NextResponse.json({
        totalCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        appointmentsScheduled: 0,
        revenue: 0,
        averageCallDuration: 0,
        conversionRate: 0
      })
    }

    const businessId = authResult.businessId

    // Fetch calls
    const { data: calls, count: totalCalls } = await supabaseAdmin
      .from('calls')
      .select('status, duration', { count: 'exact' })
      .eq('business_id', businessId)

    // Fetch appointments - optimized query
    const { count: appointmentsScheduled } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Calculate metrics with null safety
    const answeredCalls = calls?.filter(c => c?.status === 'completed' || c?.status === 'answered').length || 0
    const missedCalls = calls?.filter(c => c?.status === 'missed' || c?.status === 'no_answer').length || 0
    
    const durations = calls?.map(c => c?.duration || 0).filter(d => d > 0) || []
    const averageCallDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
      : 0

    const conversionRate = totalCalls ? ((appointmentsScheduled || 0) / totalCalls) * 100 : 0

    const avgTicket = CONFIG.BUSINESS.AVERAGE_TICKET
    const closeRate = CONFIG.BUSINESS.CLOSE_RATE
    const revenue = (appointmentsScheduled || 0) * closeRate * avgTicket

    return NextResponse.json({
      totalCalls: totalCalls || 0,
      answeredCalls,
      missedCalls,
      appointmentsScheduled: appointmentsScheduled || 0,
      revenue: Math.round(revenue),
      averageCallDuration,
      conversionRate: Math.round(conversionRate * 10) / 10
    })

  } catch (error) {
    logger.error('Dashboard metrics error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

