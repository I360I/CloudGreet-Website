import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Conversion query schema
const conversionQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = conversionQuerySchema.parse({
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

    // Generate comprehensive conversion data
    const conversionData = await generateConversionData(businessId, startDate, now, timeframe)

    return NextResponse.json({
      success: true,
      stages: conversionData.stages,
      sources: conversionData.sources,
      metadata: {
        businessId,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Conversion API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversion data'
    }, { status: 500 })
  }
}

async function generateConversionData(businessId: string, startDate: Date, endDate: Date, timeframe: string) {
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate realistic funnel stages
  const stages = [
    {
      id: 'website_visits',
      name: 'Website Visits',
      count: Math.floor(10000 + Math.random() * 5000),
      conversionRate: 100,
      avgTimeInStage: 0.5, // 30 minutes
      revenue: 0,
      color: 'bg-blue-100 text-blue-600',
      icon: '👥'
    },
    {
      id: 'lead_forms',
      name: 'Lead Forms',
      count: Math.floor(2500 + Math.random() * 1000),
      conversionRate: 25 + Math.random() * 10, // 25-35%
      avgTimeInStage: 2, // 2 hours
      revenue: 0,
      color: 'bg-green-100 text-green-600',
      icon: '📝'
    },
    {
      id: 'qualified_leads',
      name: 'Qualified Leads',
      count: Math.floor(1800 + Math.random() * 800),
      conversionRate: 70 + Math.random() * 15, // 70-85%
      avgTimeInStage: 24, // 1 day
      revenue: 0,
      color: 'bg-yellow-100 text-yellow-600',
      icon: '✅'
    },
    {
      id: 'quotes_sent',
      name: 'Quotes Sent',
      count: Math.floor(1200 + Math.random() * 600),
      conversionRate: 65 + Math.random() * 20, // 65-85%
      avgTimeInStage: 48, // 2 days
      revenue: 0,
      color: 'bg-purple-100 text-purple-600',
      icon: '💰'
    },
    {
      id: 'appointments',
      name: 'Appointments',
      count: Math.floor(750 + Math.random() * 400),
      conversionRate: 80 + Math.random() * 15, // 80-95%
      avgTimeInStage: 72, // 3 days
      revenue: 0,
      color: 'bg-indigo-100 text-indigo-600',
      icon: '📅'
    },
    {
      id: 'completed_jobs',
      name: 'Completed Jobs',
      count: Math.floor(420 + Math.random() * 200),
      conversionRate: 100, // Final stage
      avgTimeInStage: 168, // 1 week
      revenue: Math.floor(210000 + Math.random() * 100000),
      color: 'bg-emerald-100 text-emerald-600',
      icon: '🎯'
    }
  ]

  // Calculate conversion rates between stages
  for (let i = 1; i < stages.length; i++) {
    const currentStage = stages[i]
    const previousStage = stages[i - 1]
    const conversionRate = (currentStage.count / previousStage.count) * 100
    stages[i] = {
      ...currentStage,
      conversionRate: Math.round(conversionRate * 10) / 10
    }
  }

  // Generate lead sources data
  const sources = [
    {
      id: 'google_ads',
      name: 'Google Ads',
      totalLeads: Math.floor(800 + Math.random() * 400),
      qualifiedLeads: Math.floor(600 + Math.random() * 300),
      convertedLeads: Math.floor(120 + Math.random() * 80),
      conversionRate: 15 + Math.random() * 10, // 15-25%
      avgValue: 450 + Math.random() * 200, // $450-650
      totalRevenue: 0,
      cost: 2500 + Math.random() * 1500, // $2500-4000
      roas: 0
    },
    {
      id: 'facebook_ads',
      name: 'Facebook Ads',
      totalLeads: Math.floor(600 + Math.random() * 300),
      qualifiedLeads: Math.floor(400 + Math.random() * 200),
      convertedLeads: Math.floor(80 + Math.random() * 50),
      conversionRate: 12 + Math.random() * 8, // 12-20%
      avgValue: 380 + Math.random() * 150, // $380-530
      totalRevenue: 0,
      cost: 1800 + Math.random() * 1000, // $1800-2800
      roas: 0
    },
    {
      id: 'organic_search',
      name: 'Organic Search',
      totalLeads: Math.floor(1200 + Math.random() * 600),
      qualifiedLeads: Math.floor(900 + Math.random() * 450),
      convertedLeads: Math.floor(180 + Math.random() * 120),
      conversionRate: 15 + Math.random() * 8, // 15-23%
      avgValue: 520 + Math.random() * 250, // $520-770
      totalRevenue: 0,
      cost: 500 + Math.random() * 300, // $500-800 (SEO costs)
      roas: 0
    },
    {
      id: 'referrals',
      name: 'Referrals',
      totalLeads: Math.floor(300 + Math.random() * 150),
      qualifiedLeads: Math.floor(250 + Math.random() * 125),
      convertedLeads: Math.floor(90 + Math.random() * 60),
      conversionRate: 28 + Math.random() * 12, // 28-40%
      avgValue: 680 + Math.random() * 320, // $680-1000
      totalRevenue: 0,
      cost: 200 + Math.random() * 100, // $200-300 (referral bonuses)
      roas: 0
    },
    {
      id: 'direct_traffic',
      name: 'Direct Traffic',
      totalLeads: Math.floor(400 + Math.random() * 200),
      qualifiedLeads: Math.floor(320 + Math.random() * 160),
      convertedLeads: Math.floor(70 + Math.random() * 40),
      conversionRate: 17 + Math.random() * 8, // 17-25%
      avgValue: 480 + Math.random() * 220, // $480-700
      totalRevenue: 0,
      cost: 100 + Math.random() * 50, // $100-150 (brand costs)
      roas: 0
    },
    {
      id: 'social_media',
      name: 'Social Media',
      totalLeads: Math.floor(200 + Math.random() * 100),
      qualifiedLeads: Math.floor(140 + Math.random() * 70),
      convertedLeads: Math.floor(25 + Math.random() * 15),
      conversionRate: 12 + Math.random() * 8, // 12-20%
      avgValue: 350 + Math.random() * 150, // $350-500
      totalRevenue: 0,
      cost: 800 + Math.random() * 400, // $800-1200
      roas: 0
    }
  ]

  // Calculate revenue and ROAS for sources
  sources.forEach(source => {
    source.totalRevenue = source.convertedLeads * source.avgValue
    source.roas = source.totalRevenue / source.cost
  })

  // Sort sources by total revenue
  sources.sort((a, b) => b.totalRevenue - a.totalRevenue)

  return {
    stages,
    sources
  }
}
