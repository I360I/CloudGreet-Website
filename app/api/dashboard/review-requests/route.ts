import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import {
  DEFAULT_REVIEW_SMS_TEMPLATE,
  cancelQueuedForBusiness,
  getReviewStats,
} from '@/lib/review-requests'
import { logImpersonatedAction } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_TIMINGS = new Set(['1h_after', 'evening_same_day', 'next_morning'])
const TEMPLATE_MAX = 320

/**
 * Loose Google review URL check. We accept anything that points at one
 * of Google's review surfaces. Doesn't guarantee the URL works - just
 * stops obvious mistakes (random https URLs, missing protocol, etc).
 */
const GOOGLE_REVIEW_HOSTS_RE =
  /^https:\/\/(g\.page|search\.google\.com|maps\.google\.com|maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl)/i

/**
 * GET  → returns the contractor's current review-request settings
 *        plus the default template they fall back to.
 * PATCH → updates fields. Validates timing enum + template length;
 *         silently coerces missing fields to safe defaults.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('review_requests_enabled, google_review_url, review_sms_template, review_send_timing')
    .eq('id', auth.businessId)
    .maybeSingle()

  if (error) {
    logger.warn('review settings fetch failed', { error: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  // Best-effort stats. Don't block settings load if the count query
  // throws (e.g. table doesn't exist yet on a fresh deploy).
  let stats = {
    queued: 0,
    sent_last_30d: 0,
    failed_last_30d: 0,
    opted_out_count: 0,
    last_sent_at: null as string | null,
  }
  try { stats = await getReviewStats(auth.businessId) }
  catch (e) { logger.warn('review stats failed', { error: e instanceof Error ? e.message : 'unknown' }) }

  return NextResponse.json({
    success: true,
    enabled: !!(data as any)?.review_requests_enabled,
    google_review_url: (data as any)?.google_review_url || '',
    review_sms_template: (data as any)?.review_sms_template || '',
    review_send_timing: (data as any)?.review_send_timing || '1h_after',
    default_template: DEFAULT_REVIEW_SMS_TEMPLATE,
    stats,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    enabled?: boolean
    google_review_url?: string
    review_sms_template?: string
    review_send_timing?: string
  }

  const update: Record<string, any> = {}

  if (typeof body.enabled === 'boolean') {
    update.review_requests_enabled = body.enabled
  }

  if (typeof body.google_review_url === 'string') {
    const trimmed = body.google_review_url.trim()
    if (trimmed) {
      if (!/^https:\/\//i.test(trimmed)) {
        return NextResponse.json({ error: 'review URL must start with https://' }, { status: 400 })
      }
      if (!GOOGLE_REVIEW_HOSTS_RE.test(trimmed)) {
        return NextResponse.json({
          error: "That doesn't look like a Google review link. Use the URL from Google Business Profile → Customers → Reviews → Get more reviews (it usually starts with https://g.page/r/ or https://search.google.com/local/writereview).",
        }, { status: 400 })
      }
    }
    update.google_review_url = trimmed || null
  }

  if (typeof body.review_sms_template === 'string') {
    const trimmed = body.review_sms_template.trim()
    if (trimmed.length > TEMPLATE_MAX) {
      return NextResponse.json({ error: `Template too long (max ${TEMPLATE_MAX} chars)` }, { status: 400 })
    }
    update.review_sms_template = trimmed || null
  }

  if (typeof body.review_send_timing === 'string') {
    if (!VALID_TIMINGS.has(body.review_send_timing)) {
      return NextResponse.json({ error: 'Invalid timing' }, { status: 400 })
    }
    update.review_send_timing = body.review_send_timing
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: true, no_changes: true })
  }

  const { error } = await supabaseAdmin
    .from('businesses')
    .update(update)
    .eq('id', auth.businessId)

  if (error) {
    logger.warn('review settings update failed', { error: error.message })
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  // Side effect: when toggling OFF, cancel any queued sends so the
  // contractor's "off" decision is immediate, not "off going forward
  // but the queue still drains for 24h."
  let canceledQueued = 0
  if (update.review_requests_enabled === false) {
    const r = await cancelQueuedForBusiness(auth.businessId)
    canceledQueued = r.canceled
  }

  // If an admin made this change while impersonating, log both ids.
  await logImpersonatedAction({
    auth,
    action: 'review_requests.update',
    path: '/api/dashboard/review-requests',
    metadata: { fields: Object.keys(update) },
  })

  return NextResponse.json({ success: true, canceled_queued: canceledQueued })
}
