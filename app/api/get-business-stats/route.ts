import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Simulate business stats data
    const businessStats = {
      totalRevenue: 35600,
      totalCalls: 127,
      activeJobs: 23,
      customerRating: 4.8,
      monthlySubscription: 200,
      bookingFee: 50,
      phoneNumber: '+1 (555) 123-4567',
      retellAgentId: 'agent_mock_123',
      onboardingStatus: 'completed',
      lastUpdated: new Date().toISOString(),
      businessName: 'Demo Business',
      businessType: 'HVAC',
      agentStatus: 'active',
      lastCallDate: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: businessStats,
      message: 'Business stats retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching business stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business statistics' }, 
      { status: 500 }
    )
  }
}
