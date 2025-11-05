import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'

/**
 * GET /api/calls/history
 * 
 * Fetch call history for a business
 * 
 * Query parameters:
 * - businessId: UUID of the business (required)
 * - limit: Number of calls to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - status: Filter by call status (optional)
 * 
 * Returns:
 * {
 *   calls: Array<{
 *     id: string
 *     call_id: string
 *     from_number: string
 *     to_number: string
 *     status: string
 *     duration: number
 *     recording_url: string
 *     transcript: string
 *     created_at: string
 *     caller_name?: string
 *   }>
 *   total: number
 *   limit: number
 *   offset: number
 * }
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyJWT(request)
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const statusFilter = searchParams.get('status')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found', { businessId, error: businessError?.message || JSON.stringify(businessError) })
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.owner_id !== authResult.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this business' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from('calls')
      .select('id, call_id, from_number, to_number, status, duration, recording_url, transcript, created_at, caller_name', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: calls, error: callsError, count } = await query

    if (callsError) {
      logger.error('Error fetching call history', { businessId, error: callsError?.message || JSON.stringify(callsError) })
      return NextResponse.json(
        { error: 'Failed to fetch call history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      calls: calls || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    logger.error('Error in calls/history endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

