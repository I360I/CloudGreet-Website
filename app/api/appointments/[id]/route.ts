import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { z } from 'zod'
import { validateAndFormatPhone } from '@/lib/phone-validation'
import { syncGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/calendar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateAppointmentSchema = z.object({
  customer_name: z.string().min(1).max(100).optional(),
  customer_phone: z.string().min(1).optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  service_type: z.string().min(1).optional(),
  scheduled_date: z.string().optional(), // ISO date
  start_time: z.string().optional(), // ISO datetime
  end_time: z.string().optional(), // ISO datetime
  duration: z.number().min(15).max(480).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  estimated_value: z.number().min(0).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

/**
 * Get Appointment Details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const appointmentId = params.id

    // Fetch appointment with multi-tenant check
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single()

    if (appointmentError || !appointment) {
      if (appointmentError?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Appointment not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have access to this appointment' },
        { status: 403 }
      )
    }

    // Fetch business services for color mapping
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('services')
      .eq('id', businessId)
      .single()

    return NextResponse.json({
      success: true,
      appointment,
      businessServices: business?.services || []
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        ...rateLimitResult.headers
      }
    })
  } catch (error) {
    logger.error('Error fetching appointment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

/**
 * Update Appointment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const appointmentId = params.id

    // Verify appointment exists and belongs to business (multi-tenant check)
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single()

    if (fetchError || !existingAppointment) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Appointment not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have access to this appointment' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validated = updateAppointmentSchema.parse(body)

    // Fetch business for validation
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

    // Validate service_type if provided
    if (validated.service_type && (!business.services || !business.services.includes(validated.service_type))) {
      return NextResponse.json(
        { success: false, errors: { service_type: 'Service type not available for this business' } },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (validated.customer_name !== undefined) {
      updateData.customer_name = validated.customer_name
    }
    if (validated.customer_phone !== undefined) {
      const formattedPhone = validateAndFormatPhone(validated.customer_phone)
      if (!formattedPhone) {
        return NextResponse.json(
          { success: false, errors: { customer_phone: 'Invalid phone number format' } },
          { status: 400 }
        )
      }
      updateData.customer_phone = formattedPhone
    }
    if (validated.customer_email !== undefined) {
      updateData.customer_email = validated.customer_email || null
    }
    if (validated.service_type !== undefined) {
      updateData.service_type = validated.service_type
    }
    if (validated.status !== undefined) {
      updateData.status = validated.status
    }
    if (validated.scheduled_date !== undefined) {
      updateData.scheduled_date = validated.scheduled_date
    }
    if (validated.start_time !== undefined) {
      updateData.start_time = validated.start_time
    }
    if (validated.end_time !== undefined) {
      updateData.end_time = validated.end_time
    }
    if (validated.duration !== undefined) {
      updateData.duration = validated.duration
    }
    if (validated.estimated_value !== undefined) {
      updateData.estimated_value = validated.estimated_value || null
    }
    if (validated.address !== undefined) {
      updateData.address = validated.address || null
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes || null
    }

    // Check for conflicts if time changed
    if (validated.start_time || validated.end_time || validated.scheduled_date) {
      const startTime = validated.start_time ? new Date(validated.start_time) : new Date(existingAppointment.start_time)
      const endTime = validated.end_time ? new Date(validated.end_time) : new Date(existingAppointment.end_time)
      const scheduledDate = validated.scheduled_date || existingAppointment.scheduled_date

      const { data: conflicts } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .eq('scheduled_date', scheduledDate)
        .neq('id', appointmentId)
        .neq('status', 'cancelled')
        .or(`start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()}`)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Time slot conflict', conflicts: conflicts.length },
          { status: 409 }
        )
      }
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update appointment', {
        error: updateError instanceof Error ? updateError.message : String(updateError),
        appointmentId,
        businessId
      })
      return NextResponse.json(
        { success: false, error: 'Failed to update appointment' },
        { status: 500 }
      )
    }

    // Sync Google Calendar if calendar connected
    if (business.calendar_connected) {
      try {
        if (validated.status === 'cancelled' && existingAppointment.google_calendar_event_id) {
          // Delete from Google Calendar
          const calendarId = business.google_calendar_id || 'primary'
          await deleteGoogleCalendarEvent(
            calendarId,
            existingAppointment.google_calendar_event_id
          )
          
          // Clear event ID
          await supabaseAdmin
            .from('appointments')
            .update({ google_calendar_event_id: null })
            .eq('id', appointmentId)
        } else if (existingAppointment.google_calendar_event_id) {
          // Update Google Calendar event
          const calendarId = business.google_calendar_id || 'primary'
          const eventId = await syncGoogleCalendarEvent(
            calendarId,
            updatedAppointment,
            existingAppointment.google_calendar_event_id
          )
          
          // Update event ID if it changed
          if (eventId && eventId !== existingAppointment.google_calendar_event_id) {
            await supabaseAdmin
              .from('appointments')
              .update({ google_calendar_event_id: eventId })
              .eq('id', appointmentId)
          }
        }
      } catch (calendarError) {
        logger.error('Failed to sync Google Calendar', {
          error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
          appointmentId
        })
        // Don't fail the request if calendar sync fails
      }
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
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

    logger.error('Error updating appointment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

/**
 * Delete Appointment (Soft Delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const appointmentId = params.id

    // Verify appointment exists and belongs to business (multi-tenant check)
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('google_calendar_event_id')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single()

    if (fetchError || !existingAppointment) {
      if (fetchError?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Appointment not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have access to this appointment' },
        { status: 403 }
      )
    }

    // Fetch business for calendar sync
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('calendar_connected, google_calendar_id')
      .eq('id', businessId)
      .single()

    // Soft delete (set status to cancelled)
    const { error: deleteError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('business_id', businessId)

    if (deleteError) {
      logger.error('Failed to delete appointment', {
        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
        appointmentId,
        businessId
      })
      return NextResponse.json(
        { success: false, error: 'Failed to delete appointment' },
        { status: 500 }
      )
    }

    // Delete Google Calendar event if exists
    if (business?.calendar_connected && existingAppointment.google_calendar_event_id) {
      try {
        const calendarId = business.google_calendar_id || 'primary'
        await deleteGoogleCalendarEvent(
          calendarId,
          existingAppointment.google_calendar_event_id
        )
        
        // Clear event ID
        await supabaseAdmin
          .from('appointments')
          .update({ google_calendar_event_id: null })
          .eq('id', appointmentId)
      } catch (calendarError) {
        logger.error('Failed to delete Google Calendar event', {
          error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
          appointmentId
        })
        // Don't fail the request if calendar deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    }, {
      headers: rateLimitResult.headers
    })
  } catch (error) {
    logger.error('Error deleting appointment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}

