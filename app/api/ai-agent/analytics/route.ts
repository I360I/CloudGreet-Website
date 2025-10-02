import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get call analytics
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('call_logs')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (callsError) {
      logger.error('Error fetching call analytics', { 
        error: callsError, 
        requestId,
        businessId,
        userId
      })
    }

    // Get appointment analytics
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (appointmentsError) {
      logger.error('Error fetching appointment analytics', { 
        error: appointmentsError, 
        requestId,
        businessId,
        userId
      })
    }

    // Get SMS analytics
    const { data: sms, error: smsError } = await supabaseAdmin
      .from('sms_logs')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (smsError) {
      logger.error('Error fetching SMS analytics', { 
        error: smsError, 
        requestId,
        businessId,
        userId
      })
    }

    // Calculate metrics
    const totalCalls = calls?.length || 0
    const answeredCalls = calls?.filter(call => call.status === 'answered').length || 0
    const missedCalls = calls?.filter(call => call.status === 'missed').length || 0
    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0
    const totalSms = sms?.length || 0
    const sentSms = sms?.filter(msg => msg.direction === 'outbound').length || 0

    // Calculate conversion rates
    const callToAppointmentRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0
    const appointmentCompletionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0

    // Calculate average call duration
    const avgCallDuration = calls?.length > 0 
      ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length 
      : 0

    // Calculate satisfaction scores
    const satisfactionScores = calls?.filter(call => call.satisfaction_score !== null).map(call => call.satisfaction_score) || []
    const avgSatisfaction = satisfactionScores.length > 0 
      ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length 
      : 0

    // Get daily breakdown
    const dailyBreakdown = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCalls = calls?.filter(call => 
        call.created_at.startsWith(dateStr)
      ).length || 0
      
      const dayAppointments = appointments?.filter(apt => 
        apt.created_at.startsWith(dateStr)
      ).length || 0
      
      dailyBreakdown.push({
        date: dateStr,
        calls: dayCalls,
        appointments: dayAppointments
      })
    }

    // Get top performing hours
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
      const hourCalls = calls?.filter(call => {
        const callHour = new Date(call.created_at).getHours()
        return callHour === hour
      }).length || 0
      
      return { hour, calls: hourCalls }
    }).sort((a, b) => b.calls - a.calls).slice(0, 5)

    // Get common call outcomes
    const outcomes = calls?.reduce((acc, call) => {
      const outcome = call.outcome || 'unknown'
      acc[outcome] = (acc[outcome] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    logger.info('AI agent analytics generated', {
      requestId,
      businessId,
      userId,
      timeframe,
      totalCalls,
      totalAppointments,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        summary: {
          totalCalls,
          answeredCalls,
          missedCalls,
          totalAppointments,
          completedAppointments,
          totalSms,
          sentSms,
          callToAppointmentRate: Math.round(callToAppointmentRate * 100) / 100,
          appointmentCompletionRate: Math.round(appointmentCompletionRate * 100) / 100,
          avgCallDuration: Math.round(avgCallDuration),
          avgSatisfaction: Math.round(avgSatisfaction * 100) / 100
        },
        dailyBreakdown,
        topHours: hourlyStats,
        outcomes,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('AI agent analytics error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id'),
      duration: Date.now() - startTime
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to generate analytics'
    }, { status: 500 })
  }
}
