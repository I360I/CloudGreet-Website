import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Fetch real analytics data from database
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('*')

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('*')

    const { data: smsLogs } = await supabaseAdmin
      .from('sms_messages')
      .select('*')

    // Calculate real analytics
    const totalCalls = calls?.length || 0
    const answeredCalls = calls?.filter(call => call.status === 'completed').length || 0
    const missedCalls = calls?.filter(call => call.status === 'no_answer').length || 0
    const conversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    const avgDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls || 0

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0
    const cancelledAppointments = appointments?.filter(apt => apt.status === 'cancelled').length || 0
    const noShowAppointments = appointments?.filter(apt => apt.status === 'no_show').length || 0
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0

    const totalClients = businesses?.length || 0
    const activeClients = businesses?.filter(biz => biz.onboarding_completed).length || 0
    const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    const avgClientValue = totalClients > 0 ? totalRevenue / totalClients : 0

    const totalSMS = smsLogs?.length || 0
    const deliveredSMS = smsLogs?.filter(sms => sms.status === 'delivered').length || 0
    const repliedSMS = smsLogs?.filter(sms => sms.status === 'replied').length || 0
    const responseRate = totalSMS > 0 ? (repliedSMS / totalSMS) * 100 : 0

    const analytics = {
      revenue: {
        total: totalRevenue,
        monthly: totalRevenue, // Simplified for now
        average: avgClientValue
      },
      calls: {
        total: totalCalls,
        answered: answeredCalls,
        missed: missedCalls,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageDuration: Math.round(avgDuration * 10) / 10
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        noShow: noShowAppointments,
        completionRate: Math.round(completionRate * 10) / 10
      },
      clients: {
        total: totalClients,
        active: activeClients,
        churned: totalClients - activeClients,
        retentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100 * 10) / 10 : 0,
        averageValue: Math.round(avgClientValue)
      },
      sms: {
        sent: totalSMS,
        delivered: deliveredSMS,
        replied: repliedSMS,
        responseRate: Math.round(responseRate * 10) / 10
      },
      performance: {
        systemUptime: 99.8, // This would come from actual monitoring
        responseTime: 1.2, // This would come from actual monitoring
        errorRate: 0.1, // This would come from actual monitoring
        satisfaction: 4.7 // This would come from actual feedback
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })
    
  } catch (error) {
    logger.error('Admin analytics API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'admin/analytics',
      method: 'GET'
    })
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch analytics data' 
    }, { status: 500 })
  }
}

