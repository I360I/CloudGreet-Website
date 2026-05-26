import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/send-checkout-sms
 *   body: { url: string, message?: string, phone?: string }
 *
 * Texts the Stripe checkout URL to the client's owner (or a phone
 * the admin overrides with). Falls back to business.phone_number if
 * no override and the owner has no phone on file. Uses the platform
 * notifications sender so the SMS comes from a CloudGreet number
 * the owner can reply to.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    url?: string
    message?: string
    phone?: string
  }
  const url = (body.url || '').trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'url is required (and must be http(s)://)' }, { status: 400 })
  }

  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  if (!fromNumber) {
    return NextResponse.json({ error: 'CLOUDGREET_NOTIFICATIONS_FROM not configured' }, { status: 500 })
  }

  // Resolve target phone: admin-provided override > owner.phone > business.phone_number.
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, phone_number, owner_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let to = (body.phone || '').trim()
  if (!to && (biz as any).owner_id) {
    const { data: owner } = await supabaseAdmin
      .from('custom_users')
      .select('phone')
      .eq('id', (biz as any).owner_id)
      .maybeSingle()
    if ((owner as any)?.phone) to = (owner as any).phone
  }
  if (!to && (biz as any).phone_number) to = (biz as any).phone_number
  if (!to) {
    return NextResponse.json({
      error: 'No phone on file for the owner or business. Pass phone in the request.',
    }, { status: 400 })
  }
  const digits = to.replace(/\D/g, '')
  if (digits.length === 10) to = `+1${digits}`
  else if (digits.length === 11 && digits.startsWith('1')) to = `+${digits}`
  else if (to.startsWith('+')) to = `+${digits}`
  else {
    return NextResponse.json({ error: `phone format not recognized: ${to}` }, { status: 400 })
  }

  const defaultMsg = `CloudGreet checkout for ${(biz as any).business_name || 'your business'}: ${url}`
  const message = (body.message || '').trim() || defaultMsg

  try {
    const resp = await telnyxClient.sendSMS(to, message, fromNumber)
    logger.info('Admin sent checkout SMS', {
      businessId: params.id, to, telnyxMessageId: resp?.data?.id || null,
    })
    return NextResponse.json({
      success: true,
      sent_to: to,
      telnyx_message_id: resp?.data?.id || null,
    })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown'
    logger.warn('send-checkout-sms failed', { businessId: params.id, error: detail })
    return NextResponse.json({ success: false, error: `Telnyx rejected: ${detail}` }, { status: 500 })
  }
}
