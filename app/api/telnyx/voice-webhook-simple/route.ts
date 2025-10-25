import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Simple AI response for any call
    return NextResponse.json({
      call_id: body.call_control_id || 'test-call',
      status: 'answered',
      instructions: [
        {
          instruction: 'say',
          text: 'Hello! Thank you for calling CloudGreet. How can I help you today?',
          voice: 'alloy'
        }
      ]
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Voice webhook error'
    }, { status: 500 })
  }
}
