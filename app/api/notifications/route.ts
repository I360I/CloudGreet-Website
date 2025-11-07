import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Notifications
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
      .limit(50)

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

/**
 * Create Notification
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

    const body = await request.json()
    const { type, title, message, priority } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        business_id: authResult.businessId,
        type,
        title,
        message,
        priority: priority || 'medium',
        read: false
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create notification', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return NextResponse.json(
        { success: false, message: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notification
    })
  } catch (error) {
    logger.error('Error creating notification', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

