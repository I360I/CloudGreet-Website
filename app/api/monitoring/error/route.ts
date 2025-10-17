import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Error logging schema
const errorLogSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  errorId: z.string(),
  timestamp: z.string(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum(['client', 'server', 'validation', 'network', 'unknown']).default('unknown')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the error log data
    const validatedData = errorLogSchema.parse(body)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Client Error:', {
        message: validatedData.message,
        stack: validatedData.stack,
        componentStack: validatedData.componentStack,
        errorId: validatedData.errorId,
        timestamp: validatedData.timestamp,
        url: validatedData.url,
        severity: validatedData.severity,
        category: validatedData.category
      })
    }

    // In production, you would send this to your error monitoring service
    // For example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry
      // Sentry.captureException(new Error(validatedData.message), {
      //   tags: {
      //     errorId: validatedData.errorId,
      //     severity: validatedData.severity,
      //     category: validatedData.category
      //   },
      //   extra: {
      //     componentStack: validatedData.componentStack,
      //     userAgent: validatedData.userAgent,
      //     url: validatedData.url,
      //     userId: validatedData.userId,
      //     sessionId: validatedData.sessionId
      //   }
      // })

      // Example: Send to custom logging service
      await logToExternalService(validatedData)
    }

    // Store in database for analysis (optional)
    await storeErrorInDatabase(validatedData)

    return NextResponse.json({ 
      success: true, 
      errorId: validatedData.errorId 
    })

  } catch (error) {
    console.error('Error in error monitoring endpoint:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to log error' 
    }, { status: 500 })
  }
}

async function logToExternalService(errorData: z.infer<typeof errorLogSchema>) {
  // This is where you would integrate with external error monitoring services
  // Examples:
  
  // 1. Sentry
  // Sentry.captureException(new Error(errorData.message), {
  //   tags: { errorId: errorData.errorId, severity: errorData.severity },
  //   extra: errorData
  // })

  // 2. LogRocket
  // LogRocket.captureException(new Error(errorData.message))

  // 3. Bugsnag
  // Bugsnag.notify(new Error(errorData.message), (report) => {
  //   report.addMetadata('error', errorData)
  // })

  // 4. Custom webhook
  if (process.env.ERROR_WEBHOOK_URL) {
    try {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorData,
          source: 'cloudgreet-client',
          environment: process.env.NODE_ENV
        })
      })
    } catch (webhookError) {
      console.error('Failed to send error to webhook:', webhookError)
    }
  }

  // 5. Email notification for critical errors
  if (errorData.severity === 'critical' && process.env.ADMIN_EMAIL) {
    await sendCriticalErrorEmail(errorData)
  }
}

async function storeErrorInDatabase(errorData: z.infer<typeof errorLogSchema>) {
  // This would store the error in your database for analysis
  // Example with Prisma:
  
  // try {
  //   await prisma.errorLog.create({
  //     data: {
  //       errorId: errorData.errorId,
  //       message: errorData.message,
  //       stack: errorData.stack,
  //       componentStack: errorData.componentStack,
  //       severity: errorData.severity,
  //       category: errorData.category,
  //       userAgent: errorData.userAgent,
  //       url: errorData.url,
  //       userId: errorData.userId,
  //       sessionId: errorData.sessionId,
  //       timestamp: new Date(errorData.timestamp)
  //     }
  //   })
  // } catch (dbError) {
  //   console.error('Failed to store error in database:', dbError)
  // }
}

async function sendCriticalErrorEmail(errorData: z.infer<typeof errorLogSchema>) {
  // Send email notification for critical errors
  // This would integrate with your email service (SendGrid, Mailgun, etc.)
  
  if (process.env.SENDGRID_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      // Example with SendGrid
      const msg = {
        to: process.env.ADMIN_EMAIL,
        from: 'alerts@cloudgreet.com',
        subject: `Critical Error Alert - CloudGreet (${errorData.errorId})`,
        html: `
          <h2>Critical Error Alert</h2>
          <p><strong>Error ID:</strong> ${errorData.errorId}</p>
          <p><strong>Message:</strong> ${errorData.message}</p>
          <p><strong>Timestamp:</strong> ${errorData.timestamp}</p>
          <p><strong>URL:</strong> ${errorData.url}</p>
          <p><strong>User Agent:</strong> ${errorData.userAgent}</p>
          <pre><code>${errorData.stack}</code></pre>
        `
      }

      // await sgMail.send(msg)
      console.log('Critical error email would be sent:', msg)
    } catch (emailError) {
      console.error('Failed to send critical error email:', emailError)
    }
  }
}

// Rate limiting for error reporting
const errorReportLimits = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = errorReportLimits.get(ip)
  
  if (!limit || now > limit.resetTime) {
    errorReportLimits.set(ip, { count: 1, resetTime: now + 60000 }) // 1 minute window
    return true
  }
  
  if (limit.count >= 10) { // Max 10 errors per minute per IP
    return false
  }
  
  limit.count++
  return true
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now()
  errorReportLimits.forEach((limit, ip) => {
    if (now > limit.resetTime) {
      errorReportLimits.delete(ip)
    }
  })
}, 5 * 60 * 1000)