// lib/retry-logic.ts
// Retry logic with exponential backoff for external API calls

import { logger } from '@/lib/monitoring'

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatuses?: number[]
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

/**
 * Executes a function with exponential backoff retry logic
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @param context - Context for logging
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: Record<string, any>
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn()
      
      if (attempt > 0) {
        logger.info('Retry succeeded', { attempt, context })
      }
      
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Check if we should retry
      if (attempt >= opts.maxRetries) {
        logger.error('Max retries exceeded', { 
          attempts: attempt + 1, 
          error: lastError.message,
          context 
        })
        throw lastError
      }
      
      // Check if error is retryable
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (!opts.retryableStatuses.includes(status)) {
          logger.warn('Non-retryable error', { status, context })
          throw lastError
        }
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay
      const totalDelay = delay + jitter
      
      logger.warn('Retrying after error', { 
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay: Math.round(totalDelay),
        error: lastError.message,
        context
      })
      
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }
  
  throw lastError
}

/**
 * Wrapper for fetch with retry logic
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options)
      
      // Check if response status is retryable
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.response = response
        throw error
      }
      
      return response
    },
    retryOptions,
    { url, method: options.method || 'GET' }
  )
}

/**
 * Retry logic specifically for Telnyx API calls
 */
export async function telnyxWithRetry<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    fn,
    {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 5000,
      retryableStatuses: [429, 500, 502, 503, 504]
    },
    { service: 'telnyx', ...context }
  )
}

/**
 * Retry logic specifically for Stripe API calls
 */
export async function stripeWithRetry<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    fn,
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [429, 500, 502, 503]
    },
    { service: 'stripe', ...context }
  )
}

/**
 * Retry logic specifically for OpenAI API calls
 */
export async function openaiWithRetry<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    fn,
    {
      maxRetries: 2,
      initialDelay: 2000,
      maxDelay: 8000,
      retryableStatuses: [429, 500, 502, 503, 529]
    },
    { service: 'openai', ...context }
  )
}

/**
 * Retry logic specifically for Resend API calls
 */
export async function resendWithRetry<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return withRetry(
    fn,
    {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 5000,
      retryableStatuses: [429, 500, 502, 503]
    },
    { service: 'resend', ...context }
  )
}

