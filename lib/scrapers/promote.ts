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
    let leadId: string | null = null

    if (phone && existingPhoneToLead.has(phone)) {
      leadId = existingPhoneToLead.get(phone)!
      reused++
    } else {
      const { data: lead, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert({
          name: r.business_name || 'Unknown',
          business_name: r.business_name || 'Unknown',
          contact_name: r.owner_name || null,
          phone: r.phone || null,
          email: r.email || null,
          source: 'scrape',
          status: 'cold',
          notes: [
            r.business_type ? `Trade: ${r.business_type}` : null,
            r.license_no ? `License: ${r.license_no}` : null,
            r.address || r.city ? `Address: ${[r.address, r.city, r.state, r.zip].filter(Boolean).join(', ')}` : null,
            r.website ? `Web: ${r.website}` : null,
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

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = p.replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return p.trim()
}
