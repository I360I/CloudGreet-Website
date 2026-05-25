import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { telnyxClient } from '@/lib/telnyx'
import { renderReviewTemplate, DEFAULT_REVIEW_SMS_TEMPLATE } from '@/lib/review-requests'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/review-requests/dry-run
 *   body: { phone: string, customer_name?: string }
 *
 * End-to-end pipeline check. Differs from /test (which is a one-shot
 * Telnyx send) in that it INSERTS a real review_requests row with
 * scheduled_for=now() and then immediately runs the same cron-send
 * logic against it. After it returns, the row is visible in the
 * Activity stats AND the SMS has actually landed on the test phone -
 * which is the proof the contractor needs that the schedule → cron
 * → Telnyx pipeline is wired correctly.
 *
 * Heads-up about production timing: on the current Vercel Hobby tier
 * /api/cron/send-review-requests only runs once a day (14:00 UTC).
 * Sub-daily crons require Pro. For real "1 hour after" reliability
 * either upgrade or have an external poker hit the cron URL every
 * 10-15 minutes.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = auth.businessId

  const body = await request.json().catch(() => ({})) as {
    phone?: string
    customer_name?: string
  }
  const phoneRaw = (body?.phone || '').trim()
  if (!phoneRaw) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }
  const digits = phoneRaw.replace(/\D/g, '')
  let toPhone: string
  if (phoneRaw.startsWith('+')) toPhone = `+${digits}`
  else if (digits.length === 10) toPhone = `+1${digits}`
  else if (digits.length === 11 && digits.startsWith('1')) toPhone = `+${digits}`
  else {
    return NextResponse.json({
      error: 'phone format not recognized - use +1XXXXXXXXXX or a 10-digit US number',
    }, { status: 400 })
  }

  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) {
    return NextResponse.json({
      success: false,
      error: 'Notifications sender not configured. Contact support.',
    }, { status: 500 })
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, review_requests_enabled, google_review_url, review_sms_template, review_send_timing')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz) {
    return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
  }
  const reviewUrl = (biz as any).google_review_url
  if (!reviewUrl) {
    return NextResponse.json({
      success: false,
      error: 'Add your Google review link above before running the dry-run.',
    }, { status: 400 })
  }
  if (!(biz as any).review_requests_enabled) {
    return NextResponse.json({
      success: false,
      error: 'Turn the Review requests toggle ON before running the dry-run.',
    }, { status: 400 })
  }

  const customerName = (body?.customer_name || '').trim() || 'Demo Customer'
  const phoneDigits = toPhone.replace(/\D/g, '')

  // 1) Insert a real row scheduled for NOW, status=queued. This is what
  //    would have landed when a real call booked with review_consent=true.
  const nowIso = new Date().toISOString()
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('review_requests')
    .insert({
      business_id: businessId,
      appointment_id: null,
      customer_phone: phoneDigits,
      customer_name: customerName,
      scheduled_for: nowIso,
      status: 'queued',
    })
    .select('id, scheduled_for')
    .single()
  if (insertErr || !row) {
    logger.error('dry-run: insert failed', { businessId, error: insertErr?.message })
    return NextResponse.json({
      success: false,
      error: `Could not queue the test row: ${insertErr?.message || 'unknown'}`,
    }, { status: 500 })
  }

  // 2) Render with the live template + URL exactly as the cron would.
  const template = (biz as any).review_sms_template || DEFAULT_REVIEW_SMS_TEMPLATE
  const message = renderReviewTemplate(template, {
    first_name: firstName(customerName),
    business_name: (biz as any).business_name || 'us',
    review_link: reviewUrl,
  })

  // 3) Send via Telnyx exactly as the cron would.
  let telnyxMessageId: string | null = null
  let sendError: string | null = null
  try {
    const resp = await telnyxClient.sendSMS(toPhone, message, fromNumber)
    telnyxMessageId = resp?.data?.id || null
  } catch (e) {
    sendError = e instanceof Error ? e.message : 'unknown'
  }

  // 4) Mark the row sent/failed so it shows up correctly in Activity stats.
  if (sendError) {
    await supabaseAdmin
      .from('review_requests')
      .update({
        status: 'failed',
        failure_reason: sendError.slice(0, 300),
        rendered_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (row as any).id)
    return NextResponse.json({
      success: false,
      step_failed: 'telnyx_send',
      error: `Telnyx rejected: ${sendError}`,
      review_request_id: (row as any).id,
      rendered: message,
    }, { status: 500 })
  }
  await supabaseAdmin
    .from('review_requests')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      telnyx_message_id: telnyxMessageId,
      rendered_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', (row as any).id)

  logger.info('review dry-run ok', { businessId, reviewRequestId: (row as any).id })
  return NextResponse.json({
    success: true,
    review_request_id: (row as any).id,
    queued_at: nowIso,
    sent_to: toPhone,
    rendered: message,
    telnyx_message_id: telnyxMessageId,
    timing_configured: (biz as any).review_send_timing || '1h_after',
  })
}

function firstName(name: string | null | undefined): string {
  if (!name) return 'there'
  return name.trim().split(/\s+/)[0] || 'there'
}
