import { NextRequest } from 'next/server'
import { logger } from './monitoring'

/**
 * Redis-based Rate Limiting
 * 
 * Supports Upstash Redis (serverless) with in-memory fallback
 * 
 * To use Redis:
 * 1. Install: npm install @upstash/redis
 * 2. Set environment variables:
 *    - REDIS_REST_URL=https://your-redis.upstash.io
 *    - REDIS_REST_TOKEN=your_token
 * 3. Import from this file instead of rate-limiting.ts
 */

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  headers?: Record<string, string>
}

// In-memory fallback (used when Redis is not available)
const fallbackMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Generate rate limit headers
 */
function generateHeaders(config: RateLimitConfig, remaining: number, resetTime: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(resetTime),
    'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000))
  }
}

/**
 * Get Redis client (Upstash) or null if not configured
 */
async function getRedisClient() {
  const redisUrl = process.env.REDIS_REST_URL
  const redisToken = process.env.REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return null
  }

  try {
    // Dynamic import to avoid errors if package not installed
    const { Redis } = await import('@upstash/redis')
    return new Redis({
      url: redisUrl,
      token: redisToken
    })
  } catch (error: any) {
    // Package not installed or invalid config - this is OK, fallback to in-memory
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('Cannot find module')) {
      return null
    }
    logger.warn('Redis package not installed or invalid config', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * Rate limit using Redis with in-memory fallback
 */
export async function rateLimitWithRedis(
  config: RateLimitConfig,
  request: NextRequest
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = config.keyGenerator 
    ? config.keyGenerator(request)
    : getDefaultKey(request)
  
  const redisKey = `rate_limit:${key}`
  const redis = await getRedisClient()

  if (redis) {
    // Use Redis
    try {
      // Use Redis INCR with expiration
      const current = await redis.get<number>(redisKey) || 0
      
      if (current === 0) {
        // First request in window
        await redis.set(redisKey, 1, { ex: Math.ceil(config.windowMs / 1000) })
        const resetTime = now + config.windowMs
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime,
          headers: generateHeaders(config, config.maxRequests - 1, resetTime)
        }
      }

      if (current >= config.maxRequests) {
        // Get TTL to calculate reset time
        const ttl = await redis.ttl(redisKey)
        logger.warn('Rate limit exceeded (Redis)', {
          key,
          count: current,
          maxRequests: config.maxRequests,
          ttl
        })
        const resetTime = now + (ttl * 1000)
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          headers: generateHeaders(config, 0, resetTime)
        }
      }

      // Increment counter
      await redis.incr(redisKey)
      const newCount = current + 1
      const ttl = await redis.ttl(redisKey)
      
      const resetTime = now + (ttl * 1000)
      return {
        allowed: true,
        remaining: config.maxRequests - newCount,
        resetTime,
        headers: generateHeaders(config, config.maxRequests - newCount, resetTime)
      }
    } catch (error) {
      logger.error('Redis rate limit error, falling back to in-memory', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Fall through to in-memory fallback
    }
  }

  // In-memory fallback
  const current = fallbackMap.get(key)
  
  if (!current || now > current.resetTime) {
    const resetTime = now + config.windowMs
    fallbackMap.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
      headers: generateHeaders(config, config.maxRequests - 1, resetTime)
    }
  }

  if (current.count >= config.maxRequests) {
    logger.warn('Rate limit exceeded (in-memory)', {
      key,
      count: current.count,
      maxRequests: config.maxRequests
    })
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      headers: generateHeaders(config, 0, current.resetTime)
    }
  }

  current.count++
  fallbackMap.set(key, current)
  
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
    headers: generateHeaders(config, config.maxRequests - current.count, current.resetTime)
  }
}

function getDefaultKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return `rate_limit:${ip}`
}

/**
 * Pre-configured rate limiters with Redis support
 */
export function createRedisRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<RateLimitResult> => {
    return rateLimitWithRedis(config, request)
  }
}

export const strictRateLimitRedis = createRedisRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5
})

export const moderateRateLimitRedis = createRedisRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
})

export const authRateLimitRedis = createRedisRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (request) => {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    return `auth_rate_limit:${ip}`
  }
})

// Aliases for backward compatibility
export const moderateRateLimit = moderateRateLimitRedis
export const authRateLimit = authRateLimitRedis
export const strictRateLimit = strictRateLimitRedis
