import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/me/onboarding/restart
 *
 * Self-service version of admin/clients/:id/reset-onboarding. Wipes
 * ONLY the setup-flow state on the caller's business - calendar
 * connection, forwarding numbers, SMS templates, review settings,
 * onboarding progress flags. Historical data (calls, appointments,
 * review_requests) is NOT touched: a real owner who just wants to
 * re-link Cal.com after a misconfiguration shouldn't lose their
 * call log. Admin still has the heavy-handed wipe endpoint for the
 * true reset-everything case.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = auth.businessId

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('businesses')
    .update({
      onboarding_completed: false,
      onboarding_step: null,
      onboarding_data: null,
      // jsonb NOT NULL with default '{}' - never null.
      onboarding_video_progress: {},
      // Forwarding + numbers
      forwarding_verified_at: null,
      forwarding_carrier: null,
      forwarding_line_type: null,
      forwarding_mode: null,
      escalation_phone: null,
      notifications_phone: null,
      notification_phone: null,
      notification_email: null,
      enable_sms_forwarding: false,
      // Cal.com
      calcom_connected: false,
      calcom_connected_at: null,
      calendar_connected: false,
      cal_com_api_key: null,
      cal_com_user_id: null,
      cal_com_username: null,
      cal_com_event_type_id: null,
      cal_com_event_type_slug: null,
      cal_com_event_type_id_emergency: null,
      cal_com_webhook_id: null,
      cal_com_webhook_secret: null,
      // Google Calendar tokens
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_expiry_date: null,
      // SMS templates client may have edited
      booking_sms_template: null,
      booking_sms_template_emergency: null,
      // Review setup
      review_requests_enabled: false,
      review_send_timing: null,
      review_sms_template: null,
      google_review_url: null,
      updated_at: now,
    })
    .eq('id', businessId)

  if (error) {
    logger.error('me/onboarding/restart failed', { businessId, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logger.info('me/onboarding/restart ok', { businessId, userId: auth.userId })
  return NextResponse.json({ success: true })
}
