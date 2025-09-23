import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

const followUpSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  type: z.enum(['appointment_reminder', 'follow_up_call', 'review_request', 'payment_reminder', 'custom']),
  customerPhone: z.string().min(10, 'Valid phone number is required').optional(),
  customerEmail: z.string().email('Valid email is required').optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  appointmentId: z.string().uuid('Valid appointment ID is required').optional(),
  scheduledFor: z.string().min(1, 'Scheduled date is required'),
  message: z.string().min(10, 'Message must be at least 10 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }
    
    // Get pending follow-ups for business
    const { data: followUps, error } = await supabaseAdmin()
      .from('automation_follow_ups')
      .select(`
        id,
        type,
        customer_name,
        customer_phone,
        customer_email,
        appointment_id,
        message,
        priority,
        status,
        scheduled_for,
        created_at
      `)
      .eq('business_id', businessId)
      .in('status', ['pending', 'scheduled'])
      .order('scheduled_for', { ascending: true })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch follow-ups'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        followUps: followUps || []
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Automation follow-up GET API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
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
    const validatedData = followUpSchema.parse(body)
    
    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select('business_name, subscription_status')
      .eq('id', validatedData.businessId)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }
    
    // Check if business has active subscription
    if ((business as any).subscription_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Business subscription is not active'
      }, { status: 403 })
    }
    
    // Generate default message if not provided
    let message = validatedData.message
    if (!message) {
      switch (validatedData.type) {
        case 'appointment_reminder':
          message = `Hi ${validatedData.customerName}! This is a reminder about your upcoming appointment. Please confirm or reschedule if needed.`
          break
        case 'follow_up_call':
          message = `Hi ${validatedData.customerName}! We hope you're satisfied with our service. We'd love to hear from you!`
          break
        case 'review_request':
          message = `Hi ${validatedData.customerName}! Thank you for choosing us. We'd appreciate your feedback!`
          break
        case 'payment_reminder':
          message = `Hi ${validatedData.customerName}! This is a friendly reminder about your payment.`
          break
        default:
          message = `Hi ${validatedData.customerName}! We have an important update for you.`
      }
    }
    
    // Create follow-up automation record
    const { data: followUp, error: followUpError } = await supabaseAdmin()
      .from('automation_follow_ups')
      .insert({
        business_id: validatedData.businessId,
        type: validatedData.type,
        customer_name: validatedData.customerName,
        customer_phone: validatedData.customerPhone || null,
        customer_email: validatedData.customerEmail || null,
        appointment_id: validatedData.appointmentId || null,
        message: message,
        priority: validatedData.priority,
        status: 'scheduled',
        scheduled_for: validatedData.scheduledFor,
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (followUpError || !followUp) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create follow-up automation'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Follow-up automation scheduled successfully',
      data: {
        followUpId: (followUp as any).id,
        type: validatedData.type,
        customerName: validatedData.customerName,
        scheduledFor: validatedData.scheduledFor,
        businessName: (business as any).business_name
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Automation follow-up POST API error',
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
      error: 'Failed to schedule follow-up automation. Please try again.'
    }, { status: 500 })
  }
}
