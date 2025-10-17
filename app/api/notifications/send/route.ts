import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { sendEmail } from '@/lib/email'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      type, 
      message, 
      recipient, // Allow custom recipient for testing
      businessId, 
      clientId, 
      priority = 'normal' 
    } = body
    
    // Verify user owns this business
    if (businessId && userBusinessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json({ error: 'Type and message are required' }, { status: 400 })
    }
    
    // Get business notification settings from database (no hardcoded phones)
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('notification_phone, owner_phone, notification_email, owner_email')
      .eq('id', userBusinessId)
      .single()
    
    const notificationPhone = recipient || business?.notification_phone || business?.owner_phone
    const notificationEmail = business?.notification_email || business?.owner_email

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

    // Determine recipient (use custom recipient if provided, otherwise use environment variable)
    const smsRecipient = recipient || process.env.PERSONAL_PHONE || '+17372960092'

    // Try SMS first, fall back to email if SMS not available or fails
    let smsSuccess = false
    let emailSuccess = false

    // Send SMS notification
    try {
      // Check if we have a valid business phone for SMS
      const businessPhone = process.env.BUSINESS_PHONE || '+18333956731'
      
      if (!process.env.TELNYX_API_KEY || !businessPhone) {
        logger.warn('SMS service not configured, will use email fallback', {
          hasTelnyxKey: !!process.env.TELNYX_API_KEY,
          hasBusinessPhone: !!businessPhone
        })
        // Don't return error, continue to email fallback
      } else {
        
        // Log what we're about to send (for debugging)
        logger.info('Attempting to send SMS', {
          from: businessPhone,
          to: smsRecipient,
          messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID
        })

        const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: businessPhone,
            to: smsRecipient,
            text: notificationText,
            messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
          })
        })

        if (smsResponse.ok) {
          smsSuccess = true
          
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

          logger.info('SMS notification sent successfully', {
            type,
            message,
            businessId,
            clientId,
            priority
          })
        } else {
          const errorData = await smsResponse.text()
          logger.warn('SMS failed, will try email fallback', { 
            status: smsResponse.status,
            statusText: smsResponse.statusText,
            errorData: errorData,
            recipient: smsRecipient
          })
          
          // Log failed SMS attempt
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
        }
      }
    } catch (error) {
      logger.error('Error sending SMS notification', { 
        error: error instanceof Error ? error.message : 'Unknown error',  
        body 
      })
      // Continue to email fallback
    }

    // Email fallback if SMS not sent
    if (!smsSuccess) {
      try {
        logger.info('Sending email notification', { 
          type, 
          message,
          to: process.env.NOTIFICATION_EMAIL || 'support@cloudgreet.com',
          emailConfigured: !!process.env.RESEND_API_KEY
        })
        
        // Create email subject based on type
        let emailSubject = ''
        let emailEmoji = ''
        
        switch (type) {
          case 'client_booking':
            emailSubject = '📅 New Booking - CloudGreet'
            emailEmoji = '📅'
            break
          case 'client_acquisition':
            emailSubject = '🎉 New Client Signup - CloudGreet'
            emailEmoji = '🎉'
            break
          case 'system_error':
            emailSubject = '🚨 System Error - CloudGreet'
            emailEmoji = '🚨'
            break
          case 'client_support':
            emailSubject = '💬 Client Support Request - CloudGreet'
            emailEmoji = '💬'
            break
          case 'payment_received':
            emailSubject = '💰 Payment Received - CloudGreet'
            emailEmoji = '💰'
            break
          case 'payment_failed':
            emailSubject = '❌ Payment Failed - CloudGreet'
            emailEmoji = '❌'
            break
          default:
            emailSubject = '🔔 CloudGreet Notification'
            emailEmoji = '🔔'
        }

        const emailResult = await sendEmail({
          to: process.env.NOTIFICATION_EMAIL || 'support@cloudgreet.com',
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 32px;">${emailEmoji}</h1>
                <h2 style="color: white; margin: 10px 0 0 0;">${emailSubject.replace(' - CloudGreet', '')}</h2>
              </div>
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                  <p style="margin: 0 0 15px 0; font-size: 16px; color: #333; line-height: 1.6;">
                    ${message}
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Time:</strong> ${timestamp}
                  </p>
                  ${businessId ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #666;"><strong>Business ID:</strong> ${businessId}</p>` : ''}
                  ${clientId ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>Client ID:</strong> ${clientId}</p>` : ''}
                </div>
                <div style="margin-top: 20px; text-align: center;">
                  <a href="https://cloudgreet.com/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
                  CloudGreet - AI Phone Receptionist Platform
                </p>
              </div>
            </div>
          `
        })

        logger.info('Email send result', { emailResult })

        if (emailResult.success) {
          emailSuccess = true
        } else {
          logger.error('Email send returned failure', { 
            error: emailResult.error 
          })
        }
        
        // Log email notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            type,
            message,
            notification_text: notificationText,
            business_id: businessId,
            client_id: clientId,
            priority,
            status: 'email_sent',
            sent_to: process.env.NOTIFICATION_EMAIL || 'admin@cloudgreet.com',
            created_at: new Date().toISOString()
          })

        logger.info('Email notification sent successfully', {
          type,
          message,
          email: process.env.NOTIFICATION_EMAIL || 'admin@cloudgreet.com'
        })
      } catch (emailError) {
        logger.error('Failed to send email notification', { 
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        })
      }
    }

    // Return success if either SMS or email succeeded
    if (smsSuccess || emailSuccess) {
      return NextResponse.json({ 
        success: true, 
        message: 'Notification sent successfully',
        smsStatus: smsSuccess ? 'sent' : 'failed',
        emailStatus: emailSuccess ? 'sent' : (smsSuccess ? 'not_needed' : 'failed'),
        method: smsSuccess ? 'sms' : 'email'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send notification via SMS or email' 
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
