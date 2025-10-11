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

    console.log('🔐 Creating ephemeral session token...')

    // SECURE: Create ephemeral token that expires and is scoped to this session
    // This protects the main API key
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-10-01',
        voice: 'alloy',
        instructions: 'You are a helpful AI assistant',
        modalities: ['text', 'audio'],
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to create ephemeral session:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to create session: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Ephemeral session created successfully')
    
    // Return only the ephemeral client_secret, NOT the main API key
    return NextResponse.json({
      clientSecret: data.client_secret?.value || data.client_secret,
      sessionId: data.id,
      expiresAt: data.expires_at
    })

  } catch (error: any) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json(
      { error: 'Session creation failed: ' + error.message },
      { status: 500 }
    )
  }
}

