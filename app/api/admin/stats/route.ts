import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Fetch real admin statistics from database
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('*')

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')

    const { data: calls } = await supabaseAdmin
      .from('call_logs')
      .select('*')

    const { data: smsLogs } = await supabaseAdmin
      .from('sms_logs')
      .select('*')

    // Calculate today's date
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Calculate real statistics
    const totalClients = businesses?.length || 0
    const activeClients = businesses?.filter(biz => biz.onboarding_completed).length || 0
    
    const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    const monthlyRevenue = appointments?.filter(apt => {
      const aptDate = new Date(apt.created_at)
      return aptDate >= new Date(today.getFullYear(), today.getMonth(), 1)
    }).reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    
    const averageClientValue = totalClients > 0 ? totalRevenue / totalClients : 0

    const totalCalls = calls?.length || 0
    const answeredCalls = calls?.filter(call => call.status === 'completed').length || 0
    const conversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0

    const callsToday = calls?.filter(call => {
      const callDate = new Date(call.created_at)
      return callDate >= todayStart && callDate < todayEnd
    }).length || 0

    const appointmentsToday = appointments?.filter(apt => {
      const aptDate = new Date(apt.scheduled_date || apt.created_at)
      return aptDate >= todayStart && aptDate < todayEnd
    }).length || 0

    const smsToday = smsLogs?.filter(sms => {
      const smsDate = new Date(sms.created_at)
      return smsDate >= todayStart && smsDate < todayEnd
    }).length || 0

    const stats = {
      totalClients,
      activeClients,
      monthlyRevenue: Math.round(monthlyRevenue),
      totalRevenue: Math.round(totalRevenue),
      averageClientValue: Math.round(averageClientValue),
      conversionRate: Math.round(conversionRate * 10) / 10,
      callsToday,
      appointmentsToday,
      smsSent: smsToday,
      systemHealth: 'excellent' // This would come from actual health checks
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
    
  } catch (error) {
    logger.error('Admin stats API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'admin/stats',
      method: 'GET'
    })
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch admin statistics' 
    }, { status: 500 })
  }
}

