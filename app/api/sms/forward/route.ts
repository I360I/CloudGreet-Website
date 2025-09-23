import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { telynyxClient } from '@/lib/telynyx'
import { z } from 'zod'

const forwardSMSSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  toNumber: z.string().min(10, 'Valid phone number is required'),
  message: z.string().min(1, 'Message is required'),
  fromNumber: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'SMS forwarding API is ready',
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
    const validatedData = forwardSMSSchema.parse(body)
    
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
    
    // Use business phone number as from number if not provided
    const fromNumber = validatedData.fromNumber || (business as any).phone_number
    
    if (!fromNumber) {
      return NextResponse.json({
        success: false,
        error: 'Business phone number not configured'
      }, { status: 400 })
    }
    
    // Send SMS via Telynyx
    const smsResult = await telynyxClient.sendSMS(
      fromNumber,
      validatedData.message,
      validatedData.toNumber
    )
    
    if (!smsResult.success) {
      return NextResponse.json({
        success: false,
        error: smsResult.error?.message || 'Failed to send SMS'
      }, { status: 500 })
    }
    
    // Log SMS in database
    try {
      await supabaseAdmin()
        .from('sms_logs')
        .insert({
          business_id: validatedData.businessId,
          direction: 'outbound',
          from_number: fromNumber,
          to_number: validatedData.toNumber,
          message: validatedData.message,
          status: 'sent',
          provider: 'telynyx',
          message_id: smsResult.messageId || null,
          created_at: new Date().toISOString()
        } as any)
    } catch (dbError) {
      // Log error but don't fail the SMS sending
      try {
        await supabaseAdmin().from('error_logs').insert({
          error_type: 'api_warning',
          error_message: 'Failed to log SMS to database',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
          business_id: validatedData.businessId,
          created_at: new Date().toISOString()
        } as any)
      } catch (logError) {
        // Fallback logging
      }
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'SMS sent successfully',
      data: {
        messageId: smsResult.messageId,
        to: validatedData.toNumber,
        from: fromNumber,
        businessName: (business as any).business_name,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'SMS forward API error',
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
      error: 'Failed to send SMS. Please try again.'
    }, { status: 500 })
  }
}
