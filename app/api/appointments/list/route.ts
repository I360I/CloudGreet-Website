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
      .from('appointments')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        service_type,
        description,
        scheduled_date,
        status,
        estimated_value,
        actual_value,
        address,
        created_at,
        updated_at,
        completion_notes
      `)
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: appointments, error } = await query

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch appointments'
      }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin()
      .from('appointments')
      .select('count', { count: 'exact', head: true })
      .eq('business_id', businessId)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      data: {
        appointments: appointments || [],
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
        error_message: 'Appointments list API error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch appointments'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // This endpoint is for creating new appointments
    // Implementation would be similar to quotes generation
    return NextResponse.json({
      success: true,
      error_message: 'Appointment creation endpoint - implementation needed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
