import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user data to find their Retell agent ID and phone number
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/get-user-data?userId=${userId}`)
    const userData = await userResponse.json()
    
    if (!userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userData.user
    const retellAgentId = user.retell_agent_id
    const phoneNumber = user.phone_number

    if (!retellAgentId || !phoneNumber) {
      // Return default stats if no Retell connection
      return NextResponse.json({
        calls: {
          total: 0,
          answered: 0,
          missed: 0,
          conversion: 0
        },
        bookings: {
          total: 0,
          confirmed: 0,
          cancelled: 0
        },
        revenue: {
          potential: 0,
          actual: 0
        },
        systemStatus: {
          connected: false,
          lastActivity: null,
          uptime: 0
        }
      })
    }

    // Fetch real-time data from Retell API
    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey || retellApiKey.includes('mock')) {
      // Return default data when API key is not configured or is a mock key
      return NextResponse.json({
        calls: {
          total: 0,
          answered: 0,
          missed: 0,
          conversion: 0
        },
        bookings: {
          total: 0,
          confirmed: 0,
          cancelled: 0
        },
        revenue: {
          potential: 0,
          actual: 0
        },
        systemStatus: {
          connected: false,
          lastActivity: null,
          uptime: 0,
          phoneNumber: '',
          agentId: ''
        },
        recentActivity: []
      })
    }

    // Get call logs from Retell
    const callsResponse = await fetch(`https://api.retellai.com/v2/get-call`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    let callsData = { calls: [] }
    if (callsResponse.ok) {
      callsData = await callsResponse.json()
    }

    // Get agent status
    const agentResponse = await fetch(`https://api.retellai.com/v2/get-agent/${retellAgentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    let agentData = { status: 'inactive' }
    if (agentResponse.ok) {
      agentData = await agentResponse.json()
    }

    // Process call data
    const calls = callsData.calls || []
    const today = new Date().toISOString().split('T')[0]
    const todayCalls = calls.filter(call => 
      call.start_timestamp && call.start_timestamp.startsWith(today)
    )

    const totalCalls = todayCalls.length
    const answeredCalls = todayCalls.filter(call => call.end_timestamp).length
    const missedCalls = totalCalls - answeredCalls
    const conversionRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

    // Calculate bookings (assuming calls with duration > 30 seconds are bookings)
    const bookings = todayCalls.filter(call => {
      if (!call.start_timestamp || !call.end_timestamp) return false
      const start = new Date(call.start_timestamp)
      const end = new Date(call.end_timestamp)
      const duration = (end.getTime() - start.getTime()) / 1000
      return duration > 30
    })

    // Calculate revenue (based on average job value)
    const averageJobValue = user.average_job_value || 300
    const potentialRevenue = bookings.length * averageJobValue

    // Get system status
    const isConnected = agentData.status === 'active'
    const lastActivity = todayCalls.length > 0 ? todayCalls[0].start_timestamp : null
    const uptime = isConnected ? 100 : 0

    const stats = {
      calls: {
        total: totalCalls,
        answered: answeredCalls,
        missed: missedCalls,
        conversion: conversionRate
      },
      bookings: {
        total: bookings.length,
        confirmed: bookings.length,
        cancelled: 0
      },
      revenue: {
        potential: potentialRevenue,
        actual: potentialRevenue * 0.8 // Assume 80% conversion to actual revenue
      },
      systemStatus: {
        connected: isConnected,
        lastActivity: lastActivity,
        uptime: uptime,
        phoneNumber: phoneNumber,
        agentId: retellAgentId
      },
      recentActivity: todayCalls.slice(0, 5).map(call => ({
        type: call.end_timestamp ? 'call_answered' : 'call_missed',
        timestamp: call.start_timestamp,
        duration: call.end_timestamp ? 
          Math.round((new Date(call.end_timestamp).getTime() - new Date(call.start_timestamp).getTime()) / 1000) : 0,
        phoneNumber: call.from_number || 'Unknown'
      }))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching Retell stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats from Retell API' },
      { status: 500 }
    )
  }
}
