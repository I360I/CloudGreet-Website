import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { TelnyxClient } from '@/lib/telnyx'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Message Client API
 * 
 * POST: Send SMS or email message to a client (business owner)
 * 
 * Body: {
 *   clientId: string (required) - Business ID
 *   type: 'sms' | 'email' (required)
 *   message: string (required) - Message content
 *   subject?: string - Email subject (required for email)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clientId, type, message, subject } = body

    // Validate required fields
    if (!clientId || !type || !message) {
      return NextResponse.json(
        { error: 'clientId, type, and message are required' },
        { status: 400 }
      )
    }

    if (type === 'email' && !subject) {
      return NextResponse.json(
        { error: 'subject is required for email messages' },
        { status: 400 }
      )
    }

    // Validate type
    if (type !== 'sms' && type !== 'email') {
      return NextResponse.json(
        { error: 'type must be "sms" or "email"' },
        { status: 400 }
      )
    }

    // Get client (business) details
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, email, phone_number, owner_id')
      .eq('id', clientId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get owner details
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('id, email, phone, name')
      .eq('id', business.owner_id)
      .single()

    if (!owner) {
      return NextResponse.json(
        { error: 'Client owner not found' },
        { status: 404 }
      )
    }

    // Send message based on type
    if (type === 'sms') {
      return await sendSMS(business, owner, message, adminAuth.userId || '')
    } else {
      return await sendEmail(business, owner, message, subject || '', adminAuth.userId || '')
    }

  } catch (error) {
    logger.error('Admin message client failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

/**
 * Send SMS to client
 */
async function sendSMS(
  business: { id: string; business_name: string; phone_number: string | null },
  owner: { id: string; phone: string | null; name: string },
  message: string,
  adminUserId: string
) {
  try {
    // Validate phone number
    if (!owner.phone) {
      return NextResponse.json(
        { error: 'Client does not have a phone number on file' },
        { status: 400 }
      )
    }

    // Get business phone number for "from" field (use admin default if business doesn't have one)
    const fromNumber = business.phone_number || process.env.NEXT_PUBLIC_BUSINESS_PHONE || null

    if (!fromNumber) {
      logger.warn('No from phone number available for SMS', { businessId: business.id })
    }

    // Initialize Telnyx client
    const telnyxClient = new TelnyxClient()
    
    // Send SMS via Telnyx
    let telnyxResponse = null
    let smsStatus = 'failed'
    let externalId = null
    
    try {
      telnyxResponse = await telnyxClient.sendSMS(
        owner.phone,
        message,
        fromNumber || undefined
      )
      
      smsStatus = 'sent'
      externalId = telnyxResponse?.data?.id || null
      
      logger.info('Admin SMS sent successfully', {
        to: owner.phone,
        from: fromNumber,
        messageId: externalId,
        businessId: business.id,
        adminUserId
      })
    } catch (telnyxError) {
      logger.error('Telnyx SMS send failed', {
        error: telnyxError instanceof Error ? telnyxError.message : String(telnyxError),
        to: owner.phone,
        businessId: business.id
      })
      
      smsStatus = 'failed'
    }

    // Save SMS to database
    const { data: smsRecord, error: smsError } = await supabaseAdmin
      .from('sms_logs')
      .insert({
        business_id: business.id,
        to_number: owner.phone,
        from_number: fromNumber || 'admin',
        message_text: message,
        direction: 'outbound',
        status: smsStatus,
        type: 'admin_message',
        message_id: externalId
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Failed to save SMS to database', { 
        error: smsError instanceof Error ? smsError.message : String(smsError) 
      })
    }

    // Return appropriate response
    if (smsStatus === 'failed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send SMS. Please check phone number configuration.',
          messageId: smsRecord?.id || null
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      messageId: smsRecord?.id || null,
      externalId: externalId
    })

  } catch (error) {
    logger.error('Error sending admin SMS', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId: business.id
    })
    return NextResponse.json(
      { success: false, error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}

/**
 * Send email to client
 */
async function sendEmail(
  business: { id: string; business_name: string },
  owner: { id: string; email: string; name: string },
  message: string,
  subject: string,
  adminUserId: string
) {
  try {
    // Validate email
    if (!owner.email) {
      return NextResponse.json(
        { error: 'Client does not have an email address on file' },
        { status: 400 }
      )
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, cannot send email')
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 503 }
      )
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'

    let emailSent = false
    let externalId = null

    try {
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: owner.email,
        replyTo: fromEmail,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Message from CloudGreet Support</h2>
            
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p><strong>To:</strong> ${owner.name} (${business.business_name})</p>
              <p><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This is an automated message from CloudGreet support team.
            </p>
          </div>
        `
      })

      emailSent = true
      externalId = emailResponse?.data?.id || null

      logger.info('Admin email sent successfully', {
        to: owner.email,
        from: fromEmail,
        emailId: externalId,
        businessId: business.id,
        adminUserId
      })
    } catch (emailError) {
      logger.error('Resend email send failed', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        to: owner.email,
        businessId: business.id
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send email. Please check email configuration.',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Log email in database (we don't have an emails table, so we'll log it in audit_logs)
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        business_id: business.id,
        user_id: adminUserId,
        action: 'admin_email_sent',
        resource_type: 'email',
        resource_id: externalId || null,
        metadata: {
          to: owner.email,
          subject: subject,
          message_length: message.length,
          external_id: externalId
        }
      })

    if (logError) {
      logger.error('Failed to log email to database', { 
        error: logError instanceof Error ? logError.message : String(logError) 
      })
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: externalId
    })

  } catch (error) {
    logger.error('Error sending admin email', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId: business.id
    })
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

