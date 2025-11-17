import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { queueJob } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Send SMS Message via Telnyx
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
    const { to, message, businessId, type } = body

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: 'Recipient phone number and message are required' },
        { status: 400 }
      )
    }

    // Validate business access
    const targetBusinessId = businessId || authResult.businessId
    if (targetBusinessId !== authResult.businessId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to send SMS for this business' },
        { status: 403 }
      )
    }

    // Get business phone number for "from" field
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business?.phone_number) {
      logger.warn('Business phone number not found', { 
        businessId: targetBusinessId,
        error: businessError instanceof Error ? businessError.message : String(businessError)
      })
    }

    // Queue SMS for async processing
    try {
      await queueJob('send_sms', {
        to: to,
        message: message,
        from: business?.phone_number || undefined,
        businessId: targetBusinessId,
        userId: authResult.userId,
        type: type || 'manual_sms'
      }, { maxAttempts: 3 })
      
      logger.info('SMS queued successfully', {
        to,
        from: business?.phone_number,
        businessId: targetBusinessId,
        type: type || 'manual_sms',
        userId: authResult.userId
      })
      
      return NextResponse.json({
        success: true,
        message: 'SMS queued successfully. It will be sent shortly.'
      })
    } catch (queueError) {
      logger.error('Failed to queue SMS', {
        error: queueError instanceof Error ? queueError.message : String(queueError),
        to,
        businessId: targetBusinessId
      })
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to queue SMS. Please try again.'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Error sending SMS', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { success: false, message: 'Failed to send SMS. Please try again.' },
      { status: 500 }
    )
  }
}

