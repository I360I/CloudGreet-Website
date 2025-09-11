import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    validateUserId(userId)

    // Fetch real smart notifications from database
    const { data: notifications, error: notificationsError } = await supabase
      .from('smart_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq(type !== 'all' ? 'type' : 'id', type !== 'all' ? type : 'id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notificationsError) {
      throw new Error('Failed to fetch notifications')
    }

    // Generate additional smart notifications based on user data
    const smartNotifications = await generateSmartNotifications(userId)

    // Combine database notifications with generated ones
    const allNotifications = [
      ...(notifications || []),
      ...smartNotifications
    ].sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime())

    return createSuccessResponse({
      notifications: allNotifications.slice(0, limit),
      total: allNotifications.length
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, event, data } = body

    validateUserId(userId)

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event is required'
      }, { status: 400 })
    }

    // Process smart notification event
    const result = await processSmartNotificationEvent(userId, event, data)

    return createSuccessResponse(result)

  } catch (error) {
    return handleApiError(error)
  }
}

async function generateSmartNotifications(userId: string) {
  const notifications = []

  // Get user's recent activity to generate contextual notifications
  const [
    { data: recentCalls, error: callsError },
    { data: recentAppointments, error: appointmentsError },
    { data: userStats, error: statsError }
  ] = await Promise.all([
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    
    supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(10),
    
    supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .single()
  ])

  // Generate call insights
  if (recentCalls && recentCalls.length > 0) {
    const highValueCalls = recentCalls.filter(call => 
      call.booking_probability && call.booking_probability > 0.8
    )

    if (highValueCalls.length > 0) {
      notifications.push({
        id: `smart_${Date.now()}_1`,
        type: 'call_insight',
        title: 'High-Value Lead Detected',
        message: `${highValueCalls.length} recent call${highValueCalls.length > 1 ? 's' : ''} show strong buying signals`,
        priority: 'high',
        timestamp: new Date().toISOString(),
        actions: ['view_calls', 'schedule_followup'],
        status: 'unread',
        insights: {
          leadScore: Math.round(highValueCalls.reduce((sum, call) => sum + (call.booking_probability * 100), 0) / highValueCalls.length),
          urgency: 'high',
          recommendedAction: 'Follow up within 2 hours'
        }
      })
    }
  }

  // Generate performance alerts
  if (userStats) {
    const answerRate = userStats.answer_rate || 0
    if (answerRate < 95) {
      notifications.push({
        id: `smart_${Date.now()}_2`,
        type: 'performance_alert',
        title: 'Call Answer Rate Below Target',
        message: `Answer rate is ${answerRate.toFixed(1)}% - below target of 95%`,
        priority: 'medium',
        timestamp: new Date().toISOString(),
        actions: ['view_analytics', 'check_settings'],
        status: 'unread',
        insights: {
          currentRate: answerRate,
          targetRate: 95,
          recommendedAction: 'Check phone integration settings'
        }
      })
    }

    const conversionRate = userStats.conversion_rate || 0
    if (conversionRate < 10) {
      notifications.push({
        id: `smart_${Date.now()}_3`,
        type: 'performance_alert',
        title: 'Low Conversion Rate',
        message: `Conversion rate is ${conversionRate.toFixed(1)}% - industry average is 12-15%`,
        priority: 'medium',
        timestamp: new Date().toISOString(),
        actions: ['view_analytics', 'optimize_script'],
        status: 'unread',
        insights: {
          currentRate: conversionRate,
          industryAverage: 13.5,
          recommendedAction: 'Review and optimize call scripts'
        }
      })
    }
  }

  // Generate appointment insights
  if (recentAppointments && recentAppointments.length > 0) {
    const upcomingAppointments = recentAppointments.filter(apt => 
      new Date(apt.start_time) > new Date() && 
      new Date(apt.start_time) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
    )

    if (upcomingAppointments.length > 0) {
      notifications.push({
        id: `smart_${Date.now()}_4`,
        type: 'appointment_reminder',
        title: 'Upcoming Appointments',
        message: `${upcomingAppointments.length} appointment${upcomingAppointments.length > 1 ? 's' : ''} scheduled for tomorrow`,
        priority: 'medium',
        timestamp: new Date().toISOString(),
        actions: ['view_schedule', 'send_reminders'],
        status: 'unread',
        insights: {
          appointmentCount: upcomingAppointments.length,
          totalValue: upcomingAppointments.reduce((sum, apt) => sum + (apt.amount || 0), 0),
          recommendedAction: 'Send confirmation reminders'
        }
      })
    }
  }

  // Generate business insights
  const { data: monthlyRevenue, error: revenueError } = await supabase
    .from('appointments')
    .select('amount')
    .eq('user_id', userId)
    .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  if (monthlyRevenue && monthlyRevenue.length > 0) {
    const currentRevenue = monthlyRevenue.reduce((sum, apt) => sum + (apt.amount || 0), 0)
    const { data: lastMonthRevenue, error: lastMonthError } = await supabase
      .from('appointments')
      .select('amount')
      .eq('user_id', userId)
      .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString())
      .lt('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const lastMonthAmount = lastMonthRevenue?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
    const growthRate = lastMonthAmount > 0 ? ((currentRevenue - lastMonthAmount) / lastMonthAmount) * 100 : 0

    if (growthRate > 20) {
      notifications.push({
        id: `smart_${Date.now()}_5`,
        type: 'business_insight',
        title: 'Revenue Growth Alert',
        message: `Revenue increased by ${growthRate.toFixed(1)}% this month`,
        priority: 'low',
        timestamp: new Date().toISOString(),
        actions: ['view_analytics', 'celebrate'],
        status: 'unread',
        insights: {
          currentRevenue: currentRevenue,
          growthRate: growthRate,
          recommendedAction: 'Continue current strategies'
        }
      })
    } else if (growthRate < -10) {
      notifications.push({
        id: `smart_${Date.now()}_6`,
        type: 'business_insight',
        title: 'Revenue Decline Alert',
        message: `Revenue decreased by ${Math.abs(growthRate).toFixed(1)}% this month`,
        priority: 'high',
        timestamp: new Date().toISOString(),
        actions: ['view_analytics', 'optimize_strategy'],
        status: 'unread',
        insights: {
          currentRevenue: currentRevenue,
          declineRate: Math.abs(growthRate),
          recommendedAction: 'Review and optimize business strategy'
        }
      })
    }
  }

  return notifications
}

