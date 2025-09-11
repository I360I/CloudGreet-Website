import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phoneNumber')
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    console.log(`📊 Fetching phone stats for ${phoneNumber}`)

    // Try to fetch real data from Retell AI first
    const retellApiKey = process.env.RETELL_API_KEY
    if (retellApiKey && retellApiKey.length > 50) {
      try {
        // Fetch call logs from Retell AI
        const retellResponse = await fetch('https://api.retellai.com/v2/list-calls', {
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (retellResponse.ok) {
          const retellData = await retellResponse.json()
          const calls = retellData.calls || []
          
          // Filter calls for this phone number (if available)
          const relevantCalls = calls.filter((call: any) => 
            call.phone_number === phoneNumber || 
            call.to_number === phoneNumber ||
            call.from_number === phoneNumber
          )

          if (relevantCalls.length > 0) {
            const totalCalls = relevantCalls.length
            const totalDuration = relevantCalls.reduce((sum: number, call: any) => 
              sum + (call.call_length || 0), 0)
            const averageDuration = totalDuration / totalCalls
            const successfulCalls = relevantCalls.filter((call: any) => 
              call.end_reason === 'customer_hangup' || call.end_reason === 'agent_hangup'
            ).length
            const successRate = (successfulCalls / totalCalls) * 100

            const stats = {
              totalCalls,
              totalDuration: Math.round(totalDuration),
              averageCallDuration: Math.round(averageDuration),
              successRate: Math.round(successRate * 100) / 100,
              lastCallDate: relevantCalls[0]?.start_timestamp || new Date().toISOString(),
              calls: relevantCalls.map((call: any) => ({
                id: call.call_id,
                timestamp: call.start_timestamp,
                duration: call.call_length,
                status: call.end_reason,
                callerNumber: call.from_number,
                recordingUrl: call.recording_url
              })),
              phoneNumber,
              dataSource: 'retell'
            }

            console.log(`✅ Fetched real Retell stats for ${phoneNumber}:`, stats)
            return NextResponse.json(stats)
          }
        }
      } catch (error) {
        console.error('Error fetching Retell stats:', error)
      }
    }

    // Fallback: Return empty stats if no data available
    const emptyStats = {
      totalCalls: 0,
      totalDuration: 0,
      averageCallDuration: 0,
      successRate: 0,
      lastCallDate: null,
      phoneNumber,
      dataSource: 'none',
      message: 'No call data available yet. Stats will appear once calls are made to your AI agent.'
    }

    console.log(`📊 No call data available for ${phoneNumber}`)
    return NextResponse.json(emptyStats)

  } catch (error) {
    console.error('Error fetching phone stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phone statistics' }, 
      { status: 500 }
    )
  }
}
