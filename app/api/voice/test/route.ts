import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    const hasTelnyxKey = !!process.env.TELNYX_API_KEY
    const hasBusinessPhone = !!process.env.BUSINESS_PHONE
    const hasPersonalPhone = !!process.env.PERSONAL_PHONE
    
    return NextResponse.json({
      status: 'ok',
      voiceSystem: {
        openaiConfigured: hasOpenAIKey,
        telnyxConfigured: hasTelnyxKey,
        businessPhoneConfigured: hasBusinessPhone,
        personalPhoneConfigured: hasPersonalPhone,
        ready: hasOpenAIKey && hasTelnyxKey && hasBusinessPhone && hasPersonalPhone
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL
      },
      message: hasOpenAIKey 
        ? 'Voice system is configured and ready'
        : 'Voice system requires OpenAI API key configuration'
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message,
        voiceSystem: {
          ready: false
        }
      },
      { status: 500 }
    )
  }
}
