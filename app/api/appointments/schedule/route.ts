import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const appointmentSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  serviceType: z.string().min(1).max(100).optional(),
  scheduledDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  notes: z.string().max(500).optional(),
  source: z.enum(['ai_agent', 'manual', 'website', 'phone']).default('ai_agent')
})

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = appointmentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 })
    }

    const { customerName, customerPhone, customerEmail, serviceType, scheduledDate, notes, source } = validationResult.data

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
        customer_email: customerEmail || null,
        service_type: serviceType || 'General Service',
        scheduled_date: new Date(scheduledDate).toISOString(),
        duration: 60, // Default 1 hour
        status: 'scheduled',
        notes: notes || ''
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Appointment creation error:', appointmentError)
      return NextResponse.json({ 
        error: 'Failed to create appointment',
        details: appointmentError.message,
        code: appointmentError.code
      }, { status: 500 })
    }

    // SMS confirmation will be handled by the Telnyx integration
    // Update appointment with confirmation status
    await supabaseAdmin
      .from('appointments')
      .update({ 
        confirmation_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.id)

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
