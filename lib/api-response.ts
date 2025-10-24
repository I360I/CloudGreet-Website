// Standardized API response utilities
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    requestId?: string
    responseTime?: number
    timestamp?: string
  }
}

export function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  meta?: any
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }
}

export function createErrorResponse(
  error: string, 
  statusCode?: number,
  meta?: any
): ApiResponse {
  return {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode,
      ...meta
    }
  }
}

export function createValidationErrorResponse(
  errors: Record<string, string>
): ApiResponse {
  return {
    success: false,
    error: 'Validation failed',
    data: { errors },
    meta: {
      timestamp: new Date().toISOString()
    }
  }
}

// Standard error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMITED: 'Too many requests',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
} as const

// Standard HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const
