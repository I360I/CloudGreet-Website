import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const jwtSecret = process.env.JWT_SECRET
    
    return NextResponse.json({
      success: true,
      jwtSecret: jwtSecret ? 'Set' : 'Missing',
      jwtSecretLength: jwtSecret ? jwtSecret.length : 0,
      isFallback: jwtSecret === 'fallback-secret'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
