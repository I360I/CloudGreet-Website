import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple webhook test endpoint that always returns 200 OK
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telnyx webhook test endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📞 Webhook received:', body)
    
    return NextResponse.json({
      status: 'ok',
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Webhook processing failed'
    }, { status: 500 })
  }
}
