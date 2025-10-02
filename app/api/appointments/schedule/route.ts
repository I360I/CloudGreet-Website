import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customerName, 
      customerPhone, 
      serviceType, 
      scheduledDate, 
      notes,
      source = 'ai_agent'
    } = body

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Validate required fields
    if (!customerName || !customerPhone || !scheduledDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: customerName, customerPhone, scheduledDate' 
      }, { status: 400 })
    }

    // Check for conflicting appointments
    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .eq('scheduled_date', new Date(scheduledDate).toISOString())
      .eq('status', 'scheduled')

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ 
        error: 'Time slot already booked. Please choose a different time.' 
      }, { status: 400 })
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
        scheduled_date: new Date(scheduledDate).toISOString(),
        duration_minutes: 60, // Default 1 hour
        status: 'scheduled',
        notes: notes || '',
        source,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Appointment creation error:', appointmentError)
      return NextResponse.json({ 
        error: 'Failed to create appointment' 
      }, { status: 500 })
    }

    // Send confirmation SMS (if SMS service is configured)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        )

        const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })

        await twilio.messages.create({
          body: `Hi ${customerName}! Your appointment is confirmed for ${formattedDate}. We'll call you 30 minutes before arrival.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: customerPhone
        })

        // Update appointment with SMS sent status
        await supabaseAdmin
          .from('appointments')
          .update({ 
            confirmation_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id)

      } catch (smsError) {
        console.error('SMS confirmation failed:', smsError)
        // Don't fail the appointment creation if SMS fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment: {
        id: appointment.id,
        customerName: appointment.customer_name,
        customerPhone: appointment.customer_phone,
        serviceType: appointment.service_type,
        scheduledDate: appointment.scheduled_date,
        status: appointment.status
      }
    })

  } catch (error) {
    console.error('Appointment scheduling error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to schedule appointment' 
    }, { status: 500 })
  }
}
