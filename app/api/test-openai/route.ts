import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        hasKey: false 
      }, { status: 500 })
    }

    // Test OpenAI API with a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, OpenAI is working!"'
          }
        ],
        max_tokens: 20,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ 
        error: 'OpenAI API call failed',
        status: response.status,
        details: errorData,
        hasKey: true
      }, { status: 500 })
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    return NextResponse.json({ 
      success: true,
      response: aiResponse,
      hasKey: true,
      status: response.status
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      hasKey: !!process.env.OPENAI_API_KEY,
      success: false 
    }, { status: 500 })
  }
}
