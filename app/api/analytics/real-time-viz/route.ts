import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const chartType = searchParams.get('chartType') || 'live_metrics'
    const timeframe = searchParams.get('timeframe') || '1h'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real-time data based on chart type
    let realTimeData
    switch (chartType) {
      case 'live_metrics':
        realTimeData = await getLiveMetrics(businessId, timeframe)
        break
      case 'call_activity':
        realTimeData = await getCallActivity(businessId, timeframe)
        break
      case 'revenue_stream':
        realTimeData = await getRevenueStream(businessId, timeframe)
        break
      case 'conversion_live':
        realTimeData = await getConversionLive(businessId, timeframe)
        break
      case 'ai_performance':
        realTimeData = await getAIPerformance(businessId, timeframe)
        break
      default:
        return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      chartType,
      timeframe,
      data: realTimeData,
      lastUpdated: new Date().toISOString(),
      realTime: true
    })

  } catch (error: any) {
    logger.error('Real-time visualization error', { 
      error: error.message,
      businessId: request.url.includes('businessId') ? new URL(request.url).searchParams.get('businessId') : 'unknown',
      chartType: request.url.includes('chartType') ? new URL(request.url).searchParams.get('chartType') : 'unknown'
    })
    
    return NextResponse.json({ 
      error: 'Failed to generate real-time visualization',
      details: error.message 
    }, { status: 500 })
  }
}

async function getLiveMetrics(businessId: string, timeframe: string) {
  const minutes = timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440
  const startTime = new Date(Date.now() - (minutes * 60 * 1000))

  // Get real-time call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  // Get real-time appointment data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  // Get real-time revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  // Group data by time intervals (5-minute intervals)
  const intervalMinutes = 5
  const intervals = []
  const now = new Date()
  
  for (let i = 0; i < minutes; i += intervalMinutes) {
    const intervalStart = new Date(startTime.getTime() + (i * 60 * 1000))
    const intervalEnd = new Date(intervalStart.getTime() + (intervalMinutes * 60 * 1000))
    
    const intervalCalls = calls?.filter(call => {
      const callTime = new Date(call.created_at)
      return callTime >= intervalStart && callTime < intervalEnd
    }) || []

    const intervalAppointments = appointments?.filter(apt => {
      const aptTime = new Date(apt.created_at)
      return aptTime >= intervalStart && aptTime < intervalEnd
    }) || []

    const intervalRevenue = revenue?.filter(r => {
      const revTime = new Date(r.created_at)
      return revTime >= intervalStart && revTime < intervalEnd
    }) || []

    intervals.push({
      timestamp: intervalStart.toISOString(),
      calls: intervalCalls.length,
      answeredCalls: intervalCalls.filter(call => call.status === 'answered' || call.status === 'completed').length,
      missedCalls: intervalCalls.filter(call => call.status === 'missed').length,
      appointments: intervalAppointments.length,
      revenue: intervalRevenue.reduce((sum, r) => sum + (r.amount || 0), 0),
      avgCallDuration: intervalCalls.length > 0 ? 
        intervalCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / intervalCalls.length : 0
    })
  }

  return {
    type: 'line',
    title: 'Live Metrics',
    data: intervals,
    metrics: {
      totalCalls: calls?.length || 0,
      totalAppointments: appointments?.length || 0,
      totalRevenue: revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      avgCallsPerInterval: intervals.length > 0 ? intervals.reduce((sum, i) => sum + i.calls, 0) / intervals.length : 0,
      peakInterval: intervals.reduce((max, interval) => interval.calls > max.calls ? interval : max, intervals[0] || { calls: 0 })
    }
  }
}

async function getCallActivity(businessId: string, timeframe: string) {
  const minutes = timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440
  const startTime = new Date(Date.now() - (minutes * 60 * 1000))

  // Get real-time call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  // Group by status
  const statusCounts = {
    answered: calls?.filter(call => call.status === 'answered' || call.status === 'completed').length || 0,
    missed: calls?.filter(call => call.status === 'missed').length || 0,
    ringing: calls?.filter(call => call.status === 'ringing').length || 0,
    busy: calls?.filter(call => call.status === 'busy').length || 0
  }

  // Group by hour for activity pattern
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour,
    calls: 0,
    answered: 0,
    missed: 0
  }))

  calls?.forEach(call => {
    const callHour = new Date(call.created_at).getHours()
    hourlyActivity[callHour].calls++
    
    if (call.status === 'answered' || call.status === 'completed') {
      hourlyActivity[callHour].answered++
    } else if (call.status === 'missed') {
      hourlyActivity[callHour].missed++
    }
  })

  return {
    type: 'bar',
    title: 'Call Activity',
    data: {
      statusCounts,
      hourlyActivity: hourlyActivity.filter(hour => hour.calls > 0),
      totalCalls: calls?.length || 0,
      answerRate: calls?.length > 0 ? (statusCounts.answered / calls.length) * 100 : 0,
      missRate: calls?.length > 0 ? (statusCounts.missed / calls.length) * 100 : 0
    }
  }
}

