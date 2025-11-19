import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { z } from 'zod'
import { validateAndFormatPhone } from '@/lib/phone-validation'
import { syncGoogleCalendarEvent } from '@/lib/calendar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createAppointmentSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(1),
  customer_email: z.string().email().optional(),
  service_type: z.string().min(1),
  scheduled_date: z.string(), // ISO date
  start_time: z.string(), // ISO datetime
  end_time: z.string(), // ISO datetime
  duration: z.number().min(15).max(480),
  estimated_value: z.number().min(0).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

/**
 * Create Appointment
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await moderateRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    // Authenticate
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId || !authResult.businessId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = authResult.businessId

    // Parse and validate body
    const body = await request.json()
    const validated = createAppointmentSchema.parse(body)

    // Validate phone
    const formattedPhone = validateAndFormatPhone(validated.customer_phone)
    if (!formattedPhone) {
      return NextResponse.json(
        { success: false, errors: { customer_phone: 'Invalid phone number format' } },
        { status: 400 }
      )
    }

    // Fetch business to verify service_type
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('services, business_hours, timezone, calendar_connected, google_calendar_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify service_type exists in business.services
    if (!business.services || !business.services.includes(validated.service_type)) {
      return NextResponse.json(
        { success: false, errors: { service_type: 'Service type not available for this business' } },
        { status: 400 }
      )
    }

    // Check for overlapping appointments
    const startTime = new Date(validated.start_time)
    const endTime = new Date(validated.end_time)

    const { data: conflicts } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .eq('scheduled_date', validated.scheduled_date)
      .neq('status', 'cancelled')
      .or(`start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()}`)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Time slot conflict', conflicts: conflicts.length },
        { status: 409 }
      )
    }

    // Create appointment using transaction function
    const { data: appointment, error: createError } = await supabaseAdmin
      .rpc('create_appointment_safe', {
        p_business_id: businessId,
        p_customer_name: validated.customer_name,
        p_customer_phone: formattedPhone,
        p_customer_email: validated.customer_email || null,
        p_service_type: validated.service_type,
        p_scheduled_date: validated.scheduled_date,
        p_start_time: validated.start_time,
        p_end_time: validated.end_time,
        p_duration: validated.duration,
        p_estimated_value: validated.estimated_value || null,
        p_address: validated.address || null,
        p_notes: validated.notes || null
      })

    if (createError) {
      logger.error('Failed to create appointment', {
        error: createError instanceof Error ? createError.message : String(createError),
        businessId
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create appointment' },
        { status: 500 }
      )
    }

    // Sync Google Calendar if calendar_connected
    if (business.calendar_connected && appointment) {
      try {
        const calendarId = business.google_calendar_id || 'primary'
        const eventId = await syncGoogleCalendarEvent(
          calendarId,
          appointment,
          null // No existing event ID for new appointments
        )
        
        if (eventId) {
          // Update appointment with Google Calendar event ID
          await supabaseAdmin
            .from('appointments')
            .update({ google_calendar_event_id: eventId })
            .eq('id', appointment.id)
          
          logger.info('Appointment synced to Google Calendar', {
            appointmentId: appointment.id,
            googleEventId: eventId,
            businessId
          })
        } else {
          logger.warn('Failed to sync appointment to Google Calendar, appointment saved in database', {
            appointmentId: appointment.id,
            businessId
          })
        }
      } catch (calendarError) {
        // Don't fail the appointment creation if calendar sync fails
        logger.error('Error syncing appointment to Google Calendar', {
          error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
          appointmentId: appointment.id,
          businessId
        })
      }
    }

    return NextResponse.json({
      success: true,
      appointment
    }, {
      headers: rateLimitResult.headers
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message
        }
      })
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      )
    }

    logger.error('Error creating appointment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

