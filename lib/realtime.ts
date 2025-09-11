// Real-time features and WebSocket management

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

interface RealtimeEvent {
  type: string
  data: any
  timestamp: string
  userId?: string
}

interface RealtimeSubscription {
  userId: string
  events: string[]
  socketId: string
}

class RealtimeManager {
  private io: SocketIOServer | null = null
  private subscriptions = new Map<string, RealtimeSubscription>()
  private userSockets = new Map<string, Set<string>>()

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? 'https://cloudgreet.com' 
          : 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Handle user authentication
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data)
      })

      // Handle subscription to events
      socket.on('subscribe', (data) => {
        this.handleSubscription(socket, data)
      })

      // Handle unsubscription
      socket.on('unsubscribe', (data) => {
        this.handleUnsubscription(socket, data)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  private handleAuthentication(socket: any, data: { userId: string; token: string }) {
    // In a real implementation, you would validate the token
    const { userId } = data
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    
    this.userSockets.get(userId)!.add(socket.id)
    socket.userId = userId
    
    console.log(`User ${userId} authenticated with socket ${socket.id}`)
  }

  private handleSubscription(socket: any, data: { events: string[] }) {
    if (!socket.userId) return

    const subscription: RealtimeSubscription = {
      userId: socket.userId,
      events: data.events,
      socketId: socket.id
    }

    this.subscriptions.set(socket.id, subscription)
    console.log(`Socket ${socket.id} subscribed to events:`, data.events)
  }

  private handleUnsubscription(socket: any, data: { events: string[] }) {
    const subscription = this.subscriptions.get(socket.id)
    if (subscription) {
      subscription.events = subscription.events.filter(
        event => !data.events.includes(event)
      )
      
      if (subscription.events.length === 0) {
        this.subscriptions.delete(socket.id)
      }
    }
  }

  private handleDisconnect(socket: any) {
    if (socket.userId) {
      const userSockets = this.userSockets.get(socket.userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          this.userSockets.delete(socket.userId)
        }
      }
    }
    
    this.subscriptions.delete(socket.id)
    console.log('Client disconnected:', socket.id)
  }

  // Broadcast event to specific user
  broadcastToUser(userId: string, event: RealtimeEvent) {
    if (!this.io) return

    const userSockets = this.userSockets.get(userId)
    if (userSockets) {
      userSockets.forEach(socketId => {
        const subscription = this.subscriptions.get(socketId)
        if (subscription && subscription.events.includes(event.type)) {
          this.io!.to(socketId).emit('realtime_event', event)
        }
      })
    }
  }

  // Broadcast event to all connected users
  broadcastToAll(event: RealtimeEvent) {
    if (!this.io) return

    this.io.emit('realtime_event', event)
  }

  // Broadcast event to users subscribed to specific event type
  broadcastToSubscribers(eventType: string, event: RealtimeEvent) {
    if (!this.io) return

    this.subscriptions.forEach((subscription, socketId) => {
      if (subscription.events.includes(eventType)) {
        this.io!.to(socketId).emit('realtime_event', event)
      }
    })
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  // Get user's connection status
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId)
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager()

// Event types
export const REALTIME_EVENTS = {
  CALL_STARTED: 'call_started',
  CALL_ENDED: 'call_ended',
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  NOTIFICATION: 'notification',
  SYSTEM_ALERT: 'system_alert',
  ANALYTICS_UPDATE: 'analytics_update',
  AGENT_STATUS_CHANGE: 'agent_status_change',
  PHONE_INTEGRATION_UPDATE: 'phone_integration_update'
} as const

// Helper functions for sending real-time events
export function sendCallStartedEvent(userId: string, callData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.CALL_STARTED,
    data: callData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendCallEndedEvent(userId: string, callData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.CALL_ENDED,
    data: callData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendAppointmentBookedEvent(userId: string, appointmentData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.APPOINTMENT_BOOKED,
    data: appointmentData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendPaymentReceivedEvent(userId: string, paymentData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.PAYMENT_RECEIVED,
    data: paymentData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendNotificationEvent(userId: string, notificationData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.NOTIFICATION,
    data: notificationData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendSystemAlertEvent(userId: string, alertData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.SYSTEM_ALERT,
    data: alertData,
    timestamp: new Date().toISOString(),
    userId
  })
}

export function sendAnalyticsUpdateEvent(userId: string, analyticsData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.ANALYTICS_UPDATE,
    data: analyticsData,
    timestamp: new Date().toISOString(),
    userId
  })
}

// Server-Sent Events (SSE) implementation
export function createSSEConnection(userId: string, res: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connection_established',
    timestamp: new Date().toISOString()
  })}\n\n`)

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    })}\n\n`)
  }, 30000)

  // Cleanup on disconnect
  res.on('close', () => {
    clearInterval(keepAlive)
  })

  return {
    send: (event: RealtimeEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    },
    close: () => {
      clearInterval(keepAlive)
      res.end()
    }
  }
}

// Webhook integration for real-time updates
export function processWebhookEvent(eventType: string, data: any, userId?: string) {
  const event: RealtimeEvent = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    userId
  }

  if (userId) {
    realtimeManager.broadcastToUser(userId, event)
  } else {
    realtimeManager.broadcastToSubscribers(eventType, event)
  }
}

// Real-time analytics updates
export function updateRealtimeAnalytics(userId: string, analyticsData: any) {
  sendAnalyticsUpdateEvent(userId, {
    totalCalls: analyticsData.totalCalls,
    successfulCalls: analyticsData.successfulCalls,
    conversionRate: analyticsData.conversionRate,
    revenue: analyticsData.revenue,
    activeCalls: analyticsData.activeCalls,
    lastUpdated: new Date().toISOString()
  })
}

// Real-time system monitoring
export function updateSystemStatus(userId: string, statusData: any) {
  realtimeManager.broadcastToUser(userId, {
    type: REALTIME_EVENTS.SYSTEM_ALERT,
    data: {
      component: statusData.component,
      status: statusData.status,
      message: statusData.message,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    userId
  })
}
