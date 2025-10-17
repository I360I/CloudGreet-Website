import { NextRequest } from 'next/server'

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  // Get user ID from query params or headers
  const userId = request.nextUrl.searchParams.get('userId') || 'anonymous'
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      connections.set(userId, controller)
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Real-time notifications connected',
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } catch (error) {
          clearInterval(heartbeat)
          connections.delete(userId)
        }
      }, 30000)

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        connections.delete(userId)
        controller.close()
      })
    },
    
    cancel() {
      connections.delete(userId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Utility function to send notifications to specific users
function sendNotification(userId: string, notification: {
  type: string
  title: string
  message: string
  data?: any
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}) {
  const controller = connections.get(userId)
  
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      })}\n\n`)
    } catch (error) {
      // Connection closed, remove from map
      connections.delete(userId)
    }
  }
}

// Utility function to broadcast to all connected users
function broadcastNotification(notification: {
  type: string
  title: string
  message: string
  data?: any
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}) {
  connections.forEach((controller, userId) => {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      })}\n\n`)
    } catch (error) {
      // Connection closed, remove from map
      connections.delete(userId)
    }
  })
}

