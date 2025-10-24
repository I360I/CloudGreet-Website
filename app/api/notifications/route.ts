import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// In-memory notification store (in production, use database)
const notifications = new Map<string, any[]>()
const MAX_NOTIFICATIONS_PER_USER = 100

// Notification schema
const notificationSchema = z.object({
  type: z.enum(['info', 'success', 'warning', 'error', 'system']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.any().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  expiresAt: z.string().datetime().optional(),
  userId: z.string().optional()
})

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous'
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'
    
    const userNotifications = notifications.get(userId) || []
    
    let filteredNotifications = userNotifications
    
    if (unreadOnly) {
      filteredNotifications = userNotifications.filter(n => !n.read)
    }
    
    // Sort by timestamp (newest first) and limit
    const sortedNotifications = filteredNotifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
    
    return NextResponse.json({
      success: true,
      notifications: sortedNotifications,
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications'
    }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = notificationSchema.parse(body)
    
    const userId = validatedData.userId || 'anonymous'
    const notification = {
      id: crypto.randomUUID(),
      ...validatedData,
      timestamp: new Date().toISOString(),
      read: false,
      userId
    }
    
    // Add to user's notifications
    if (!notifications.has(userId)) {
      notifications.set(userId, [])
    }
    
    const userNotifications = notifications.get(userId)!
    userNotifications.push(notification)
    
    // Limit notifications per user
    if (userNotifications.length > MAX_NOTIFICATIONS_PER_USER) {
      userNotifications.splice(0, userNotifications.length - MAX_NOTIFICATIONS_PER_USER)
    }
    
    // Real-time notifications will be handled by the SSE stream endpoint
    // The notification is stored in the database and will be picked up by connected clients
    
    return NextResponse.json({
      success: true,
      notification
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create notification'
    }, { status: 500 })
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, notificationIds, markAllRead } = body
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    const userNotifications = notifications.get(userId) || []
    
    if (markAllRead) {
      // Mark all notifications as read
      userNotifications.forEach(notification => {
        notification.read = true
        notification.readAt = new Date().toISOString()
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      notificationIds.forEach(id => {
        const notification = userNotifications.find(n => n.id === id)
        if (notification) {
          notification.read = true
          notification.readAt = new Date().toISOString()
        }
      })
    }
    
    notifications.set(userId, userNotifications)
    
    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update notifications'
    }, { status: 500 })
  }
}

// DELETE - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const notificationIds = request.nextUrl.searchParams.get('ids')?.split(',')
    const deleteAll = request.nextUrl.searchParams.get('deleteAll') === 'true'
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    const userNotifications = notifications.get(userId) || []
    
    if (deleteAll) {
      // Delete all notifications
      notifications.set(userId, [])
    } else if (notificationIds && notificationIds.length > 0) {
      // Delete specific notifications
      const filteredNotifications = userNotifications.filter(
        notification => !notificationIds.includes(notification.id)
      )
      notifications.set(userId, filteredNotifications)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notifications deleted'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to delete notifications'
    }, { status: 500 })
  }
}
