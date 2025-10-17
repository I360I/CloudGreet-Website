import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * GET: Fetch enriched leads with filters
 */
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const enrichmentFilter = filter
    const minScore = Number(searchParams.get('minScore')) || 0
    const businessType = searchParams.get('businessType')
    const limit = Number(searchParams.get('limit')) || 100
    const page = Number(searchParams.get('page')) || 1
    const outreachStatus = searchParams.get('outreachStatus')
    const assignedTo = searchParams.get('assignedTo')
    const tags = searchParams.get('tags')
    const searchQuery = searchParams.get('search')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('enriched_leads')
      .select('*')

    // Apply enrichment status filter
    if (filter === 'enriched') {
      query = query.eq('enrichment_status', 'enriched')
    } else if (filter === 'pending') {
      query = query.in('enrichment_status', ['pending', 'in_progress'])
    }

    // Apply score filter
    if (minScore > 0) {
      query = query.gte('total_score', minScore)
    }

    // Apply business type filter
    if (businessType) {
      query = query.eq('business_type', businessType)
    }

    // Order by score (highest first) and limit
    query = query.order('total_score', { ascending: false, nullsFirst: false })
    query = query.order('created_at', { ascending: false })
    query = query.limit(limit)

    const { data, count, error } = await query

    if (error) {
      logger.error('Failed to fetch leads', { error: error.message })
      return NextResponse.json({
        error: 'Failed to fetch leads'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leads: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      },
      filters: {
        enrichment: enrichmentFilter,
        minScore,
        businessType,
        outreachStatus,
        assignedTo,
        tags,
        search: searchQuery
      }
    })

  } catch (error) {
    logger.error('Leads API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch leads'
    }, { status: 500 })
  }
}

