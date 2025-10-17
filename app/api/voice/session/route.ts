import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating OpenAI Realtime API session...')
    
    const { model = 'gpt-4o-realtime-preview-2024-12-17', voice = 'alloy', businessName = 'CloudGreet' } = await request.json()

    const session = await openai.beta.realtime.sessions.create({
      model,
      voice,
      instructions: `You are a professional AI receptionist for ${businessName || 'CloudGreet'}. Be helpful, friendly, and professional. Keep responses concise and natural for voice conversation.`,
      modalities: ['text', 'audio']
    })

    console.log('✅ OpenAI Realtime session created:', session)

    return NextResponse.json({
      session_id: (session as any).id || (session as any).session_id,
      client_secret: (session as any).client_secret,
      message: 'Realtime session created successfully'
    })

  } catch (error: any) {
    console.error('❌ Error creating OpenAI Realtime session:', error)
    return NextResponse.json({
      error: error.message,
      message: 'Failed to create realtime session'
    }, { status: 500 })
  }
}
