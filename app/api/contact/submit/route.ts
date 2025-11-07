import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Submit Contact Form
 * Saves submission to database and sends email notification to support team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, businessName, message, subject } = body

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

    // Send email notification to support team
    let emailSent = false
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@cloudgreet.com'

        await resend.emails.send({
          from: fromEmail,
          to: supportEmail,
          replyTo: email,
          subject: `New Contact Form Submission: ${emailSubject}`,
          html: `
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
        })
        
        emailSent = true
        logger.info('Contact form email sent successfully', { email, submissionId: submission?.id })
      } catch (emailError) {
        logger.error('Failed to send contact form email', { 
          error: emailError instanceof Error ? emailError.message : String(emailError),
          email 
        })
        // Don't fail the request if email fails - submission is saved
      }
    } else {
      logger.warn('RESEND_API_KEY not configured, skipping email notification', { email })
    }

    // Log submission
    logger.info('Contact form submission processed', {
      email,
      firstName,
      lastName,
      businessName,
      submissionId: submission?.id,
      emailSent,
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

