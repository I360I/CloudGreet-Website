import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create ephemeral token for Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-10-01',
        voice: 'alloy'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create realtime session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      token: data.client_secret.value,
      sessionId: data.id
    })

  } catch (error: any) {
    console.error('Realtime token error:', error)
    return NextResponse.json(
      { error: 'Token generation failed' },
      { status: 500 }
    )
  }
}

