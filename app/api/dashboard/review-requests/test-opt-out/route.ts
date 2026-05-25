import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { markPhoneOptedOut } from '@/lib/review-requests'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/review-requests/test-opt-out
 *   body: { phone: string, clear?: boolean }
 *
 * Simulates a customer texting STOP. Calls the EXACT same code path
 * the Telnyx inbound webhook calls when a real STOP arrives:
 *   - Adds phone to review_opt_outs
 *   - Cancels any queued / scheduled_remote review_requests for that phone
 *   - Calls Telnyx cancel-message API for held messages
 *
 * Reports back what happened (opt-out row written, count of rows
 * canceled, any Telnyx cancellations) so the contractor can confirm
 * the chain works without needing to send a real STOP from a real
 * phone over real cell network.
 *
 * Pass clear:true to remove the phone from the opt-out list so you
 * can re-test or recover from an accidental test on a real phone.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = auth.businessId

  const body = await request.json().catch(() => ({})) as { phone?: string; clear?: boolean }
  const phoneRaw = (body?.phone || '').trim()
  if (!phoneRaw) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }
  const digits = phoneRaw.replace(/\D/g, '')
  let normalised: string
  if (phoneRaw.startsWith('+')) normalised = `+${digits}`
  else if (digits.length === 10) normalised = `+1${digits}`
  else if (digits.length === 11 && digits.startsWith('1')) normalised = `+${digits}`
  else {
    return NextResponse.json({
      error: 'phone format not recognized - use +1XXXXXXXXXX or a 10-digit US number',
    }, { status: 400 })
  }
  const phoneDigits = normalised.replace(/\D/g, '')

  if (body.clear === true) {
    const { error: rmErr } = await supabaseAdmin
      .from('review_opt_outs')
      .delete()
      .eq('phone', phoneDigits)
    if (rmErr) {
      return NextResponse.json({ success: false, error: rmErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, cleared: phoneDigits })
  }

  // Snapshot pending rows BEFORE the opt-out fires so we can show
  // the contractor exactly what got canceled.
  const { data: pendingBefore } = await supabaseAdmin
    .from('review_requests')
    .select('id, status, telnyx_message_id, scheduled_for, business_id')
    .eq('customer_phone', phoneDigits)
    .in('status', ['queued', 'scheduled_remote'])

  try {
    await markPhoneOptedOut(normalised, 'manual')
  } catch (e) {
    logger.error('test-opt-out: markPhoneOptedOut threw', {
      businessId, phone: phoneDigits, error: e instanceof Error ? e.message : 'unknown',
    })
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : 'opt-out write failed',
    }, { status: 500 })
  }

  // Read back so the response reflects actual DB state, not assumptions.
  const [{ data: optOutRow }, { data: pendingAfter }] = await Promise.all([
    supabaseAdmin
      .from('review_opt_outs')
      .select('phone, source, opted_out_at')
      .eq('phone', phoneDigits)
      .maybeSingle(),
    supabaseAdmin
      .from('review_requests')
      .select('id, status, telnyx_message_id')
      .eq('customer_phone', phoneDigits)
      .in('status', ['queued', 'scheduled_remote']),
  ])

  return NextResponse.json({
    success: true,
    opt_out_row: optOutRow,
    canceled_count: (pendingBefore || []).length,
    telnyx_messages_canceled: (pendingBefore || []).filter((r: any) => r.telnyx_message_id).map((r: any) => r.telnyx_message_id),
    still_pending_after_optout: (pendingAfter || []).length,
    phone_normalised: normalised,
  })
}
