import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function createRateLimit(config: RateLimitConfig) {
  return (req: NextRequest): NextResponse | null => {
    const identifier = getClientIdentifier(req)
    const now = Date.now()
    const windowStart = now - config.windowMs

    let entry = rateLimitStore.get(identifier)

    // Create new entry if none exists or if window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      }
      rateLimitStore.set(identifier, entry)
      return null // Allow request
    }

    // Check if already blocked
    if (entry.blocked) {
      return NextResponse.json(
        {
          error: config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
          }
        }
      )
    }

    // Increment counter
    entry.count++

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true
      return NextResponse.json(
        {
          error: config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
          }
        }
      )
    }

    return null // Allow request
  }
}

function getClientIdentifier(req: NextRequest): string {
  // Try to get real IP from headers (for production with reverse proxy)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const clientIp = forwarded?.split(',')[0] || realIp || req.ip || 'unknown'

  // Include user agent for additional uniqueness
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  return `${clientIp}:${userAgent}`
}

// Predefined rate limiters
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  message: 'Too many authentication attempts'
})

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  message: 'Too many API requests'
})

export const strictApiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per window
  message: 'Too many requests to this endpoint'
})

export const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 webhooks per minute
  message: 'Too many webhook requests'
})

// Middleware function
export function withRateLimit(rateLimiter: (req: NextRequest) => NextResponse | null) {
  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      const rateLimitResponse = rateLimiter(req)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
      return handler(req, ...args)
    }
  }
}
