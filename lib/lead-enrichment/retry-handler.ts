/**
 * APOLLO KILLER: Comprehensive Retry & Error Handling
 * 
 * Handles exponential backoff, circuit breaker patterns,
 * and intelligent retry strategies for all enrichment operations
 */

import { logger } from '@/lib/monitoring'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  exponentialBase?: number
  jitter?: boolean
  retryCondition?: (error: Error) => boolean
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  recoveryTime?: number
  monitoringPeriod?: number
}

export class RetryError extends Error {
  public readonly attempts: number
  public readonly lastError: Error

  constructor(message: string, attempts: number, lastError: Error) {
    super(message)
    this.name = 'RetryError'
    this.attempts = attempts
    this.lastError = lastError
  }
}

/**
 * Exponential backoff retry with jitter
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  operationName: string = 'unknown'
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    exponentialBase = 2,
    jitter = true,
    retryCondition = defaultRetryCondition
  } = options

  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation()
      
      if (attempt > 1) {
        logger.info('Retry successful', {
          operation: operationName,
          attempt,
          totalAttempts: maxAttempts
        })
      }
      
      return result
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logger.warn('Operation failed, considering retry', {
        operation: operationName,
        attempt,
        maxAttempts,
        error: lastError.message,
        stack: lastError.stack?.substring(0, 500)
      })
      
      // Check if we should retry this error
      if (!retryCondition(lastError) || attempt === maxAttempts) {
        break
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        baseDelayMs * Math.pow(exponentialBase, attempt - 1),
        maxDelayMs
      )
      
      const delay = jitter 
        ? baseDelay + Math.random() * baseDelay * 0.1 // Add up to 10% jitter
        : baseDelay
      
      logger.info('Retrying operation after delay', {
        operation: operationName,
        attempt,
        delayMs: Math.round(delay),
        nextAttempt: attempt + 1
      })
      
      await sleep(delay)
    }
  }
  
  const retryError = new RetryError(
    `Operation '${operationName}' failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError!
  )
  
  logger.error('All retry attempts exhausted', {
    operation: operationName,
    attempts: maxAttempts,
    finalError: lastError?.message
  })
  
  throw retryError
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private options: CircuitBreakerOptions = {},
    private name: string = 'unknown'
  ) {
    const {
      failureThreshold = 5,
      recoveryTime = 60000, // 1 minute
      monitoringPeriod = 300000 // 5 minutes
    } = options
    
    this.options = { failureThreshold, recoveryTime, monitoringPeriod }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.options.recoveryTime!) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Recovery time not elapsed.`)
      } else {
        this.state = 'half-open'
        logger.info('Circuit breaker transitioning to half-open', { name: this.name })
      }
    }

    try {
      const result = await operation()
      
      // Success - reset failure count
      if (this.state === 'half-open') {
        this.state = 'closed'
        logger.info('Circuit breaker closed after successful recovery', { name: this.name })
      }
      this.failures = 0
      
      return result
      
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      
      if (this.failures >= this.options.failureThreshold!) {
        this.state = 'open'
        logger.error('Circuit breaker opened due to failures', {
          name: this.name,
          failures: this.failures,
          threshold: this.options.failureThreshold
        })
      }
      
      throw error
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }

  /**


   * reset - Add description here


   * 


   * @param {...any} args - Method parameters


   * @returns {Promise<any>} Method return value


   * @throws {Error} When operation fails


   * 


   * @example


   * ```typescript


   * await this.reset(param1, param2)


   * ```


   */


  reset(): void {
    this.failures = 0
    this.state = 'closed'
    this.lastFailureTime = 0
    logger.info('Circuit breaker manually reset', { name: this.name })
  }
}

/**
 * Specialized retry functions for different operation types
 */

export async function retryWebsiteScrape<T>(
  operation: () => Promise<T>,
  url: string
): Promise<T> {
  return withRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, but not 404s
        return !error.message.includes('404') && 
               !error.message.includes('403') &&
               (error.message.includes('timeout') || 
                error.message.includes('network') ||
                error.message.includes('ECONNRESET'))
      }
    },
    `website-scrape-${url}`
  )
}

export async function retryEmailVerification<T>(
  operation: () => Promise<T>,
  email: string
): Promise<T> {
  return withRetry(
    operation,
    {
      maxAttempts: 2, // Email verification is usually deterministic
      baseDelayMs: 1000,
      retryCondition: (error) => {
        // Only retry on network/timeout errors
        return error.message.includes('timeout') || 
               error.message.includes('network') ||
               error.message.includes('rate limit')
      }
    },
    `email-verification-${email}`
  )
}

