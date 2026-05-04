import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { registerWebhook, deleteWebhook, listWebhooks } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/calcom-rewire
 *
 * Re-registers the Cal.com webhook for a business that already has
 * its API key + event type set but lost (or never got) a webhook —
 * usually because the original registration silently failed during
 * onboarding. Without a webhook, Cal.com bookings never appear on
 * the CloudGreet dashboard even though they hit the contractor's
 * calendar via Cal.com's own integration.
 *
 * Idempotent: if a webhook id already exists, we delete it first
 * so we don't accumulate duplicates.
 */
export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const { data: business } = await supabaseAdmin
  .from('businesses')
  .select('id, cal_com_api_key, cal_com_webhook_id')
  .eq('id', params.id)
  .maybeSingle()

 if (!business?.cal_com_api_key) {
  return NextResponse.json(
   { error: 'No Cal.com API key on file. The client needs to complete the Cal.com step in onboarding first.' },
   { status: 400 },
  )
 }

 const subscriberUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webhooks/cal/${business.id}`
 const webhookSecret = crypto.randomBytes(32).toString('hex')

 // Drop any stale webhook before registering a new one. We can't trust
 // cal_com_webhook_id alone — Cal.com's "subscriber url already exists"
 // error means there's a previous registration whose id we don't have.
 // List + match by URL to find it.
 const knownIds = new Set<string>()
 if (business.cal_com_webhook_id) knownIds.add(business.cal_com_webhook_id)
 try {
  const allWebhooks = await listWebhooks(business.cal_com_api_key)
  for (const w of allWebhooks) {
   if (w.subscriberUrl === subscriberUrl) knownIds.add(w.id)
  }
 } catch (e) {
  logger.warn('Cal.com listWebhooks failed (continuing)', {
   clientId: params.id, error: e instanceof Error ? e.message : 'Unknown',
  })
 }
 for (const id of Array.from(knownIds)) {
  try { await deleteWebhook(business.cal_com_api_key, id) }
  catch (e) {
   logger.warn('Stale Cal.com webhook delete failed (continuing)', {
    clientId: params.id, webhookId: id, error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }

 try {
  const wh = await registerWebhook(business.cal_com_api_key, subscriberUrl, webhookSecret)
  await supabaseAdmin
   .from('businesses')
   .update({
    cal_com_webhook_id: wh.id,
    cal_com_webhook_secret: webhookSecret,
    updated_at: new Date().toISOString(),
   })
   .eq('id', business.id)
  return NextResponse.json({
   success: true,
   webhookId: wh.id,
   subscriberUrl,
   message: 'Cal.com will now POST every BOOKING_CREATED to CloudGreet.',
  })
 } catch (e) {
  const detail = e instanceof Error ? e.message : 'Unknown'
  logger.error('Cal.com webhook re-registration failed', { clientId: params.id, error: detail })
  return NextResponse.json(
   { error: `Cal.com rejected the webhook registration: ${detail}` },
   { status: 502 },
  )
 }
}
