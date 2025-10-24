import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { createCalendarEvent } from '@/lib/calendar'
import Stripe from 'stripe'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    logger.info('Realtime function call received', { 
      session_id: body.session_id,
      function_name: body.function_name
    })

    const { session_id, function_name, parameters } = body

    // Get session context
    const { data: session } = await supabaseAdmin
      .from('realtime_sessions')
      .select('business_id, call_id')
      .eq('session_id', session_id)
      .single()

    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 })
    }

    // Handle different function calls
    switch (function_name) {
      case 'schedule_appointment':
        return await handleScheduleAppointment(parameters, session.business_id, session.call_id)
      
      case 'get_business_info':
        return await handleGetBusinessInfo(session.business_id)
      
      case 'send_sms':
        return await handleSendSMS(parameters, session.business_id)
      
      default:
        return NextResponse.json({ 
          error: 'Unknown function' 
        }, { status: 400 })
    }

  } catch (error: unknown) {
    logger.error('Realtime function error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({ 
      error: 'Function call failed' 
    }, { status: 500 })
  }
}

async function handleScheduleAppointment(parameters: any, businessId: string, callId: string) {
  try {
    const {
      service_type,
      preferred_date,
      preferred_time,
      customer_name,
      customer_phone,
      customer_email,
      issue_description
    } = parameters

    // Create appointment using calendar integration (handles both database and Google Calendar)
    const appointmentDate = new Date(`${preferred_date}T${preferred_time}:00`)
    const appointmentEnd = new Date(appointmentDate.getTime() + 60 * 60 * 1000) // 1 hour duration

    const calendarEvent = await createCalendarEvent(businessId, {
      title: `${service_type} - ${customer_name}`,
      start: appointmentDate.toISOString(),
      end: appointmentEnd.toISOString(),
      description: `Customer: ${customer_name}\nPhone: ${customer_phone}\nEmail: ${customer_email || 'Not provided'}\nService: ${service_type}\nIssue: ${issue_description || 'Not specified'}`,
      location: 'To be determined',
      attendees: customer_email ? [customer_email] : []
    })

    if (!calendarEvent) {
      logger.error('Failed to create calendar event', { businessId, callId })
      return NextResponse.json({ 
        success: false,
        error: 'Failed to schedule appointment'
      })
    }

    // Charge per-booking fee automatically
    let chargeResult = null
    try {
      // Get business Stripe customer ID
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('stripe_customer_id, subscription_status, business_name')
        .eq('id', businessId)
        .single()

      if (business?.stripe_customer_id && business?.subscription_status === 'active') {
        const bookingFee = 5000 // $50.00 in cents
        
        // Create invoice item
        const invoiceItem = await stripe.invoiceItems.create({
          customer: business.stripe_customer_id,
          amount: bookingFee,
          currency: 'usd',
          description: `Appointment booking fee - ${customer_name} (${service_type})`,
          metadata: {
            business_id: businessId,
            appointment_id: calendarEvent.id,
            call_id: callId || '',
            customer_name,
            service_type
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
            appointment_id: calendarEvent.id
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
          .from('billing_history')
          .insert({
            business_id: businessId,
            appointment_id: calendarEvent.id,
            stripe_invoice_id: paidInvoice.id,
            amount: bookingFee / 100, // Convert cents to dollars
            currency: 'usd',
            description: `Appointment booking fee - ${customer_name}`,
            status: paidInvoice.status,
            created_at: new Date().toISOString()
          })

        logger.info('Per-booking fee charged successfully', {
          businessId,
          appointmentId: calendarEvent.id,
          invoiceId: paidInvoice.id,
          amount: bookingFee
        })
      }
    } catch (billingError) {
      logger.error('Failed to charge per-booking fee', { 
        error: billingError instanceof Error ? billingError.message : 'Unknown error',
        businessId,
        appointmentId: calendarEvent.id
      })
      // Continue anyway - appointment is still created
    }

    // Send confirmation SMS
    if (customer_phone) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customer_phone,
            message: `Hi ${customer_name}! Your ${service_type} appointment is scheduled for ${preferred_date} at ${preferred_time}. We'll call to confirm. Thank you!`
          })
        })
      } catch (smsError) {
        logger.error('Failed to send confirmation SMS', { error: smsError })
      }
    }

    return NextResponse.json({
      success: true,
      appointment_id: calendarEvent.id,
      message: `Appointment scheduled for ${customer_name} on ${preferred_date} at ${preferred_time}`,
      google_event_id: calendarEvent.id,
      billing: chargeResult ? {
        charged: true,
        amount: chargeResult.amount / 100,
        invoice_id: chargeResult.invoiceId,
        status: chargeResult.status
      } : {
        charged: false,
        reason: 'No active subscription or Stripe customer'
      }
    })

  } catch (error) {
    logger.error('Schedule appointment error', { error })
    return NextResponse.json({ 
      success: false,
      error: 'Failed to schedule appointment'
    })
  }
}

async function handleGetBusinessInfo(businessId: string) {
  try {
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('business_name, business_type, services, business_hours, phone_number')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json({ 
        error: 'Business not found' 
      })
    }

    return NextResponse.json({
      business_name: business.business_name,
      business_type: business.business_type,
      services: business.services,
      hours: business.business_hours,
      phone: business.phone_number
    })

  } catch (error) {
    logger.error('Get business info error', { error })
    return NextResponse.json({ 
      error: 'Failed to get business info' 
    })
  }
}

async function handleSendSMS(parameters: any, businessId: string) {
  try {
    const { phone_number, message } = parameters

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone_number,
        message,
        business_id: businessId
      })
    })

    if (!response.ok) {
      throw new Error('SMS send failed')
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully'
    })

  } catch (error) {
    logger.error('Send SMS error', { error })
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send SMS'
    })
  }
}
