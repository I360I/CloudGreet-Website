import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

/**
 * Sync scraped fields from the originating lead row onto the linked
 * businesses row. Called immediately after a business is created from
 * a lead so the rep doesn't have to manually re-paste data that the
 * scraper already captured.
 *
 * Strategy: only copy fields the business doesn't already have. The
 * business is authoritative once a value is set there (admin/dashboard
 * edits go to businesses.*) - we never clobber.
 *
 * Currently syncs: website, address. Owner name lives only on leads
 * (businesses doesn't have an owner_name column) - downstream views
 * fall back to leads.contact_name when they need to display it.
 *
 * Safe to call when there's no lead, no business, or a partial match -
 * it just no-ops. Best-effort; failures are logged but don't throw.
 */
export async function syncBusinessFromLead(opts: {
  businessId?: string | null
  leadId?: string | null
  /**
   * If neither businessId nor leadId is known, we can try to find the
   * lead by phone or business_name (lead-promotion paths often have
   * these but not the IDs).
   */
  phone?: string | null
  businessName?: string | null
}): Promise<{ updated: boolean; fields: string[] }> {
  const result = { updated: false, fields: [] as string[] }

  try {
    // 1) Resolve a lead to copy from.
    let lead: any = null
    if (opts.leadId) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, business_id, website, address, contact_name')
        .eq('id', opts.leadId)
        .maybeSingle()
      lead = data
    } else if (opts.businessId) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, business_id, website, address, contact_name')
        .eq('business_id', opts.businessId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lead = data
    } else if (opts.phone) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, business_id, website, address, contact_name')
        .eq('phone', opts.phone)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lead = data
    } else if (opts.businessName) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, business_id, website, address, contact_name')
        .ilike('business_name', opts.businessName)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lead = data
    }
    if (!lead) return result

    // 2) Resolve the business to copy onto.
    const businessId = opts.businessId || lead.business_id
    if (!businessId) return result

    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id, website, address')
      .eq('id', businessId)
      .maybeSingle()
    if (!biz) return result

    // 3) Build the diff - only copy where the business is missing the value.
    const update: Record<string, any> = {}
    if (lead.website && !biz.website) update.website = lead.website
    if (lead.address && !biz.address) update.address = lead.address

    if (Object.keys(update).length === 0) return result

    update.updated_at = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('businesses')
      .update(update)
      .eq('id', businessId)

    if (error) {
      logger.warn('syncBusinessFromLead: update failed', {
        businessId, error: error.message,
      })
      return result
    }

    // Also stamp business_id on the lead if it wasn't linked yet, so
    // future lookups work from either side.
    if (!lead.business_id) {
      await supabaseAdmin
        .from('leads')
        .update({ business_id: businessId })
        .eq('id', lead.id)
    }

    result.updated = true
    result.fields = Object.keys(update).filter((k) => k !== 'updated_at')
    logger.info('syncBusinessFromLead: synced', {
      businessId, leadId: lead.id, fields: result.fields.join(','),
    })
    return result
  } catch (e) {
    logger.warn('syncBusinessFromLead: threw', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return result
  }
}
