import { NextResponse } from 'next/server'

export interface ApiError {
  message: string
  code?: string
  statusCode: number
  details?: any
}

export class AppError extends Error {
  public statusCode: number
  public code?: string
  public details?: any

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Unknown error occurred',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field])
  if (missing.length > 0) {
    throw new AppError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'MISSING_FIELDS',
      { missing }
    )
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL')
  }
}

export function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400, 'WEAK_PASSWORD')
  }
}

export function validatePhoneNumber(phone: string): void {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
    throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE')
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function createSuccessResponse(data: any, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Operation completed successfully',
    timestamp: new Date().toISOString()
  })
}

export function createErrorResponse(message: string, statusCode: number = 500, code?: string): NextResponse {
  return NextResponse.json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}
