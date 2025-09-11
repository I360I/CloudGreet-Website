import { NextRequest, NextResponse } from 'next/server'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429)
  }
}

// Global error handler
export function handleError(error: Error, req: NextRequest): NextResponse {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Handle known errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    )
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: (error as any).errors,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }

  // Handle Stripe errors
  if (error.name === 'StripeError') {
    return NextResponse.json(
      {
        error: 'Payment processing error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }

  // Handle Azure Communication Services errors
  if (error.name === 'CommunicationError') {
    return NextResponse.json(
      {
        error: 'Communication service error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }

  // Default error response
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: NextRequest, res: NextResponse) => {
    return Promise.resolve(fn(req, res)).catch((error) => handleError(error, req))
  }
}

// Error boundary for React components
export class ErrorBoundary extends Error {
  constructor(message: string, componentStack: string) {
    super(message)
    this.name = 'ErrorBoundary'
    this.stack = componentStack
  }
}

// Logging utility
export function logError(error: Error, context?: any) {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  }

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service (e.g., Sentry, LogRocket)
    console.error('Production error:', errorLog)
  } else {
    console.error('Development error:', errorLog)
  }
}

// Additional utility functions that are being imported
export function handleApiError(error: Error, req: NextRequest): NextResponse {
  return handleError(error, req)
}

export function validateUserId(userId: string): boolean {
  return userId && userId.length > 0
}

export function createSuccessResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Success',
    timestamp: new Date().toISOString()
  })
}