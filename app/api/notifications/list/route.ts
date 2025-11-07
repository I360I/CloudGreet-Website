import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * List Notifications
 * Alternative endpoint for notifications list
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

    const businessId = authResult.businessId

    // Get notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logger.error('Failed to fetch notifications', { 
        error: error instanceof Error ? error.message : String(error), 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || []
    })
  } catch (error) {
    logger.error('Error fetching notifications', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

