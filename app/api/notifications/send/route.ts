import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNewBooking } from '@/lib/notifications'
import { z } from 'zod'

const sendNotificationSchema = z.object({
  businessId: z.string().uuid('Valid business ID is required'),
  type: z.enum(['appointment_reminder', 'new_booking', 'payment_due', 'system_alert', 'custom']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduledFor: z.string().optional(),
  channels: z.array(z.enum(['email', 'sms', 'dashboard'])).default(['dashboard'])
})

export async function GET(request: NextRequest) {
  try {
      return NextResponse.json({
        success: true,
        message: 'Notifications API is ready',
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
    const validatedData = sendNotificationSchema.parse(body)
    
    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select('business_name, email, phone_number, subscription_status')
      .eq('id', validatedData.businessId)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }
    
    // Create notification record
    const { data: notification, error: notificationError } = await supabaseAdmin()
      .from('notifications')
      .insert({
        business_id: validatedData.businessId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        priority: validatedData.priority,
        status: 'pending',
        channels: validatedData.channels,
        scheduled_for: validatedData.scheduledFor || new Date().toISOString(),
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()
    
    if (notificationError || !notification) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create notification'
      }, { status: 500 })
    }
    
    // Send notifications through configured channels
    const results = []
    
    for (const channel of validatedData.channels) {
      try {
        let result
        
        switch (channel) {
          case 'email':
            if ((business as any).email) {
              // Send email notification
              result = await sendEmailNotification(
                (business as any).email,
                validatedData.title,
                validatedData.message,
                (business as any).business_name
              )
            }
            break
            
          case 'sms':
            if ((business as any).phone_number) {
              // Send SMS notification
              result = await sendSMSNotification(
                (business as any).phone_number,
                validatedData.message
              )
            }
            break
            
          case 'dashboard':
            // Dashboard notifications are already stored in database
            result = { success: true, channel: 'dashboard', error_message: 'Stored in database' }
            break
        }
        
        if (result) {
          results.push({
            channel,
            success: result.success || false,
            error_message: result.message || 'Notification sent'
          })
        }
      } catch (channelError) {
        results.push({
          channel,
          success: false,
          error: channelError instanceof Error ? channelError.message : 'Unknown error'
        })
      }
    }
    
    // Update notification status
    const successCount = results.filter(r => r.success).length
    const status = successCount === results.length ? 'sent' : successCount > 0 ? 'partial' : 'failed'
    
    await (supabaseAdmin() as any)
      .from('notifications')
      .update({
        status,
        sent_at: status !== 'failed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', (notification as any).id)
    
    return NextResponse.json({
      success: true,
      error_message: 'Notification processed',
      data: {
        notificationId: (notification as any).id,
        status,
        results,
        businessName: (business as any).business_name
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Notifications send API error',
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
      error: 'Failed to send notification. Please try again.'
    }, { status: 500 })
  }
}

// Helper functions for sending notifications
async function sendEmailNotification(email: string, title: string, error_message: string, businessName: string) {
  // This would integrate with your email service (SendGrid, Mailgun, etc.)
  // For now, we'll simulate success
  return {
    success: true,
    error_message: 'Email notification queued'
  }
}

async function sendSMSNotification(phoneNumber: string, error_message: string) {
  // This would integrate with your SMS service (Telynyx, Twilio, etc.)
  // For now, we'll simulate success
  return {
    success: true,
    error_message: 'SMS notification queued'
  }
}
