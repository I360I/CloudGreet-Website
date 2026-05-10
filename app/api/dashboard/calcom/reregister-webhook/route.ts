import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { registerWebhook, deleteWebhook, listWebhooks } from '@/lib/calcom'
import { syncBusinessCalendar } from '@/lib/calcom-sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/dashboard/calcom/reregister-webhook
 *
 * Re-runs the Cal.com webhook registration for the calling business.
 * Useful when the original onboarding registration silently failed,
 * the contractor revoked it inside Cal.com, or the secret got out of
 * sync. Also kicks a one-shot reconciliation so the dashboard catches
 * up immediately rather than waiting for the next cron tick.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const businessId = auth.businessId

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('cal_com_api_key, cal_com_webhook_id')
    .eq('id', businessId)
    .single()

  if (!biz?.cal_com_api_key) {
    return NextResponse.json(
      { success: false, error: 'Cal.com is not connected for this business' },
      { status: 400 },
    )
  }

  const apiKey = biz.cal_com_api_key
  const subscriberUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/webhooks/cal/${businessId}`

  // Drop the recorded webhook id if we have one; also walk the
  // contractor's webhook list and remove any orphan pointed at our
  // subscriberUrl, so we don't end up with duplicates after retries.
  if (biz.cal_com_webhook_id) {
    await deleteWebhook(apiKey, biz.cal_com_webhook_id)
  }
  try {
    const all = await listWebhooks(apiKey)
    for (const w of all) {
      if (w?.subscriberUrl === subscriberUrl && w.id && w.id !== biz.cal_com_webhook_id) {
        await deleteWebhook(apiKey, w.id)
      }
    }
  } catch { /* best-effort cleanup */ }

  const newSecret = crypto.randomBytes(32).toString('hex')
  let webhookId: string | null = null
  try {
    const wh = await registerWebhook(apiKey, subscriberUrl, newSecret)
    webhookId = wh.id
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.error('Cal.com webhook re-register failed', { businessId, error: msg })
    return NextResponse.json(
      { success: false, error: `Webhook registration failed: ${msg}` },
      { status: 502 },
    )
  }

  await supabaseAdmin
    .from('businesses')
    .update({
      cal_com_webhook_id: webhookId,
      cal_com_webhook_secret: newSecret,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  // Run a one-shot sync now so the user sees their calendar fill in
  // without waiting for the cron. Failures here are non-fatal - the
  // cron will catch up.
  let syncResult: any = null
  try {
    syncResult = await syncBusinessCalendar({ businessId, apiKey })
  } catch (e) {
    logger.warn('post-reregister sync failed', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  return NextResponse.json({
    success: true,
    webhook_id: webhookId,
    sync: syncResult,
  })
}
