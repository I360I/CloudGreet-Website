/**
 * Audit Logging API
 * Provides access to compliance and audit logs for admin users
 * 
 * GET /api/admin/audit-logs
 * Query params: 
 *   - businessId (optional): Filter by business
 *   - eventType (optional): Filter by event type
 *   - channel (optional): Filter by channel (voice, sms, email, api)
 *   - startDate (optional): Start date (ISO string)
 *   - endDate (optional): End date (ISO string)
 *   - limit (optional): Max results (default 100, max 1000)
 *   - offset (optional): Pagination offset
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const eventType = searchParams.get('eventType')
    const channel = searchParams.get('channel')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Build query
    let query = supabaseAdmin
      .from('compliance_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (businessId) {
      query = query.eq('tenant_id', businessId)
    }
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (channel) {
      query = query.eq('channel', channel)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: events, error, count } = await query

    if (error) {
      logger.error('Failed to fetch audit logs', {
        error: error.message,
        businessId,
        eventType,
        channel
      })
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    // Format response
    const formattedEvents = (events || []).map(event => ({
      id: event.id,
      tenantId: event.tenant_id,
      channel: event.channel,
      eventType: event.event_type,
      path: event.path,
      metadata: event.metadata || {},
      createdAt: event.created_at
    }))

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        businessId: businessId || null,
        eventType: eventType || null,
        channel: channel || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    })

  } catch (error) {
    logger.error('Audit logs API failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
