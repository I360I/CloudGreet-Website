import { NextRequest } from 'next/server'
import { logger } from './monitoring'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

// In-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

/**
 * createRateLimit - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await createRateLimit(param1, param2)
 * ```
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
    const now = Date.now()
    
    // Generate rate limit key
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : getDefaultKey(request)
    
    // Get current rate limit data
    const current = rateLimitMap.get(key)
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      const resetTime = now + config.windowMs
      rateLimitMap.set(key, { count: 1, resetTime })
      
      logger.info('Rate limit: First request', { key, remaining: config.maxRequests - 1 })
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime
      }
    }
    
    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        key, 
        count: current.count, 
        maxRequests: config.maxRequests,
        resetTime: current.resetTime 
      })
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    // Increment counter
    current.count++
    rateLimitMap.set(key, current)
    
    logger.info('Rate limit: Request allowed', { 
      key, 
      count: current.count, 
      remaining: config.maxRequests - current.count 
    })
    
    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime
    }
  }
}

function getDefaultKey(request: NextRequest): string {
  // Use IP address as default key
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  
  return `rate_limit:${ip}`
}

// Pre-configured rate limiters
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 requests per 15 minutes
})

export const moderateRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  maxRequests: 100 // 100 requests per 15 minutes
})

export const lenientRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000 // 1000 requests per 15 minutes
})

// Auth-specific rate limiter (by IP)
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth attempts per 15 minutes
  keyGenerator: (request) => {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    return `auth_rate_limit:${ip}`
  }
})

// API-specific rate limiter (by user)
export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyGenerator: (request) => {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      return `api_rate_limit:${token}`
    }
    
    // Fallback to IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    return `api_rate_limit:${ip}`
  }
})