export async function retryLinkedInSearch<T>(
  operation: () => Promise<T>,
  company: string
): Promise<T> {
  return withRetry(
    operation,
    {
      maxAttempts: 2, // LinkedIn blocks aggressively
      baseDelayMs: 5000,
      maxDelayMs: 15000,
      retryCondition: (error) => {
        // Only retry on rate limits, not blocks
        return error.message.includes('rate limit') && 
               !error.message.includes('blocked')
      }
    },
    `linkedin-search-${company}`
  )
}

export async function retryAPICall<T>(
  operation: () => Promise<T>,
  apiName: string
): Promise<T> {
  return withRetry(
    operation,
    {
      maxAttempts: 4,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      retryCondition: (error) => {
        // Retry on 5xx errors, timeouts, rate limits
        return error.message.includes('5') || 
               error.message.includes('timeout') ||
               error.message.includes('rate limit') ||
               error.message.includes('502') ||
               error.message.includes('503') ||
               error.message.includes('504')
      }
    },
    `api-call-${apiName}`
  )
}

/**
 * Database operation retry (for connection issues)
 */
export async function retryDatabaseOp<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(
    operation,
    {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      retryCondition: (error) => {
        // Retry on connection errors, not data errors
        return error.message.includes('connection') ||
               error.message.includes('timeout') ||
               error.message.includes('network') ||
               error.message.includes('ECONNREFUSED')
      }
    },
    `database-${operationName}`
  )
}

/**
 * Default retry condition
 */
function defaultRetryCondition(error: Error): boolean {
  const message = error.message.toLowerCase()
  
  // Always retry these
  const retryableErrors = [
    'timeout',
    'network',
    'econnreset',
    'econnrefused',
    'rate limit',
    '502',
    '503', 
    '504',
    'service unavailable',
    'gateway timeout'
  ]
  
  // Never retry these
  const nonRetryableErrors = [
    '400', // Bad request
    '401', // Unauthorized  
    '403', // Forbidden
    '404', // Not found
    '422', // Validation error
    'invalid',
    'malformed',
    'syntax error'
  ]
  
  // Check non-retryable first
  if (nonRetryableErrors.some(err => message.includes(err))) {
    return false
  }
  
  // Check retryable
  return retryableErrors.some(err => message.includes(err))
}

/**
 * Global circuit breakers for different services
 */
export const circuitBreakers = {
  googlePlaces: new CircuitBreaker(
    { failureThreshold: 3, recoveryTime: 300000 }, // 5 min recovery
    'google-places-api'
  ),
  
  openAI: new CircuitBreaker(
    { failureThreshold: 5, recoveryTime: 180000 }, // 3 min recovery
    'openai-api'
  ),
  
  emailVerification: new CircuitBreaker(
    { failureThreshold: 10, recoveryTime: 600000 }, // 10 min recovery
    'email-verification'
  ),
  
  websiteScraping: new CircuitBreaker(
    { failureThreshold: 8, recoveryTime: 120000 }, // 2 min recovery
    'website-scraping'
  ),
  
  linkedin: new CircuitBreaker(
    { failureThreshold: 2, recoveryTime: 1800000 }, // 30 min recovery (aggressive)
    'linkedin-scraping'
  )
}

/**
 * Utility functions
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Graceful degradation helpers
 */
export function createFallbackResult<T>(
  partialData: Partial<T>,
  defaultData: T,
  errors: string[]
): T & { _degraded: boolean; _errors: string[] } {
  return {
    ...defaultData,
    ...partialData,
    _degraded: true,
    _errors: errors
  } as T & { _degraded: boolean; _errors: string[] }
}

/**
 * Error aggregation for batch operations
 */
export class BatchErrorAggregator {
  private errors: Array<{ item: string; error: Error }> = []
  private successes: string[] = []

  addError(item: string, error: Error): void {
    this.errors.push({ item, error })
  }

  addSuccess(item: string): void {
    this.successes.push(item)
  }

  getResults() {
    return {
      totalItems: this.errors.length + this.successes.length,
      successful: this.successes.length,
      failed: this.errors.length,
      successRate: this.successes.length / (this.errors.length + this.successes.length),
      errors: this.errors,
      successes: this.successes
    }
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  createSummaryError(): Error {
    const results = this.getResults()
    return new Error(`Batch operation completed with ${results.failed}/${results.totalItems} failures. Success rate: ${(results.successRate * 100).toFixed(1)}%`)
  }
}
