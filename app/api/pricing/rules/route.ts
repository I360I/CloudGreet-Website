import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Pricing Rules
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

    const businessIdParam = request.nextUrl.searchParams.get('business_id')
    const businessId = (businessIdParam && businessIdParam.trim() !== '') 
      ? businessIdParam 
      : authResult.businessId

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get pricing rules
    const { data: rules, error } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch pricing rules', { 
        error: error instanceof Error ? error.message : String(error), 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to fetch pricing rules' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rules: rules || []
    })
  } catch (error) {
    logger.error('Error fetching pricing rules', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pricing rules' },
      { status: 500 }
    )
  }
}

/**
 * Create Pricing Rule
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { business_id, ...ruleData } = body || {}

    const businessId = business_id || authResult.businessId

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Create pricing rule
    const { data: rule, error } = await supabaseAdmin
      .from('pricing_rules')
      .insert({
        business_id: businessId,
        ...ruleData,
        is_active: ruleData.is_active !== undefined ? ruleData.is_active : true
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create pricing rule', { 
        error: error instanceof Error ? error.message : String(error), 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to create pricing rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rule
    })
  } catch (error) {
    logger.error('Error creating pricing rule', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to create pricing rule' },
      { status: 500 }
    )
  }
}

/**
 * Update Pricing Rule
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

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const { id, ...ruleData } = body || {}

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Rule ID is required' },
        { status: 400 }
      )
    }

    // Update pricing rule
    const { data: rule, error } = await supabaseAdmin
      .from('pricing_rules')
      .update(ruleData)
      .eq('id', id)
      .eq('business_id', authResult.businessId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update pricing rule', { 
        error: error instanceof Error ? error.message : String(error), 
        ruleId: id 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to update pricing rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rule
    })
  } catch (error) {
    logger.error('Error updating pricing rule', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to update pricing rule' },
      { status: 500 }
    )
  }
}

/**
 * Delete Pricing Rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ruleId = request.nextUrl.searchParams.get('id')

    if (!ruleId) {
      return NextResponse.json(
        { success: false, message: 'Rule ID is required' },
        { status: 400 }
      )
    }

    // Delete pricing rule
    const { error } = await supabaseAdmin
      .from('pricing_rules')
      .delete()
      .eq('id', ruleId)
      .eq('business_id', authResult.businessId)

    if (error) {
      logger.error('Failed to delete pricing rule', { 
        error: error instanceof Error ? error.message : String(error), 
        ruleId 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to delete pricing rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing rule deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting pricing rule', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to delete pricing rule' },
      { status: 500 }
    )
  }
}

