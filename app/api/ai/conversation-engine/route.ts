import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ConversationContext {
  businessId: string
  businessName: string
  businessType: string
  services: string[]
  businessHours: Record<string, string>
  customerInfo?: {
    name?: string
    phone?: string
    email?: string
    previousCalls?: number
    lastCallDate?: string
    customerType?: 'new' | 'returning' | 'vip'
  }
  conversationHistory: Array<{
    speaker: 'ai' | 'customer'
    message: string
    timestamp: string
    sentiment?: string
    intent?: string
  }>
  currentIntent?: string
  leadScore?: number
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency'
}

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId

    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const { message, conversationId, customerPhone } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get business information
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get conversation history if conversationId exists
    let conversationHistory = []
    if (conversationId) {
      const { data: history } = await supabaseAdmin
        .from('conversation_history')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      conversationHistory = history || []
    }

    // Get customer information if phone provided
    let customerInfo = {}
    if (customerPhone) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('phone', customerPhone)
        .single()
      
      if (customer) {
        // Get previous call count
        const { count: callCount } = await supabaseAdmin
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('from_number', customerPhone)
          .eq('business_id', businessId)

        customerInfo = {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          previousCalls: callCount || 0,
          lastCallDate: customer.last_call_date,
          customerType: (callCount || 0) > 0 ? 'returning' : 'new'
        }
      }
    }

    // Analyze customer message with AI
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an advanced AI conversation analyzer. Analyze the customer message and provide:
1. Sentiment (positive, negative, neutral, frustrated, urgent)
2. Intent (inquiry, complaint, booking, emergency, general)
3. Urgency level (low, medium, high, emergency)
4. Key information extracted (name, phone, email, service needed, timeframe)
5. Suggested next actions

Business context:
- Business: ${business.business_name}
- Type: ${business.business_type}
- Services: ${business.services?.join(', ') || 'General services'}
- Business Hours: ${JSON.stringify(business.business_hours || {})}

Customer context:
${JSON.stringify(customerInfo)}

Recent conversation:
${conversationHistory.slice(-3).map(msg => `${msg.speaker}: ${msg.message}`).join('\n')}

Current message: "${message}"`
        },
        {
          role: "user",
          content: `Analyze this customer message and respond with a JSON object containing:
{
  "sentiment": "positive|negative|neutral|frustrated|urgent",
  "intent": "inquiry|complaint|booking|emergency|general",
  "urgency": "low|medium|high|emergency",
  "extractedInfo": {
    "name": "string or null",
    "phone": "string or null", 
    "email": "string or null",
    "serviceNeeded": "string or null",
    "timeframe": "string or null",
    "address": "string or null"
  },
  "leadScore": 0-100,
  "suggestedActions": ["action1", "action2"],
  "emotionalState": "calm|concerned|frustrated|urgent|happy"
}`
        }
      ],
      temperature: 0.3
    })

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}')

    // Generate intelligent response
    const responsePrompt = `You are an advanced AI receptionist for ${business.business_name}, a ${business.business_type} business.

BUSINESS DETAILS:
- Company: ${business.business_name}
- Type: ${business.business_type}
- Services: ${business.services?.join(', ') || 'General services'}
- Business Hours: ${JSON.stringify(business.business_hours || {})}
- Phone: ${business.phone_number}

CUSTOMER CONTEXT:
${JSON.stringify(customerInfo)}

CONVERSATION ANALYSIS:
- Sentiment: ${analysis.sentiment}
- Intent: ${analysis.intent}
- Urgency: ${analysis.urgency}
- Emotional State: ${analysis.emotionalState}
- Lead Score: ${analysis.leadScore}/100

CONVERSATION HISTORY:
${conversationHistory.slice(-5).map(msg => `${msg.speaker}: ${msg.message}`).join('\n')}

CUSTOMER MESSAGE: "${message}"

INSTRUCTIONS:
1. Respond naturally and professionally
2. Match the customer's emotional state
3. If urgent/emergency, prioritize immediate help
4. If booking intent, gather necessary information
5. If complaint, show empathy and offer solutions
6. If inquiry, provide helpful information
7. Always ask clarifying questions when needed
8. End with clear next steps

Respond in a conversational, helpful tone that builds trust and solves the customer's problem.`

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: responsePrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const response = aiResponse.choices[0].message.content || "I apologize, but I'm having trouble processing your request. Let me connect you with our team."

    // Save conversation to history
    const conversationData = {
      conversation_id: conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      business_id: businessId,
      customer_message: message,
      ai_response: response,
      sentiment: analysis.sentiment,
      intent: analysis.intent,
      urgency_level: analysis.urgency,
      lead_score: analysis.leadScore,
      extracted_info: analysis.extractedInfo,
      emotional_state: analysis.emotionalState,
      created_at: new Date().toISOString()
    }

    await supabaseAdmin
      .from('conversation_history')
      .insert(conversationData)

    // Update customer information if new details extracted
    if (customerPhone && analysis.extractedInfo) {
      const updateData: any = {}
      
      if (analysis.extractedInfo.name) updateData.name = analysis.extractedInfo.name
      if (analysis.extractedInfo.email) updateData.email = analysis.extractedInfo.email
      if (analysis.extractedInfo.address) updateData.address = analysis.extractedInfo.address
      
      if (Object.keys(updateData).length > 0) {
        updateData.last_call_date = new Date().toISOString()
        updateData.updated_at = new Date().toISOString()

        await supabaseAdmin
          .from('customers')
          .upsert({
            phone: customerPhone,
            business_id: businessId,
            ...updateData
          })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response,
        analysis: {
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          urgency: analysis.urgency,
          leadScore: analysis.leadScore,
          emotionalState: analysis.emotionalState,
          extractedInfo: analysis.extractedInfo
        },
        conversationId: conversationData.conversation_id,
        suggestedActions: analysis.suggestedActions
      }
    })

  } catch (error) {
    console.error('Conversation engine error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process conversation'
    }, { status: 500 })
  }
}
