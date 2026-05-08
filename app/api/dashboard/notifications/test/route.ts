import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import {
  DEFAULT_BOOKING_SMS_TEMPLATE,
  SAMPLE_CONTEXT,
  renderTemplate,
} from '@/lib/booking-notifications'
import { telnyxClient } from '@/lib/telnyx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/notifications/test
 *
 * Sends one test SMS to the saved notifications_phone using either
 * the saved template or a draft template the contractor is editing.
 * Body (optional): { template?: string }
 *
 * Used by the dashboard settings panel's "Send test" button so the
 * contractor can verify the wiring before the first real booking.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) {
    return NextResponse.json({
      error: 'Booking notifications are not enabled on this CloudGreet account yet. Contact your CloudGreet rep.',
    }, { status: 503 })
  }

  const body = await request.json().catch(() => ({})) as { template?: string }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('notifications_phone, booking_sms_template, business_name')
    .eq('id', auth.businessId)
    .maybeSingle()

  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  const to = (biz as any).notifications_phone
  if (!to) {
    return NextResponse.json({
      error: 'Save a phone number first - that\'s where the test will be sent.',
    }, { status: 400 })
  }

  const template = body.template
    ?? (biz as any).booking_sms_template
    ?? DEFAULT_BOOKING_SMS_TEMPLATE
  const message = renderTemplate(template, {
    ...SAMPLE_CONTEXT,
    business: (biz as any).business_name || SAMPLE_CONTEXT.business,
  })

  try {
    await telnyxClient.sendSMS(to, `[TEST] ${message}`, fromNumber)
    void supabaseAdmin.from('sms_messages').insert({
      business_id: auth.businessId,
      to_phone: to,
      from_phone: fromNumber,
      message: `[TEST] ${message}`,
      direction: 'outbound',
      status: 'sent',
      type: 'booking_notification_test',
    })
    return NextResponse.json({ success: true, sent_to: to })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.warn('booking notification test failed', { error: msg, businessId: auth.businessId })
    return NextResponse.json({
      error: `Send failed: ${msg}. Most common cause: number is not attached to the messaging profile in Telnyx.`,
    }, { status: 500 })
  }
}
