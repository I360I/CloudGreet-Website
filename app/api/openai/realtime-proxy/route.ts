import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Return the API key for client-side use
    return NextResponse.json({ 
      apiKey: apiKey,
      wsUrl: 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17'
    })
  } catch (error: any) {
    console.error('❌ OpenAI proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
