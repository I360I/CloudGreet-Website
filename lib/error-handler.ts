// Centralized error handling for production
export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export class CloudGreetError extends Error implements AppError {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'CloudGreetError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic errors
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  APPOINTMENT_CONFLICT: 'APPOINTMENT_CONFLICT',
  
  // External service errors
  STRIPE_ERROR: 'STRIPE_ERROR',
  TELNYX_ERROR: 'TELNYX_ERROR',
  RETELL_ERROR: 'RETELL_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export function createError(
  code: keyof typeof ERROR_CODES,
  message: string,
  statusCode: number = 500,
  details?: any
): CloudGreetError {
  return new CloudGreetError(ERROR_CODES[code], message, statusCode, details);
}

export function handleError(error: unknown): AppError {
  // Handle known CloudGreet errors
  if (error instanceof CloudGreetError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // Handle validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      statusCode: 400,
      details: error,
    };
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;
    if (dbError.code === '23505') {
      return {
        code: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: 'Resource already exists',
        statusCode: 409,
      };
    }
    if (dbError.code === '23503') {
      return {
        code: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: 'Referenced resource not found',
        statusCode: 400,
      };
    }
  }

  // Handle Stripe errors
  if (error && typeof error === 'object' && 'type' in error) {
    return {
      code: ERROR_CODES.STRIPE_ERROR,
      message: 'Payment processing error',
      statusCode: 400,
      details: error,
    };
  }

  // Default error handling
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal error occurred' 
      : message,
    statusCode: 500,
    details: process.env.NODE_ENV === 'development' ? error : undefined,
  };
}

export function logError(error: unknown, context?: any) {
  const appError = handleError(error);
  
  // Use proper logger instead of console
  const { logger } = require('@/lib/monitoring')
  logger.error('CloudGreet Error', {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    context,
    timestamp: new Date().toISOString(),
    details: appError.details,
  });

  // In production, you might want to send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: context });
  }
}
