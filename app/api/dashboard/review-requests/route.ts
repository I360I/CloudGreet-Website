import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { DEFAULT_REVIEW_SMS_TEMPLATE } from '@/lib/review-requests'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_TIMINGS = new Set(['1h_after', 'evening_same_day', 'next_morning'])
const TEMPLATE_MAX = 320

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

  return NextResponse.json({
    success: true,
    enabled: !!(data as any)?.review_requests_enabled,
    google_review_url: (data as any)?.google_review_url || '',
    review_sms_template: (data as any)?.review_sms_template || '',
    review_send_timing: (data as any)?.review_send_timing || '1h_after',
    default_template: DEFAULT_REVIEW_SMS_TEMPLATE,
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
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json({ error: 'review URL must start with http(s)://' }, { status: 400 })
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

  return NextResponse.json({ success: true })
}
