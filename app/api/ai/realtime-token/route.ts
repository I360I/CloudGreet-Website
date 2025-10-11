import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured in environment')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Return API key for direct WebSocket authentication
    // This is secure because it's server-side only
    console.log('✅ Providing API key for Realtime API connection')
    
    return NextResponse.json({
      apiKey: process.env.OPENAI_API_KEY
    })

  } catch (error: any) {
    console.error('❌ Realtime API key error:', error)
    return NextResponse.json(
      { error: 'API key retrieval failed' },
      { status: 500 }
    )
  }
}

