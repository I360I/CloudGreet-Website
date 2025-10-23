import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get recent calls
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (callsError) {
      logger.error('Error fetching calls for activity', { error: callsError.message, businessId })
    }

    // Get recent appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (appointmentsError) {
      logger.error('Error fetching appointments for activity', { error: appointmentsError.message, businessId })
    }

    // Get business info for context
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('business_name')
      .eq('id', businessId)
      .single()

    const businessName = business?.business_name || 'Your Business'

    // Convert calls to activity items
    const callActivities = (calls || []).map(call => {
      const isAnswered = call.status === 'answered' || call.status === 'completed'
      const isMissed = call.status === 'missed' || call.status === 'busy'
      
      return {
        id: `call-${call.id}`,
        type: 'call' as const,
        title: isAnswered ? 'Call Answered' : isMissed ? 'Missed Call' : 'Call Received',
        description: isAnswered 
          ? `Answered call from ${call.from_number} (${call.duration || 0}s)`
          : isMissed
          ? `Missed call from ${call.from_number}`
          : `Call from ${call.from_number}`,
        timestamp: call.created_at,
        status: isAnswered ? 'success' as const : isMissed ? 'warning' as const : 'info' as const,
        value: isAnswered ? `${call.duration || 0}s` : undefined,
        trend: isAnswered ? 'up' as const : isMissed ? 'down' as const : undefined
      }
    })

    // Convert appointments to activity items
    const appointmentActivities = (appointments || []).map(appointment => {
      const isCompleted = appointment.status === 'completed'
      const isConfirmed = appointment.status === 'confirmed'
      const isScheduled = appointment.status === 'scheduled'
      
      return {
        id: `appointment-${appointment.id}`,
        type: 'appointment' as const,
        title: isCompleted ? 'Appointment Completed' : isConfirmed ? 'Appointment Confirmed' : 'Appointment Scheduled',
        description: isCompleted
          ? `Completed appointment with ${appointment.customer_name}`
          : isConfirmed
          ? `Confirmed appointment with ${appointment.customer_name}`
          : `Scheduled appointment with ${appointment.customer_name}`,
        timestamp: appointment.created_at,
        status: isCompleted ? 'success' as const : isConfirmed ? 'success' as const : 'info' as const,
        value: appointment.estimated_value ? `$${appointment.estimated_value}` : undefined,
        trend: isCompleted ? 'up' as const : isConfirmed ? 'up' as const : undefined
      }
    })

    // Combine and sort activities by timestamp
    const allActivities = [...callActivities, ...appointmentActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20) // Limit to 20 most recent activities

    logger.info('Real activity data generated', { 
      businessId, 
      totalActivities: allActivities.length,
      calls: callActivities.length,
      appointments: appointmentActivities.length
    })

    return NextResponse.json({
      success: true,
      activities: allActivities,
      businessName,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error generating real activity data', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate activity data' 
    }, { status: 500 })
  }
}