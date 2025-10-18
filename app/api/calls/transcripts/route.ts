import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access - CRITICAL for transcript privacy!
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get business ID from middleware or query params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID is required'
      }, { status: 400 })
    }
    
    // Verify user owns this business - prevent transcript snooping!
    if (userBusinessId !== businessId) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Fetch call logs with transcripts
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (callsError) {
      logger.error('Failed to fetch call transcripts', { 
        error: callsError, 
        businessId
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch call data'
      }, { status: 500 })
    }

    // Format calls for frontend
    const formattedCalls = calls?.map(call => ({
      id: call.id,
      callId: call.call_id,
      from: call.from_number,
      to: call.to_number,
      status: call.status,
      duration: call.duration || 0,
      timestamp: call.created_at,
      transcript: call.transcript || 'No transcript available',
      recording_url: call.recording_url,
      summary: call.summary || 'No summary available',
      customer_name: call.customer_name,
      customer_phone: call.customer_phone,
      tags: call.tags || [],
      sentiment: call.sentiment || 'neutral',
      follow_up_required: call.follow_up_required || false
    })) || []

    return NextResponse.json({
      success: true,
      calls: formattedCalls,
      total: formattedCalls.length
    })

  } catch (error) {
    logger.error('Call transcripts API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'calls/transcripts'
    })
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
