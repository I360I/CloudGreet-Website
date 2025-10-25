import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Input validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY not configured in environment')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    logger.info('Creating ephemeral session token...')

    // SECURE: Create ephemeral client secret using GA endpoint
    // This protects the main API key
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
      logger.error('Failed to create ephemeral session', { status: response.status, error: errorText })
      return NextResponse.json(
        { error: `Failed to create session: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    logger.info('Ephemeral session created successfully')
    
    // Return only the ephemeral client_secret, NOT the main API key
    return NextResponse.json({
      clientSecret: data.client_secret?.value || data.client_secret,
      sessionId: data.id,
      expiresAt: data.expires_at
    })

  } catch (error: any) {
    logger.error('Session creation error', { error: error.message })
    return NextResponse.json(
      { error: 'Session creation failed: ' + error.message },
      { status: 500 }
    )
  }
}

