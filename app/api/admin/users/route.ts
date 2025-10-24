import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authCheck = requireAdmin(request)
    if (authCheck.error) return authCheck.response

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // Build query
    let query = supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        business_type,
        email,
        phone_number,
        subscription_status,
        onboarding_completed,
        created_at,
        updated_at,
        owner_id
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('subscription_status', status)
    }

    const { data: businesses, error, count } = await query

    if (error) {
      logger.error('Failed to fetch users', { error: error.message })
      return NextResponse.json(createErrorResponse('Failed to fetch users'), { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json(createSuccessResponse({
      users: businesses || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    }))

  } catch (error) {
    logger.error('Admin users fetch error', { error })
    return NextResponse.json(createErrorResponse('Internal server error'), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require admin authentication
    const authCheck = requireAdmin(request)
    if (authCheck.error) return authCheck.response

    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json(createErrorResponse('User ID and action are required'), { status: 400 })
    }

    let result

    switch (action) {
      case 'suspend':
        result = await supabaseAdmin
          .from('businesses')
          .update({
            subscription_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        break

      case 'activate':
        result = await supabaseAdmin
          .from('businesses')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        break

      case 'update':
        result = await supabaseAdmin
          .from('businesses')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        break

      default:
        return NextResponse.json(createErrorResponse('Invalid action'), { status: 400 })
    }

    if (result.error) {
      logger.error('Failed to update user', { error: result.error.message, userId, action })
      return NextResponse.json(createErrorResponse('Failed to update user'), { status: 500 })
    }

    logger.info('User updated successfully', { userId, action })

    return NextResponse.json(createSuccessResponse({
      message: 'User updated successfully'
    }))

  } catch (error) {
    logger.error('Admin user update error', { error })
    return NextResponse.json(createErrorResponse('Internal server error'), { status: 500 })
  }
}
