import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Real conversion stages based on actual business flow
const CONVERSION_STAGES = [
  {
    id: 'website_visit',
    name: 'Website Visit',
    description: 'Customer visits your website',
    isEntryPoint: true
  },
  {
    id: 'phone_call',
    name: 'Phone Call',
    description: 'Customer calls your business number',
    isEntryPoint: false
  },
  {
    id: 'ai_conversation',
    name: 'AI Conversation',
    description: 'Customer speaks with AI receptionist',
    isEntryPoint: false
  },
  {
    id: 'lead_qualified',
    name: 'Lead Qualified',
    description: 'AI determines customer is a qualified lead',
    isEntryPoint: false
  },
  {
    id: 'appointment_scheduled',
    name: 'Appointment Scheduled',
    description: 'Customer books an appointment',
    isEntryPoint: false
  },
  {
    id: 'appointment_completed',
    name: 'Appointment Completed',
    description: 'Service appointment is completed',
    isEntryPoint: false
  },
  {
    id: 'payment_received',
    name: 'Payment Received',
    description: 'Customer pays for service',
    isEntryPoint: false
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timeframe = searchParams.get('timeframe') || '30d'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real conversion data
    const conversionData = await getRealConversionData(businessId, timeframe)
    
    // Calculate real funnel metrics
    const funnelMetrics = calculateRealFunnelMetrics(conversionData)
    
    // Get conversion insights
    const insights = await generateConversionInsights(businessId, conversionData, funnelMetrics)

    return NextResponse.json({
      success: true,
      stages: CONVERSION_STAGES,
      conversionData,
      funnelMetrics,
      insights,
      lastUpdated: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Real conversion analytics error', { 
      error: error.message,
      businessId: request.url.includes('businessId') ? new URL(request.url).searchParams.get('businessId') : 'unknown'
    })
    
    return NextResponse.json({ 
      error: 'Failed to generate real conversion analytics',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, stage, customerId, metadata } = body

    if (!businessId || !stage) {
      return NextResponse.json({ error: 'Business ID and stage are required' }, { status: 400 })
    }

    // Track real conversion event
    const { data: conversionEvent, error: conversionError } = await supabaseAdmin
      .from('conversion_events')
      .insert({
        business_id: businessId,
        stage: stage,
        customer_id: customerId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (conversionError) {
      logger.error('Failed to track conversion event', { 
        error: conversionError.message,
        businessId,
        stage 
      })
      return NextResponse.json({ 
        error: 'Failed to track conversion event',
        details: conversionError.message 
      }, { status: 500 })
    }

    logger.info('Conversion event tracked', { 
      businessId,
      stage,
      customerId,
      eventId: conversionEvent.id 
    })

    return NextResponse.json({
      success: true,
      conversionEvent
    })

  } catch (error: any) {
    logger.error('Conversion tracking error', { 
      error: error.message
    })
    
    return NextResponse.json({ 
      error: 'Failed to track conversion',
      details: error.message 
    }, { status: 500 })
  }
}

async function getRealConversionData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real conversion events
  const { data: conversionEvents } = await supabaseAdmin
    .from('conversion_events')
    .select('*')
    .eq('business_id', businessId)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true })

  // Get real call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Get real appointment data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Get real revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  return {
    conversionEvents: conversionEvents || [],
    calls: calls || [],
    appointments: appointments || [],
    revenue: revenue || [],
    timeframe: {
      start: startDate,
      end: new Date(),
      days
    }
  }
}

function calculateRealFunnelMetrics(conversionData: any) {
  const { conversionEvents, calls, appointments, revenue } = conversionData

  // Calculate stage counts
  const stageCounts = CONVERSION_STAGES.map(stage => {
    const count = conversionEvents.filter((event: any) => event.stage === stage.id).length
    return {
      ...stage,
      count,
      conversionRate: 0 // Will be calculated below
    }
  })

  // Calculate conversion rates
  const totalCalls = calls.length
  const totalAppointments = appointments.length
  const totalRevenue = revenue.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

  // Phone call to appointment conversion
  const callToAppointmentRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0
  
  // Appointment to payment conversion
  const appointmentToPaymentRate = totalAppointments > 0 ? (revenue.length / totalAppointments) * 100 : 0

  // Overall conversion rate
  const overallConversionRate = totalCalls > 0 ? (revenue.length / totalCalls) * 100 : 0

  // Calculate stage conversion rates
  stageCounts.forEach((stage, index) => {
    if (index === 0) {
      stage.conversionRate = 100 // Entry point
    } else {
      const previousStageCount = index > 0 ? stageCounts[index - 1].count : totalCalls
      stage.conversionRate = previousStageCount > 0 ? (stage.count / previousStageCount) * 100 : 0
    }
  })

  return {
    stageCounts,
    totalCalls,
    totalAppointments,
    totalRevenue,
    callToAppointmentRate,
    appointmentToPaymentRate,
    overallConversionRate,
    avgRevenuePerCall: totalCalls > 0 ? totalRevenue / totalCalls : 0,
    avgRevenuePerAppointment: totalAppointments > 0 ? totalRevenue / totalAppointments : 0
  }
}

async function generateConversionInsights(businessId: string, conversionData: any, funnelMetrics: any) {
  const insights = []

  // Call to appointment conversion insights
  if (funnelMetrics.callToAppointmentRate < 30) {
    insights.push({
      type: 'improvement',
      metric: 'call_to_appointment',
      message: `Call to appointment conversion (${funnelMetrics.callToAppointmentRate.toFixed(1)}%) is low. Focus on better lead qualification and appointment booking process.`,
      priority: 'high',
      action: 'Improve appointment booking process'
    })
  } else if (funnelMetrics.callToAppointmentRate > 60) {
    insights.push({
      type: 'strength',
      metric: 'call_to_appointment',
      message: `Excellent call to appointment conversion (${funnelMetrics.callToAppointmentRate.toFixed(1)}%)!`,
      priority: 'low',
      action: 'Maintain current process'
    })
  }

  // Appointment to payment conversion insights
  if (funnelMetrics.appointmentToPaymentRate < 80) {
    insights.push({
      type: 'improvement',
      metric: 'appointment_to_payment',
      message: `Appointment to payment conversion (${funnelMetrics.appointmentToPaymentRate.toFixed(1)}%) could be improved. Focus on follow-up and payment collection.`,
      priority: 'medium',
      action: 'Improve payment collection process'
    })
  }

  // Revenue insights
  if (funnelMetrics.avgRevenuePerCall < 200) {
    insights.push({
      type: 'opportunity',
      metric: 'revenue_per_call',
      message: `Average revenue per call ($${funnelMetrics.avgRevenuePerCall.toFixed(0)}) is low. Consider upselling strategies.`,
      priority: 'medium',
      action: 'Implement upselling strategies'
    })
  }

  // Overall conversion insights
  if (funnelMetrics.overallConversionRate < 20) {
    insights.push({
      type: 'critical',
      metric: 'overall_conversion',
      message: `Overall conversion rate (${funnelMetrics.overallConversionRate.toFixed(1)}%) is very low. Review entire customer journey.`,
      priority: 'critical',
      action: 'Review and optimize entire customer journey'
    })
  }

  return insights
}
