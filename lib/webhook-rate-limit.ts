// lib/webhook-rate-limit.ts
// Rate limiting for webhook endpoints

import { logger } from '@/lib/monitoring'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check if request is rate limited
 * @param identifier - Unique identifier (IP, phone number, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `ratelimit:${identifier}`
  
  const existing = rateLimitStore.get(key)
  
  if (!existing || now > existing.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }
  
  if (existing.count >= config.maxRequests) {
    // Rate limit exceeded
    logger.warn('Rate limit exceeded', { 
      identifier, 
      count: existing.count, 
      maxRequests: config.maxRequests 
    })
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    }
  }
  
  // Increment counter
  existing.count++
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  }
}

/**
 * Webhook-specific rate limiting (more permissive)
 */
export function checkWebhookRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimit(identifier, {
    windowMs: 60000, // 1 minute
    maxRequests: 100 // 100 requests per minute
  })
}

/**
 * SMS webhook rate limiting (prevent spam)
 */
export function checkSMSRateLimit(phoneNumber: string): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimit(`sms:${phoneNumber}`, {
    windowMs: 60000, // 1 minute
    maxRequests: 10 // 10 SMS per minute per phone number
  })
}

/**
 * Voice webhook rate limiting
 */
export function checkVoiceRateLimit(phoneNumber: string): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimit(`voice:${phoneNumber}`, {
    windowMs: 300000, // 5 minutes
    maxRequests: 20 // 20 calls per 5 minutes per phone number
  })
}

/**
 * Stripe webhook rate limiting
 */
export function checkStripeRateLimit(customerId: string): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimit(`stripe:${customerId}`, {
    windowMs: 60000, // 1 minute
    maxRequests: 50 // 50 events per minute per customer
  })
}

