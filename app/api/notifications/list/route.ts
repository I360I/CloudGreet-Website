/**
 * Notifications List API
 * Returns user notifications with real-time updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get business ID for this user
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = business.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const onlyUnread = searchParams.get('unread') === 'true'

    // Query notifications from database
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (onlyUnread) {
      query = query.eq('read', false)
    }

    const { data: dbNotifications, error: notificationsError } = await query

    // If notifications table doesn't exist, generate from recent activity
    if (notificationsError && notificationsError.code === 'PGRST116') {
      // Generate notifications from recent calls and appointments
      const notifications = await generateNotificationsFromActivity(businessId, limit)
      return NextResponse.json({
        success: true,
        notifications
      })
    }

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch notifications',
        notifications: []
      }, { status: 500 })
    }

    // Transform database notifications to frontend format
    const notifications = (dbNotifications || []).map(n => ({
      id: n.id,
      type: n.type || 'system',
      title: n.title,
      message: n.message,
      timestamp: n.created_at,
      read: n.read || false,
      priority: n.priority || 'medium',
      action_url: n.action_url
    }))

    return NextResponse.json({
      success: true,
      notifications
    })

  } catch (error) {
    console.error('Notifications list API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      notifications: []
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, read = true } = body

    if (!notificationId) {
      return NextResponse.json({
        success: false,
        error: 'Notification ID is required'
      }, { status: 400 })
    }

    // Update notification read status
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read, updated_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (updateError) {
      console.error('Error updating notification:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update notification'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notification updated'
    })

  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to generate notifications from recent activity
async function generateNotificationsFromActivity(businessId: string, limit: number) {
  const notifications: any[] = []

  try {
    // Get recent calls
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    recentCalls?.forEach(call => {
      const callTime = new Date(call.created_at)
      const timeAgo = formatTimeAgo(callTime)

      if (call.status === 'answered' || call.status === 'completed') {
        notifications.push({
          id: `call-${call.id}`,
          type: 'call',
          title: 'New Call Received',
          message: `Call from ${call.from_number || 'Unknown'} - Duration: ${call.duration || '0:00'}`,
          timestamp: call.created_at,
          read: true,
          priority: 'medium'
        })
      } else if (call.status === 'missed') {
        notifications.push({
          id: `call-missed-${call.id}`,
          type: 'call',
          title: 'Missed Call',
          message: `Missed call from ${call.from_number || 'Unknown'}`,
          timestamp: call.created_at,
          read: false,
          priority: 'high'
        })
      }
    })

    // Get recent appointments
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(5)

    recentAppointments?.forEach(apt => {
      notifications.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        title: 'New Appointment Booked',
        message: `Appointment scheduled for ${apt.appointment_date || 'upcoming'}`,
        timestamp: apt.created_at,
        read: true,
        priority: 'medium'
      })
    })

    // Sort by timestamp and limit
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return notifications.slice(0, limit)

  } catch (error) {
    console.error('Error generating notifications from activity:', error)
    return []
  }
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  
  return date.toLocaleDateString()
}

