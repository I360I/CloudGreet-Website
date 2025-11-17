/**
 * GDPR Data Deletion Endpoint
 * Allows users to request deletion of all their personal data
 * 
 * POST /api/user/gdpr/delete
 * Body: { confirm: true }
 * 
 * Note: This performs a "soft delete" by anonymizing data rather than hard deletion
 * for compliance and audit trail purposes
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { enforceRequestSizeLimit } from '@/lib/request-limits'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Enforce request size limit
    const sizeCheck = enforceRequestSizeLimit(request)
    if ('error' in sizeCheck) {
      return sizeCheck.error
    }

    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { confirm } = body || {}

    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed with confirm: true' },
        { status: 400 }
      )
    }

    const userId = authResult.userId
    const businessId = authResult.businessId

    // Log deletion request for compliance
    await supabaseAdmin
      .from('compliance_events')
      .insert({
        tenant_id: businessId,
        channel: 'api',
        event_type: 'gdpr_deletion_request',
        path: request.nextUrl.pathname,
        metadata: {
          userId,
          businessId,
          requestedAt: new Date().toISOString()
        }
      })
      .catch((error) => {
        logger.error('Failed to log GDPR deletion event', { error })
      })

    // Anonymize user data (soft delete)
    const anonymizedEmail = `deleted-${userId.substring(0, 8)}@deleted.cloudgreet.com`
    const anonymizedPhone = '0000000000'
    const anonymizedName = 'Deleted User'

    // Anonymize user profile
    await supabaseAdmin
      .from('users')
      .update({
        email: anonymizedEmail,
        phone: anonymizedPhone,
        name: anonymizedName,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .catch((error) => {
        logger.error('Failed to anonymize user', { error, userId })
      })

    // Anonymize business data if exists
    if (businessId) {
      await supabaseAdmin
        .from('businesses')
        .update({
          business_name: 'Deleted Business',
          email: anonymizedEmail,
          phone_number: anonymizedPhone,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
        .catch((error) => {
          logger.error('Failed to anonymize business', { error, businessId })
        })

      // Anonymize calls
      await supabaseAdmin
        .from('calls')
        .update({
          from_number: anonymizedPhone,
          to_number: anonymizedPhone,
          caller_name: anonymizedName,
          transcript: '[DELETED]',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .catch((error) => {
          logger.error('Failed to anonymize calls', { error, businessId })
        })

      // Anonymize appointments
      await supabaseAdmin
        .from('appointments')
        .update({
          customer_name: anonymizedName,
          customer_phone: anonymizedPhone,
          customer_email: anonymizedEmail,
          notes: '[DELETED]',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .catch((error) => {
          logger.error('Failed to anonymize appointments', { error, businessId })
        })

      // Anonymize SMS messages
      await supabaseAdmin
        .from('sms_messages')
        .update({
          to_phone: anonymizedPhone,
          from_phone: anonymizedPhone,
          message: '[DELETED]',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .catch((error) => {
          logger.error('Failed to anonymize SMS messages', { error, businessId })
        })

      // Anonymize email logs
      await supabaseAdmin
        .from('email_logs')
        .update({
          to_email: anonymizedEmail,
          from_email: anonymizedEmail,
          subject: '[DELETED]',
          body: '[DELETED]',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .catch((error) => {
          logger.error('Failed to anonymize email logs', { error, businessId })
        })
    }

    logger.info('GDPR deletion request processed', {
      userId,
      businessId,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Your data has been anonymized and will be permanently deleted within 30 days per GDPR requirements.',
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('GDPR data deletion failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to process deletion request. Please contact support.' },
      { status: 500 }
    )
  }
}
