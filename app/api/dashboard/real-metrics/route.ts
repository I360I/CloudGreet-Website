import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyJWT(request)
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    let businessId = searchParams.get('businessId')

    // If businessId not provided, default to user's business
    if (!businessId) {
      const { data: userBusiness, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('owner_id', authResult.user.id)
        .single()

      if (businessError || !userBusiness) {
        return NextResponse.json(
          { error: 'No business found' },
          { status: 404 }
        )
      }
      businessId = userBusiness.id
    }

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeframe) {
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
        startDate.setDate(now.getDate() - 30)
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.owner_id !== authResult.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch calls for timeframe - only select needed fields
    const { data: calls, count: totalCalls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('status, duration, satisfaction_rating, created_at', { count: 'exact' })
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    // Fetch appointments for timeframe - only select created_at for count
    const { data: appointments, count: totalAppointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('created_at', { count: 'exact' })
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    if (callsError || appointmentsError) {
      logger.error('Error fetching metrics', { 
        callsError: callsError?.message, 
        appointmentsError: appointmentsError?.message 
      })
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }

    // Calculate metrics with null safety
    const answeredCalls = calls?.filter(c => c?.status === 'completed' || c?.status === 'answered').length || 0
    const missedCalls = calls?.filter(c => c?.status === 'missed' || c?.status === 'no_answer').length || 0
    const callAnswerRate = totalCalls ? (answeredCalls / totalCalls) * 100 : 0
    
    // Calculate average call duration
    const durations = calls?.map(c => c.duration || 0).filter(d => d > 0) || []
    const avgCallDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0

    // Calculate conversion rate
    const conversionRate = totalCalls ? (totalAppointments / totalCalls) * 100 : 0

    // Calculate revenue (estimate based on appointments)
    const avgTicket = CONFIG.BUSINESS.AVERAGE_TICKET
    const closeRate = CONFIG.BUSINESS.CLOSE_RATE
    const totalRevenue = totalAppointments * closeRate * avgTicket

    // Calculate weekly metrics
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    
    const callsThisWeek = calls?.filter(c => c?.created_at && new Date(c.created_at) >= weekAgo).length || 0
    const appointmentsThisWeek = appointments?.filter(a => a?.created_at && new Date(a.created_at) >= weekAgo).length || 0
    const revenueThisWeek = appointmentsThisWeek * closeRate * avgTicket

    // Calculate monthly growth with proper date handling
    const monthAgo = new Date(now)
    monthAgo.setMonth(now.getMonth() - 1)
    // Ensure we're comparing same month boundaries
    monthAgo.setDate(1)
    monthAgo.setHours(0, 0, 0, 0)
    
    const startDateForComparison = new Date(startDate)
    startDateForComparison.setDate(1)
    startDateForComparison.setHours(0, 0, 0, 0)
    
    const callsLastMonth = calls?.filter(c => {
      const callDate = new Date(c?.created_at || 0)
      return callDate >= monthAgo && callDate < startDateForComparison
    }).length || 0
    
    const monthlyGrowth = callsLastMonth > 0 
      ? ((totalCalls - callsLastMonth) / callsLastMonth) * 100 
      : totalCalls > 0 ? 100 : 0

    // Revenue projection (next 30 days)
    const dailyAvg = totalCalls / (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90)
    const revenueProjection = dailyAvg * 30 * conversionRate / 100 * closeRate * avgTicket

    // Customer satisfaction - calculate from actual ratings
    const satisfactionRatings = calls?.filter(c => c?.satisfaction_rating != null)
      .map(c => c.satisfaction_rating)
      .filter((rating): rating is number => typeof rating === 'number' && rating > 0) || []
    
    const customerSatisfaction = satisfactionRatings.length > 0
      ? satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length
      : 4.2 // Default fallback if no ratings exist

    const metrics = {
      totalCalls: totalCalls || 0,
      totalAppointments: totalAppointments || 0,
      totalRevenue: Math.round(totalRevenue),
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgCallDuration: Math.round(avgCallDuration),
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      revenueProjection: Math.round(revenueProjection),
      callsThisWeek,
      appointmentsThisWeek,
      revenueThisWeek: Math.round(revenueThisWeek),
      missedCalls,
      answeredCalls,
      callAnswerRate: Math.round(callAnswerRate * 10) / 10
    }

    return NextResponse.json({
      success: true,
      metrics,
      timeframe
    })

  } catch (error) {
    logger.error('Real metrics error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

