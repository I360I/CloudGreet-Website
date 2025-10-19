import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple webhook that always returns 200 OK for Telnyx validation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📞 Webhook received:', body)
    
    return NextResponse.json({
      status: 'ok',
      message: 'Webhook processed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({
      status: 'ok',
      message: 'Webhook processed'
    })
  }
}
