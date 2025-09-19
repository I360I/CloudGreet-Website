import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/monitoring'

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
    
    // Log the contact form submission
    logger.info('Contact form submission received', {
      email: validatedData.email,
      subject: validatedData.subject,
      business: validatedData.business
    })
    
    // In a real implementation, you would:
    // 1. Send email notification to support team
    // 2. Store in database for tracking
    // 3. Send auto-reply to customer
    // 4. Integrate with support ticket system
    
    // For now, we'll just log and return success
    // TODO: Implement actual email sending and database storage
    
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
