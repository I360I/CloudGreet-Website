import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Business Hours
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = request.nextUrl.searchParams.get('businessId') || authResult.businessId

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get business hours
    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('business_hours')
      .eq('id', businessId)
      .single()

    if (error || !business) {
      logger.error('Failed to fetch business hours', { 
        error: error instanceof Error ? error.message : String(error), 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      hours: business.business_hours || {}
    })
  } catch (error) {
    logger.error('Error fetching business hours', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to fetch business hours' },
      { status: 500 }
    )
  }
}

/**
 * Update Business Hours
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { hours } = body
    const businessId = request.nextUrl.searchParams.get('businessId') || authResult.businessId

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: 'Business ID is required' },
        { status: 400 }
      )
    }

    if (!hours) {
      return NextResponse.json(
        { success: false, message: 'Hours data is required' },
        { status: 400 }
      )
    }

    // Update business hours
    const { error } = await supabaseAdmin
      .from('businesses')
      .update({ business_hours: hours })
      .eq('id', businessId)
      .eq('owner_id', authResult.userId)

    if (error) {
      logger.error('Failed to update business hours', { 
        error: error instanceof Error ? error.message : String(error), 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to update business hours' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Business hours updated successfully'
    })
  } catch (error) {
    logger.error('Error updating business hours', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to update business hours' },
      { status: 500 }
    )
  }
}

