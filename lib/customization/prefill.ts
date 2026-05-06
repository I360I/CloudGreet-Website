/**
 * Prefill the customization form from data we already have.
 *
 * Sources, in priority order:
 *   1) businesses row (business_name, address, phone, services, hours, etc.)
 *   2) the prospect's owner profile (custom_users -> name)
 *   3) the originating lead (if linked via close.business_id) for owner_name,
 *      services we scraped, etc. - filled in only if not present on the
 *      business row itself.
 *
 * This runs once on the server when the client first opens the form.
 * Anything they edit afterward overrides the prefill - we save edits to
 * businesses.customization rather than mutating the source rows.
 *
 * Returns a flat record of `{ fieldId: value }` matching the field IDs
 * declared in form-config.ts.
 */

export type Prefillable = {
  business: {
    id: string
    business_name?: string | null
    phone?: string | null
    phone_number?: string | null
    address?: string | null
    services?: string[] | null
    business_hours?: any
    cal_com_username?: string | null
    cal_com_event_type_slug?: string | null
    cal_com_api_key?: string | null
  } | null
  ownerName?: string | null
  /** From the rep's lead row, if we have it. */
  lead?: {
    contact_name?: string | null
    services?: string[] | null
    address?: string | null
    phone?: string | null
  } | null
}

export function buildPrefill(input: Prefillable): Record<string, any> {
  const out: Record<string, any> = {}
  const b = input.business
  if (!b) return out

  if (b.business_name) out.business_name = b.business_name
  out.owner_name = input.ownerName || input.lead?.contact_name || ''
  out.forward_phone = b.phone || b.phone_number || input.lead?.phone || ''
  out.address = b.address || input.lead?.address || ''

  // Hours: businesses.business_hours is a jsonb that varies by where it
  // was filled in. If it looks like our weekly grid, hand it through;
  // otherwise leave blank for the client to fill in.
  if (b.business_hours && typeof b.business_hours === 'object') {
    out.hours = b.business_hours
  }

  if (Array.isArray(b.services) && b.services.length > 0) {
    out.services_offered = b.services
  } else if (Array.isArray(input.lead?.services) && input.lead!.services!.length > 0) {
    out.services_offered = input.lead!.services
  }

  // Calendar integration - infer from cal_com_api_key presence.
  if (b.cal_com_api_key) out.calendar = 'Cal.com'

  return out
}

/**
 * Merge order: prefill (server) ← saved (server) ← edits (client).
 * Client edits always win. Saved answers from a prior partial save win
 * over prefill so the client doesn't see their answer revert.
 */
export function mergeAnswers(
  prefill: Record<string, any>,
  saved: Record<string, any>,
): Record<string, any> {
  return { ...prefill, ...saved }
}
