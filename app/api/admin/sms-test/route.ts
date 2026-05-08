import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'
import {
  DEFAULT_BOOKING_SMS_TEMPLATE,
  SAMPLE_CONTEXT,
  renderTemplate,
} from '@/lib/booking-notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/sms-test
 *
 * Admin-only end-to-end SMS tester. Lets you fire a single SMS to
 * any number from any sender (or the configured CLOUDGREET_NOTIFICATIONS_FROM
 * default) without going through a real booking. Surfaces the raw
 * Telnyx response on failure so you can see exactly what went wrong.
 *
 * Body: {
 *   to: '+15551234567',                         // required
 *   from?: '+1...',                              // defaults to env
 *   template?: string,                           // defaults to default template
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    to?: string
    from?: string
    template?: string
  }

  const to = (body.to || '').toString().trim()
  if (!to) return NextResponse.json({ error: 'to (E.164 phone) required' }, { status: 400 })

  const from = (body.from || process.env.CLOUDGREET_NOTIFICATIONS_FROM || '').toString().trim()
  if (!from) {
    return NextResponse.json({
      error: 'No sender number. Pass { from } in the body or set CLOUDGREET_NOTIFICATIONS_FROM env.',
    }, { status: 400 })
  }

  const template = body.template || DEFAULT_BOOKING_SMS_TEMPLATE
  const message = `[ADMIN TEST] ${renderTemplate(template, SAMPLE_CONTEXT)}`

  try {
    const resp = await telnyxClient.sendSMS(to, message, from)
    return NextResponse.json({
      success: true,
      message_id: resp?.data?.id || null,
      to,
      from,
      message,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.warn('admin SMS test failed', { error: msg, to, from })
    return NextResponse.json({
      success: false,
      error: msg,
      diagnostics: {
        TELNYX_API_KEY_set: !!process.env.TELNYX_API_KEY,
        TELNYX_MESSAGING_PROFILE_ID_set: !!process.env.TELNYX_MESSAGING_PROFILE_ID,
        CLOUDGREET_NOTIFICATIONS_FROM_set: !!process.env.CLOUDGREET_NOTIFICATIONS_FROM,
        from_used: from,
      },
    }, { status: 500 })
  }
}
