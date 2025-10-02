import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Get phone numbers from environment variables
const PERSONAL_PHONE = process.env.NOTIFICATION_PHONE || '+17372960092'
const BUSINESS_PHONE = process.env.TELYNX_BUSINESS_PHONE || '+18005551234' // Toll-free number for notifications

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      type, 
      message, 
      recipient, // Allow custom recipient for testing
      businessId, 
      clientId, 
      priority = 'normal' 
    } = body

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json({ error: 'Type and message are required' }, { status: 400 })
    }

    // Create notification message based on type
    let notificationText = ''
    let emoji = ''

    switch (type) {
      case 'client_booking':
        notificationText = `NEW BOOKING: ${message}`
        break
      case 'client_acquisition':
        notificationText = `NEW CLIENT: ${message}`
        break
      case 'system_error':
        notificationText = `SYSTEM ERROR: ${message}`
        break
      case 'client_support':
        notificationText = `CLIENT SUPPORT: ${message}`
        break
      case 'payment_received':
        notificationText = `PAYMENT: ${message}`
        break
      case 'payment_failed':
        notificationText = `PAYMENT FAILED: ${message}`
        break
      default:
        notificationText = `NOTIFICATION: ${message}`
    }

    // Add timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    notificationText += `\nTime: ${timestamp}`

    // Determine recipient (use custom recipient if provided, otherwise default to personal phone)
    const smsRecipient = recipient || PERSONAL_PHONE

    // Send SMS notification
    try {
      // Check if we have a valid business phone for SMS
      if (!process.env.TELYNX_API_KEY || !BUSINESS_PHONE) {
        return NextResponse.json({ 
          success: true, 
          message: 'Notification logged (SMS not configured)' 
        })
      }

      const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: BUSINESS_PHONE,
          to: smsRecipient,
          text: notificationText,
          type: 'SMS'
        })
      })

      if (smsResponse.ok) {
        // Log the notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            type,
            message,
            notification_text: notificationText,
            business_id: businessId,
            client_id: clientId,
            priority,
            status: 'sent',
            sent_to: smsRecipient,
            created_at: new Date().toISOString()
          })

        logger.info('Notification sent successfully', {
          type,
          message,
          businessId,
          clientId,
          priority
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Notification sent successfully',
          smsStatus: 'sent',
          telnyxResponse: await smsResponse.json()
        })
      } else {
        const errorData = await smsResponse.text()
        // SMS API Error logged
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          error: errorData,
          recipient: smsRecipient,
          from: BUSINESS_PHONE,
          hasApiKey: !!process.env.TELYNX_API_KEY
        })
        
        // For SMS errors, log the notification anyway and return success
        // This prevents SMS issues from breaking the notification system
        await supabaseAdmin
          .from('notifications')
          .insert({
            type,
            message,
            notification_text: notificationText,
            business_id: businessId,
            client_id: clientId,
            priority,
            status: 'sms_failed',
            sent_to: smsRecipient,
            created_at: new Date().toISOString()
          })
        
        logger.error('Failed to send notification SMS', { 
          error: new Error('Telynyx API error'), 
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          errorData: errorData,
          recipient: smsRecipient
        })
        
        return NextResponse.json({ 
          success: false, 
          message: 'SMS failed - check details',
          smsError: errorData,
          status: smsResponse.status,
          telnyxError: true
        })
      }
    } catch (error) {
      logger.error('Error sending notification', { 
        error: error instanceof Error ? error.message : 'Unknown error',  
        body 
      })
      return NextResponse.json({ 
        error: 'Failed to send notification' 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Notification send error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'notifications/send' 
    })
    return NextResponse.json({ 
      error: 'Failed to process notification' 
    }, { status: 500 })
  }
}
