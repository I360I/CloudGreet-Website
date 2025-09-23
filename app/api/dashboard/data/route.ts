import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    // Since we bypass middleware for dashboard, get the first business for now
    // In production, this should get the business from the authenticated user
    let businessId: string
    let businessData: any
    
    try {
      const { data: businesses } = await supabaseAdmin()
        .from('businesses')
        .select('id, business_name, phone_number, onboarding_completed')
        .limit(1)
      
      if (!businesses || businesses.length === 0) {
        return NextResponse.json({ error: 'No business found' }, { status: 404 })
      }
      
      businessId = businesses[0].id
      businessData = businesses[0]
    } catch (error) {
      console.error('Error fetching business:', error)
      return NextResponse.json({ error: 'Failed to fetch business data' }, { status: 500 })
    }
    
    // Use the business data we already fetched
    const business = businessData
    
    // Get timeframe from query params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '24h':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }
    
            // Fetch real data from Supabase using business_id (consistent with schema)
            const { data: calls, error: callsError } = await supabaseAdmin
              .from('call_logs')
              .select('*')
              .eq('business_id', businessId)
              .gte('created_at', startDate.toISOString())
              .order('created_at', { ascending: false })
            
            const { data: appointments, error: appointmentsError } = await supabaseAdmin
              .from('appointments')
              .select('*')
              .eq('business_id', businessId)
              .gte('created_at', startDate.toISOString())
              .order('scheduled_date', { ascending: true })
            
            const { data: sms, error: smsError } = await supabaseAdmin
              .from('sms_logs')
              .select('*')
              .eq('business_id', businessId)
              .gte('created_at', startDate.toISOString())
              .order('created_at', { ascending: false })
    
    if (callsError) {
      logger.error('Failed to fetch calls data', callsError, { businessId, userId })
    }
    if (appointmentsError) {
      logger.error('Failed to fetch appointments data', appointmentsError, { businessId, userId })
    }
    if (smsError) {
      logger.error('Failed to fetch SMS data', smsError, { businessId, userId })
    }
    
    // Calculate comprehensive metrics
    const totalCalls = calls?.length || 0
    const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    const activeCalls = calls?.filter(call => call.status === 'in-progress').length || 0
    const completedCalls = calls?.filter(call => call.status === 'completed').length || 0
    const conversionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0
    const emergencyCalls = calls?.filter(call => call.status === 'emergency').length || 0
    
    // Calculate calls that led to appointments (conversion tracking)
    const callsWithAppointments = calls?.filter(call => 
      appointments?.some(apt => apt.customer_phone === call.from_number)
    ).length || 0
    const bookingConversionRate = totalCalls > 0 ? Math.round((callsWithAppointments / totalCalls) * 100) : 0
    
    // Today's bookings
    const today = new Date().toDateString()
    const todayBookings = appointments?.filter(apt => {
      return new Date(apt.scheduled_date).toDateString() === today
    }).length || 0
    
    const missedCalls = calls?.filter(call => call.status === 'no-answer').length || 0
    const avgCallDuration = calls?.length > 0 
      ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length * 10) / 10
      : 0
    
    // Calculate customer satisfaction from call ratings
    const ratedCalls = calls?.filter(call => call.satisfaction_rating) || []
    const customerSatisfaction = ratedCalls.length > 0
      ? Math.round(ratedCalls.reduce((sum, call) => sum + call.satisfaction_rating, 0) / ratedCalls.length * 10) / 10
      : 5
    
    // Monthly recurring revenue (last 30 days)
    const lastMonth = new Date()
    lastMonth.setDate(lastMonth.getDate() - 30)
    const monthlyRecurring = appointments?.filter(apt => {
      return new Date(apt.created_at) >= lastMonth
    }).reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    
    // Check if AI agent is active
    const { data: agent } = await supabaseAdmin
      .from('ai_agents')
      .select('is_active')
      .eq('business_id', businessId)
      .single()

    const dashboardData = {
      totalCalls,
      totalRevenue,
      activeCalls,
      conversionRate: bookingConversionRate, // Use booking conversion instead of call completion
      emergencyCalls,
      todayBookings,
      missedCalls,
      avgCallDuration,
      customerSatisfaction,
      monthlyRecurring,
      timeframe,
      phoneNumber: business.phone_number,
      businessName: business.business_name,
      isLive: agent?.is_active || false,
      onboardingCompleted: business.onboarding_completed || false,
      recentCalls: calls?.slice(0, 10) || [],
      recentAppointments: appointments?.slice(0, 10) || [],
      recentSMS: sms?.slice(0, 10) || [],
      // Additional metrics for 5-10+ calls per day
      callsToday: calls?.filter(call => {
        const callDate = new Date(call.created_at).toDateString()
        return callDate === today
      }).length || 0,
      callsThisWeek: calls?.filter(call => {
        const callDate = new Date(call.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return callDate >= weekAgo
      }).length || 0,
      avgCallsPerDay: calls?.length > 0 ? Math.round((calls.length / Math.max(1, Math.ceil((now.getTime() - new Date(calls[calls.length - 1]?.created_at || now).getTime()) / (1000 * 60 * 60 * 24)))) * 10) / 10 : 0
    }
    
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    logger.error('Dashboard data error', error as Error, { 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
