import { NextRequest, NextResponse } from 'next/server'

// System status store
let systemStatus = {
  phoneSystem: {
    status: 'disconnected',
    lastCheck: new Date().toISOString(),
    details: 'No phone number configured'
  },
  calendarSync: {
    status: 'disconnected',
    lastCheck: new Date().toISOString(),
    details: 'No calendar integration configured'
  },
  aiEngine: {
    status: 'disconnected',
    lastCheck: new Date().toISOString(),
    details: 'AI agent not created'
  },
  speechServices: {
    status: 'disconnected',
    lastCheck: new Date().toISOString(),
    details: 'Azure Speech Services not configured'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user has completed onboarding
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      // Return disconnected status for all systems
      const disconnectedStatus = {
        phoneSystem: {
          status: 'disconnected',
          lastCheck: new Date().toISOString(),
          details: 'Complete onboarding to get phone number'
        },
        calendarSync: {
          status: 'disconnected',
          lastCheck: new Date().toISOString(),
          details: 'Complete onboarding to connect calendar'
        },
        aiEngine: {
          status: 'disconnected',
          lastCheck: new Date().toISOString(),
          details: 'Complete onboarding to configure AI'
        },
        speechServices: {
          status: 'disconnected',
          lastCheck: new Date().toISOString(),
          details: 'Complete onboarding to activate speech services'
        }
      }
      
      return NextResponse.json({
        success: true,
        data: disconnectedStatus,
        message: 'System status - onboarding not complete'
      })
    }

    // Onboarding complete - connect all systems
    const now = new Date().toISOString()
    systemStatus = {
      phoneSystem: {
        status: 'connected',
        lastCheck: now,
        details: `Phone number (555) 123-4567 active for ${businessName}`,
        phoneNumber: '(555) 123-4567'
      },
      calendarSync: {
        status: 'connected',
        lastCheck: now,
        details: `Google Calendar synced for ${businessName}`,
        provider: 'Google Calendar'
      },
      aiEngine: {
        status: 'connected',
        lastCheck: now,
        details: `AI receptionist trained for ${businessName}`,
        agentName: `${businessName} Receptionist`,
        greeting: `Thanks for calling ${businessName}, this is your virtual receptionist. How can I help you today?`
      },
      speechServices: {
        status: 'connected',
        lastCheck: now,
        details: 'Azure Speech Services connected and operational',
        language: 'English'
      }
    }

    return NextResponse.json({
      success: true,
      data: systemStatus,
      timestamp: now
    })

  } catch (error) {
    console.error('System status API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'update_status':
        // Update system status
        if (data.system && systemStatus[data.system]) {
          systemStatus[data.system] = {
            ...systemStatus[data.system],
            status: data.status,
            details: data.details || systemStatus[data.system].details,
            lastCheck: new Date().toISOString()
          }
        }
        break

      case 'connect_phone':
        // Simulate phone system connection
        systemStatus.phoneSystem = {
          status: 'connected',
          lastCheck: new Date().toISOString(),
          details: `Phone number ${data.phoneNumber || '+1 (555) 123-4567'} is active`
        }
        break

      case 'connect_calendar':
        // Simulate calendar connection
        systemStatus.calendarSync = {
          status: 'connected',
          lastCheck: new Date().toISOString(),
          details: `Connected to ${data.provider || 'Google Calendar'}`
        }
        break

      case 'connect_ai':
        // Simulate AI engine connection
        systemStatus.aiEngine = {
          status: 'connected',
          lastCheck: new Date().toISOString(),
          details: `AI agent "${data.agentName || 'Business Receptionist'}" is active`
        }
        break

      case 'connect_speech':
        // Simulate speech services connection
        systemStatus.speechServices = {
          status: 'connected',
          lastCheck: new Date().toISOString(),
          details: 'Azure Speech Services connected and operational'
        }
        break

      case 'disconnect':
        // Disconnect a system
        if (data.system && systemStatus[data.system]) {
          systemStatus[data.system] = {
            status: 'disconnected',
            lastCheck: new Date().toISOString(),
            details: 'Disconnected by user'
          }
        }
        break

      case 'test_connection':
        // Test a system connection
        if (data.system && systemStatus[data.system]) {
          const currentStatus = systemStatus[data.system].status
          
          // Simulate connection test
          const testResult = Math.random() > 0.1 // 90% success rate
          
          if (testResult) {
            systemStatus[data.system] = {
              ...systemStatus[data.system],
              status: currentStatus === 'connected' ? 'connected' : 'testing',
              lastCheck: new Date().toISOString(),
              details: currentStatus === 'connected' ? 'Connection test successful' : 'Testing connection...'
            }
          } else {
            systemStatus[data.system] = {
              ...systemStatus[data.system],
              status: 'error',
              lastCheck: new Date().toISOString(),
              details: 'Connection test failed'
            }
          }
        }
        break

      case 'get_health_check':
        // Get overall system health
        const connectedSystems = Object.values(systemStatus).filter(sys => sys.status === 'connected').length
        const totalSystems = Object.keys(systemStatus).length
        const healthPercentage = (connectedSystems / totalSystems) * 100
        
        return NextResponse.json({
          success: true,
          data: {
            overallHealth: healthPercentage,
            connectedSystems,
            totalSystems,
            status: healthPercentage === 100 ? 'excellent' : 
                   healthPercentage >= 75 ? 'good' : 
                   healthPercentage >= 50 ? 'fair' : 'poor',
            systems: systemStatus
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: systemStatus,
      message: 'System status updated successfully'
    })

  } catch (error) {
    console.error('System status update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update system status' },
      { status: 500 }
    )
  }
}
