// Comprehensive API Error Handler
// This prevents 500 errors and provides graceful fallbacks

import { NextResponse } from 'next/server'
import { logger } from './monitoring'

export interface APIErrorOptions {
  status?: number
  message?: string
  fallbackData?: any
  logError?: boolean
}

export function handleAPIError(error: unknown, options: APIErrorOptions = {}) {
  const {
    status = 500,
    message = 'Internal server error',
    fallbackData = null,
    logError = true
  } = options

  if (logError) {
    logger.error('API Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      status,
      message
    })
  }

  const response: any = {
    success: false,
    error: message
  }

  if (fallbackData) {
    response.fallbackData = fallbackData
    response.message = 'Service temporarily unavailable, showing cached data'
  }

  return NextResponse.json(response, { status })
}

export function checkEnvironmentVariable(key: string, service: string) {
  if (!process.env[key]) {
    throw new Error(`${service} not configured - ${key} missing`)
  }
}

export function checkRequiredHeaders(request: Request, requiredHeaders: string[]) {
  const missingHeaders = []
  
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      missingHeaders.push(header)
    }
  }
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
  }
}

export function createServiceUnavailableResponse(service: string, fallbackData?: any) {
  const response: any = {
    success: false,
    error: `${service} not configured`,
    message: 'This feature is temporarily unavailable'
  }
  
  if (fallbackData) {
    response.fallbackData = fallbackData
    response.message = 'Using cached data while service is being configured'
  }
  
  return NextResponse.json(response, { status: 503 })
}

export function createMissingConfigResponse(service: string, configKey: string) {
  return NextResponse.json({
    success: false,
    error: `${service} not configured`,
    message: `${configKey} environment variable is missing`,
    action: 'Please configure the required environment variables'
  }, { status: 503 })
}
