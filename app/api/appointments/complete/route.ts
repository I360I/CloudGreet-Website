import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { notifyNewBooking } from '@/lib/notifications'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { appointmentId, businessId, sendReviewSMS = true } = await request.json()

    if (!appointmentId || !businessId) {
      return NextResponse.json({ error: 'Appointment ID and Business ID are required' }, { status: 400 })
    }
    
    // Verify user owns this business
    if (userBusinessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Update appointment status to completed
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .select()
      .single()

    if (appointmentError) {
      logger.error('Error updating appointment', { 
        error: appointmentError,  
        appointmentId, 
        businessId 
      })
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
    }

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Send review SMS if requested
    let reviewSMSResult = null
    if (sendReviewSMS) {
      try {
        const reviewResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send-review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointmentId,
            businessId: businessId
          })
        })

        if (reviewResponse.ok) {
          reviewSMSResult = await reviewResponse.json()
        } else {
          logger.error('Failed to send review SMS', { error: null,  appointmentId, businessId })
        }
      } catch (error) {
        logger.error('Error sending review SMS', { error: error instanceof Error ? error.message : 'Unknown error',  appointmentId, businessId })
      }
    }

    // Send notification about completed appointment
    try {
      await notifyNewBooking(
        `Appointment completed: ${appointment.customer_name || 'Customer'} on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}`,
        businessId
      )
    } catch (error) {
      logger.error('Error sending appointment completion notification', { error: error instanceof Error ? error.message : 'Unknown error',  appointmentId, businessId })
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'appointment_completed',
        details: {
          business_id: businessId,
          appointment_id: appointmentId,
          customer_phone: appointment.customer_phone,
          send_review_sms: sendReviewSMS,
          review_sms_sent: reviewSMSResult?.success || false
        },
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    logger.info('Appointment completed successfully', {
      appointmentId,
      businessId,
      customerPhone: appointment.customer_phone,
      reviewSMSSent: reviewSMSResult?.success || false
    })

    return NextResponse.json({ 
      success: true,
      appointment,
      reviewSMS: reviewSMSResult
    })

  } catch (error) {
    logger.error('Complete appointment error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'appointments/complete',
      method: 'PUT'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
