import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { sendTestReviewSms } from '@/lib/review-requests'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/review-requests/test
 *   body: { phone: string, customer_name?: string }
 *
 * Sends a one-off test review SMS to a phone the contractor specifies
 * (typically their own phone), using their saved Google review URL +
 * template. Bypasses queue/frequency/opt-out/quiet-hours since it's a
 * manual contractor-initiated test.
 *
 * If review URL or template aren't set, returns a friendly error
 * pointing the user back to the right form field.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    phone?: string
    customer_name?: string
  }

  const phoneRaw = (body?.phone || '').trim()
  if (!phoneRaw) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }
  // Accept "+1 (555) 555-5555", "5555555555", etc - normalize to +1XXXXXXXXXX
  // for Telnyx. Allow international by leaving "+CC..." alone.
  const digits = phoneRaw.replace(/\D/g, '')
  let toPhone: string
  if (phoneRaw.startsWith('+')) {
    toPhone = `+${digits}`
  } else if (digits.length === 10) {
    toPhone = `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    toPhone = `+${digits}`
  } else {
    return NextResponse.json({
      error: 'phone format not recognized - use +1XXXXXXXXXX or a 10-digit US number',
    }, { status: 400 })
  }

  const result = await sendTestReviewSms({
    businessId: auth.businessId,
    toPhone,
    customerName: body?.customer_name || null,
  })

  if (result.ok === false) {
    logger.info('review test SMS denied', { businessId: auth.businessId, reason: result.reason })
    const message = ({
      notifications_from_unset: 'SMS sender not configured. Contact support.',
      business_not_found: 'Could not find your business record.',
      no_review_url: 'Add your Google review link in the form above before testing.',
      send_failed: `Telnyx rejected the send: ${result.detail || 'unknown error'}`,
    } as Record<string, string>)[result.reason] || `Send failed: ${result.reason}`
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    rendered: result.rendered,
    telnyx_message_id: result.telnyx_message_id,
    sent_to: toPhone,
  })
}
