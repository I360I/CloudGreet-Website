import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import * as jwt from 'jsonwebtoken'
import { createCalendarEvent } from '@/lib/calendar'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET' }, { status: 500 })
    }

    // Verify JWT token
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

    // Parse and validate request body
    const body = await request.json()
    const {
      customer_name,
      customer_phone,
      customer_email,
      service,
      scheduled_date,
      scheduled_time,
      issue_description,
      estimated_value
    } = body

    // Validate required fields
    if (!customer_name || !customer_phone || !service || !scheduled_date || !scheduled_time) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: customer_name, customer_phone, service, scheduled_date, scheduled_time'
      }, { status: 400 })
    }

    // Create appointment date
    const appointmentDate = new Date(`${scheduled_date}T${scheduled_time}:00`)
    const appointmentEnd = new Date(appointmentDate.getTime() + 60 * 60 * 1000) // 1 hour duration

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        service_type: service,
        scheduled_date: appointmentDate.toISOString(),
        scheduled_time: scheduled_time,
        issue_description: issue_description || null,
        estimated_value: estimated_value || null,
        status: 'scheduled',
        confirmation_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (appointmentError) {
      logger.error('Failed to create appointment', {
        error: appointmentError.message,
        businessId,
        userId
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to create appointment'
      }, { status: 500 })
    }

    // Create Google Calendar event if business has calendar connected
    let calendarEventId = null
    try {
      const calendarEvent = await createCalendarEvent(businessId, {
        title: `${service} - ${customer_name}`,
        start: appointmentDate.toISOString(),
        end: appointmentEnd.toISOString(),
        description: `Customer: ${customer_name}\nPhone: ${customer_phone}\nEmail: ${customer_email || 'Not provided'}\nService: ${service}\nIssue: ${issue_description || 'Not specified'}`,
        location: 'To be determined',
        attendees: customer_email ? [customer_email] : []
      })

      if (calendarEvent) {
        calendarEventId = calendarEvent.id
        
        // Update appointment with calendar event ID
        await supabaseAdmin
          .from('appointments')
          .update({
            google_event_id: calendarEventId,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)
      }
    } catch (calendarError) {
      logger.error('Failed to create calendar event', {
        error: calendarError,
        businessId,
        appointmentId: appointment.id
      })
      // Continue without calendar event
    }

    // Send confirmation SMS if phone number is available
    if (customer_phone) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: customer_phone,
            message: `Hi ${customer_name}! Your ${service} appointment is scheduled for ${scheduled_date} at ${scheduled_time}. We'll call to confirm. Thank you!`
          })
        })
      } catch (smsError) {
        logger.error('Failed to send confirmation SMS', { error: smsError })
        // Continue without SMS
      }
    }

    logger.info('Appointment created successfully', {
      businessId,
      userId,
      appointmentId: appointment.id,
      customerName: customer_name,
      service: service
    })

    return NextResponse.json({
      success: true,
      message: 'Appointment created successfully',
      appointment: {
        id: appointment.id,
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        service: appointment.service_type,
        scheduled_date: appointment.scheduled_date,
        scheduled_time: appointment.scheduled_time,
        status: appointment.status,
        google_event_id: calendarEventId
      }
    })

  } catch (error) {
    logger.error('Appointment creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({
      success: false,
      error: 'Appointment creation failed'
    }, { status: 500 })
  }
}