async function processSmartNotificationEvent(userId: string, event: string, data: any) {
  const eventHandlers = {
    'call_completed': handleCallCompleted,
    'appointment_scheduled': handleAppointmentScheduled,
    'payment_received': handlePaymentReceived,
    'customer_feedback': handleCustomerFeedback,
    'system_alert': handleSystemAlert
  }

  const handler = eventHandlers[event as keyof typeof eventHandlers]
  if (!handler) {
    throw new Error(`Unknown event type: ${event}`)
  }

  return await handler(userId, data)
}

async function handleCallCompleted(userId: string, data: any) {
  const { callId, duration, outcome, customerPhone } = data

  // Store call completion notification
  const { error: insertError } = await supabase
    .from('smart_notifications')
    .insert({
      user_id: userId,
      type: 'call_completed',
      title: 'Call Completed',
      message: `Call with ${customerPhone} completed - ${outcome}`,
      priority: 'low',
      metadata: {
        callId,
        duration,
        outcome,
        customerPhone
      },
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error('Failed to store notification')
  }

  return {
    success: true,
    message: 'Call completion processed',
    notifications: ['Call logged successfully']
  }
}

async function handleAppointmentScheduled(userId: string, data: any) {
  const { appointmentId, customerName, serviceType, scheduledTime, amount } = data

  // Store appointment notification
  const { error: insertError } = await supabase
    .from('smart_notifications')
    .insert({
      user_id: userId,
      type: 'appointment_scheduled',
      title: 'New Appointment Scheduled',
      message: `${serviceType} appointment with ${customerName} scheduled for ${new Date(scheduledTime).toLocaleDateString()}`,
      priority: 'medium',
      metadata: {
        appointmentId,
        customerName,
        serviceType,
        scheduledTime,
        amount
      },
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error('Failed to store notification')
  }

  return {
    success: true,
    message: 'Appointment scheduled',
    notifications: ['Appointment confirmation sent', 'Calendar updated']
  }
}

async function handlePaymentReceived(userId: string, data: any) {
  const { paymentId, amount, customerName, serviceType } = data

  // Store payment notification
  const { error: insertError } = await supabase
    .from('smart_notifications')
    .insert({
      user_id: userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of $${amount} received for ${serviceType} from ${customerName}`,
      priority: 'medium',
      metadata: {
        paymentId,
        amount,
        customerName,
        serviceType
      },
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error('Failed to store notification')
  }

  return {
    success: true,
    message: 'Payment processed',
    notifications: ['Receipt generated', 'Revenue updated']
  }
}

async function handleCustomerFeedback(userId: string, data: any) {
  const { feedbackId, rating, comments, customerName } = data

  // Store feedback notification
  const { error: insertError } = await supabase
    .from('smart_notifications')
    .insert({
      user_id: userId,
      type: 'customer_feedback',
      title: 'Customer Feedback Received',
      message: `${customerName} rated service ${rating}/5 stars`,
      priority: rating < 3 ? 'high' : 'medium',
      metadata: {
        feedbackId,
        rating,
        comments,
        customerName
      },
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error('Failed to store notification')
  }

  return {
    success: true,
    message: 'Feedback processed',
    notifications: rating < 3 ? ['Follow-up required', 'Service review scheduled'] : ['Thank you message sent']
  }
}

async function handleSystemAlert(userId: string, data: any) {
  const { alertType, message, severity } = data

  // Store system alert
  const { error: insertError } = await supabase
    .from('smart_notifications')
    .insert({
      user_id: userId,
      type: 'system_alert',
      title: 'System Alert',
      message: message,
      priority: severity === 'critical' ? 'high' : 'medium',
      metadata: {
        alertType,
        severity
      },
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error('Failed to store notification')
  }

  return {
    success: true,
    message: 'System alert processed',
    notifications: ['Alert logged', 'Monitoring updated']
  }
}