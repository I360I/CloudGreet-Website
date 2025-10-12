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

    console.log('🔐 Creating client secret using GA endpoint...')

    // Use /v1/realtime/client_secrets for GA API (as error message states)
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to create session:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to create session: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Session created:', data)
    
    // Return the client secret and session details
    return NextResponse.json({
      clientSecret: data.client_secret?.value || data.client_secret,
      sessionId: data.id,
      expiresAt: data.expires_at,
      model: data.model
    })

  } catch (error: any) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json(
      { error: 'Session creation failed: ' + error.message },
      { status: 500 }
    )
  }
}

