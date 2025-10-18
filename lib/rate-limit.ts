import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  async check(request: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    totalHits: number
  }> {
    const key = this.config.keyGenerator!(request)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get or create entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs
      }
    }

    const entry = store[key]
    const isAllowed = entry.count < this.config.maxRequests

    if (isAllowed) {
      entry.count++
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalHits: entry.count
    }
  }
}

// Pre-configured rate limiters
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req) => {
    const body = req.body
    // In a real implementation, you'd extract email from request body
    return req.ip || 'unknown'
  }
})

export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 API calls per 15 minutes
  keyGenerator: (req) => req.ip || 'unknown'
})

export const webhookRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 webhook calls per minute
  keyGenerator: (req) => req.ip || 'unknown'
})

export const onboardingRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 onboarding attempts per hour
  keyGenerator: (req) => req.ip || 'unknown'
})

// Rate limiting middleware
export function withRateLimit(
  rateLimiter: RateLimiter,
  options: {
    skipIf?: (request: NextRequest) => boolean
    onLimitReached?: (request: NextRequest, result: any) => void
  } = {}
) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip rate limiting if condition is met
    if (options.skipIf && options.skipIf(request)) {
      return handler(request)
    }

    const result = await rateLimiter.check(request)

    // Set rate limit headers
    const response = result.allowed
      ? await handler(request)
      : NextResponse.json(
          { 
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          },
          { status: 429 }
        )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString())
    response.headers.set('X-RateLimit-Used', result.totalHits.toString())

    if (!result.allowed) {
      response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString())
      
      // Call custom handler if provided
      if (options.onLimitReached) {
        options.onLimitReached(request, result)
      }
    }

    return response
  }
}

// Utility function to get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return request.ip || 'unknown'
}

// Utility function to check if request is from admin
export function isAdminRequest(request: NextRequest): boolean {
  const adminIPs = process.env.ADMIN_IPS?.split(',') || []
  const clientIP = getClientIP(request)
  
  return adminIPs.includes(clientIP) || 
         request.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

// Utility function to check if request is from webhook
export function isWebhookRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || ''
  const webhookUserAgents = [
    'Stripe/1.0',
    'Retell-AI/1.0',
    'GitHub-Hookshot',
    'Bitbucket-Webhooks'
  ]
  
  return webhookUserAgents.some(agent => userAgent.includes(agent))
}

const rateLimitExports = {
  RateLimiter,
  authRateLimit,
  apiRateLimit,
  webhookRateLimit,
  onboardingRateLimit,
  withRateLimit,
  getClientIP,
  isAdminRequest,
  isWebhookRequest
}

export default rateLimitExports

