import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { registerWebhook, deleteWebhook, listWebhooks } from '@/lib/calcom'

/**
 * Register the Cal.com BOOKING_CREATED webhook for a business if it has
 * an API key on file but no webhook id. Idempotent + safe to call from
 * any GET that touches a business row - it's the "self-healing" version
 * of the manual /admin/clients/[id]/calcom-rewire button.
 *
 * Removes any stale webhook pointing at our subscriber URL before
 * registering the new one, so we don't accumulate duplicates if Cal.com
 * still has an entry from a prior key.
 *
 * Returns true if it registered (or attempted), false if there was
 * nothing to do.
 */
export async function ensureCalcomWebhookForBusiness(businessId: string): Promise<boolean> {
 const { data: business } = await supabaseAdmin
  .from('businesses')
  .select('id, cal_com_api_key, cal_com_webhook_id')
  .eq('id', businessId)
  .maybeSingle()

 if (!business?.cal_com_api_key) return false
 if (business.cal_com_webhook_id) return false

 const subscriberUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webhooks/cal/${business.id}`
 const webhookSecret = crypto.randomBytes(32).toString('hex')

 try {
  const allWebhooks = await listWebhooks(business.cal_com_api_key)
  for (const w of allWebhooks || []) {
   if (w.subscriberUrl === subscriberUrl) {
    try { await deleteWebhook(business.cal_com_api_key, w.id) } catch {}
   }
  }
 } catch (e) {
  logger.warn('ensureCalcomWebhookForBusiness: listWebhooks failed (continuing)', {
   businessId, error: e instanceof Error ? e.message : 'Unknown',
  })
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
  return true
 } catch (e) {
  logger.warn('ensureCalcomWebhookForBusiness: register failed', {
   businessId, error: e instanceof Error ? e.message : 'Unknown',
  })
  return false
 }
}
