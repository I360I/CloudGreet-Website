import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { enforceRequestSizeLimit } from '@/lib/request-limits'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { queueJob } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Submit Contact Form
 * Saves submission to database and sends email notification to support team
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (100 requests per 15 minutes)
    const rateLimitResult = await moderateRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime)
          }
        }
      )
    }

    // Enforce request size limit (1MB)
    const sizeCheck = enforceRequestSizeLimit(request)
    if ('error' in sizeCheck) {
      return sizeCheck.error
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { firstName, lastName, email, businessName, message, subject } = body || {}

    // Validate required fields
    if (!email || !message) {
      return NextResponse.json(
        { success: false, message: 'Email and message are required' },
        { status: 400 }
      )
    }

    // Generate subject if not provided
    const emailSubject = subject || `Contact Form Submission from ${firstName || email}`

    // Save to database
    const { data: submission, error: dbError } = await supabaseAdmin
      .from('contact_submissions')
      .insert({
        first_name: firstName || '',
        last_name: lastName || '',
        email: email,
        business: businessName || null,
        subject: emailSubject,
        message: message,
        status: 'new'
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Failed to save contact submission', { 
        error: dbError instanceof Error ? dbError.message : String(dbError),
        email 
      })
      // Continue even if DB save fails - still try to send email
    }

    // Queue email notification to support team (async processing)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@cloudgreet.com'
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">New Contact Form Submission</h2>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${firstName || ''} ${lastName || ''} <${email}></p>
          ${businessName ? `<p><strong>Business:</strong> ${businessName}</p>` : ''}
          <p><strong>Subject:</strong> ${emailSubject}</p>
          ${submission?.id ? `<p><strong>Ticket ID:</strong> ${submission.id}</p>` : ''}
        </div>
        
        <div style="background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          This is an automated notification from the CloudGreet contact form.
          ${submission?.id ? `Ticket ID: ${submission.id}` : ''}
        </p>
      </div>
    `
    
    try {
      await queueJob('send_email', {
        to: supportEmail,
        subject: `New Contact Form Submission: ${emailSubject}`,
        html: emailHtml,
        from: fromEmail,
        replyTo: email
      }, { maxAttempts: 3 })
      
      logger.info('Contact form email queued successfully', { email, submissionId: submission?.id })
    } catch (queueError) {
      logger.error('Failed to queue contact form email', { 
        error: queueError instanceof Error ? queueError.message : String(queueError),
        email 
      })
      // Don't fail the request if email queue fails - submission is saved
    }

    // Log submission
    logger.info('Contact form submission processed', {
      email,
      firstName,
      lastName,
      businessName,
      submissionId: submission?.id,
      messageLength: message.length
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
      ticketId: submission?.id || null
    })
  } catch (error) {
    logger.error('Error submitting contact form', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to submit contact form. Please try again.' },
      { status: 500 }
    )
  }
}
