import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { sendContactFormNotification, sendContactFormAutoReply } from '@/lib/email'

export const dynamic = 'force-dynamic'

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  business: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = contactSchema.parse(body)
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      logger.error('Database not configured for contact form')
      return NextResponse.json({
        success: false,
        error: 'Contact form service unavailable. Database not configured.'
      }, { status: 503 })
    }
    
    // Store contact form submission in database
    const { data: contactRecord, error: contactError } = await supabaseAdmin
      .from('contact_submissions')
      .insert({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: validatedData.email,
        business: validatedData.business || null,
        subject: validatedData.subject,
        message: validatedData.message,
        status: 'new',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (contactError) {
      logger.error('Failed to store contact submission', {
        error: contactError.message,
        email: validatedData.email,
        subject: validatedData.subject
      })
    }

    // Log the contact form submission
    logger.info('Contact form submission received', {
      email: validatedData.email,
      subject: validatedData.subject,
      business: validatedData.business,
      contactId: contactRecord?.id
    })

    // Send notification email to admin
    try {
      await sendContactFormNotification({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        business: validatedData.business,
        subject: validatedData.subject,
        message: validatedData.message
      })
    } catch (error) {
      logger.warn('Failed to send notification email', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Send auto-reply to customer
    try {
      await sendContactFormAutoReply({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        business: validatedData.business,
        subject: validatedData.subject,
        message: validatedData.message
      })
    } catch (error) {
      logger.warn('Failed to send auto-reply email', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Message received successfully'
    })
    
  } catch (error) {
    logger.error('Contact form submission error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      body: await request.json().catch(() => ({}))
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid form data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
