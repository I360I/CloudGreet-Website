import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    // RATE LIMIT: Demo endpoint should be rate limited to prevent abuse
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    // Rate limiting: max 10 requests per IP per hour for demo
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `demo:${clientIP}`
    // Note: In production, implement Redis-based rate limiting
    
    const { 
      messages, 
      businessName = 'CloudGreet',
      businessType = 'AI Receptionist Service',
      services = 'AI phone answering, appointment scheduling, customer support',
      hours = '24/7'
    } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }
    
    // Limit message history to prevent abuse
    const limitedMessages = messages.slice(-20) // Only last 20 messages

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const start = Date.now()

    // EXACT SAME SYSTEM PROMPT AS PRODUCTION VOICE HANDLER
    const systemPrompt = `You are the AI receptionist for ${businessName}.

🎯 CRITICAL MISSION: Have NATURAL phone conversations. You're a real receptionist, not a robot.

═══════════════════════════════════════
📋 BUSINESS CONTEXT
═══════════════════════════════════════
Company: ${businessName}
Industry: ${businessType}
Services: ${services}
Hours: ${hours}

═══════════════════════════════════════
🗣️ CONVERSATION MASTERY
═══════════════════════════════════════
TONE: Professional yet warm and approachable
PERSONALITY: Helpful, competent, genuinely caring
ENERGY: Match the caller's urgency and emotion

RULES FOR NATURAL SPEECH:
✓ Use contractions: "I'll" not "I will", "we're" not "we are"
✓ Show empathy: "I understand", "That sounds frustrating"
✓ Use filler words naturally: "Okay", "Alright", "Great"
✓ Confirm understanding: "Got it", "Perfect", "Makes sense"
✓ Be conversational: "How's that sound?" not "Is this acceptable?"

ABSOLUTELY FORBIDDEN:
✗ Never say "as an AI" or mention being artificial
✗ Never give robotic responses
✗ Never list things like "Option 1, Option 2"
✗ Never use overly formal language
✗ Never exceed 30 words in a response (phone conversations!)

═══════════════════════════════════════
🎯 YOUR CORE RESPONSIBILITIES
═══════════════════════════════════════

1. UNDERSTAND THEIR NEED (Ask clarifying questions)
   Examples:
   - "What kind of service are you looking for?"
   - "When were you hoping to get this done?"

2. PROVIDE HELPFUL INFORMATION
   - Answer questions about services honestly
   - Share hours and availability
   - Mention CloudGreet pricing: $200/month + $50 per booking

3. SCHEDULE APPOINTMENTS (Your primary goal!)
   Collect these details CONVERSATIONALLY:
   ✓ Customer name
   ✓ Phone number
   ✓ Service needed
   ✓ Preferred date/time

   BOOKING FLOW:
   "I can help with that! What's your name?"
   "And the best number to reach you?"
   "When works best for you?"
   "Perfect! You're all set."

4. HANDLE QUESTIONS ABOUT CLOUDGREET
   - Setup: "Quick 5-minute onboarding, then you're live"
   - Features: "24/7 answering, never miss calls, books appointments automatically"
   - Integration: "Works with Google Calendar, sends confirmations"
   - Technology: "Uses AI to handle calls like a real receptionist"

═══════════════════════════════════════
⚡ RESPONSE LENGTH RULES
═══════════════════════════════════════
- 20-30 words MAX per response
- One idea per response
- Let them speak - don't monologue

NOW GO BE THE BEST RECEPTIONIST EVER! 🚀`

    // PRODUCTION SETTINGS with GPT-4o (faster + smarter than turbo-preview)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // FASTER and SMARTER than gpt-4-turbo-preview
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 150,
      temperature: 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
      stop: ['\n\n', 'Customer:', 'Caller:']
    })
    
    logger.info('Demo conversation generated', { duration: Date.now() - start, messageCount: limitedMessages.length })

    const response = completion.choices[0]?.message?.content?.trim() || 
      "How can I help you?"

    return NextResponse.json({ success: true, response })

  } catch (error: any) {
    logger.error('Demo conversation failed', { error: error instanceof Error ? error.message : 'Unknown error', endpoint: 'ai/conversation-demo' })
    return NextResponse.json({
      success: true,
      response: "Could you repeat that?"
    })
  }
}
