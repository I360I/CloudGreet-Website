import { NextRequest, NextResponse } from 'next/server'

// In-memory store for active SSE connections
let callClients: Map<string, { response: NextResponse; controller: ReadableStreamDefaultController }> = new Map()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId') || 'default'
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  console.log(`New SSE connection for business ${businessId}: ${clientId}`)

  // Create a new ReadableStream for this client
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this client
      callClients.set(clientId, { response: new NextResponse(), controller })

      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        clientId,
        businessId,
        timestamp: new Date().toISOString()
      })}\n\n`))

      // Set up periodic updates
      const updateInterval = setInterval(() => {
        if (callClients.has(clientId)) {
          try {
            // Send heartbeat
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`))
          } catch (error) {
            console.error('Error sending heartbeat to client:', clientId, error)
            clearInterval(updateInterval)
            callClients.delete(clientId)
          }
        } else {
          clearInterval(updateInterval)
        }
      }, 30000) // Send heartbeat every 30 seconds

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`SSE connection closed for client: ${clientId}`)
        clearInterval(updateInterval)
        callClients.delete(clientId)
        controller.close()
      })
    },
    cancel() {
      console.log(`SSE stream cancelled for client: ${clientId}`)
      callClients.delete(clientId)
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Function to broadcast call events to all connected clients
function broadcastCallEvent(businessId: string, event: any) {
  const encoder = new TextEncoder()
  const message = `data: ${JSON.stringify({
    ...event,
    businessId,
    timestamp: new Date().toISOString()
  })}\n\n`

  // Send to all clients for this business
  callClients.forEach((client, clientId) => {
    try {
      client.controller.enqueue(encoder.encode(message))
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error)
      callClients.delete(clientId)
    }
  })
}

// Function to broadcast to specific business clients
function broadcastToBusiness(businessId: string, event: any) {
  const encoder = new TextEncoder()
  const message = `data: ${JSON.stringify({
    ...event,
    businessId,
    timestamp: new Date().toISOString()
  })}\n\n`

  callClients.forEach((client, clientId) => {
    try {
      // In a real implementation, you'd track which business each client belongs to
      // For now, we'll send to all clients
      client.controller.enqueue(encoder.encode(message))
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error)
      callClients.delete(clientId)
    }
  })
}

// Simulate real-time call events (for demo purposes)
setInterval(() => {
  // Simulate new incoming calls occasionally
  if (Math.random() < 0.1) { // 10% chance every 5 seconds
    const callEvent = {
      type: 'call_started',
      call: {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromNumber: generatePhoneNumber(),
        toNumber: '+17372960092',
        status: 'ringing',
        duration: 0,
        startTime: new Date(),
        callerName: generateCallerName(),
        callerLocation: generateLocation(),
        quality: {
          audioQuality: getRandomAudioQuality(),
          latency: Math.floor(Math.random() * 100) + 50,
          packetLoss: Math.random() * 2
        }
      }
    }
    
    broadcastToBusiness('default', callEvent)
  }

  // Simulate call updates occasionally
  if (Math.random() < 0.05) { // 5% chance every 5 seconds
    const callUpdateEvent = {
      type: 'call_updated',
      callId: `call_${Math.floor(Math.random() * 1000)}`,
      updates: {
        status: Math.random() > 0.5 ? 'connected' : 'ended',
        duration: Math.floor(Math.random() * 300) + 30,
        endTime: new Date()
      }
    }
    
    broadcastToBusiness('default', callUpdateEvent)
  }

  // Simulate stats updates
  if (Math.random() < 0.2) { // 20% chance every 5 seconds
    const statsEvent = {
      type: 'stats_updated',
      stats: {
        totalToday: Math.floor(Math.random() * 50) + 20,
        activeNow: Math.floor(Math.random() * 3),
        answeredToday: Math.floor(Math.random() * 40) + 15,
        missedToday: Math.floor(Math.random() * 10) + 2,
        avgDuration: Math.floor(Math.random() * 300) + 120,
        satisfaction: 4.0 + Math.random() * 1.0
      }
    }
    
    broadcastToBusiness('default', statsEvent)
  }
}, 5000) // Run every 5 seconds

// Helper functions (same as in realtime route)
function generatePhoneNumber(): string {
  const areaCodes = ['555', '444', '333', '222', '111']
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)]
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return `+1${areaCode}${number.slice(0, 3)}${number.slice(3)}`
}

function generateCallerName(): string {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  
  return `${firstName} ${lastName}`
}

function generateLocation(): string {
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA']
  
  const index = Math.floor(Math.random() * cities.length)
  return `${cities[index]}, ${states[index]}`
}

function getRandomAudioQuality(): 'excellent' | 'good' | 'poor' {
  const qualities = ['excellent', 'excellent', 'good', 'good', 'poor']
  return qualities[Math.floor(Math.random() * qualities.length)] as any
}
