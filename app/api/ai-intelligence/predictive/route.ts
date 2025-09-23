import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessId, analysisType = 'general' } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real historical data for predictions
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Get last 90 days of data for trend analysis
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [callsResult, appointmentsResult] = await Promise.all([
      supabaseAdmin().from('call_logs')
        .select('created_at, status, duration')
        .eq('business_id', businessId)
        .gte('created_at', ninetyDaysAgo.toISOString()),
      
      supabaseAdmin().from('appointments')
        .select('created_at, actual_value, estimated_value, status')
        .eq('business_id', businessId)
        .gte('created_at', ninetyDaysAgo.toISOString())
    ])

    const calls = callsResult.data || []
    const appointments = appointmentsResult.data || []

    // Calculate historical trends
    const recentCalls = calls.filter(call => new Date((call as any).created_at) >= thirtyDaysAgo).length
    const olderCalls = calls.filter(call => {
      const callDate = new Date((call as any).created_at)
      return callDate >= ninetyDaysAgo && callDate < thirtyDaysAgo
    }).length

    const recentRevenue = appointments
      .filter(apt => new Date((apt as any).created_at) >= thirtyDaysAgo)
      .reduce((sum, apt) => sum + ((apt as any).actual_value || (apt as any).estimated_value || 0), 0)
    
    const olderRevenue = appointments
      .filter(apt => {
        const aptDate = new Date((apt as any).created_at)
        return aptDate >= ninetyDaysAgo && aptDate < thirtyDaysAgo
      })
      .reduce((sum, apt) => sum + ((apt as any).actual_value || (apt as any).estimated_value || 0), 0)

    // Calculate trends
    const callTrend = olderCalls > 0 ? ((recentCalls - olderCalls) / olderCalls) * 100 : 0
    const revenueTrend = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0

    // Calculate conversion rate
    const recentAnsweredCalls = calls
      .filter(call => new Date((call as any).created_at) >= thirtyDaysAgo && (call as any).status === 'answered')
      .length
    const recentConversionRate = recentCalls > 0 ? (recentAnsweredCalls / recentCalls) * 100 : 0

    // Generate predictions based on trends
    const predictedCallVolume = Math.max(1, Math.round(recentCalls * (1 + callTrend / 100)))
    const predictedRevenue = Math.max(0, Math.round(recentRevenue * (1 + revenueTrend / 100)))
    const predictedConversion = Math.min(100, Math.max(0, recentConversionRate))

    const predictions = {
      id: `prediction_${Date.now()}`,
      businessId,
      analysisType,
      insights: {
        callVolume: {
          predicted: predictedCallVolume,
          confidence: Math.min(0.95, Math.max(0.5, 0.7 + Math.abs(callTrend) / 1000)),
          trend: callTrend > 5 ? 'increasing' : callTrend < -5 ? 'decreasing' : 'stable',
          factors: callTrend > 0 ? ['growth trend', 'increased activity'] : ['declining trend', 'seasonal variation']
        },
        appointmentConversion: {
          predicted: Math.round(predictedConversion),
          confidence: Math.min(0.95, Math.max(0.6, 0.8 + Math.abs(recentConversionRate - 50) / 1000)),
          trend: recentConversionRate > 70 ? 'increasing' : recentConversionRate < 30 ? 'decreasing' : 'stable',
          factors: recentConversionRate > 50 ? ['good call quality', 'effective responses'] : ['improvement needed', 'call handling optimization']
        },
        revenue: {
          predicted: predictedRevenue,
          confidence: Math.min(0.95, Math.max(0.5, 0.7 + Math.abs(revenueTrend) / 1000)),
          trend: revenueTrend > 10 ? 'increasing' : revenueTrend < -10 ? 'decreasing' : 'stable',
          factors: revenueTrend > 0 ? ['appointment volume growth', 'increased ticket values'] : ['revenue decline', 'market conditions']
        }
      },
      recommendations: [
        recentConversionRate < 50 ? 'Focus on improving call response quality' : 'Maintain current call handling standards',
        callTrend < 0 ? 'Consider marketing campaigns to increase call volume' : 'Optimize existing call handling capacity',
        revenueTrend < 0 ? 'Review pricing strategy and service offerings' : 'Scale operations to handle growth'
      ],
      timestamp: new Date().toISOString()
    }

    // In production, this would:
    // 1. Analyze historical business data
    // 2. Use AI/ML models for predictions
    // 3. Generate actionable insights
    // 4. Provide specific recommendations

    return NextResponse.json({
      success: true,
      error_message: 'Predictive analysis completed successfully',
      data: predictions
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to generate predictive insights'
    }, { status: 500 })
  }
}