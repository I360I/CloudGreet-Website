import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get recent calls with transcripts
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .not('transcription_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (callsError) {
      logger.error('Error fetching calls for quality analysis', { 
        error: callsError.message, 
        businessId 
      })
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        success: true,
        qualityData: []
      })
    }

    // Analyze each call with AI
    const qualityData = await Promise.all(
      calls.map(async (call) => {
        try {
          const analysis = await analyzeCallQuality(call.transcription_text, call.duration)
          return {
            callId: call.id,
            duration: call.duration || 0,
            qualityScore: analysis.qualityScore,
            sentimentScore: analysis.sentimentScore,
            keywords: analysis.keywords,
            issues: analysis.issues,
            recommendations: analysis.recommendations,
            transcript: call.transcription_text,
            recordingUrl: call.recording_url
          }
        } catch (error) {
          logger.error('Error analyzing call quality', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            callId: call.id 
          })
          return {
            callId: call.id,
            duration: call.duration || 0,
            qualityScore: 50,
            sentimentScore: 0.5,
            keywords: [],
            issues: ['Analysis failed'],
            recommendations: ['Review call manually'],
            transcript: call.transcription_text,
            recordingUrl: call.recording_url
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      qualityData
    })

  } catch (error) {
    logger.error('Error getting call quality metrics', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get quality metrics' 
    }, { status: 500 })
  }
}

async function analyzeCallQuality(transcript: string, duration: number): Promise<{
  qualityScore: number
  sentimentScore: number
  keywords: string[]
  issues: string[]
  recommendations: string[]
}> {
  try {
    const prompt = `Analyze this call transcript for quality and provide a JSON response:

Transcript: "${transcript}"
Duration: ${duration} seconds

Please analyze and return a JSON object with:
1. qualityScore (0-100): Overall call quality based on professionalism, clarity, helpfulness
2. sentimentScore (0-1): Customer sentiment (0=negative, 0.5=neutral, 1=positive)
3. keywords: Array of key topics discussed (max 5)
4. issues: Array of problems or areas for improvement (max 3)
5. recommendations: Array of specific improvement suggestions (max 3)

Focus on:
- Professional communication
- Problem-solving effectiveness
- Customer satisfaction indicators
- Technical issues or confusion
- Opportunities for improvement

Return only valid JSON, no other text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')
    
    return {
      qualityScore: analysis.qualityScore || 50,
      sentimentScore: analysis.sentimentScore || 0.5,
      keywords: analysis.keywords || [],
      issues: analysis.issues || [],
      recommendations: analysis.recommendations || []
    }
  } catch (error) {
    logger.error('Error in AI call quality analysis', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    
    // Return default values if AI analysis fails
    return {
      qualityScore: 50,
      sentimentScore: 0.5,
      keywords: [],
      issues: ['AI analysis unavailable'],
      recommendations: ['Manual review recommended']
    }
  }
}
