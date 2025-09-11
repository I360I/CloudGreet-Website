import { NextRequest, NextResponse } from 'next/server'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId') || 'agent_mock_123'
    const userId = searchParams.get('userId')

    // Simulate Retell stats data
    const stats = {
      totalCalls: 45,
      totalDuration: 2340,
      averageCallDuration: 52,
      successRate: 87.5,
      lastCallDate: new Date().toISOString(),
      agentId: agentId,
      userId: userId
    }

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Retell stats retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching Retell stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call statistics' }, 
      { status: 500 }
    )
  }
}
