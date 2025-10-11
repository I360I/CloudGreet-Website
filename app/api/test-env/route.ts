import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    TELNYX_API_KEY: process.env.TELNYX_API_KEY ? 'SET (length: ' + process.env.TELNYX_API_KEY.length + ')' : 'NOT SET',
    TELNYX_PHONE_NUMBER: process.env.TELNYX_PHONE_NUMBER || 'NOT SET',
    TELNYX_MESSAGING_PROFILE_ID: process.env.TELNYX_MESSAGING_PROFILE_ID || 'NOT SET',
    NOTIFICATION_PHONE: process.env.NOTIFICATION_PHONE || 'NOT SET'
  })
}

