import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { businessType, businessName, services, hours } = await request.json();
    
    // Check if AI services are configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!process.env.TELYNX_API_KEY) {
      return NextResponse.json({ error: 'Telnyx API key not configured' }, { status: 500 });
    }
    
    // Create AI conversation session using OpenAI SDK
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional AI receptionist for ${businessName || 'a service business'}.
          
Business Information:
- Name: ${businessName || 'Service Business'}
- Type: ${businessType || 'Service'}
- Services: ${services || 'General services'}
- Hours: ${hours || 'Standard business hours'}

Your responsibilities:
1. Answer questions about services and pricing professionally
2. Schedule appointments when requested
3. Take detailed messages for the business owner
4. Provide accurate contact information
5. Be helpful, professional, and friendly
6. Ask for contact information when appropriate

Important guidelines:
- Always be polite and professional
- Ask clarifying questions when needed
- Don't make promises about specific pricing without consulting the owner
- If you don't know something, say so and offer to have someone call back
- Keep responses conversational but informative
- End calls politely and confirm next steps`
        },
        {
          role: 'user',
          content: 'Hello, I need help with my business.'
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    const aiResponse = completion.choices[0]?.message?.content || 'Hello! How can I help you today?';
    
    return NextResponse.json({
      success: true,
      sessionId: `demo_${Date.now()}`,
      message: 'AI conversation session created',
      aiResponse: aiResponse,
      businessName: businessName,
      businessType: businessType
    });
    
  } catch (error) {
    console.error('AI conversation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create AI conversation',
      details: error.message 
    }, { status: 500 });
  }
}