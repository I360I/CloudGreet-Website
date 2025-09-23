import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Fetch real data from Supabase with proper error handling
    const { data: businesses, error: businessesError } = await supabaseAdmin
      .from('businesses')
      .select('*')

    if (businessesError) {
      // Console error removed for production
      // Return empty stats if database not ready yet
      return NextResponse.json({
        totalClients: 0,
        activeClients: 0,
        monthlyRevenue: 0,
        callsToday: 0,
        appointmentsToday: 0,
        smsSent: 0,
        averageClientValue: 0,
        conversionRate: 0,
        totalRevenue: 0,
        isLive: false,
        onboardingCompleted: false
      })
    }

    const { data: callLogs, error: callLogsError } = await supabaseAdmin
      .from('call_logs')
      .select('*')

    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')

    const { data: smsLogs, error: smsLogsError } = await supabaseAdmin
      .from('sms_logs')
      .select('*')

    // Calculate real metrics from actual data
    const totalClients = businesses?.length || 0
    const activeClients = businesses?.filter(b => b.subscription_status === 'active').length || 0
    
    // Calculate monthly revenue from actual subscription data
    const monthlyRevenue = businesses?.reduce((total, business) => {
      return total + (business.subscription_amount || 0)
    }, 0) || 0

    // Calculate today's activity
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const callsToday = callLogs?.filter(call => {
      const callDate = new Date(call.created_at)
      return callDate >= todayStart && callDate < todayEnd
    }).length || 0

    const appointmentsToday = appointments?.filter(apt => {
      const aptDate = new Date(apt.appointment_date)
      return aptDate >= todayStart && aptDate < todayEnd
    }).length || 0

    const smsSent = smsLogs?.filter(sms => {
      const smsDate = new Date(sms.created_at)
      return smsDate >= todayStart && smsDate < todayEnd
    }).length || 0

    const averageClientValue = totalClients > 0 ? monthlyRevenue / totalClients : 0
    
    // Calculate conversion rate from actual data
    const totalCalls = callLogs?.length || 0
    const totalAppointments = appointments?.length || 0
    const conversionRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0

    const stats = {
      totalClients,
      activeClients,
      monthlyRevenue: Math.round(monthlyRevenue),
      callsToday,
      appointmentsToday,
      smsSent,
      averageClientValue: Math.round(averageClientValue),
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue: monthlyRevenue * 12, // Annual projection
      isLive: totalClients > 0,
      onboardingCompleted: totalClients > 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}