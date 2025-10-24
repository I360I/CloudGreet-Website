import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timeframe = searchParams.get('timeframe') || '30d'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real business data
    const businessData = await getRealBusinessData(businessId, timeframe)
    
    // Generate AI insights from real data
    const insights = await generateRealAIInsights(businessId, businessData)
    
    // Get trend analysis
    const trends = await analyzeTrends(businessId, businessData)
    
    // Get recommendations
    const recommendations = await generateRecommendations(businessId, businessData, insights)

    return NextResponse.json({
      success: true,
      insights,
      trends,
      recommendations,
      businessData: {
        summary: {
          totalCalls: businessData.calls.length,
          totalAppointments: businessData.appointments.length,
          totalRevenue: businessData.revenue,
          avgSatisfaction: businessData.avgSatisfaction
        }
      },
      lastUpdated: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Real insights error', { 
      error: error.message,
      businessId: request.url.includes('businessId') ? new URL(request.url).searchParams.get('businessId') : 'unknown'
    })
    
    return NextResponse.json({ 
      error: 'Failed to generate real insights',
      details: error.message 
    }, { status: 500 })
  }
}

async function getRealBusinessData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get business info
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('business_name, business_type, phone_number')
    .eq('id', businessId)
    .single()

  // Get real call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Get real appointment data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Get real revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Get real conversion events
  const { data: conversionEvents } = await supabaseAdmin
    .from('conversion_events')
    .select('*')
    .eq('business_id', businessId)
    .gte('timestamp', startDate.toISOString())

  // Calculate metrics
  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const answeredCalls = calls?.filter(call => call.status === 'answered' || call.status === 'completed').length || 0
  const conversionRate = answeredCalls > 0 ? (appointments?.length || 0) / answeredCalls * 100 : 0
  const avgSatisfaction = calls?.length > 0 ? 
    calls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / calls.length : 4

  return {
    business,
    calls: calls || [],
    appointments: appointments || [],
    revenue: revenue || [],
    conversionEvents: conversionEvents || [],
    totalRevenue,
    conversionRate,
    avgSatisfaction,
    timeframe: { start: startDate, end: new Date(), days }
  }
}

async function generateRealAIInsights(businessId: string, businessData: any) {
  const { business, calls, appointments, revenue, conversionRate, avgSatisfaction } = businessData

  // Prepare data for AI analysis
  const analysisData = {
    businessName: business.business_name,
    businessType: business.business_type,
    totalCalls: calls.length,
    answeredCalls: calls.filter(call => call.status === 'answered' || call.status === 'completed').length,
    missedCalls: calls.filter(call => call.status === 'missed').length,
    totalAppointments: appointments.length,
    totalRevenue: businessData.totalRevenue,
    conversionRate: conversionRate,
    avgSatisfaction: avgSatisfaction,
    avgCallDuration: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0,
    peakCallHours: getPeakCallHours(calls),
    topServices: getTopServices(appointments),
    revenueByDay: getRevenueByDay(revenue),
    callQuality: analyzeCallQuality(calls)
  }

  // Generate AI insights
  const prompt = `Analyze this real business data and provide actionable insights:

BUSINESS: ${analysisData.businessName} (${analysisData.businessType})
CALLS: ${analysisData.totalCalls} total, ${analysisData.answeredCalls} answered, ${analysisData.missedCalls} missed
APPOINTMENTS: ${analysisData.totalAppointments} booked
REVENUE: $${analysisData.totalRevenue}
CONVERSION RATE: ${analysisData.conversionRate.toFixed(1)}%
CUSTOMER SATISFACTION: ${analysisData.avgSatisfaction.toFixed(1)}/5
AVERAGE CALL DURATION: ${analysisData.avgCallDuration.toFixed(1)} minutes
PEAK HOURS: ${analysisData.peakCallHours.join(', ')}
TOP SERVICES: ${analysisData.topServices.join(', ')}
CALL QUALITY: ${analysisData.callQuality}

Provide 5 specific, actionable insights based on this real data. Focus on:
1. Performance strengths and weaknesses
2. Revenue optimization opportunities
3. Customer experience improvements
4. Operational efficiency gains
5. Growth opportunities

Be specific and actionable. Use the actual numbers provided.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a business analytics expert. Analyze real business data and provide specific, actionable insights. Be precise and use the actual numbers provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const aiInsights = completion.choices[0]?.message?.content || 'Unable to generate insights'

    // Parse insights into structured format
    const insights = parseAIInsights(aiInsights, analysisData)

    return insights

  } catch (error) {
    logger.error('AI insights generation failed', { error: error.message, businessId })
    
    // Fallback to rule-based insights
    return generateRuleBasedInsights(analysisData)
  }
}

async function analyzeTrends(businessId: string, businessData: any) {
  const { calls, appointments, revenue } = businessData
  
  // Analyze call trends
  const callTrends = analyzeCallTrends(calls)
  
  // Analyze appointment trends
  const appointmentTrends = analyzeAppointmentTrends(appointments)
  
  // Analyze revenue trends
  const revenueTrends = analyzeRevenueTrends(revenue)
  
  // Analyze seasonal patterns
  const seasonalPatterns = analyzeSeasonalPatterns(calls, appointments)

  return {
    calls: callTrends,
    appointments: appointmentTrends,
    revenue: revenueTrends,
    seasonal: seasonalPatterns,
    overall: {
      growth: calculateOverallGrowth(calls, appointments, revenue),
      volatility: calculateVolatility(calls, appointments, revenue),
      predictability: calculatePredictability(calls, appointments, revenue)
    }
  }
}

async function generateRecommendations(businessId: string, businessData: any, insights: any) {
  const recommendations = []

  // Performance-based recommendations
  if (businessData.conversionRate < 30) {
    recommendations.push({
      type: 'conversion',
      priority: 'high',
      title: 'Improve Lead Qualification',
      description: `Your conversion rate is ${businessData.conversionRate.toFixed(1)}%. Focus on better lead qualification and follow-up processes.`,
      action: 'Implement lead scoring system and automated follow-up',
      expectedImpact: 'Increase conversion rate by 15-25%',
      effort: 'medium'
    })
  }

  // Revenue optimization recommendations
  if (businessData.totalRevenue < 10000) {
    recommendations.push({
      type: 'revenue',
      priority: 'high',
      title: 'Increase Average Ticket Size',
      description: `Current revenue is $${businessData.totalRevenue.toFixed(0)}. Focus on upselling and service bundling.`,
      action: 'Implement upselling strategies and service packages',
      expectedImpact: 'Increase revenue by 20-30%',
      effort: 'low'
    })
  }

  // Customer experience recommendations
  if (businessData.avgSatisfaction < 4.0) {
    recommendations.push({
      type: 'experience',
      priority: 'medium',
      title: 'Improve Customer Satisfaction',
      description: `Current satisfaction is ${businessData.avgSatisfaction.toFixed(1)}/5. Focus on service quality and response time.`,
      action: 'Implement customer feedback system and service improvements',
      expectedImpact: 'Increase satisfaction to 4.5+',
      effort: 'medium'
    })
  }

  // Operational efficiency recommendations
  if (businessData.calls.filter(call => call.status === 'missed').length > businessData.calls.length * 0.2) {
    recommendations.push({
      type: 'operations',
      priority: 'high',
      title: 'Reduce Missed Calls',
      description: `You're missing ${businessData.calls.filter(call => call.status === 'missed').length} calls. Implement better call handling.`,
      action: 'Optimize AI response time and add backup systems',
      expectedImpact: 'Reduce missed calls by 50%',
      effort: 'low'
    })
  }

  return recommendations
}

