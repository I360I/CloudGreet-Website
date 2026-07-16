import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processHarvestTargets, feedCampaigns } from '@/lib/cold-outreach/harvest'
import { sendCampaignBatch } from '@/lib/email-campaigns'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Cold-email pipeline heartbeat (see lib/cold-outreach/harvest.ts for
 * the loop). Each run:
 *   1. processes a bounded batch of harvest targets (Places searches)
 *   2. attaches newly enriched harvest leads to auto-feed campaigns
 *   3. fires the daily send batch for auto-feed campaigns that are
 *      status='sending' (the per-campaign escalating cap inside
 *      sendCampaignBatch does the pacing; a second run the same day
 *      is a no-op once capped out)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // DISABLED 2026-07-15 to stop Places API spend. This ran Places searches
  // twice every weekday on autopilot. Re-enable by removing this block (and
  // set a Places daily quota cap first). Leaving the cron entry in vercel.json
  // is harmless while this early-returns.
  if (process.env.ENABLE_LEAD_HARVEST !== 'true') {
    return NextResponse.json({ disabled: true, reason: 'lead harvest paused to control API spend' })
  }

  const harvest = await processHarvestTargets(6)
  const feed = await feedCampaigns()

  // Auto-send for opted-in campaigns.
  const sends: { campaign_id: string; sent: number; cappedOut: boolean }[] = []
  const { data: sendable } = await supabaseAdmin
    .from('email_campaigns')
    .select('id')
    .not('auto_feed_category', 'is', null)
    .eq('status', 'sending')
  for (const c of (sendable || []) as any[]) {
    try {
      const r = await sendCampaignBatch(c.id, 50)
      sends.push({ campaign_id: c.id, sent: r.sent, cappedOut: r.cappedOut })
    } catch (e) {
      logger.warn('harvest cron: campaign send failed', {
        campaignId: c.id, error: e instanceof Error ? e.message : 'unknown',
      })
    }
  }

  logger.info('harvest cron run', {
    targets: harvest.targets_processed, found: harvest.places_found,
    created: harvest.leads_created, fed: feed.leads_attached,
    sent: sends.reduce((s, x) => s + x.sent, 0),
  })
  return NextResponse.json({ success: true, harvest, feed, sends })
}
