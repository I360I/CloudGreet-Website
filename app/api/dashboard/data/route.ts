import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'
    
    // Skip authentication for now - just get the first business from the database
    let businessId: string
    let businessData: any
    
    try {
      const { data: businesses } = await supabaseAdmin()
        .from('businesses')
        .select('id, business_name, phone_number, onboarding_completed')
        .limit(1)
      
      if (businesses && businesses.length > 0) {
        businessId = (businesses[0] as any).id
        businessData = businesses[0]
      } else {
        return NextResponse.json({ error: 'No business found' }, { status: 404 })
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Fetch real data from database
    const [callsResult, appointmentsResult] = await Promise.all([
      supabaseAdmin().from('call_logs')
        .select('id, created_at, status, duration, from_number')
        .gte('created_at', startDate.toISOString())
        .eq('business_id', businessId),
      
      supabaseAdmin().from('appointments')
        .select('id, created_at, status, estimated_value, actual_value, scheduled_date')
        .gte('created_at', startDate.toISOString())
        .eq('business_id', businessId)
    ])

    const calls = callsResult.data || []
    const appointments = appointmentsResult.data || []
    const business = businessData || {}

    // Calculate real metrics
    const totalCalls = calls.length
    const answeredCalls = calls.filter(call => (call as any).status === 'answered').length
    const missedCalls = calls.filter(call => (call as any).status === 'missed').length
    const conversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    
    const totalRevenue = appointments.reduce((sum, apt) => {
      const value = (apt as any).actual_value || (apt as any).estimated_value || 0
      return sum + value
    }, 0)

    const todayBookings = appointments.filter(apt => {
      const aptDate = new Date((apt as any).scheduled_date)
      return aptDate.toDateString() === now.toDateString()
    }).length

    const avgCallDuration = calls.length > 0 
      ? calls.reduce((sum, call) => sum + ((call as any).duration || 0), 0) / calls.length 
      : 0

    // Calculate calls today
    const callsToday = calls.filter(call => {
      const callDate = new Date((call as any).created_at)
      return callDate.toDateString() === now.toDateString()
    }).length

    // Calculate calls this week
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const callsThisWeek = calls.filter(call => {
      const callDate = new Date((call as any).created_at)
      return callDate >= weekStart
    }).length

    const avgCallsPerDay = callsThisWeek > 0 ? callsThisWeek / 7 : 0

    return NextResponse.json({
      success: true,
      totalCalls,
      totalRevenue,
      activeCalls: answeredCalls,
      conversionRate: Math.round(conversionRate * 100) / 100,
      emergencyCalls: 0, // Would need special handling for emergency calls
      todayBookings,
      missedCalls,
      avgCallDuration: Math.round(avgCallDuration * 100) / 100,
      customerSatisfaction: 4.5, // Would need feedback system
      monthlyRecurring: totalRevenue, // Use actual revenue instead of estimate
      callsToday,
      callsThisWeek,
      avgCallsPerDay: Math.round(avgCallsPerDay * 100) / 100,
      businessName: (business as any).business_name || '',
      phoneNumber: (business as any).phone_number || '',
      isLive: true, // Would check actual AI agent status
      onboardingCompleted: (business as any).onboarding_completed || false,
      recentCalls: calls.slice(0, 5).map(call => ({
        id: (call as any).id,
        from: (call as any).from_number,
        duration: (call as any).duration,
        status: (call as any).status,
        timestamp: (call as any).created_at
      })),
      recentAppointments: appointments.slice(0, 5).map(apt => ({
        id: (apt as any).id,
        customer: (apt as any).customer_name || (apt as any).customer_email || 'Unknown',
        service: (apt as any).service_type || 'General Service',
        scheduled_date: (apt as any).scheduled_date,
        status: (apt as any).status,
        value: (apt as any).actual_value || (apt as any).estimated_value || 0
      }))
    })

  } catch (error) {
    console.error('Dashboard data API error:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Full error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'API endpoint working',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
