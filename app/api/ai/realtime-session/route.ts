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

    // Create client secret with session configuration (per OpenAI docs)
    const sessionConfig = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'verse'
    }

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionConfig)
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
    
    // Parse the response correctly based on OpenAI's format
    console.log('📥 OpenAI response:', JSON.stringify(data, null, 2))
    
    // Handle different response formats from OpenAI
    let clientSecretValue: string
    let expiresAt: string | undefined
    
    if (typeof data.client_secret === 'string') {
      clientSecretValue = data.client_secret
      expiresAt = data.expires_at
    } else if (data.client_secret && typeof data.client_secret === 'object') {
      clientSecretValue = data.client_secret.value
      expiresAt = data.client_secret.expires_at
    } else if (data.value) {
      clientSecretValue = data.value
      expiresAt = data.expires_at
    } else {
      console.error('❌ No client secret in response:', data)
      return NextResponse.json(
        { error: 'Invalid session response from OpenAI' },
        { status: 500 }
      )
    }
    
    if (!clientSecretValue) {
      console.error('❌ Client secret is empty:', data)
      return NextResponse.json(
        { error: 'Empty client secret from OpenAI' },
        { status: 500 }
      )
    }
    
    // Return the client secret
    console.log('✅ Generated client secret (length:', clientSecretValue.length, ')')
    return NextResponse.json({
      clientSecret: clientSecretValue,
      expiresAt: expiresAt
    })

  } catch (error: any) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json(
      { error: 'Session creation failed: ' + error.message },
      { status: 500 }
    )
  }
}

