import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/calls/recording
 * 
 * Fetch call recording and transcript for a specific call
 * 
 * Query parameters:
 * - callId: UUID of the call
 * - businessId: UUID of the business (for authorization)
 * 
 * Returns:
 * {
 *   recording: {
 *     id: string
 *     callId: string
 *     recordingUrl: string
 *     transcript: string
 *     duration: number
 *     sentiment: 'positive' | 'neutral' | 'negative'
 *     summary: string
 *     createdAt: string
 *     callerName?: string
 *     callerPhone: string
 *   }
 * }
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId || !authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const requestedBusinessId = searchParams.get('businessId')
    
    // Use businessId from auth token, but allow override via query param for admin access
    const businessId = requestedBusinessId || authResult.businessId

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required parameter: callId' },
        { status: 400 }
      )
    }

    // Verify tenant isolation - user can only access their own business
    if (businessId !== authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this business' },
        { status: 403 }
      )
    }

    // Fetch call record
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select(`
        id,
        call_id,
        recording_url,
        transcript,
        duration,
        from_number,
        to_number,
        status,
        created_at,
        caller_name
      `)
      .eq('id', callId)
      .eq('business_id', businessId)
      .single()

    if (callError || !call) {
      logger.error('Call not found', { callId, businessId, error: callError?.message || JSON.stringify(callError) })
      return NextResponse.json(
        { error: 'Call recording not found' },
        { status: 404 }
      )
    }

    // Calculate sentiment from transcript (simple heuristic - can be enhanced)
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (call.transcript) {
      const transcript = call.transcript.toLowerCase()
      const positiveWords = ['yes', 'great', 'thank', 'perfect', 'excellent', 'love', 'happy', 'satisfied']
      const negativeWords = ['no', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed']
      
      const positiveCount = positiveWords.filter(word => transcript.includes(word)).length
      const negativeCount = negativeWords.filter(word => transcript.includes(word)).length
      
      if (positiveCount > negativeCount) sentiment = 'positive'
      else if (negativeCount > positiveCount) sentiment = 'negative'
    }

    // Generate summary if transcript exists
    let summary = ''
    if (call.transcript) {
      // Simple summary: first 200 characters of transcript
      summary = call.transcript.length > 200 
        ? call.transcript.substring(0, 200) + '...'
        : call.transcript
    }

    // Format response to match CallPlayer component expectations
    const recording = {
      id: call.id,
      callId: call.call_id || call.id,
      recordingUrl: call.recording_url || '',
      transcript: call.transcript || '',
      duration: call.duration || 0,
      sentiment,
      summary,
      createdAt: call.created_at,
      callerName: call.caller_name || undefined,
      callerPhone: call.from_number || ''
    }

    return NextResponse.json({ recording })
  } catch (error) {
    logger.error('Error fetching call recording', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

