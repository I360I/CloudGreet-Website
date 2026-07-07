import { supabaseAdmin } from '@/lib/supabase'
import { discoverPlaces } from '@/lib/scrapers/google-places'
import { normalizePhone } from '@/lib/scrapers/normalize'
import { logger } from '@/lib/monitoring'

/*
 * Cold-email harvest pipeline. The full loop:
 *
 *   harvest_targets (category x city queue, seeded by admin)
 *     -> processHarvestTargets(): Google Places search per target,
 *        new businesses inserted into `leads` (email NULL)
 *     -> existing /api/cron/enrich-lead-emails crawls their websites
 *        and fills leads.email
 *     -> feedCampaigns(): enriched harvest leads are attached to the
 *        email campaign whose auto_feed_category matches
 *     -> existing sendCampaignBatch sends within the escalating daily
 *        cap (10/day +10/wk, ceiling 200), personalizing each email
 *
 * Cost guardrails: each target is ONE Places text search (1-3 paged
 * requests, ~$0.03-0.10); the cron caps targets per run, so daily
 * Places spend is bounded and predictable.
 */

export type HarvestRunResult = {
  targets_processed: number
  places_found: number
  leads_created: number
  errors: number
}

/** Process up to `limit` pending harvest targets. */
export async function processHarvestTargets(limit = 6): Promise<HarvestRunResult> {
  const result: HarvestRunResult = { targets_processed: 0, places_found: 0, leads_created: 0, errors: 0 }

  const { data: targets } = await supabaseAdmin
    .from('harvest_targets')
    .select('id, category, city, state, lat, lng')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  for (const t of (targets || []) as any[]) {
    let found = 0
    let created = 0
    try {
      const query = `${t.category} in ${t.city}, ${t.state}`
      for await (const place of discoverPlaces(query, {
        maxResults: 40,
        locationRestriction: { lat: t.lat, lng: t.lng, radiusMeters: 40_000 },
        stateAllowList: [t.state],
        minReviewCount: 1, // ghost-listing filter
      })) {
        found += 1
        const phone = normalizePhone(place.phone)
        if (!phone) continue // no phone = can't dedupe or ever call; skip

        // leads.phone is globally unique - ignoreDuplicates makes this
        // an insert-if-new against every lead we've ever touched.
        const { data: inserted, error } = await supabaseAdmin
          .from('leads')
          .upsert({
            business_name: place.business_name,
            name: place.business_name,
            phone,
            website: place.website,
            address: place.address,
            city: place.city || t.city,
            state: place.state || t.state,
            zip: place.zip,
            business_type: t.category,
            google_place_id: place.place_id,
            google_rating: place.rating,
            google_review_count: place.review_count,
            google_business_status: place.business_status,
            source: 'harvest',
            status: 'cold',
            // email left NULL so the enrich-lead-emails cron picks it up
          }, { onConflict: 'phone', ignoreDuplicates: true })
          .select('id')
        if (!error && inserted && inserted.length > 0) created += 1
      }

      await supabaseAdmin
        .from('harvest_targets')
        .update({ status: 'done', found_count: found, new_count: created, processed_at: new Date().toISOString() })
        .eq('id', t.id)
      result.targets_processed += 1
      result.places_found += found
      result.leads_created += created
    } catch (e) {
      result.errors += 1
      await supabaseAdmin
        .from('harvest_targets')
        .update({ status: 'error', error: e instanceof Error ? e.message.slice(0, 300) : 'unknown', processed_at: new Date().toISOString() })
        .eq('id', t.id)
      logger.warn('harvest target failed', { target: `${t.category}/${t.city}`, error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  return result
}

export type FeedResult = { campaigns: number; leads_attached: number }

/**
 * Attach newly enriched harvest leads to their matching auto-feed
 * campaign. Suppression: an email that exists in ANY campaign already
 * (including unsubscribed/bounced there) is never re-added.
 */
export async function feedCampaigns(perCampaignLimit = 200): Promise<FeedResult> {
  const result: FeedResult = { campaigns: 0, leads_attached: 0 }

  const { data: campaigns } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, auto_feed_category, status')
    .not('auto_feed_category', 'is', null)
    .in('status', ['draft', 'sending'])

  for (const c of (campaigns || []) as any[]) {
    const { data: candidates } = await supabaseAdmin
      .from('leads')
      .select('id, business_name, contact_name, email, phone, city')
      .eq('source', 'harvest')
      .eq('business_type', c.auto_feed_category)
      .not('email', 'is', null)
      .neq('email', '')
      .order('created_at', { ascending: true })
      .limit(perCampaignLimit)

    let attached = 0
    for (const lead of (candidates || []) as any[]) {
      const email = String(lead.email).trim().toLowerCase()
      if (!email || !email.includes('@')) continue

      // Global suppression / cross-campaign dedupe.
      const { count } = await supabaseAdmin
        .from('email_leads')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
      if ((count || 0) > 0) continue

      const { error } = await supabaseAdmin
        .from('email_leads')
        .insert({
          campaign_id: c.id,
          email,
          owner_name: lead.contact_name || null,
          business_name: lead.business_name || null,
          city: lead.city || null,
          phone: lead.phone || null,
          source: 'scraper',
          status: 'queued',
        })
      if (!error) attached += 1
    }

    if (attached > 0) {
      result.campaigns += 1
      result.leads_attached += attached
      logger.info('harvest: fed campaign', { campaignId: c.id, category: c.auto_feed_category, attached })
    }
  }

  return result
}
