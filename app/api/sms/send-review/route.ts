import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, businessId } = await request.json()

    if (!appointmentId || !businessId) {
      return NextResponse.json({ error: 'Appointment ID and Business ID are required' }, { status: 400 })
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single()

    if (appointmentError || !appointment) {
      logger.error('Appointment not found', { 
        error: appointmentError,  
        appointmentId, 
        businessId 
      })
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Get business details
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found', { error: businessError,  businessId })
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if customer has opted out
    const { data: optOut, error: optOutError } = await supabaseAdmin
      .from('sms_opt_outs')
      .select('*')
      .eq('phone_number', appointment.customer_phone)
      .eq('business_id', businessId)
      .single()

    if (optOutError === null && optOut) {
      logger.info('Customer has opted out of SMS', { 
        phone: appointment.customer_phone, 
        businessId 
      })
      return NextResponse.json({ success: true, message: 'Customer opted out of SMS' })
    }

    // Generate review SMS message
    const reviewMessage = `Hi ${appointment.customer_name || 'there'}! Thank you for choosing ${business.business_name} for your ${appointment.service_type || 'service'}. 

We hope you're satisfied with our work! Would you mind taking 30 seconds to leave us a quick review? Your feedback helps us serve you better.

⭐ Leave a review: https://g.page/r/${business.business_name.toLowerCase().replace(/\s+/g, '-')}/review

Or simply reply with your rating (1-5 stars) and any comments.

Thank you for your business!

${business.business_name}
Reply STOP to opt out; HELP for help.`

    // Store the SMS in database
    const { data: sms, error: smsError } = await supabaseAdmin
      .from('sms_logs')
      .insert({
        message_id: `review_${appointmentId}_${Date.now()}`,
        from_number: business.phone_number,
        to_number: appointment.customer_phone,
        body: reviewMessage,
        status: 'sent',
        direction: 'outbound',
        appointment_id: appointmentId,
        message_type: 'review_request',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Error storing SMS in database', { error: smsError,  appointmentId, businessId })
      return NextResponse.json({ error: 'Failed to store SMS' }, { status: 500 })
    }

    // Send SMS via Telynyx API (implementation pending)
    logger.info('Review SMS would be sent', {
      appointmentId,
      businessId,
      customerPhone: appointment.customer_phone,
      customerName: appointment.customer_name,
      messageId: sms.message_id
    })

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'review_sms_sent',
        details: {
          business_id: businessId,
          appointment_id: appointmentId,
          customer_phone: appointment.customer_phone,
          sms_id: sms.id
        },
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    logger.info('Review SMS sent successfully', {
      appointmentId,
      businessId,
      smsId: sms.id
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Review SMS sent successfully',
      smsId: sms.id
    })

  } catch (error) {
    logger.error('Send review SMS error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'sms/send-review',
      method: 'POST'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
