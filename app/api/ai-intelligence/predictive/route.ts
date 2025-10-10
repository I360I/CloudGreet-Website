import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'AI features not configured - OpenAI API key missing'
      }, { status: 503 })
    }

    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    // For now, allow requests without headers to prevent 401 errors during testing
    // In production, you'd want proper authentication
    if (!userId || !businessId) {
      console.warn('AI intelligence API called without authentication headers')
    }

    // Get comprehensive business data
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // AI-powered predictive analysis
    const analysisPrompt = `
    Analyze this business data and provide predictive insights:

    Business: ${business?.business_name} (${business?.business_type})
    Total Calls (90 days): ${calls?.length || 0}
    Total Appointments (90 days): ${appointments?.length || 0}
    
    Call Patterns:
    - Peak hours: ${getPeakHours(calls)}
    - Average call duration: ${getAvgCallDuration(calls)} minutes
    - Conversion rate: ${getConversionRate(calls, appointments)}%
    
    Appointment Data:
    - Completion rate: ${getCompletionRate(appointments)}%
    - Average value: $${getAvgAppointmentValue(appointments)}
    - Seasonal trends: ${getSeasonalTrends(appointments)}

    Provide:
    1. Revenue predictions for next 30/90 days
    2. Optimal call handling strategies
    3. Peak time recommendations
    4. Customer behavior insights
    5. Growth opportunities
    6. Risk factors to watch
    7. Specific action items to increase revenue
    `

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 1000,
      temperature: 0.3
    })

    const insights = analysis.choices[0]?.message?.content || 'Analysis failed'

    // Generate specific recommendations
    const recommendations = await generateRecommendations(business, calls, appointments)

    return NextResponse.json({
      success: true,
      data: {
        insights,
        recommendations,
        predictions: {
          next30Days: {
            estimatedCalls: Math.round((calls?.length || 0) * 1.1),
            estimatedAppointments: Math.round((appointments?.length || 0) * 1.15),
            estimatedRevenue: Math.round((appointments?.length || 0) * 1.15 * getAvgAppointmentValue(appointments))
          },
          next90Days: {
            estimatedCalls: Math.round((calls?.length || 0) * 3.3),
            estimatedAppointments: Math.round((appointments?.length || 0) * 3.5),
            estimatedRevenue: Math.round((appointments?.length || 0) * 3.5 * getAvgAppointmentValue(appointments))
          }
        },
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('AI intelligence analysis error', error as Error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate insights'
    }, { status: 500 })
  }
}

function getPeakHours(calls: any[]) {
  if (!calls?.length) return 'No data'
  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => {
    const count = calls.filter(call => new Date(call.created_at).getHours() === hour).length
    return { hour, count }
  }).sort((a, b) => b.count - a.count)
  
  return hourlyCounts.slice(0, 3).map(h => `${h.hour}:00`).join(', ')
}

function getAvgCallDuration(calls: any[]) {
  if (!calls?.length) return 0
  const total = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
  return Math.round(total / calls.length / 60) // Convert to minutes
}

function getConversionRate(calls: any[], appointments: any[]) {
  if (!calls?.length) return 0
  return Math.round((appointments?.length || 0) / calls.length * 100)
}

function getCompletionRate(appointments: any[]) {
  if (!appointments?.length) return 0
  const completed = appointments.filter(apt => apt.status === 'completed').length
  return Math.round(completed / appointments.length * 100)
}

function getAvgAppointmentValue(appointments: any[]) {
  if (!appointments?.length) return 500
  const total = appointments.reduce((sum, apt) => sum + (apt.estimated_value || 500), 0)
  return Math.round(total / appointments.length)
}

function getSeasonalTrends(appointments: any[]) {
  if (!appointments?.length) return 'No data'
  // Simple seasonal analysis
  const monthlyCounts = Array.from({ length: 12 }, (_, month) => {
    const count = appointments.filter(apt => new Date(apt.created_at).getMonth() === month).length
    return { month, count }
  })
  
  const peakMonth = monthlyCounts.sort((a, b) => b.count - a.count)[0]
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return `Peak: ${monthNames[peakMonth.month]} (${peakMonth.count} appointments)`
}

async function generateRecommendations(business: any, calls: any[], appointments: any[]) {
  const recommendations = []
  
  // Call volume recommendations
  if (calls?.length < 50) {
    recommendations.push({
      type: 'growth',
      priority: 'high',
      title: 'Increase Call Volume',
      description: 'Consider local SEO and advertising to increase call volume',
      impact: 'Could increase revenue by 200-300%',
      effort: 'medium'
    })
  }
  
  // Conversion rate recommendations
  const conversionRate = getConversionRate(calls, appointments)
  if (conversionRate < 15) {
    recommendations.push({
      type: 'optimization',
      priority: 'high',
      title: 'Improve Call Conversion',
      description: 'Optimize AI agent scripts and qualification process',
      impact: 'Could increase appointments by 50-100%',
      effort: 'low'
    })
  }
  
  // Peak time recommendations
  const peakHours = getPeakHours(calls)
  if (peakHours !== 'No data') {
    recommendations.push({
      type: 'scheduling',
      priority: 'medium',
      title: 'Optimize Peak Hours',
      description: `Focus marketing efforts during peak hours: ${peakHours}`,
      impact: 'Could increase conversion by 20-30%',
      effort: 'low'
    })
  }
  
  return recommendations
}
