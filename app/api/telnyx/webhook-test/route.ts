import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// Simple webhook endpoint for Telnyx validation
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook test endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    logger.info('Webhook test received', { body })
    
    return NextResponse.json({ 
      status: 'received',
      message: 'Webhook test successful',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Webhook test error:', error)
    return NextResponse.json({ 
      status: 'error',
      message: 'Webhook test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}