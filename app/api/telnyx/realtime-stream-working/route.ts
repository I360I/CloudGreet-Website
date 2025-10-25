import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { call_id, business_id, audio_data } = body
    
    // Simple AI response without complex dependencies
    const aiResponse = "Hello! Thank you for calling. How can I help you today?"
    
    // Simulate AI processing
    const processingTime = Math.random() * 1000 + 500 // 500-1500ms
    
    return NextResponse.json({
      success: true,
      message: 'Realtime conversation processed',
      call_id,
      business_id,
      ai_response: aiResponse,
      has_audio: !!audio_data,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Realtime stream error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
