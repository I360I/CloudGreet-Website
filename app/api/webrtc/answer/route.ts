import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sdp } = await request.json()

    if (!sessionId || !sdp) {
      return NextResponse.json({ 
        error: 'Session ID and SDP required' 
      }, { status: 400 })
    }

    console.log('🎧 Processing WebRTC answer for session:', sessionId)

    // Send answer to Telnyx
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/texml/sessions/answer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        sdp: sdp
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      console.error('❌ Telnyx WebRTC answer error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to process WebRTC answer with Telnyx' 
      }, { status: 500 })
    }

    const telnyxData = await telnyxResponse.json()
    console.log('✅ WebRTC answer processed:', telnyxData)

    return NextResponse.json({
      success: true,
      message: 'WebRTC answer processed successfully'
    })

  } catch (error: any) {
    console.error('❌ WebRTC answer error:', error)
    logger.error('WebRTC answer processing failed', { 
      error: error.message,
      endpoint: 'webrtc_answer'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to process WebRTC answer'
    }, { status: 500 })
  }
}
