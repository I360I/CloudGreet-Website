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

    // Use /v1/realtime/client_secrets for GA API
    // This endpoint doesn't accept 'model' parameter - model is set in WebSocket connection
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
    console.log('✅ Client secret created:', JSON.stringify(data, null, 2))
    
    // Parse the response correctly based on OpenAI's format
    // The response has: { client_secret: { value: "...", expires_at: ... }, ... }
    const clientSecretValue = typeof data.client_secret === 'string' 
      ? data.client_secret 
      : data.client_secret?.value || data.value
    
    if (!clientSecretValue) {
      console.error('❌ No client secret in response:', data)
      return NextResponse.json(
        { error: 'Invalid session response from OpenAI' },
        { status: 500 }
      )
    }
    
    // Return the client secret
    return NextResponse.json({
      clientSecret: clientSecretValue,
      expiresAt: data.client_secret?.expires_at || data.expires_at
    })

  } catch (error: any) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json(
      { error: 'Session creation failed: ' + error.message },
      { status: 500 }
    )
  }
}

