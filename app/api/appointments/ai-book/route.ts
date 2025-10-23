import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { createCalendarEvent } from '@/lib/calendar'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Internal API for AI-triggered appointment booking during calls
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      businessId,
      callId,
      customerName, 
      customerPhone, 
      customerAddress,
      serviceType, 
      scheduledDate,
      scheduledTime,
      notes,
      conversationTranscript
    } = body

    logger.info('AI booking appointment', {
      businessId,
      callId,
      customerName,
      serviceType,
      scheduledDate
    })

    // Validate required fields
    if (!businessId || !customerName || !customerPhone || !scheduledDate) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: businessId, customerName, customerPhone, scheduledDate' 
      }, { status: 400 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, stripe_customer_id, subscription_status, billing_plan')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for AI booking', { businessId, error: businessError?.message })
      return NextResponse.json({ 
        success: false,
        error: 'Business not found' 
      }, { status: 404 })
    }

    // Parse date and time
    const appointmentDateTime = scheduledTime 
      ? new Date(`${scheduledDate}T${scheduledTime}`)
      : new Date(scheduledDate)

    // Check for conflicting appointments
    const oneHourBefore = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000)
    const oneHourAfter = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000)

    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_date')
      .eq('business_id', businessId)
      .gte('scheduled_date', oneHourBefore.toISOString())
      .lte('scheduled_date', oneHourAfter.toISOString())
      .in('status', ['scheduled', 'confirmed'])

    if (conflicts && conflicts.length > 0) {
      logger.warn('Appointment conflict detected', { 
        businessId, 
        requestedTime: appointmentDateTime.toISOString(),
        conflictingAppointments: conflicts.length
      })
      return NextResponse.json({ 
        success: false,
        error: 'Time slot unavailable',
        message: 'This time slot is already booked. Please choose a different time.'
      }, { status: 409 })
    }

    // Create the appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.replace(/\D/g, ''),
        customer_email: null,
        service_type: serviceType || 'General Service',
        scheduled_date: appointmentDateTime.toISOString(),
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
        notes: notes || '',
        address: customerAddress || '',
        source: 'ai_phone_call',
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
      const calendarEvent = await createCalendarEvent(businessId, {
        title: `${serviceType || 'Service'} - ${customerName}`,
        start: appointmentDateTime.toISOString(),
        end: new Date(appointmentDateTime.getTime() + 60 * 60 * 1000).toISOString(),
        description: `Customer: ${customerName}\nPhone: ${customerPhone}\nService: ${serviceType}\nNotes: ${notes || 'N/A'}`,
        location: customerAddress || '',
        attendees: []
      })

      if (calendarEvent) {
        // Update appointment with calendar event ID
        await supabaseAdmin
          .from('appointments')
          .update({
            google_event_id: calendarEvent.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)
      }
    } catch (calendarError) {
      logger.warn('Calendar event creation failed, continuing anyway', { 
        error: calendarError,
        appointmentId: appointment.id
      })
    }

    // Charge per-booking fee if business has active subscription
    let chargeResult = null
    if (business.subscription_status === 'active' && business.stripe_customer_id) {
      try {
        // Get booking fee from environment or default to $50
        const bookingFee = parseInt(process.env.PER_BOOKING_FEE || '5000') // In cents

        // Create invoice item
        const invoiceItem = await stripe.invoiceItems.create({
          customer: business.stripe_customer_id,
          amount: bookingFee,
          currency: 'usd',
          description: `Appointment booking fee - ${customerName} (${serviceType})`,
          metadata: {
            business_id: businessId,
            appointment_id: appointment.id,
            call_id: callId || '',
            customer_name: customerName,
            service_type: serviceType || 'General Service'
          }
        })

        // Create and finalize invoice
        const invoice = await stripe.invoices.create({
          customer: business.stripe_customer_id,
          auto_advance: true,
          collection_method: 'charge_automatically',
          description: `Appointment booking fee for ${business.business_name}`,
          metadata: {
            business_id: businessId,
            appointment_id: appointment.id
          }
        })

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id)

        chargeResult = {
          invoiceId: paidInvoice.id,
          amount: bookingFee,
          status: paidInvoice.status
        }

        // Store billing record
        await supabaseAdmin
          .from('finance')
          .insert({
            business_id: businessId,
            appointment_id: appointment.id,
            amount: bookingFee / 100, // Convert to dollars
            currency: 'USD',
            type: 'per_booking_fee',
            status: paidInvoice.status === 'paid' ? 'completed' : 'pending',
            stripe_invoice_id: paidInvoice.id,
            description: `Booking fee for ${customerName}`,
            created_at: new Date().toISOString()
          })

        logger.info('Per-booking fee charged successfully', {
          businessId,
          appointmentId: appointment.id,
          amount: bookingFee / 100,
          invoiceId: paidInvoice.id
        })

      } catch (stripeError) {
        logger.error('Per-booking fee charge failed', { 
          error: stripeError instanceof Error ? stripeError.message : stripeError,
          businessId,
          appointmentId: appointment.id
        })
        // Continue anyway - don't fail appointment creation due to billing issues
      }
    }

    // Send SMS confirmation to customer
    try {
      const formattedDate = appointmentDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = appointmentDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: customerPhone,
          from: business.phone_number,
          message: `Hi ${customerName}! Your ${serviceType || 'service'} appointment with ${business.business_name} is confirmed for ${formattedDate} at ${formattedTime}. Reply STOP to opt out.`,
          businessId: businessId,
          type: 'appointment_confirmation'
        })
      })

      // Mark confirmation as sent
      await supabaseAdmin
        .from('appointments')
        .update({ 
          confirmation_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

    } catch (smsError) {
      logger.error('SMS confirmation failed', { 
        error: smsError,
        appointmentId: appointment.id
      })
      // Continue anyway - appointment is still created
    }

    // Notify business owner
    try {
      if (business.notification_phone || business.phone) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: business.notification_phone || business.phone,
            from: business.phone_number,
            message: `New appointment booked by AI! Customer: ${customerName} (${customerPhone}). Service: ${serviceType}. Date: ${appointmentDateTime.toLocaleDateString()}. Check your dashboard for details.`,
            businessId: businessId,
            type: 'appointment_notification'
          })
        })
      }
    } catch (notificationError) {
      logger.warn('Business notification failed', { error: notificationError })
    }

    logger.info('Appointment booked successfully by AI', {
      appointmentId: appointment.id,
      businessId,
      callId,
      customerName,
      charged: !!chargeResult
    })

    return NextResponse.json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment: {
        id: appointment.id,
        customerName: appointment.customer_name,
        customerPhone: appointment.customer_phone,
        serviceType: appointment.service_type,
        scheduledDate: appointment.scheduled_date,
        status: appointment.status,
        confirmationSent: true
      },
      billing: chargeResult ? {
        charged: true,
        amount: chargeResult.amount / 100,
        invoiceId: chargeResult.invoiceId
      } : {
        charged: false,
        reason: 'No active subscription'
      }
    })

  } catch (error) {
    logger.error('AI booking error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to schedule appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

