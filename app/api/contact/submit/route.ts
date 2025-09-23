import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// import { logger } from '@/lib/monitoring' // Temporarily disabled
import { sendContactEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase'

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
    
    // Contact form submission received
    
    // Send email notification to support team with retry logic
    let emailResult = await sendContactEmail(validatedData)
    let retryCount = 0
    const maxRetries = 3
    
    while (!emailResult.success && retryCount < maxRetries) {
      retryCount++
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      emailResult = await sendContactEmail(validatedData)
    }
    
    if (!emailResult.success) {
      // Log failed email attempts but continue processing
      // Email failed after multiple attempts
    }
    
    // Store contact form submission in database for tracking
    try {
      const { error: dbError } = await supabaseAdmin
        .from('support_tickets')
        .insert({
          type: 'contact_form',
          status: 'new',
          priority: 'medium',
          subject: validatedData.subject,
          description: validatedData.message,
          customer_name: `${validatedData.firstName} ${validatedData.lastName}`,
          customer_email: validatedData.email,
          customer_phone: validatedData.business || null,
          created_at: new Date().toISOString()
        })
      
      if (dbError) {
        // Log database error but don't fail the request
        logger.warn('Failed to store contact form in database', { error: dbError })
      }
    } catch (dbError) {
      // Log database error but don't fail the request
      logger.warn('Database error storing contact form', { error: dbError })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Message received successfully'
    })
    
  } catch (error) {
    
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