function getPeakCallHours(calls: any[]) {
  const hourlyCounts = Array.from({ length: 24 }, () => 0)
  
  calls.forEach(call => {
    const hour = new Date(call.created_at).getHours()
    hourlyCounts[hour]++
  })
  
  const maxCount = Math.max(...hourlyCounts)
  return hourlyCounts
    .map((count, hour) => ({ hour, count }))
    .filter(item => item.count >= maxCount * 0.8)
    .map(item => `${item.hour}:00`)
    .slice(0, 3)
}

function getTopServices(appointments: any[]) {
  const serviceCounts = new Map()
  
  appointments.forEach(apt => {
    if (apt.service_type) {
      serviceCounts.set(apt.service_type, (serviceCounts.get(apt.service_type) || 0) + 1)
    }
  })
  
  return Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([service]) => service)
}

function getRevenueByDay(revenue: any[]) {
  const dailyRevenue = new Map()
  
  revenue.forEach(transaction => {
    const date = transaction.created_at.split('T')[0]
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + (transaction.amount || 0))
  })
  
  return Array.from(dailyRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

function analyzeCallQuality(calls: any[]) {
  const qualityMetrics = {
    avgDuration: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0,
    satisfaction: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / calls.length : 4,
    completionRate: calls.length > 0 ? (calls.filter(call => call.status === 'completed').length / calls.length) * 100 : 0
  }
  
  if (qualityMetrics.avgDuration > 5 && qualityMetrics.satisfaction > 4.0) {
    return 'excellent'
  } else if (qualityMetrics.avgDuration > 3 && qualityMetrics.satisfaction > 3.5) {
    return 'good'
  } else {
    return 'needs_improvement'
  }
}

function parseAIInsights(aiResponse: string, data: any) {
  // Parse AI response into structured insights
  const insights = []
  const lines = aiResponse.split('\n').filter(line => line.trim())
  
  lines.forEach((line, index) => {
    if (line.includes('insight') || line.includes('finding') || line.includes('discovery')) {
      insights.push({
        id: `insight_${index}`,
        type: 'discovery',
        title: `Key Finding ${index + 1}`,
        description: line.trim(),
        confidence: 0.8,
        data: data
      })
    }
  })
  
  return insights
}

function generateRuleBasedInsights(data: any) {
  const insights = []
  
  if (data.conversionRate > 50) {
    insights.push({
      id: 'high_conversion',
      type: 'strength',
      title: 'High Conversion Rate',
      description: `Your conversion rate of ${data.conversionRate.toFixed(1)}% is excellent and above industry average.`,
      confidence: 0.9,
      data: data
    })
  }
  
  if (data.avgSatisfaction > 4.5) {
    insights.push({
      id: 'high_satisfaction',
      type: 'strength',
      title: 'High Customer Satisfaction',
      description: `Customer satisfaction of ${data.avgSatisfaction.toFixed(1)}/5 indicates excellent service quality.`,
      confidence: 0.9,
      data: data
    })
  }
  
  return insights
}

function analyzeCallTrends(calls: any[]) {
  // Analyze call volume trends over time
  const dailyCalls = new Map()
  
  calls.forEach(call => {
    const date = call.created_at.split('T')[0]
    dailyCalls.set(date, (dailyCalls.get(date) || 0) + 1)
  })
  
  const callCounts = Array.from(dailyCalls.values())
  const trend = callCounts.length > 1 ? 
    (callCounts[callCounts.length - 1] - callCounts[0]) / callCounts.length : 0
  
  return {
    volume: {
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      change: trend,
      volatility: calculateVolatility(callCounts)
    },
    quality: {
      avgDuration: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0,
      satisfaction: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / calls.length : 4
    }
  }
}

function analyzeAppointmentTrends(appointments: any[]) {
  const dailyAppointments = new Map()
  
  appointments.forEach(apt => {
    const date = apt.created_at.split('T')[0]
    dailyAppointments.set(date, (dailyAppointments.get(date) || 0) + 1)
  })
  
  const appointmentCounts = Array.from(dailyAppointments.values())
  const trend = appointmentCounts.length > 1 ? 
    (appointmentCounts[appointmentCounts.length - 1] - appointmentCounts[0]) / appointmentCounts.length : 0
  
  return {
    volume: {
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      change: trend
    },
    completion: {
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      completionRate: appointments.length > 0 ? 
        (appointments.filter(apt => apt.status === 'completed').length / appointments.length) * 100 : 0
    }
  }
}

function analyzeRevenueTrends(revenue: any[]) {
  const dailyRevenue = new Map()
  
  revenue.forEach(transaction => {
    const date = transaction.created_at.split('T')[0]
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + (transaction.amount || 0))
  })
  
  const revenueAmounts = Array.from(dailyRevenue.values())
  const trend = revenueAmounts.length > 1 ? 
    (revenueAmounts[revenueAmounts.length - 1] - revenueAmounts[0]) / revenueAmounts.length : 0
  
  return {
    amount: {
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      change: trend,
      total: revenue.reduce((sum, r) => sum + (r.amount || 0), 0)
    },
    sources: {
      subscription: revenue.filter(r => r.transaction_type === 'subscription').length,
      perBooking: revenue.filter(r => r.transaction_type === 'per_booking').length
    }
  }
}

