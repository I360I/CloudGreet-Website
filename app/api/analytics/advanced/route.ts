import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Analytics query schema
const analyticsQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  comparisonPeriod: z.enum(['previous', 'same_last_year', 'custom']).default('previous')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = analyticsQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      timeframe: searchParams.get('timeframe'),
      comparisonPeriod: searchParams.get('comparisonPeriod')
    })

    const { businessId, timeframe, comparisonPeriod } = query

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

    // Mock data for demonstration - in production, this would query your database
    const analyticsData = await generateAdvancedAnalytics(businessId, startDate, now, timeframe)

    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Advanced analytics API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics'
    }, { status: 500 })
  }
}

async function generateAdvancedAnalytics(businessId: string, startDate: Date, endDate: Date, timeframe: string) {
  // In production, replace this with actual database queries
  // This is comprehensive mock data for demonstration
  
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate realistic revenue data
  const baseRevenue = 25000 + Math.random() * 15000
  const revenueGrowth = 0.05 + Math.random() * 0.15 // 5-20% growth
  
  // Generate calls data
  const baseCalls = 180 + Math.random() * 120
  const conversionRate = 0.65 + Math.random() * 0.25 // 65-90% conversion
  
  // Generate appointments data
  const baseAppointments = Math.floor(baseCalls * conversionRate)
  const completionRate = 0.75 + Math.random() * 0.20 // 75-95% completion
  
  // Generate leads data
  const baseLeads = baseCalls * 1.2 // 20% more leads than calls
  const leadConversionRate = 0.35 + Math.random() * 0.30 // 35-65% lead conversion

  // Generate peak hours data (realistic call distribution)
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: Math.floor(
      baseCalls * getHourMultiplier(hour) * (1 + Math.random() * 0.3)
    )
  }))

  // Generate daily trends
  const dailyTrends = Array.from({ length: daysInPeriod }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const multiplier = isWeekend ? 0.3 + Math.random() * 0.4 : 0.8 + Math.random() * 0.4
    
    return {
      date: date.toISOString().split('T')[0],
      calls: Math.floor(baseCalls * multiplier / daysInPeriod),
      appointments: Math.floor(baseAppointments * multiplier / daysInPeriod),
      revenue: Math.floor(baseRevenue * multiplier / daysInPeriod)
    }
  })

  // Generate weekly trends
  const weeklyTrends = Array.from({ length: Math.ceil(daysInPeriod / 7) }, (_, week) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + week * 7)
    
    const weekData = dailyTrends.slice(week * 7, (week + 1) * 7)
    
    return {
      week: `Week ${week + 1}`,
      calls: weekData.reduce((sum, day) => sum + day.calls, 0),
      appointments: weekData.reduce((sum, day) => sum + day.appointments, 0),
      revenue: weekData.reduce((sum, day) => sum + day.revenue, 0)
    }
  })

  // Generate lead sources
  const leadSources = [
    { source: 'Phone Calls', count: Math.floor(baseLeads * 0.4), conversion: 0.7 },
    { source: 'Website', count: Math.floor(baseLeads * 0.25), conversion: 0.5 },
    { source: 'Referrals', count: Math.floor(baseLeads * 0.15), conversion: 0.8 },
    { source: 'Social Media', count: Math.floor(baseLeads * 0.1), conversion: 0.3 },
    { source: 'Google Ads', count: Math.floor(baseLeads * 0.1), conversion: 0.6 }
  ]

  return {
    revenue: {
      total: Math.floor(baseRevenue),
      monthly: Math.floor(baseRevenue / (daysInPeriod / 30)),
      weekly: Math.floor(baseRevenue / (daysInPeriod / 7)),
      daily: Math.floor(baseRevenue / daysInPeriod),
      growth: revenueGrowth * 100,
      projection: Math.floor(baseRevenue * (1 + revenueGrowth))
    },
    calls: {
      total: Math.floor(baseCalls),
      answered: Math.floor(baseCalls * conversionRate),
      missed: Math.floor(baseCalls * (1 - conversionRate)),
      conversionRate: conversionRate * 100,
      averageDuration: 4.5 + Math.random() * 3, // 4.5-7.5 minutes
      peakHours
    },
    appointments: {
      total: baseAppointments,
      completed: Math.floor(baseAppointments * completionRate),
      cancelled: Math.floor(baseAppointments * (1 - completionRate) * 0.7),
      noShow: Math.floor(baseAppointments * (1 - completionRate) * 0.3),
      completionRate: completionRate * 100,
      averageValue: 450 + Math.random() * 300 // $450-750 average
    },
    leads: {
      total: Math.floor(baseLeads),
      qualified: Math.floor(baseLeads * 0.6),
      converted: Math.floor(baseLeads * leadConversionRate),
      conversionRate: leadConversionRate * 100,
      sources: leadSources
    },
    performance: {
      systemUptime: 99.5 + Math.random() * 0.4, // 99.5-99.9%
      responseTime: 1.2 + Math.random() * 0.8, // 1.2-2.0 seconds
      errorRate: Math.random() * 0.5, // 0-0.5%
      satisfaction: 4.2 + Math.random() * 0.7 // 4.2-4.9 stars
    },
    trends: {
      daily: dailyTrends,
      weekly: weeklyTrends,
      monthly: [] // Would generate monthly data for longer timeframes
    }
  }
}

function getHourMultiplier(hour: number): number {
  // Realistic call distribution throughout the day
  if (hour >= 9 && hour <= 17) {
    // Business hours - peak
    return 1.0
  } else if (hour >= 8 && hour <= 20) {
    // Extended hours - medium
    return 0.6
  } else if (hour >= 6 && hour <= 22) {
    // Early/late - low
    return 0.3
  } else {
    // Night hours - very low
    return 0.1
  }
}
