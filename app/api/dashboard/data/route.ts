import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Force redeploy - dashboard API v2

export async function GET(request: NextRequest) {
  try {
    // Ensure Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 })
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid token', 
        details: 'Token verification failed'
      }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }
    
    // Check if onboarding is completed and get business status
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('onboarding_completed, phone_number, business_name, tone')
      .eq('id', businessId)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json({ 
        error: 'Business not found'
      }, { status: 404 })
    }
    
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
      logger.error('Failed to fetch calls data', { 
        error: callsError,  
        businessId, 
        userId 
      })
    }
    if (appointmentsError) {
      logger.error('Failed to fetch appointments data', { 
        error: appointmentsError,  
        businessId, 
        userId 
      })
    }
    if (smsError) {
      logger.error('Failed to fetch SMS data', { 
        error: smsError,  
        businessId, 
        userId 
      })
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

    // Format recent calls for dashboard
    const formattedRecentCalls = calls?.slice(0, 5).map(call => ({
      id: call.id,
      caller: call.from_number || 'Unknown',
      duration: `${call.duration || 0}s`,
      status: call.status || 'unknown',
      date: new Date(call.created_at).toLocaleDateString()
    })) || []

    // Format upcoming appointments
    const formattedUpcomingAppointments = appointments?.slice(0, 5).map(apt => ({
      id: apt.id,
      customer: apt.customer_name || 'Unknown',
      service: apt.service_type || 'General Service',
      date: new Date(apt.scheduled_date).toLocaleDateString(),
      time: new Date(apt.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })) || []

    // Get onboarding status and next steps
    const onboardingCompleted = business.onboarding_completed || false
    const hasPhoneNumber = business.phone_number && business.phone_number !== '5551234567'
    const hasAgent = agent?.is_active || false

    // Determine setup status
    let setupStatus = 'incomplete'
    let nextSteps = []
    
    if (!onboardingCompleted) {
      setupStatus = 'setup_needed'
      nextSteps = ['Complete business profile', 'Configure AI settings', 'Get phone number']
    } else if (!hasPhoneNumber) {
      setupStatus = 'phone_needed'
      nextSteps = ['Get a phone number', 'Test your AI agent', 'Go live']
    } else if (!hasAgent) {
      setupStatus = 'agent_needed'
      nextSteps = ['Activate AI agent', 'Test call handling', 'Monitor performance']
    } else {
      setupStatus = 'active'
      nextSteps = ['Monitor calls', 'Review appointments', 'Optimize settings']
    }

    const dashboardData = {
      success: true,
      data: {
        businessName: business.business_name,
        phoneNumber: business.phone_number || 'Not assigned',
        isActive: hasAgent,
        totalCalls,
        totalAppointments: appointments?.length || 0,
        totalRevenue,
        recentCalls: formattedRecentCalls,
        upcomingAppointments: formattedUpcomingAppointments,
        setupStatus,
        nextSteps,
        onboardingCompleted,
        hasPhoneNumber,
        hasAgent,
        timeframe
      }
    }
    
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    logger.error('Dashboard data error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
