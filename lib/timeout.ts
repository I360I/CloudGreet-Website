/**
 * Timeout Handling
 * Adds timeout support to promises and external API calls
 */

import { logger } from './monitoring'
import { TIMEOUTS } from './constants/timeouts'

/**
 * Wrap a promise with a timeout
 * Returns the promise result if it completes within timeout, otherwise rejects
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = TIMEOUTS.API_REQUEST,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

/**
 * Execute a function with timeout and retry logic
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = TIMEOUTS.API_REQUEST,
  retries: number = 0
): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs)
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('timeout')) {
      logger.warn('Request timed out, retrying', { retries, timeoutMs })
      return executeWithTimeout(fn, timeoutMs, retries - 1)
    }
    throw error
  }
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise<T>(
  timeoutMs: number,
  errorMessage: string = 'Operation timeout'
): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
}

/**
 * Timeout configuration for different operation types
 */
export const TIMEOUT_CONFIG = {
  DATABASE_QUERY: TIMEOUTS.DB_QUERY,
  DATABASE_CONNECTION: TIMEOUTS.DB_CONNECTION,
  EXTERNAL_API: TIMEOUTS.API_REQUEST,
  STRIPE_API: TIMEOUTS.STRIPE_API,
  TELNYX_API: TIMEOUTS.TELNYX_API,
  RETELL_API: TIMEOUTS.RETELL_API,
  EMAIL_API: TIMEOUTS.EMAIL_API,
  CALENDAR_API: TIMEOUTS.CALENDAR_API,
} as const
