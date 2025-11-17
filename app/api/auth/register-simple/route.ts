import { NextRequest, NextResponse } from 'next/server'
import {
  registerAccount,
  RegistrationError,
  serializeUnknown
} from '@/lib/auth/register-service'
import { logger } from '@/lib/monitoring'
import { enforceRequestSizeLimit } from '@/lib/request-limits'
import { authRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10 registration attempts per 15 minutes)
    const rateLimitResult = await authRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Too many registration attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime)
          }
        }
      )
    }

    // Enforce request size limit (1MB)
    const sizeCheck = enforceRequestSizeLimit(request)
    if ('error' in sizeCheck) {
      return sizeCheck.error
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }
    const result = await registerAccount(body)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
          details: serializeUnknown(error.details)
        },
        { status: error.status }
      )
    }

    logger.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      rawError: serializeUnknown(error)
    })
    return NextResponse.json(
      {
        success: false,
        message: 'Registration failed. Please try again.',
        details: serializeUnknown(error)
      },
      { status: 500 }
    )
  }
}
