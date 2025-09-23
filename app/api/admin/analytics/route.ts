import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock analytics data - in production, fetch from database
    const analytics = {
      revenue: {
        daily: [1200, 1350, 1100, 1450, 1600, 1800, 1650],
        weekly: [8500, 9200, 8800, 9500, 10200, 10800, 11200],
        monthly: [45000, 48000, 46500, 52000, 55000, 58000, 62000]
      },
      calls: {
        total: 2340,
        answered: 2106,
        missed: 234,
        conversionRate: 78.5,
        averageDuration: 4.2,
        dailyBreakdown: [45, 52, 38, 61, 55, 67, 49]
      },
      appointments: {
        total: 1890,
        completed: 1720,
        cancelled: 95,
        noShow: 75,
        completionRate: 91.0,
        dailyBreakdown: [28, 32, 25, 38, 35, 42, 31]
      },
      clients: {
        new: 45,
        active: 127,
        churned: 8,
        retentionRate: 94.1,
        averageValue: 1850
      },
      sms: {
        sent: 3240,
        delivered: 3198,
        replied: 456,
        responseRate: 14.3
      },
      performance: {
        systemUptime: 99.8,
        responseTime: 1.2,
        errorRate: 0.1,
        satisfaction: 4.7
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch analytics data' 
    }, { status: 500 })
  }
}

