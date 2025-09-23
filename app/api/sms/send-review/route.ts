import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { telynyxClient } from '@/lib/telynyx'
import { z } from 'zod'

const sendReviewSMSSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  customerPhone: z.string().min(10, 'Valid phone number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  appointmentId: z.string().uuid('Valid appointment ID is required').optional(),
  serviceType: z.string().min(1, 'Service type is required').optional(),
  rating: z.number().min(1).max(5).optional()
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'SMS review sending API is ready',
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
    const validatedData = sendReviewSMSSchema.parse(body)
    
    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select('business_name, phone_number, subscription_status')
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
    
    // Generate personalized review request message
    const serviceText = validatedData.serviceType ? ` for your ${validatedData.serviceType}` : ''
    const reviewMessage = `Hi ${validatedData.customerName}! Thank you${serviceText}. We'd love your feedback! Please rate us: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/reviews/${validatedData.businessId}?customer=${encodeURIComponent(validatedData.customerPhone)}. Reply STOP to opt out.`
    
    // Send SMS via Telynyx
    const smsResult = await telynyxClient.sendSMS(
      (business as any).phone_number,
      reviewMessage,
      validatedData.customerPhone
    )
    
    if (!smsResult.success) {
      return NextResponse.json({
        success: false,
        error: smsResult.error?.message || 'Failed to send review SMS'
      }, { status: 500 })
    }
    
    // Log SMS in database
    try {
      await supabaseAdmin()
        .from('sms_logs')
        .insert({
          business_id: validatedData.businessId,
          direction: 'outbound',
          from_number: (business as any).phone_number,
          to_number: validatedData.customerPhone,
          error_message: reviewMessage,
          status: 'sent',
          provider: 'telynyx',
          message_id: smsResult.messageId || null,
          type: 'review_request',
          appointment_id: validatedData.appointmentId || null,
          created_at: new Date().toISOString()
        } as any)
    } catch (dbError) {
      // Log error but don't fail the SMS sending
      try {
        await supabaseAdmin().from('error_logs').insert({
          error_type: 'api_warning',
          error_message: 'Failed to log review SMS to database',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
          business_id: validatedData.businessId,
          created_at: new Date().toISOString()
        } as any)
      } catch (logError) {
        // Fallback logging
      }
    }
    
    // Update appointment with review request if appointment ID provided
    if (validatedData.appointmentId) {
      try {
        await (supabaseAdmin() as any)
          .from('appointments')
          .update({
            review_request_sent: true,
            review_request_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', validatedData.appointmentId)
          .eq('business_id', validatedData.businessId)
      } catch (updateError) {
        // Log error but don't fail the SMS sending
        try {
          await supabaseAdmin().from('error_logs').insert({
            error_type: 'api_warning',
            error_message: 'Failed to update appointment with review request',
            details: updateError instanceof Error ? updateError.message : 'Unknown error',
            business_id: validatedData.businessId,
            appointment_id: validatedData.appointmentId,
            created_at: new Date().toISOString()
          } as any)
        } catch (logError) {
          // Fallback logging
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'Review request SMS sent successfully',
      data: {
        messageId: smsResult.messageId,
        to: validatedData.customerPhone,
        from: (business as any).phone_number,
        businessName: (business as any).business_name,
        customerName: validatedData.customerName,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'SMS review send API error',
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
      error: 'Failed to send review request SMS. Please try again.'
    }, { status: 500 })
  }
}