async function getRevenueStream(businessId: string, timeframe: string) {
  const minutes = timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440
  const startTime = new Date(Date.now() - (minutes * 60 * 1000))

  // Get real-time revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  // Group by transaction type
  const revenueByType = {
    subscription: revenue?.filter(r => r.transaction_type === 'subscription').reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
    per_booking: revenue?.filter(r => r.transaction_type === 'per_booking').reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
    setup: revenue?.filter(r => r.transaction_type === 'setup').reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  }

  // Group by time intervals
  const intervalMinutes = 10
  const intervals = []
  
  for (let i = 0; i < minutes; i += intervalMinutes) {
    const intervalStart = new Date(startTime.getTime() + (i * 60 * 1000))
    const intervalEnd = new Date(intervalStart.getTime() + (intervalMinutes * 60 * 1000))
    
    const intervalRevenue = revenue?.filter(r => {
      const revTime = new Date(r.created_at)
      return revTime >= intervalStart && revTime < intervalEnd
    }) || []

    intervals.push({
      timestamp: intervalStart.toISOString(),
      revenue: intervalRevenue.reduce((sum, r) => sum + (r.amount || 0), 0),
      transactions: intervalRevenue.length,
      avgTransaction: intervalRevenue.length > 0 ? 
        intervalRevenue.reduce((sum, r) => sum + (r.amount || 0), 0) / intervalRevenue.length : 0
    })
  }

  return {
    type: 'line',
    title: 'Revenue Stream',
    data: {
      intervals,
      revenueByType,
      totalRevenue: revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      totalTransactions: revenue?.length || 0,
      avgTransactionValue: revenue?.length > 0 ? 
        revenue.reduce((sum, r) => sum + (r.amount || 0), 0) / revenue.length : 0
    }
  }
}

async function getConversionLive(businessId: string, timeframe: string) {
  const minutes = timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440
  const startTime = new Date(Date.now() - (minutes * 60 * 1000))

  // Get real-time conversion events
  const { data: conversionEvents } = await supabaseAdmin
    .from('conversion_events')
    .select('*')
    .eq('business_id', businessId)
    .gte('timestamp', startTime.toISOString())
    .order('timestamp', { ascending: true })

  // Get real-time calls and appointments
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())

  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())

  // Calculate real-time conversion rates
  const answeredCalls = calls?.filter(call => call.status === 'answered' || call.status === 'completed').length || 0
  const totalAppointments = appointments?.length || 0
  const conversionRate = answeredCalls > 0 ? (totalAppointments / answeredCalls) * 100 : 0

  // Group by stage
  const stageCounts = {
    website_visit: conversionEvents?.filter(e => e.stage === 'website_visit').length || 0,
    phone_call: conversionEvents?.filter(e => e.stage === 'phone_call').length || 0,
    ai_conversation: conversionEvents?.filter(e => e.stage === 'ai_conversation').length || 0,
    lead_qualified: conversionEvents?.filter(e => e.stage === 'lead_qualified').length || 0,
    appointment_scheduled: conversionEvents?.filter(e => e.stage === 'appointment_scheduled').length || 0,
    appointment_completed: conversionEvents?.filter(e => e.stage === 'appointment_completed').length || 0,
    payment_received: conversionEvents?.filter(e => e.stage === 'payment_received').length || 0
  }

  return {
    type: 'funnel',
    title: 'Live Conversion Funnel',
    data: {
      stageCounts,
      conversionRate,
      totalCalls: calls?.length || 0,
      answeredCalls,
      totalAppointments,
      events: conversionEvents || []
    }
  }
}

async function getAIPerformance(businessId: string, timeframe: string) {
  const minutes = timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440
  const startTime = new Date(Date.now() - (minutes * 60 * 1000))

  // Get real-time AI performance data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startTime.toISOString())
    .not('ai_response_time', 'is', null)

  // Calculate AI performance metrics
  const responseTimes = calls?.map(call => call.ai_response_time).filter(time => time) || []
  const avgResponseTime = responseTimes.length > 0 ? 
    responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

  const satisfactionScores = calls?.map(call => call.satisfaction_score).filter(score => score) || []
  const avgSatisfaction = satisfactionScores.length > 0 ? 
    satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length : 4

  const sentimentCounts = {
    positive: calls?.filter(call => call.sentiment === 'positive').length || 0,
    neutral: calls?.filter(call => call.sentiment === 'neutral').length || 0,
    negative: calls?.filter(call => call.sentiment === 'negative').length || 0
  }

  // Group by time intervals for performance trends
  const intervalMinutes = 5
  const intervals = []
  
  for (let i = 0; i < minutes; i += intervalMinutes) {
    const intervalStart = new Date(startTime.getTime() + (i * 60 * 1000))
    const intervalEnd = new Date(intervalStart.getTime() + (intervalMinutes * 60 * 1000))
    
    const intervalCalls = calls?.filter(call => {
      const callTime = new Date(call.created_at)
      return callTime >= intervalStart && callTime < intervalEnd
    }) || []

    const intervalResponseTimes = intervalCalls.map(call => call.ai_response_time).filter(time => time)
    const intervalSatisfaction = intervalCalls.map(call => call.satisfaction_score).filter(score => score)

    intervals.push({
      timestamp: intervalStart.toISOString(),
      calls: intervalCalls.length,
      avgResponseTime: intervalResponseTimes.length > 0 ? 
        intervalResponseTimes.reduce((sum, time) => sum + time, 0) / intervalResponseTimes.length : 0,
      avgSatisfaction: intervalSatisfaction.length > 0 ? 
        intervalSatisfaction.reduce((sum, score) => sum + score, 0) / intervalSatisfaction.length : 4,
      positiveSentiment: intervalCalls.filter(call => call.sentiment === 'positive').length
    })
  }

  return {
    type: 'line',
    title: 'AI Performance',
    data: {
      intervals,
      overall: {
        avgResponseTime,
        avgSatisfaction,
        totalCalls: calls?.length || 0,
        sentimentCounts
      }
    }
  }
}
