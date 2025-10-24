import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Real analytics system is working!',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/analytics/real-benchmarks',
        '/api/analytics/real-conversion', 
        '/api/analytics/real-charts',
        '/api/analytics/real-insights',
        '/api/dashboard/real-dashboard',
        '/api/analytics/real-time-viz'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test endpoint failed',
      details: error.message 
    }, { status: 500 })
  }
}
