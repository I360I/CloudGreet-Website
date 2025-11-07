// Standardized error handling patterns for CloudGreet platform

import * as Sentry from '@sentry/nextjs'
import { logger } from './monitoring'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

export interface APIError {
  code: string
  message: string
  details?: unknown
  timestamp: string
}

export interface ComponentError {
  type: 'network' | 'validation' | 'permission' | 'unknown'
  message: string
  retryable: boolean
  action?: string
}

export class CloudGreetError extends Error {
  public readonly code: string
  public readonly type: ComponentError['type']
  public readonly retryable: boolean
  public readonly action?: string
  public readonly timestamp: string

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    type: ComponentError['type'] = 'unknown',
    retryable: boolean = false,
    action?: string
  ) {
    super(message)
    this.name = 'CloudGreetError'
    this.code = code
    this.type = type
    this.retryable = retryable
    this.action = action
    this.timestamp = new Date().toISOString()
  }
}

// Standard error handlers
export const errorHandlers = {
  // Network errors
  network: (error: Error): ComponentError => ({
    type: 'network',
    message: 'Network connection failed. Please check your internet connection.',
    retryable: true,
    action: 'retry'
  }),

  // Validation errors
  validation: (error: Error): ComponentError => ({
    type: 'validation',
    message: 'Invalid data provided. Please check your input.',
    retryable: false,
    action: 'fix_input'
  }),

  // Permission errors
  permission: (error: Error): ComponentError => ({
    type: 'permission',
    message: 'You don\'t have permission to perform this action.',
    retryable: false,
    action: 'contact_admin'
  }),

  // Unknown errors
  unknown: (error: Error): ComponentError => ({
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
    action: 'retry'
  })
}

// Standard error response creator for APIs
/**
 * createErrorResponse - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await createErrorResponse(param1, param2)
 * ```
 */
export function createErrorResponse(
  error: Error | CloudGreetError,
  statusCode: number = 500
): { error: APIError; status: number } {
  const apiError: APIError = {
    code: error instanceof CloudGreetError ? error.code : 'INTERNAL_ERROR',
    message: error.message,
    timestamp: new Date().toISOString()
  }

  if (error instanceof CloudGreetError) {
    apiError.details = {
      type: error.type,
      retryable: error.retryable,
      action: error.action
    }
  }

  return { error: apiError, status: statusCode }
}

// Standard error boundary props
export interface ErrorBoundaryProps {
  fallback?: (error: ComponentError, retry: () => void) => React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  children: React.ReactNode
}

// Standard retry logic
/**
 * createRetryHandler - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await createRetryHandler(param1, param2)
 * ```
 */
export function createRetryHandler(
  fn: () => Promise<unknown>,
  maxRetries: number = 3,
  delay: number = 1000
) {
  return async (): Promise<unknown> => {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
      }
    }
    
    throw lastError!
  }
}

// Standard error logging
/**
 * logError - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await logError(param1, param2)
 * ```
 */
export function logError(error: Error, context?: unknown) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context as any })
  }
  logger.error(error.message, context as any)
}

// Standard error messages for common scenarios
export const ERROR_MESSAGES = {
  NETWORK_FAILURE: 'Unable to connect to the server. Please check your internet connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You don\'t have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  TIMEOUT: 'The request timed out. Please try again.',
  CALL_FAILED: 'Unable to initiate call. Please check your phone number.',
  RECORDING_UNAVAILABLE: 'Call recording is not available for this call.',
  TRANSCRIPT_UNAVAILABLE: 'Call transcript is not available.',
  ANALYTICS_UNAVAILABLE: 'Analytics data is not available at this time.',
  INSIGHTS_UNAVAILABLE: 'AI insights are not available at this time.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
} as const
