import { NextRequest, NextResponse } from 'next/server'

// Mock active calls store
let activeCalls = []

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const businessName = url.searchParams.get('businessName')
    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      return NextResponse.json({
        success: true,
        data: {
          activeCalls: [],
          totalActive: 0,
          message: 'Complete onboarding to start receiving calls',
          timestamp: new Date().toISOString()
        }
      })
    }

    // Return current active calls for real business
    return NextResponse.json({
      success: true,
      data: {
        activeCalls,
        totalActive: activeCalls.length,
        businessName,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Live calls API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live calls' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'start_call':
        // Start a new call
        const newCall = {
          id: `call_${Date.now()}`,
          phoneNumber: data.phoneNumber || generateRandomPhoneNumber(),
          callerName: data.callerName || 'Unknown',
          callType: data.callType || 'appointment_inquiry',
          startTime: new Date().toISOString(),
          duration: 0,
          status: 'active',
          transcript: [],
          aiResponses: []
        }
        
        activeCalls.push(newCall)
        
        return NextResponse.json({
          success: true,
          data: newCall,
          message: 'Call started successfully'
        })

      case 'end_call':
        // End a call
        const callIndex = activeCalls.findIndex(call => call.id === data.callId)
        if (callIndex !== -1) {
          const endedCall = activeCalls[callIndex]
          endedCall.status = 'completed'
          endedCall.endTime = new Date().toISOString()
          endedCall.duration = data.duration || Math.floor(Math.random() * 300) + 30
          endedCall.outcome = data.outcome || 'no_booking'
          endedCall.revenue = data.revenue || 0
          
          // Remove from active calls
          activeCalls.splice(callIndex, 1)
          
          return NextResponse.json({
            success: true,
            data: endedCall,
            message: 'Call ended successfully'
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Call not found' },
            { status: 404 }
          )
        }

      case 'update_transcript':
        // Update call transcript
        const transcriptCallIndex = activeCalls.findIndex(call => call.id === data.callId)
        if (transcriptCallIndex !== -1) {
          activeCalls[transcriptCallIndex].transcript.push({
            speaker: data.speaker, // 'caller' or 'ai'
            message: data.message,
            timestamp: new Date().toISOString()
          })
          
          return NextResponse.json({
            success: true,
            data: activeCalls[transcriptCallIndex],
            message: 'Transcript updated'
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Call not found' },
            { status: 404 }
          )
        }

      case 'get_transcript':
        // Get call transcript
        const transcriptCall = activeCalls.find(call => call.id === data.callId)
        if (transcriptCall) {
          return NextResponse.json({
            success: true,
            data: {
              callId: data.callId,
              transcript: transcriptCall.transcript,
              duration: transcriptCall.duration
            }
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Call not found' },
            { status: 404 }
          )
        }

      case 'simulate_incoming_call':
        // Simulate an incoming call for testing
        const simulatedCall = {
          id: `call_${Date.now()}`,
          phoneNumber: generateRandomPhoneNumber(),
          callerName: generateRandomName(),
          callType: getRandomCallType(),
          startTime: new Date().toISOString(),
          duration: 0,
          status: 'active',
          transcript: [],
          aiResponses: []
        }
        
        activeCalls.push(simulatedCall)
        
        return NextResponse.json({
          success: true,
          data: simulatedCall,
          message: 'Simulated call started'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Live calls update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update call data' },
      { status: 500 }
    )
  }
}

function generateRandomPhoneNumber() {
  const areaCodes = ['555', '212', '415', '312', '404', '305', '713', '214']
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)]
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `+1 (${areaCode}) ${number.slice(0, 3)}-${number.slice(3)}`
}

function generateRandomName() {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'James', 'Amanda']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  
  return `${firstName} ${lastName}`
}

function getRandomCallType() {
  const callTypes = [
    'appointment_inquiry',
    'reschedule_appointment',
    'cancel_appointment',
    'general_question',
    'pricing_inquiry',
    'service_inquiry'
  ]
  
  return callTypes[Math.floor(Math.random() * callTypes.length)]
}
