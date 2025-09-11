import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, apiRateLimit, authRateLimit } from './rate-limiter'
import { validateApiRequest } from './validation'
import { handleError } from './error-handler'
import { Logger } from './logger'

// CORS middleware
export function corsMiddleware(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
  
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: 'CORS policy violation' },
      { status: 403 }
    )
  }

  return null
}

// Authentication middleware
export function authMiddleware(req: NextRequest): NextResponse | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // In production, validate JWT token here
  // For now, just check if token exists
  if (token === 'invalid') {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }

  return null
}

// API key middleware
export function apiKeyMiddleware(req: NextRequest): NextResponse | null {
  const apiKey = req.headers.get('x-api-key')
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required' },
      { status: 401 }
    )
  }

  // In production, validate API key against database
  // For now, just check if key exists
  if (apiKey === 'invalid') {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    )
  }

  return null
}

// Request logging middleware
export function loggingMiddleware(req: NextRequest, res: NextResponse, duration: number): void {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.status,
    duration: `${duration}ms`,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    timestamp: new Date().toISOString()
  }

  if (res.status >= 400) {
    Logger.error('Request failed', logData)
  } else {
    Logger.info('Request completed', logData)
  }
}

// Security headers middleware
export function securityHeadersMiddleware(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return res
}

// Maintenance mode middleware
export function maintenanceMiddleware(req: NextRequest): NextResponse | null {
  if (process.env.ENABLE_MAINTENANCE_MODE === 'true') {
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable',
        message: 'We are currently performing maintenance. Please try again later.'
      },
      { status: 503 }
    )
  }

  return null
}

// Combined middleware function
export function withMiddleware(
  handler: Function,
  options: {
    auth?: boolean
    apiKey?: boolean
    rateLimit?: boolean
    cors?: boolean
    logging?: boolean
    securityHeaders?: boolean
    maintenance?: boolean
  } = {}
) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now()

    try {
      // Maintenance mode check
      if (options.maintenance) {
        const maintenanceResponse = maintenanceMiddleware(req)
        if (maintenanceResponse) return maintenanceResponse
      }

      // CORS check
      if (options.cors) {
        const corsResponse = corsMiddleware(req)
        if (corsResponse) return corsResponse
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResponse = apiRateLimit(req)
        if (rateLimitResponse) return rateLimitResponse
      }

      // Authentication check
      if (options.auth) {
        const authResponse = authMiddleware(req)
        if (authResponse) return authResponse
      }

      // API key check
      if (options.apiKey) {
        const apiKeyResponse = apiKeyMiddleware(req)
        if (apiKeyResponse) return apiKeyResponse
      }

      // Execute handler
      const response = await handler(req, ...args)

      // Add security headers
      if (options.securityHeaders) {
        securityHeadersMiddleware(response)
      }

      // Log request
      if (options.logging) {
        const duration = Date.now() - startTime
        loggingMiddleware(req, response, duration)
      }

      return response

    } catch (error) {
      const duration = Date.now() - startTime
      Logger.error('Middleware error', { error: error instanceof Error ? error.message : 'Unknown error', duration })
      return handleError(error as Error, req)
    }
  }
}

// Specific middleware combinations
export const withAuth = (handler: Function) => withMiddleware(handler, { auth: true, rateLimit: true, logging: true, securityHeaders: true })
export const withApiKey = (handler: Function) => withMiddleware(handler, { apiKey: true, rateLimit: true, logging: true, securityHeaders: true })
export const withPublic = (handler: Function) => withMiddleware(handler, { cors: true, rateLimit: true, logging: true, securityHeaders: true })
export const withStrict = (handler: Function) => withMiddleware(handler, { auth: true, apiKey: true, rateLimit: true, cors: true, logging: true, securityHeaders: true, maintenance: true })
