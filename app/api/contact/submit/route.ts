import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendContactEmail } from '@/lib/email'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  business: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters')
})

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Contact form API is ready',
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
    const validatedData = contactSchema.parse(body)
    
    // Send email notification
    await sendContactEmail({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      business: validatedData.business,
      subject: validatedData.subject,
      message: validatedData.message
    })
    
    // Store contact form submission in database for tracking
    try {
      const { error: dbError } = await supabaseAdmin()
        .from('support_tickets')
        .insert({
          type: 'contact_form',
          status: 'open',
          priority: 'medium',
          subject: validatedData.subject,
          message: validatedData.message,
          business: validatedData.business || null,
          created_at: new Date().toISOString()
        } as any)
      
      if (dbError) {
        // Log database error but don't fail the request
        logger.warn('Failed to store contact form in database', { error: dbError })
      }
    } catch (dbError) {
      logger.warn('Database error during contact form storage', { error: dbError })
    }
    
    logger.info('Contact form submitted successfully', {
      email: validatedData.email,
      subject: validatedData.subject
    })
    
    return NextResponse.json({
      success: true,
      error_message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Contact form submission error', error as Error, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to submit contact form. Please try again.'
    }, { status: 500 })
  }
}
