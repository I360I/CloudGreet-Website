import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

// Your personal phone number for notifications
const PERSONAL_PHONE = '+17372960092'
const BUSINESS_PHONE = '+17372448305'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      type, 
      message, 
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
        emoji = '📅'
        notificationText = `${emoji} NEW BOOKING: ${message}`
        break
      case 'client_acquisition':
        emoji = '🎉'
        notificationText = `${emoji} NEW CLIENT: ${message}`
        break
      case 'system_error':
        emoji = '⚠️'
        notificationText = `${emoji} SYSTEM ERROR: ${message}`
        break
      case 'client_support':
        emoji = '🆘'
        notificationText = `${emoji} CLIENT SUPPORT: ${message}`
        break
      case 'payment_received':
        emoji = '💰'
        notificationText = `${emoji} PAYMENT: ${message}`
        break
      case 'payment_failed':
        emoji = '❌'
        notificationText = `${emoji} PAYMENT FAILED: ${message}`
        break
      default:
        emoji = '📢'
        notificationText = `${emoji} NOTIFICATION: ${message}`
    }

    // Add timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    notificationText += `\n⏰ ${timestamp}`

    // Send SMS notification
    try {
      const smsResponse = await fetch('https://api.telynx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: BUSINESS_PHONE,
          to: PERSONAL_PHONE,
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
            sent_to: PERSONAL_PHONE,
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
          message: 'Notification sent successfully' 
        })
      } else {
        const errorData = await smsResponse.text()
        logger.error('Failed to send notification SMS', new Error('Telynyx API error'), {
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          error: errorData
        })

        return NextResponse.json({ 
          error: 'Failed to send notification' 
        }, { status: 500 })
      }
    } catch (error) {
      logger.error('Error sending notification', error as Error, { body })
      return NextResponse.json({ 
        error: 'Failed to send notification' 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Notification send error', error as Error, { endpoint: 'notifications/send' })
    return NextResponse.json({ 
      error: 'Failed to process notification' 
    }, { status: 500 })
  }
}
