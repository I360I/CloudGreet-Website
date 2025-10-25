import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    
    // Calculate date range
    const now = new Date()
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    // Get real calls data
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (callsError) {
      logger.error('Error fetching calls data', { error: callsError.message, businessId })
    }

    // Get real appointments data
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (appointmentsError) {
      logger.error('Error fetching appointments data', { error: appointmentsError.message, businessId })
    }

    // Get business data for comparison
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError) {
      logger.error('Error fetching business data', { error: businessError.message, businessId })
    }

    // Calculate real metrics
    const totalCalls = calls?.length || 0
    const totalAppointments = appointments?.length || 0
    const answeredCalls = calls?.filter(call => call.status === 'answered' || call.status === 'completed').length || 0
    const missedCalls = calls?.filter(call => call.status === 'missed' || call.status === 'busy').length || 0
    const callAnswerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    const conversionRate = answeredCalls > 0 ? (totalAppointments / answeredCalls) * 100 : 0
    
    // Calculate revenue (assuming average appointment value)
    const avgAppointmentValue = 2500 // This could be configurable per business
    const totalRevenue = totalAppointments * avgAppointmentValue
    
    // Calculate average call duration
    const avgCallDuration = calls?.length > 0 
      ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length 
      : 0

    // Calculate weekly metrics
    const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const callsThisWeek = calls?.filter(call => new Date(call.created_at) >= weekStart).length || 0
    const appointmentsThisWeek = appointments?.filter(apt => new Date(apt.created_at) >= weekStart).length || 0
    const revenueThisWeek = appointmentsThisWeek * avgAppointmentValue

    // Calculate growth (simplified - comparing to previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000))
    const previousPeriodEnd = startDate
    
    const { data: previousCalls } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', previousPeriodStart.toISOString())
      .lte('created_at', previousPeriodEnd.toISOString())

    const previousCallsCount = previousCalls?.length || 0
    const monthlyGrowth = previousCallsCount > 0 
      ? ((totalCalls - previousCallsCount) / previousCallsCount) * 100 
      : 0

    // Calculate customer satisfaction (simplified based on call outcomes)
    const customerSatisfaction = callAnswerRate > 80 ? 4.5 : callAnswerRate > 60 ? 4.0 : 3.5

    // Calculate revenue projection
    const revenueProjection = totalRevenue * (1 + (monthlyGrowth / 100))

    const metrics = {
      totalCalls,
      totalAppointments,
      totalRevenue,
      conversionRate,
      avgCallDuration,
      customerSatisfaction,
      monthlyGrowth,
      revenueProjection,
      callsThisWeek,
      appointmentsThisWeek,
      revenueThisWeek,
      missedCalls,
      answeredCalls,
      callAnswerRate
    }

    logger.info('Real metrics calculated', { 
      businessId, 
      timeframe, 
      totalCalls, 
      totalAppointments, 
      totalRevenue 
    })

    return NextResponse.json({
      success: true,
      metrics,
      timeframe,
      calculatedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error calculating real metrics', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to calculate metrics' 
    }, { status: 500 })
  }
}
