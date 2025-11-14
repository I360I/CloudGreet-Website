import { NextRequest, NextResponse } from 'next/server'
import {
  registerAccount,
  RegistrationError,
  serializeUnknown
} from '@/lib/auth/register-service'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
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

