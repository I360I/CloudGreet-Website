import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

/**
 * Keep the Prospects tab and the Leads workspace in sync.
 *
 * A rep can register a prospect two ways: by closing a claimed lead (in
 * which case a `leads` row already exists), or by submitting a close /
 * demo-client from scratch (no lead at all). The second path used to
 * leave the prospect invisible in the Leads workspace, so the rep had
 * nowhere to write notes on it. `ensureLeadForRep` closes that gap: it
 * finds or creates a lead assigned to the rep for every prospect.
 *
 * Idempotent - matches an existing assigned lead by phone (last 10
 * digits) or exact business name before creating one. Best-effort:
 * returns the lead id, or null on failure so callers never break the
 * close submission on a leads hiccup.
 */

function digits10(s?: string | null): string {
  const d = (s || '').replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : ''
}

// lead_assignments.status is constrained to the pipeline vocabulary
// (new/called/.../demo_scheduled/closed/dead/...). leads.status is free
// text, so a close can leave 'won'/'lost' there, but the assignment row
// has to be coerced to a legal workflow value or the insert 500s.
const ASSIGNMENT_STATUSES = new Set([
  'new', 'called', 'voicemail', 'interested', 'demo_scheduled', 'demo_showed',
  'proposal_sent', 'closed', 'dead', 'not_available', 'not_interested',
  'wrong_dm', 'do_not_call',
])
function toAssignmentStatus(s: string): string {
  if (ASSIGNMENT_STATUSES.has(s)) return s
  if (s === 'won') return 'closed'
  if (s === 'lost' || s === 'cancelled' || s === 'rejected') return 'dead'
  return 'new'
}

export interface EnsureLeadInput {
  repId: string
  businessName: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  businessType?: string | null
  notes?: string | null
  /** leads.source tag for created rows. Default 'close'. */
  source?: string
  /** lead_assignments.status + leads.status for created rows. Default 'new'. */
  status?: string
}

export async function ensureLeadForRep(input: EnsureLeadInput): Promise<string | null> {
  const repId = input.repId
  const name = (input.businessName || '').trim()
  if (!repId || !name) return null
  const ph10 = digits10(input.phone)

  try {
    // 1) Does the rep already have a matching lead? Match on phone
    //    (last 10 digits) or exact business name so we never duplicate
    //    a lead the rep closed from their own pipeline.
    const { data: assigns } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id')
      .eq('rep_id', repId)
      .limit(2000)
    const ids = (assigns || []).map((a: any) => a.lead_id).filter(Boolean) as string[]
    const CHUNK = 150
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data: rows } = await supabaseAdmin
        .from('leads')
        .select('id, phone, business_name')
        .in('id', ids.slice(i, i + CHUNK))
      for (const r of rows || []) {
        const rp = digits10((r as any).phone)
        const rn = String((r as any).business_name || '').trim().toLowerCase()
        if ((ph10 && rp === ph10) || (rn && rn === name.toLowerCase())) {
          return (r as any).id as string
        }
      }
    }

    // 2) No match - create the lead and assign it to the rep.
    const now = new Date().toISOString()
    const status = input.status || 'new'
    const { data: lead, error: lErr } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        business_name: name,
        contact_name: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        business_type: input.businessType || null,
        source: input.source || 'close',
        status,
        notes: input.notes || null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()
    if (lErr || !lead) {
      logger.warn('ensureLeadForRep: lead insert failed', { repId, name, error: lErr?.message })
      return null
    }

    const { error: aErr } = await supabaseAdmin.from('lead_assignments').insert({
      lead_id: (lead as any).id,
      rep_id: repId,
      assigned_at: now,
      claimed: false,
      status: toAssignmentStatus(status),
      touch_count: 0,
    })
    if (aErr) {
      logger.warn('ensureLeadForRep: assignment insert failed', { repId, name, error: aErr.message })
      return null
    }
    return (lead as any).id as string
  } catch (e) {
    logger.warn('ensureLeadForRep failed', {
      repId, name, error: e instanceof Error ? e.message : 'unknown',
    })
    return null
  }
}
