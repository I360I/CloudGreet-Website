import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Test SMS API is working',
      debug: {
        telnyxApiKey: process.env.TELNYX_API_KEY ? 'SET' : 'MISSING',
        phoneNumber: process.env.TELYNX_PHONE_NUMBER ? 'SET' : 'MISSING',
        phoneNumberValue: process.env.TELYNX_PHONE_NUMBER,
        availableTelnyxVars: Object.keys(process.env).filter(key => key.includes('TELNYX') || key.includes('TELYNX'))
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test SMS API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
