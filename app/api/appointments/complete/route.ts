import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNewBooking } from '@/lib/notifications'
import { z } from 'zod'

const completeAppointmentSchema = z.object({
  appointmentId: z.string().uuid('Valid appointment ID is required'),
  businessId: z.string().uuid('Valid business ID is required'),
  actualValue: z.number().min(0, 'Actual value must be positive').optional(),
  notes: z.string().optional(),
  completionStatus: z.enum(['completed', 'cancelled', 'no_show']).default('completed')
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'Appointment completion API is ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = completeAppointmentSchema.parse(body)
    
    // Update appointment status in database
    const updateData = {
      status: validatedData.completionStatus,
      actual_value: validatedData.actualValue || null,
      completion_notes: validatedData.notes || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: appointment, error: updateError } = await (supabaseAdmin() as any)
      .from('appointments')
      .update(updateData)
      .eq('id', validatedData.appointmentId)
      .eq('business_id', validatedData.businessId)
      .select()
      .single()
    
    if (updateError || !appointment) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update appointment'
      }, { status: 500 })
    }
    
    // Send notification to business owner
    try {
      await notifyNewBooking({
        error_message: `Appointment ${validatedData.completionStatus}: ${(appointment as any).customer_name || 'Customer'} - ${(appointment as any).service_type || 'Service'}`,
        businessId: validatedData.businessId
      })
    } catch (notificationError) {
      // Log notification error but don't fail the appointment completion
      try {
        await supabaseAdmin().from('error_logs').insert({
          error_type: 'api_warning',
          error_message: 'Failed to send appointment completion notification',
          details: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          business_id: validatedData.businessId,
          created_at: new Date().toISOString()
        } as any)
      } catch (logError) {
        // Fallback logging
      }
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Appointment completed successfully',
      data: {
        appointmentId: validatedData.appointmentId,
        status: validatedData.completionStatus,
        actualValue: validatedData.actualValue,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Appointment completion API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to complete appointment. Please try again.'
    }, { status: 500 })
  }
}
