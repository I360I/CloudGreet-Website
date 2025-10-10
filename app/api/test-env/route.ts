import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    TELYNX_API_KEY: process.env.TELYNX_API_KEY ? 'SET (length: ' + process.env.TELYNX_API_KEY.length + ')' : 'NOT SET',
    TELYNX_PHONE_NUMBER: process.env.TELYNX_PHONE_NUMBER || 'NOT SET',
    TELYNX_MESSAGING_PROFILE_ID: process.env.TELYNX_MESSAGING_PROFILE_ID || 'NOT SET',
    NOTIFICATION_PHONE: process.env.NOTIFICATION_PHONE || 'NOT SET'
  })
}

