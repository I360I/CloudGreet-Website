import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
  }
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Decode JWT token
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: calls, error: callsError } = await query

    if (callsError) {
      logger.error('Error fetching call history', {
        error: callsError.message,
        businessId,
        userId
      })
      return NextResponse.json({ error: 'Failed to fetch call history' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      logger.error('Error fetching call count', {
        error: countError.message,
        businessId
      })
    }

    // Format the response
    const formattedCalls = calls?.map(call => ({
      id: call.id,
      from_number: call.from_number,
      to_number: call.to_number,
      customer_name: call.customer_name,
      status: call.status,
      duration: call.duration,
      created_at: call.created_at,
      timestamp: call.created_at, // For backward compatibility
      transcript: call.transcript,
      recording_url: call.recording_url,
      service: call.service,
      revenue: call.revenue,
      estimated_value: call.estimated_value,
      satisfaction_rating: call.satisfaction_rating,
      notes: call.notes
    })) || []

    return NextResponse.json({
      success: true,
      calls: formattedCalls,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Call history API error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
