import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'

/**
 * Shared scrape-results → leads promotion. Used by:
 *   - lib/scrapers/runner.ts auto-promote at end of every rep scrape job
 *   - /api/sales/scrape/[id]/promote (manual rep button, fallback)
 *
 * Promotes any not-yet-promoted scrape_results into the public.leads
 * table, dedupes by phone, and (if a rep_id is supplied) auto-claims
 * each lead in lead_assignments so it shows up in the rep's portal.
 */
export type PromoteResult = {
  promoted: number       // brand-new leads inserted
  reused: number         // existing leads (phone match) reclaimed for this rep
  claimed: number        // total claims inserted (new + reused) for this rep
  failed: number         // rows that errored on insert
  first_error: string | null
}

export async function promoteScrapeResults(opts: {
  jobId: string
  repId?: string | null
  /** Limit which scrape_result ids to promote. If undefined, promote all unpromoted in the job. */
  resultIds?: string[]
}): Promise<PromoteResult> {
  let q = supabaseAdmin
    .from('scrape_results')
    .select('*')
    .eq('job_id', opts.jobId)
    .is('promoted_lead_id', null)
  if (opts.resultIds && opts.resultIds.length > 0) {
    q = q.in('id', opts.resultIds)
  }
  const { data: pending, error: rErr } = await q
  if (rErr) {
    logger.error('promoteScrapeResults: query failed', { error: rErr.message, jobId: opts.jobId })
    return { promoted: 0, reused: 0, claimed: 0, failed: 0, first_error: rErr.message }
  }
  if (!pending || pending.length === 0) {
    return { promoted: 0, reused: 0, claimed: 0, failed: 0, first_error: null }
  }

  // Phone dedupe pre-load
  const phones = pending.map((r) => normalizePhone(r.phone)).filter((p): p is string => !!p)
  const existingPhoneToLead = new Map<string, string>()
  if (phones.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, phone')
      .in('phone', phones)
    for (const e of existing || []) {
      const p = normalizePhone(e.phone)
      if (p) existingPhoneToLead.set(p, e.id)
    }
  }

  let promoted = 0
  let reused = 0
  let failed = 0
  let firstError: string | null = null
  const leadIdsForRep: string[] = []

  for (const r of pending) {
    const phone = normalizePhone(r.phone)
    // Hard gate: skip any scrape_result that lacks a phone. The runner
    // already drops these, but legacy rows from older scrapes are still
    // in scrape_results and would otherwise become phone-less leads.
    if (!phone) { failed++; continue }
    let leadId: string | null = null

    if (phone && existingPhoneToLead.has(phone)) {
      leadId = existingPhoneToLead.get(phone)!
      reused++
    } else {
      const raw = (r.raw || {}) as any
      const rating = numOrNull(raw.google_rating)
      const reviewCount = intOrNull(raw.google_review_count)
      const placeId = strOrNull(raw.google_place_id)
      const businessStatus = strOrNull(raw.google_business_status)
      const lastReviewAt = parseLastReviewTimestamp(raw)
      const quality = computeQualityScore(rating, reviewCount)

      const { data: lead, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert({
          name: r.business_name || 'Unknown',
          business_name: r.business_name || 'Unknown',
          contact_name: r.owner_name || null,
          phone: r.phone || null,
          email: r.email || null,
          website: r.website || null,
          address: r.address || null,
          city: r.city || null,
          state: r.state || null,
          zip: r.zip || null,
          business_type: r.business_type || null,
          google_rating: rating,
          google_review_count: reviewCount,
          google_place_id: placeId,
          google_business_status: businessStatus,
          google_last_activity_at: lastReviewAt,
          quality_score: quality,
          source: 'scrape',
          status: 'cold',
          notes: [
            r.license_no ? `License: ${r.license_no}` : null,
            `From scrape job ${opts.jobId}`,
          ].filter(Boolean).join('\n') || null,
        })
        .select('id')
        .single()
      if (insertErr || !lead) {
        if (!firstError) firstError = insertErr?.message || 'Unknown insert error'
        logger.warn('promoteScrapeResults: lead insert failed', { error: insertErr?.message })
        failed++
        continue
      }
      leadId = lead.id
      promoted++
      if (phone) existingPhoneToLead.set(phone, leadId)
    }

    await supabaseAdmin
      .from('scrape_results')
      .update({ promoted_lead_id: leadId })
      .eq('id', r.id)
    if (leadId) leadIdsForRep.push(leadId)
  }

  let claimed = 0
  if (opts.repId && leadIdsForRep.length > 0) {
    const claimRows = leadIdsForRep.map((id) => ({
      lead_id: id, rep_id: opts.repId!, claimed: true,
    }))
    const { error: claimErr } = await supabaseAdmin
      .from('lead_assignments')
      .upsert(claimRows, { onConflict: 'lead_id,rep_id', ignoreDuplicates: true })
    if (claimErr) {
      logger.warn('promoteScrapeResults: auto-claim failed (non-fatal)', { error: claimErr.message })
    } else {
      claimed = leadIdsForRep.length
    }
  }

  // Bump the job's promoted_count for visibility.
  if (promoted > 0) {
    const { data: jobRow } = await supabaseAdmin
      .from('scrape_jobs').select('promoted_count').eq('id', opts.jobId).single()
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        promoted_count: (jobRow?.promoted_count ?? 0) + promoted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.jobId)
  }

  return { promoted, reused, claimed, failed, first_error: firstError }
}

// Use the shared, more tolerant normalizer so leads.phone matches what
// the runner's seenPhones set will see on subsequent scrapes.
import { normalizePhone as sharedNormalizePhone } from './normalize'
function normalizePhone(p: string | null | undefined): string | null {
  return sharedNormalizePhone(p)
}

function numOrNull(v: any): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
function intOrNull(v: any): number | null {
  const n = numOrNull(v)
  return n === null ? null : Math.round(n)
}
function strOrNull(v: any): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Quality score: log(reviews + 1) * rating, with a small recency bonus
 * (we don't have per-review timestamps from Places yet, so this stays
 * review-volume + rating for now). Returns null when both inputs are
 * missing - lets the UI sort known-quality leads above unknowns.
 */
function computeQualityScore(rating: number | null, reviewCount: number | null): number | null {
  if (rating === null && reviewCount === null) return null
  const r = rating ?? 3.5
  const c = reviewCount ?? 0
  const score = Math.log(c + 1) * r
  return Math.round(score * 100) / 100
}

/**
 * Places (New) v1 doesn't return a single "last review" timestamp on the
 * places.searchText payload; reviews carry relativePublishTimeDescription
 * as a human string ("3 weeks ago"). We don't have that here yet, so
 * leave null until the scraper layer surfaces it.
 */
function parseLastReviewTimestamp(_raw: any): string | null {
  return null
}
