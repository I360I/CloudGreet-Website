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
      // Return empty metrics data instead of 401 for users without businesses
      return NextResponse.json({
        success: true,
        metrics: {
          totalCalls: 0,
          totalAppointments: 0,
          totalRevenue: 0,
          conversionRate: 0,
          avgCallDuration: 0,
          customerSatisfaction: 0,
          monthlyGrowth: 0,
          revenueProjection: 0,
          callsThisWeek: 0,
          appointmentsThisWeek: 0,
          revenueThisWeek: 0,
          missedCalls: 0,
          answeredCalls: 0,
          callAnswerRate: 0
        }
      })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    const businessId = authResult.businessId

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

    // Fetch calls for timeframe - handle different column name variations
    // Try to select all possible column name variations
    const { data: calls, count: totalCalls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*', { count: 'exact' })
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

    // Calculate metrics with null safety - handle different column name variations
    const getStatus = (c: any) => c?.status || c?.call_status || 'unknown'
    const getDuration = (c: any) => c?.duration || c?.call_duration || 0
    const getSatisfaction = (c: any) => c?.satisfaction_rating || c?.satisfaction_score || null
    
    const answeredCalls = calls?.filter(c => {
      const status = getStatus(c)
      return status === 'completed' || status === 'answered' || status === 'completed'
    }).length || 0
    
    const missedCalls = calls?.filter(c => {
      const status = getStatus(c)
      return status === 'missed' || status === 'no_answer' || status === 'busy' || status === 'failed'
    }).length || 0
    
    const callAnswerRate = totalCalls ? (answeredCalls / totalCalls) * 100 : 0
    
    // Calculate average call duration
    const durations = calls?.map(c => getDuration(c)).filter(d => d > 0) || []
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

    // Customer satisfaction - calculate from actual ratings (handle different column names)
    const satisfactionRatings = calls?.filter(c => getSatisfaction(c) != null)
      .map(c => getSatisfaction(c))
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
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      businessId: authResult?.businessId,
      timeframe
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

