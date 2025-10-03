import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ActivityItem {
  id: string
  type: 'call' | 'appointment' | 'revenue' | 'message' | 'system'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'info'
  value?: string
}

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const activities: ActivityItem[] = []

    // Get REAL recent calls
    const { data: recentCalls, error: callsError } = await supabaseAdmin
      .from('call_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!callsError && recentCalls) {
      recentCalls.forEach(call => {
        const timestamp = new Date(call.created_at)
        const timeAgo = getTimeAgo(timestamp)
        
        activities.push({
          id: `call-${call.id}`,
          type: 'call',
          title: call.status === 'answered' ? 'Call Completed' : 'Missed Call',
          description: call.status === 'answered' 
            ? `Customer call handled successfully`
            : `Customer called outside business hours`,
          timestamp: timeAgo,
          status: call.status === 'answered' ? 'success' : 'warning',
          value: call.status === 'answered' ? `${call.duration || 0}s` : 'Voicemail'
        })
      })
    }

    // Get REAL recent appointments
    const { data: recentAppointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!appointmentsError && recentAppointments) {
      recentAppointments.forEach(appointment => {
        const timestamp = new Date(appointment.created_at)
        const timeAgo = getTimeAgo(timestamp)
        
        activities.push({
          id: `appointment-${appointment.id}`,
          type: 'appointment',
          title: 'Appointment Scheduled',
          description: `${appointment.service_type || 'Service'} scheduled for ${new Date(appointment.scheduled_date).toLocaleDateString()}`,
          timestamp: timeAgo,
          status: 'success',
          value: appointment.estimated_value ? `$${appointment.estimated_value}` : 'TBD'
        })
      })
    }

    // Get REAL recent SMS messages
    const { data: recentSMS, error: smsError } = await supabaseAdmin
      .from('sms_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!smsError && recentSMS) {
      recentSMS.forEach(sms => {
        const timestamp = new Date(sms.created_at)
        const timeAgo = getTimeAgo(timestamp)
        
        activities.push({
          id: `sms-${sms.id}`,
          type: 'message',
          title: 'SMS Sent',
          description: sms.direction === 'outbound' 
            ? 'Appointment reminder sent to customer'
            : 'Customer sent message',
          timestamp: timeAgo,
          status: 'success',
          value: sms.direction === 'outbound' ? 'Sent' : 'Received'
        })
      })
    }

    // Get REAL system events (audit logs)
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!auditError && auditLogs) {
      auditLogs.forEach(log => {
        const timestamp = new Date(log.created_at)
        const timeAgo = getTimeAgo(timestamp)
        
        activities.push({
          id: `audit-${log.id}`,
          type: 'system',
          title: getAuditTitle(log.action_type),
          description: getAuditDescription(log.action_type, log.action_details),
          timestamp: timeAgo,
          status: 'success',
          value: 'Active'
        })
      })
    }

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => {
      const timeA = getTimestampFromTimeAgo(a.timestamp)
      const timeB = getTimestampFromTimeAgo(b.timestamp)
      return timeB - timeA
    })

    return NextResponse.json({
      success: true,
      data: activities.slice(0, 15) // Return last 15 activities
    })

  } catch (error) {
    console.error('Error fetching real activity:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real activity'
    }, { status: 500 })
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}

function getTimestampFromTimeAgo(timeAgo: string): number {
  const now = new Date().getTime()
  const match = timeAgo.match(/(\d+)([smhd])/)
  if (!match) return now
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 's': return now - (value * 1000)
    case 'm': return now - (value * 60 * 1000)
    case 'h': return now - (value * 60 * 60 * 1000)
    case 'd': return now - (value * 24 * 60 * 60 * 1000)
    default: return now
  }
}

function getAuditTitle(actionType: string): string {
  switch (actionType) {
    case 'agent_created': return 'AI Agent Created'
    case 'agent_updated': return 'AI Agent Updated'
    case 'phone_provisioned': return 'Phone Number Added'
    case 'settings_updated': return 'Settings Updated'
    case 'onboarding_completed': return 'Setup Completed'
    default: return 'System Event'
  }
}

function getAuditDescription(actionType: string, details: any): string {
  switch (actionType) {
    case 'agent_created': return 'AI receptionist activated and ready'
    case 'agent_updated': return 'Agent configuration updated'
    case 'phone_provisioned': return 'New phone number assigned to business'
    case 'settings_updated': return 'Business settings modified'
    case 'onboarding_completed': return 'Initial setup process completed'
    default: return 'System configuration changed'
  }
}
