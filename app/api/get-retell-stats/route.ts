import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey) {
      return NextResponse.json({ error: 'Retell API key not configured' }, { status: 500 })
    }

    // Fetch call statistics from Retell AI
    const retellResponse = await fetch(`https://api.retellai.com/get-call/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!retellResponse.ok) {
      throw new Error(`Retell API error: ${retellResponse.status}`)
    }

    const retellData = await retellResponse.json()
    
    // Calculate statistics
    const stats = {
      totalCalls: retellData.call_count || 0,
      totalDuration: retellData.total_duration || 0,
      averageCallDuration: retellData.average_duration || 0,
      successRate: retellData.success_rate || 0,
      lastCallDate: retellData.last_call_date || null
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching Retell stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call statistics' }, 
      { status: 500 }
    )
  }
}
