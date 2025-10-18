import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Benchmarks query schema
const benchmarksQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = benchmarksQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      timeframe: searchParams.get('timeframe')
    })

    const { businessId, timeframe } = query

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date()
    
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
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Generate comprehensive benchmark data
    const benchmarkData = await generateBenchmarkData(businessId, startDate, now, timeframe)

    return NextResponse.json({
      success: true,
      metrics: benchmarkData.metrics,
      competitors: benchmarkData.competitors,
      metadata: {
        businessId,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Benchmarks API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch benchmark data'
    }, { status: 500 })
  }
}

async function generateBenchmarkData(businessId: string, startDate: Date, endDate: Date, timeframe: string) {
  // Generate realistic benchmark metrics
  const metrics = [
    {
      id: 'response_time',
      name: 'Response Time',
      value: 1.2 + Math.random() * 1.8, // 1.2-3.0 seconds
      benchmark: 2.5,
      industry: 3.2,
      percentile: 75 + Math.random() * 20, // 75-95th percentile
      trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      change: -5 + Math.random() * 10, // -5% to +5%
      unit: 'time',
      description: 'Average time to respond to customer inquiries',
      icon: '⚡'
    },
    {
      id: 'conversion_rate',
      name: 'Conversion Rate',
      value: 65 + Math.random() * 20, // 65-85%
      benchmark: 45,
      industry: 35,
      percentile: 85 + Math.random() * 10, // 85-95th percentile
      trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
      change: -3 + Math.random() * 6, // -3% to +3%
      unit: 'percentage',
      description: 'Percentage of leads that convert to customers',
      icon: '🎯'
    },
    {
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      value: 4.2 + Math.random() * 0.7, // 4.2-4.9
      benchmark: 3.8,
      industry: 3.5,
      percentile: 80 + Math.random() * 15, // 80-95th percentile
      trend: Math.random() > 0.5 ? 'up' : 'stable',
      change: -2 + Math.random() * 4, // -2% to +2%
      unit: 'rating',
      description: 'Average customer satisfaction rating',
      icon: '⭐'
    },
    {
      id: 'call_volume',
      name: 'Call Volume',
      value: 1200 + Math.random() * 800, // 1200-2000
      benchmark: 800,
      industry: 600,
      percentile: 70 + Math.random() * 20, // 70-90th percentile
      trend: Math.random() > 0.4 ? 'up' : Math.random() > 0.2 ? 'down' : 'stable',
      change: -10 + Math.random() * 20, // -10% to +10%
      unit: 'count',
      description: 'Total number of calls received',
      icon: '📞'
    },
    {
      id: 'appointment_booking',
      name: 'Appointment Booking Rate',
      value: 75 + Math.random() * 15, // 75-90%
      benchmark: 60,
      industry: 50,
      percentile: 85 + Math.random() * 10, // 85-95th percentile
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
      change: -5 + Math.random() * 10, // -5% to +5%
      unit: 'percentage',
      description: 'Percentage of calls that result in booked appointments',
      icon: '📅'
    },
    {
      id: 'revenue_per_lead',
      name: 'Revenue per Lead',
      value: 450 + Math.random() * 300, // $450-750
      benchmark: 350,
      industry: 280,
      percentile: 75 + Math.random() * 20, // 75-95th percentile
      trend: Math.random() > 0.4 ? 'up' : Math.random() > 0.2 ? 'down' : 'stable',
      change: -8 + Math.random() * 16, // -8% to +8%
      unit: 'currency',
      description: 'Average revenue generated per lead',
      icon: '💰'
    },
    {
      id: 'first_call_resolution',
      name: 'First Call Resolution',
      value: 85 + Math.random() * 10, // 85-95%
      benchmark: 70,
      industry: 65,
      percentile: 90 + Math.random() * 8, // 90-98th percentile
      trend: Math.random() > 0.6 ? 'up' : 'stable',
      change: -2 + Math.random() * 4, // -2% to +2%
      unit: 'percentage',
      description: 'Percentage of issues resolved on first contact',
      icon: '✅'
    },
    {
      id: 'average_handle_time',
      name: 'Average Handle Time',
      value: 4.5 + Math.random() * 2.5, // 4.5-7.0 minutes
      benchmark: 6.0,
      industry: 7.5,
      percentile: 70 + Math.random() * 25, // 70-95th percentile
      trend: Math.random() > 0.7 ? 'down' : Math.random() > 0.5 ? 'up' : 'stable',
      change: -8 + Math.random() * 16, // -8% to +8%
      unit: 'time',
      description: 'Average time spent handling each call',
      icon: '⏱️'
    },
    {
      id: 'lead_quality_score',
      name: 'Lead Quality Score',
      value: 7.5 + Math.random() * 2.0, // 7.5-9.5
      benchmark: 6.0,
      industry: 5.5,
      percentile: 80 + Math.random() * 15, // 80-95th percentile
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
      change: -5 + Math.random() * 10, // -5% to +5%
      unit: 'rating',
      description: 'Average quality score of incoming leads',
      icon: '🏆'
    },
    {
      id: 'system_uptime',
      name: 'System Uptime',
      value: 99.5 + Math.random() * 0.4, // 99.5-99.9%
      benchmark: 99.0,
      industry: 98.5,
      percentile: 85 + Math.random() * 12, // 85-97th percentile
      trend: Math.random() > 0.8 ? 'up' : 'stable',
      change: -0.1 + Math.random() * 0.2, // -0.1% to +0.1%
      unit: 'percentage',
      description: 'System availability and reliability',
      icon: '🛡️'
    }
  ]

  // Generate competitor comparison data
  const competitors = [
    {
      id: 'competitor_1',
      name: 'Premier HVAC Solutions',
      type: 'direct' as const,
      metrics: {
        responseTime: 2.1,
        conversionRate: 58,
        satisfaction: 4.1,
        marketShare: 15.2
      },
      strengths: [
        'Strong local brand recognition',
        'Excellent customer service team',
        'Fast response times',
        'Comprehensive service offerings'
      ],
      weaknesses: [
        'Higher pricing than competitors',
        'Limited online presence',
        'Seasonal capacity constraints',
        'Older technology stack'
      ]
    },
    {
      id: 'competitor_2',
      name: 'QuickFix Services',
      type: 'direct' as const,
      metrics: {
        responseTime: 1.8,
        conversionRate: 42,
        satisfaction: 3.7,
        marketShare: 8.5
      },
      strengths: [
        'Very fast response times',
        'Competitive pricing',
        '24/7 emergency service',
        'Modern booking system'
      ],
      weaknesses: [
        'Lower customer satisfaction',
        'Limited service area',
        'High staff turnover',
        'Quality control issues'
      ]
    },
    {
      id: 'competitor_3',
      name: 'Elite Home Services',
      type: 'indirect' as const,
      metrics: {
        responseTime: 3.2,
        conversionRate: 35,
        satisfaction: 4.3,
        marketShare: 12.8
      },
      strengths: [
        'Premium service quality',
        'High customer satisfaction',
        'Strong referral network',
        'Experienced technicians'
      ],
      weaknesses: [
        'Slower response times',
        'Higher prices',
        'Limited emergency availability',
        'Smaller service area'
      ]
    },
    {
      id: 'competitor_4',
      name: 'TechCorp Solutions',
      type: 'aspirational' as const,
      metrics: {
        responseTime: 0.8,
        conversionRate: 78,
        satisfaction: 4.8,
        marketShare: 25.3
      },
      strengths: [
        'Industry-leading technology',
        'Exceptional customer experience',
        'High conversion rates',
        'Strong online presence',
        'AI-powered customer service'
      ],
      weaknesses: [
        'Premium pricing',
        'Limited local presence',
        'Complex service offerings',
        'High customer acquisition costs'
      ]
    }
  ]

  return {
    metrics,
    competitors
  }
}
