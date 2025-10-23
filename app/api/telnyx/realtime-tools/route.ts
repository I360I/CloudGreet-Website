import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      session_id, 
      function_name, 
      function_arguments 
    } = body

    logger.info('Realtime function called', {
      session_id,
      function_name,
      arguments: function_arguments
    })

    // Get session context
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('realtime_sessions')
      .select('business_id, call_id')
      .eq('session_id', session_id)
      .single()

    if (sessionError || !session) {
      logger.error('Session not found', { session_id, error: sessionError?.message })
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 })
    }

    // Handle different function calls
    switch (function_name) {
      case 'schedule_appointment':
        return await handleScheduleAppointment(function_arguments, session.business_id, session.call_id)
      
      case 'get_business_info':
        return await handleGetBusinessInfo(session.business_id)
      
      case 'send_sms':
        return await handleSendSMS(function_arguments, session.business_id)
      
      default:
        logger.warn('Unknown function called', { function_name })
        return NextResponse.json({ 
          error: 'Unknown function' 
        }, { status: 400 })
    }

  } catch (error: unknown) {
    logger.error('Realtime tools error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleScheduleAppointment(args: any, businessId: string, callId: string) {
  try {
    const {
      service_type,
      preferred_date,
      preferred_time,
      customer_name,
      customer_phone,
      customer_email,
      issue_description
    } = args

    // Parse appointment date/time
    const appointmentDateTime = preferred_date && preferred_time 
      ? new Date(`${preferred_date}T${preferred_time}`)
      : new Date(Date.now() + 24 * 60 * 60 * 1000) // Default to tomorrow

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: customer_name || 'Unknown',
        customer_phone: customer_phone || 'Unknown',
        customer_email: customer_email || null,
        service_type: service_type || 'General Service',
        scheduled_date: appointmentDateTime.toISOString(),
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
        notes: issue_description || '',
        source: 'ai_realtime_call',
        call_id: callId,
        confirmation_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (appointmentError) {
      logger.error('Appointment creation failed', {
        error: appointmentError.message,
        businessId,
        callId
      })
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create appointment' 
      }, { status: 500 })
    }

    // Create Google Calendar event if connected
    try {
      const { createCalendarEvent } = await import('@/lib/calendar')
      await createCalendarEvent(businessId, {
        title: `Appointment with ${customer_name || 'Customer'}`,
        start: appointment.scheduled_date,
        end: new Date(new Date(appointment.scheduled_date).getTime() + 60 * 60000).toISOString(),
        description: `Phone: ${customer_phone}\nService: ${service_type}\nNotes: ${issue_description}`,
        location: 'Phone Consultation',
        attendees: [customer_phone]
      })
    } catch (calendarError) {
      logger.error('Failed to create Google Calendar event', { 
        error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
        businessId,
        appointmentId: appointment.id
      })
    }

    // Charge per-booking fee automatically
    try {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('stripe_customer_id, subscription_status')
        .eq('id', businessId)
        .single()

      if (business?.stripe_customer_id && business.subscription_status === 'active') {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/billing/per-booking`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.JWT_SECRET}`
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
            customerName: customer_name || 'Unknown',
            serviceType: service_type || 'General Service',
            estimatedValue: 0
          })
        }).catch(err => logger.error('Failed to charge booking fee', { error: err }))
      }
    } catch (billingError) {
      logger.error('Booking fee automation failed', { error: billingError })
    }

    // Send notification to business owner
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          type: 'appointment_booked',
          title: 'New Appointment Booked!',
          message: `Appointment scheduled with ${customer_name || 'Customer'} for ${appointment.scheduled_date}`,
          data: {
            appointmentId: appointment.id,
            customerName: customer_name,
            customerPhone: customer_phone,
            scheduledDate: appointment.scheduled_date
          }
        })
      })
    } catch (notificationError) {
      logger.error('Failed to send appointment notification', { error: notificationError })
    }

    return NextResponse.json({
      success: true,
      appointment_id: appointment.id,
      scheduled_date: appointment.scheduled_date,
      message: `Appointment scheduled for ${appointmentDateTime.toLocaleDateString()} at ${appointmentDateTime.toLocaleTimeString()}`
    })

  } catch (error) {
    logger.error('Schedule appointment error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId,
      callId
    })
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to schedule appointment' 
    }, { status: 500 })
  }
}

async function handleGetBusinessInfo(businessId: string) {
  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, business_type, services, business_hours, phone_number')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        success: false,
        error: 'Business not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      business_name: business.business_name,
      business_type: business.business_type,
      services: business.services,
      hours: business.business_hours,
      phone: business.phone_number
    })

  } catch (error) {
    logger.error('Get business info error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get business info' 
    }, { status: 500 })
  }
}

async function handleSendSMS(args: any, businessId: string) {
  try {
    const { phone_number, message } = args

    if (!phone_number || !message) {
      return NextResponse.json({ 
        success: false,
        error: 'Phone number and message required' 
      }, { status: 400 })
    }

    // Send SMS via Telnyx
    const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        to: phone_number,
        message: message
      })
    })

    if (!smsResponse.ok) {
      throw new Error('SMS sending failed')
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully'
    })

  } catch (error) {
    logger.error('Send SMS error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send SMS' 
    }, { status: 500 })
  }
}