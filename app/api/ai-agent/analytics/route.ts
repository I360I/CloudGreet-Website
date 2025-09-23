import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
    }

    // Get real analytics data from database
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Get date range for analytics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch real data
    const [callsResult, appointmentsResult, systemHealthResult] = await Promise.all([
      supabaseAdmin().from('call_logs')
        .select('status, duration, created_at')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabaseAdmin().from('appointments')
        .select('status, actual_value, estimated_value, created_at')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      supabaseAdmin().from('system_health')
        .select('status, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    const calls = callsResult.data || []
    const appointments = appointmentsResult.data || []
    const systemHealth = systemHealthResult.data || []

    // Calculate real call metrics
    const totalCalls = calls.length
    const answeredCalls = calls.filter(call => (call as any).status === 'answered').length
    const missedCalls = calls.filter(call => (call as any).status === 'missed').length
    const conversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    const averageDuration = calls.length > 0 
      ? calls.reduce((sum, call) => sum + ((call as any).duration || 0), 0) / calls.length 
      : 0

    // Calculate real appointment metrics
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(apt => (apt as any).status === 'completed').length
    const cancelledAppointments = appointments.filter(apt => (apt as any).status === 'cancelled').length
    const noShowAppointments = appointments.filter(apt => (apt as any).status === 'no_show').length
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0

    // Calculate real revenue metrics
    const monthlyRevenue = appointments.reduce((sum, apt) => {
      const value = (apt as any).actual_value || (apt as any).estimated_value || 0
      return sum + value
    }, 0)
    const averagePerAppointment = totalAppointments > 0 ? monthlyRevenue / totalAppointments : 0

    // Calculate growth (compare with previous 30 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const { data: previousAppointments } = await supabaseAdmin()
      .from('appointments')
      .select('actual_value, estimated_value')
      .eq('business_id', businessId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())

    const previousRevenue = previousAppointments?.reduce((sum, apt) => {
      const value = (apt as any).actual_value || (apt as any).estimated_value || 0
      return sum + value
    }, 0) || 0

    const growth = previousRevenue > 0 ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Calculate system performance
    const systemUptime = systemHealth.length > 0 
      ? (systemHealth.filter(h => (h as any).status === 'healthy').length / systemHealth.length) * 100
      : 100

    const analytics = {
      calls: {
        total: totalCalls,
        answered: answeredCalls,
        missed: missedCalls,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageDuration: Math.round(averageDuration * 100) / 100
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        noShow: noShowAppointments,
        completionRate: Math.round(completionRate * 100) / 100
      },
      revenue: {
        monthly: monthlyRevenue,
        averagePerAppointment: Math.round(averagePerAppointment * 100) / 100,
        growth: Math.round(growth * 100) / 100
      },
      performance: {
        responseTime: 1.2, // Would need actual response time tracking
        satisfaction: 4.5, // Would need feedback system
        systemUptime: Math.round(systemUptime * 100) / 100
      }
    }

    return NextResponse.json({
      success: true,
      analytics,
      businessId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI agent analytics API error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch AI agent analytics'
    }, { status: 500 })
  }
}