import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock admin statistics - in production, fetch from database
    const stats = {
      totalClients: 127,
      activeClients: 98,
      monthlyRevenue: 45600,
      totalRevenue: 234500,
      averageClientValue: 1850,
      conversionRate: 78.5,
      callsToday: 23,
      appointmentsToday: 15,
      smsSent: 89,
      systemHealth: 'excellent'
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch admin statistics' 
    }, { status: 500 })
  }
}

