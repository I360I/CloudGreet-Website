import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()
    
    console.log('🎤 Processing voice message through server...')
    
    // For now, return a simple text response
    // In a real implementation, this would handle audio streaming
    const aiResponse = {
      type: 'response',
      content: `Hello! I'm your AI receptionist. I heard: "${message}". How can I help you today?`,
      audio: null // Would contain base64 audio in real implementation
    }
    
    console.log('✅ Voice response generated')
    
    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId
    })
    
  } catch (error: any) {
    console.error('❌ Voice processing error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}