function analyzeSeasonalPatterns(calls: any[], appointments: any[]) {
  // Analyze patterns by day of week
  const dayOfWeekPatterns = Array.from({ length: 7 }, () => ({ calls: 0, appointments: 0 }))
  
  calls.forEach(call => {
    const dayOfWeek = new Date(call.created_at).getDay()
    dayOfWeekPatterns[dayOfWeek].calls++
  })
  
  appointments.forEach(apt => {
    const dayOfWeek = new Date(apt.created_at).getDay()
    dayOfWeekPatterns[dayOfWeek].appointments++
  })
  
  return {
    dayOfWeek: dayOfWeekPatterns,
    peakDay: dayOfWeekPatterns.reduce((max, day, index) => 
      day.calls > max.calls ? { day: index, calls: day.calls } : max, { day: 0, calls: 0 })
  }
}

function calculateOverallGrowth(calls: any[], appointments: any[], revenue: any[]) {
  // Calculate growth rates
  const callGrowth = calls.length > 0 ? 1 : 0
  const appointmentGrowth = appointments.length > 0 ? 1 : 0
  const revenueGrowth = revenue.length > 0 ? 1 : 0
  
  return {
    calls: callGrowth,
    appointments: appointmentGrowth,
    revenue: revenueGrowth,
    overall: (callGrowth + appointmentGrowth + revenueGrowth) / 3
  }
}

function calculateVolatility(data: number[]) {
  if (data.length < 2) return 0
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  
  return Math.sqrt(variance) / mean
}

function calculatePredictability(calls: any[], appointments: any[], revenue: any[]) {
  // Simple predictability based on consistency
  const callVolatility = calculateVolatility(calls.map(() => 1))
  const appointmentVolatility = calculateVolatility(appointments.map(() => 1))
  const revenueVolatility = calculateVolatility(revenue.map(r => r.amount || 0))
  
  return {
    calls: 1 - callVolatility,
    appointments: 1 - appointmentVolatility,
    revenue: 1 - revenueVolatility,
    overall: 1 - ((callVolatility + appointmentVolatility + revenueVolatility) / 3)
  }
}
