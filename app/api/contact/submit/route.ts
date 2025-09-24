import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

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
      // Log the contact form submission without database
      console.log('Contact form submission (no DB):', {
        email: validatedData.email,
        subject: validatedData.subject,
        business: validatedData.business
      })
      
      return NextResponse.json({
        success: true,
        message: 'Message received successfully (demo mode)'
      })
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
      logger.error('Failed to store contact submission', contactError, {
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

    // TODO: Implement actual email sending to support team
    // TODO: Send auto-reply to customer
    // TODO: Integrate with support ticket system
    
    return NextResponse.json({
      success: true,
      message: 'Message received successfully'
    })
    
  } catch (error) {
    logger.error('Contact form submission error', error as Error, { body: await request.json().catch(() => ({})) })
    
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
