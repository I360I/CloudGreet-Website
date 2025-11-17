/**
 * GDPR Data Export Endpoint
 * Allows users to export all their personal data in a portable format
 * 
 * GET /api/user/gdpr/export
 * Returns: JSON file with all user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.userId
    const businessId = authResult.businessId

    // Fetch all user data
    const userData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      userId,
      businessId: businessId || null,
    }

    // Get user profile
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    userData.profile = user || null

    // Get business data if exists
    if (businessId) {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      userData.business = business || null

      // Get calls
      const { data: calls } = await supabaseAdmin
        .from('calls')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      userData.calls = calls || []

      // Get appointments
      const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      userData.appointments = appointments || []

      // Get SMS messages
      const { data: smsMessages } = await supabaseAdmin
        .from('sms_messages')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      userData.smsMessages = smsMessages || []

      // Get email logs
      const { data: emailLogs } = await supabaseAdmin
        .from('email_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      userData.emailLogs = emailLogs || []

      // Get AI agent configuration
      const { data: aiAgent } = await supabaseAdmin
        .from('ai_agents')
        .select('*')
        .eq('business_id', businessId)
        .single()

      userData.aiAgent = aiAgent || null

      // Get compliance events
      const { data: complianceEvents } = await supabaseAdmin
        .from('compliance_events')
        .select('*')
        .eq('tenant_id', businessId)
        .order('created_at', { ascending: false })

      userData.complianceEvents = complianceEvents || []
    }

    // Log export request for compliance
    await supabaseAdmin
      .from('compliance_events')
      .insert({
        tenant_id: businessId,
        channel: 'api',
        event_type: 'gdpr_data_export',
        path: request.nextUrl.pathname,
        metadata: {
          userId,
          businessId,
          exportDate: userData.exportDate
        }
      })
      .catch((error) => {
        logger.error('Failed to log GDPR export event', { error })
      })

    // Return as JSON download
    return new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cloudgreet-data-export-${userId}-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

  } catch (error) {
    logger.error('GDPR data export failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to export data. Please contact support.' },
      { status: 500 }
    )
  }
}
