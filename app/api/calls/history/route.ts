import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    // Build query
    let query = supabaseAdmin()
      .from('call_logs')
      .select(`
        id,
        call_id,
        from_number,
        to_number,
        direction,
        status,
        duration,
        transcription_text,
        recording_url,
        caller_city,
        caller_state,
        caller_country,
        cost,
        outcome,
        satisfaction_score,
        call_analysis,
        created_at
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: calls, error } = await query

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch call history'
      }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin()
      .from('call_logs')
      .select('count', { count: 'exact', head: true })
      .eq('business_id', businessId)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    // Calculate call statistics
    const callStats = {
      total: count || 0,
      answered: calls?.filter(call => (call as any).status === 'answered').length || 0,
      missed: calls?.filter(call => (call as any).status === 'missed').length || 0,
      averageDuration: calls?.length > 0 
        ? Math.round(calls.reduce((sum, call) => sum + ((call as any).duration || 0), 0) / calls.length)
        : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        calls: calls || [],
        stats: callStats,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Calls history API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch call history'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint could be used for creating call notes or updates
    return NextResponse.json({
      success: true,
      error_message: 'Call history POST endpoint - implementation needed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
