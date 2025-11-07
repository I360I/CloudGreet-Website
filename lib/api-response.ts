import { NextResponse } from 'next/server'
import { logger } from './monitoring'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

/**
 * Standardized API Response Utility
 * Ensures consistent response format across all API routes
 * 
 * @example
 * ```typescript
 * // Success response
 * return APIResponseHandler.success({ id: 1, name: 'John' }, 'User created successfully', 201)
 * 
 * // Error response
 * return APIResponseHandler.error('User not found', 404, { userId: 123 })
 * 
 * // Validation error
 * return APIResponseHandler.validationError({ email: ['Invalid email format'] })
 * ```
 */
export class APIResponseHandler {
  /**
   * Creates a standardized success response with optional data and message
   * 
   * @template T - Type of the data being returned
   * @param data - The response data (optional)
   * @param message - Optional success message
   * @param status - HTTP status code (default: 200)
   * @returns NextResponse with success format
   * 
   * @example
   * ```typescript
   * // Simple success
   * return APIResponseHandler.success(null, 'Operation completed')
   * 
   * // Success with data
   * return APIResponseHandler.success({ user: userData }, 'User retrieved successfully')
   * 
   * // Created resource
   * return APIResponseHandler.success(newUser, 'User created', 201)
   * ```
   */
  static success<T>(data: T, message?: string, status: number = 200) {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    } as APIResponse<T>

    logger.info('API Success Response', { 
      status, 
      hasData: !!data,
      message 
    })

    return NextResponse.json(response, { status })
  }

  /**
   * Creates a standardized error response with error details
   * 
   * @param error - Error message string or Error object
   * @param status - HTTP status code (default: 500)
   * @param details - Optional additional error details
   * @returns NextResponse with error format
   * 
   * @example
   * ```typescript
   * // Simple error
   * return APIResponseHandler.error('User not found', 404)
   * 
   * // Error with details
   * return APIResponseHandler.error('Validation failed', 400, { field: 'email' })
   * 
   * // Error from exception
   * return APIResponseHandler.error(new Error('Database connection failed'), 500)
   * ```
   */
  static error(
    error: string | Error, 
    status: number = 500, 
    details?: Record<string, unknown>
  ) {
    const errorMessage = error instanceof Error ? error.message : error
    
    const apiError: APIError = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message: errorMessage,
        ...(details && Object.keys(details).length > 0 ? { value: details } : {})
      },
      timestamp: new Date().toISOString()
    }

    const response: APIResponse<never> = apiError

    logger.error('API Error Response', {
      status,
      error: errorMessage,
      details: details ? JSON.stringify(details) : undefined,
      code: apiError.error.code
    })

    return NextResponse.json(response, { status })
  }

  /**
   * Validation error response
   */
  static validationError(errors: Record<string, string[]>, status: number = 400) {
    const response: APIResponse<never> = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message: 'Validation failed',
        value: { errors }
      },
      timestamp: new Date().toISOString()
    }

    logger.warn('API Validation Error', { 
      status, 
      errorCount: Object.keys(errors).length,
      errors: JSON.stringify(errors) 
    })

    return NextResponse.json(response, { status })
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message: string = 'Unauthorized') {
    return this.error(message, 401)
  }

  /**
   * Forbidden response
   */
  static forbidden(message: string = 'Forbidden') {
    return this.error(message, 403)
  }

  /**
   * Not found response
   */
  static notFound(message: string = 'Resource not found') {
    return this.error(message, 404)
  }

  /**
   * Rate limit exceeded response
   */
  static rateLimitExceeded(retryAfter?: number) {
    const headers: Record<string, string> = {}
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
    }

    const response = this.error('Too many requests', 429)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }

  /**
   * Internal server error response
   */
  static internalError(error?: Error) {
    return this.error(
      error || 'Internal server error', 
      500,
      process.env.NODE_ENV === 'development' ? { stack: error?.stack } : undefined
    )
  }

  /**
   * Service unavailable response
   */
  static serviceUnavailable(message: string = 'Service temporarily unavailable') {
    return this.error(message, 503)
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    },
    message?: string
  ) {
    const response = {
      success: true,
      data,
      pagination,
      message
    }

    logger.info('API Paginated Response', {
      itemCount: data.length,
      page: pagination.page,
      total: pagination.total
    })

    return NextResponse.json(response, { status: 200 })
  }

  /**
   * Get error code based on status
   */
  private static getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    }

    return codes[status] || 'UNKNOWN_ERROR'
  }
}

/**
 * Convenience functions for common responses
 */
export const apiSuccess = APIResponseHandler.success
export const apiError = APIResponseHandler.error
export const apiValidationError = APIResponseHandler.validationError
export const apiUnauthorized = APIResponseHandler.unauthorized
export const apiForbidden = APIResponseHandler.forbidden
export const apiNotFound = APIResponseHandler.notFound
export const apiRateLimitExceeded = APIResponseHandler.rateLimitExceeded
export const apiInternalError = APIResponseHandler.internalError
export const apiServiceUnavailable = APIResponseHandler.serviceUnavailable
export const apiPaginated = APIResponseHandler.paginated

// Legacy exports for backward compatibility
export const createSuccessResponse = APIResponseHandler.success
export const createErrorResponse = APIResponseHandler.error

/**
 * Middleware for consistent error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      logger.error('Unhandled API Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      return APIResponseHandler.internalError(
        error instanceof Error ? error : new Error('Unknown error')
      )
    }
  }
}

/**
 * Validation helper for request bodies
 */
export function validateRequestBody<T>(
  body: unknown,
  validator: (data: unknown) => T
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validatedData = validator(body)
    return { success: true, data: validatedData }
  } catch (error) {
    const validationError = error instanceof Error ? error.message : 'Invalid request body'
    return {
      success: false,
      error: APIResponseHandler.validationError({ body: [validationError] })
    }
  }
}