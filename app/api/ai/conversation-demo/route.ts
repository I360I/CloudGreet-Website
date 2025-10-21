import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessType } = await request.json();
    
    // Check if AI services are configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!process.env.TELNYX_API_KEY) {
      return NextResponse.json({ error: 'Telnyx API key not configured' }, { status: 500 });
    }
    
    // Create AI conversation session
    const sessionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional AI receptionist for a ${businessType} business. 
            Answer calls professionally, qualify leads, and book appointments. 
            Always be helpful and ask for contact information.`
          },
          {
            role: 'user',
            content: 'Hello, I need help with my business.'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error('Failed to create AI session');
    }
    
    const sessionData = await sessionResponse.json();
    
    return NextResponse.json({
      success: true,
      sessionId: `demo_${Date.now()}`,
      message: 'AI conversation session created',
      aiResponse: sessionData.choices[0].message.content
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ error: 'Failed to create AI conversation' }, { status: 500 });
  }
}