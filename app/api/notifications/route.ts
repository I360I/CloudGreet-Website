import { NextRequest, NextResponse } from 'next/server'

// Mock notifications store
let notifications = [
  {
    id: 'notif_1',
    type: 'system',
    title: 'Welcome to CloudGreet!',
    message: 'Your AI receptionist is ready to start taking calls.',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    read: false,
    priority: 'info'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const businessName = searchParams.get('businessName')
    const onboardingComplete = businessName && businessName !== 'Demo User'
    
    if (!onboardingComplete) {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
          totalCount: 0,
          message: 'Complete onboarding to start receiving notifications'
        },
        timestamp: new Date().toISOString()
      })
    }
    
    let filteredNotifications = notifications
    if (unreadOnly) {
      filteredNotifications = notifications.filter(notif => !notif.read)
    }
    
    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return NextResponse.json({
      success: true,
      data: {
        notifications: filteredNotifications,
        unreadCount: notifications.filter(notif => !notif.read).length,
        totalCount: notifications.length,
        businessName
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'create':
        // Create a new notification
        const newNotification = {
          id: `notif_${Date.now()}`,
          type: data.type || 'info',
          title: data.title || 'New Notification',
          message: data.message || '',
          timestamp: new Date().toISOString(),
          read: false,
          priority: data.priority || 'info'
        }
        
        notifications.unshift(newNotification)
        
        return NextResponse.json({
          success: true,
          data: newNotification,
          message: 'Notification created successfully'
        })

      case 'mark_read':
        // Mark notification as read
        const notifIndex = notifications.findIndex(notif => notif.id === data.notificationId)
        if (notifIndex !== -1) {
          notifications[notifIndex].read = true
          
          return NextResponse.json({
            success: true,
            data: notifications[notifIndex],
            message: 'Notification marked as read'
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Notification not found' },
            { status: 404 }
          )
        }

      case 'mark_all_read':
        // Mark all notifications as read
        notifications.forEach(notif => {
          notif.read = true
        })
        
        return NextResponse.json({
          success: true,
          data: { unreadCount: 0 },
          message: 'All notifications marked as read'
        })

      case 'delete':
        // Delete a notification
        const deleteIndex = notifications.findIndex(notif => notif.id === data.notificationId)
        if (deleteIndex !== -1) {
          notifications.splice(deleteIndex, 1)
          
          return NextResponse.json({
            success: true,
            message: 'Notification deleted successfully'
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Notification not found' },
            { status: 404 }
          )
        }

      case 'simulate_call_notification':
        // Simulate a call-related notification
        const callNotification = {
          id: `notif_${Date.now()}`,
          type: 'call',
          title: 'New Call Started',
          message: `Incoming call from ${data.phoneNumber || '+1 (555) 123-4567'}`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'high'
        }
        
        notifications.unshift(callNotification)
        
        return NextResponse.json({
          success: true,
          data: callNotification,
          message: 'Call notification created'
        })

      case 'simulate_appointment_notification':
        // Simulate an appointment booking notification
        const appointmentNotification = {
          id: `notif_${Date.now()}`,
          type: 'appointment',
          title: 'Appointment Booked',
          message: `New appointment scheduled for ${data.time || 'tomorrow at 2:00 PM'}`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'medium'
        }
        
        notifications.unshift(appointmentNotification)
        
        return NextResponse.json({
          success: true,
          data: appointmentNotification,
          message: 'Appointment notification created'
        })

      case 'simulate_system_notification':
        // Simulate a system notification
        const systemNotification = {
          id: `notif_${Date.now()}`,
          type: 'system',
          title: data.title || 'System Update',
          message: data.message || 'System status has been updated',
          timestamp: new Date().toISOString(),
          read: false,
          priority: data.priority || 'info'
        }
        
        notifications.unshift(systemNotification)
        
        return NextResponse.json({
          success: true,
          data: systemNotification,
          message: 'System notification created'
        })

      case 'clear_all':
        // Clear all notifications
        notifications = []
        
        return NextResponse.json({
          success: true,
          data: { count: 0 },
          message: 'All notifications cleared'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Notifications update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}