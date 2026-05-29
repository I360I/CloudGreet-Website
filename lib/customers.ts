/**
 * Customers table helpers - the canonical home for per-(business, phone)
 * contact info that survives across calls and texts. Mirrors what the
 * agent collects so the next call/text from the same number can read
 * straight from here instead of re-asking.
 */

import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

function digits(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '')
}

// RFC-5322-lite. Good enough for "is this thing email-shaped". We don't
// send verification emails, so a more permissive check just means a
// typo lands in the DB; a stricter check rejects legit addresses. This
// keeps the false-reject rate low.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SaveCustomerEmailResult =
  | { ok: true; created: boolean; id: string }
  | { ok: false; error: string; detail?: string }

/**
 * Upsert a customer's email by (business_id, phone). Creates the row
 * if it didn't exist. Idempotent: calling twice with the same email is
 * a no-op on the second call.
 */
export async function saveCustomerEmail(args: {
  businessId: string
  phone: string
  email: string
  name?: string | null
}): Promise<SaveCustomerEmailResult> {
  const phoneDigits = digits(args.phone)
  if (phoneDigits.length < 7) return { ok: false, error: 'bad_phone' }

  const email = (args.email || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid_email', detail: 'Email must look like name@domain.tld.' }
  }
  if (email.length > 254) return { ok: false, error: 'email_too_long' }

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id, email, name')
    .eq('business_id', args.businessId)
    .eq('phone_digits', phoneDigits)
    .maybeSingle()

  if ((existing as any)?.id) {
    const id = (existing as any).id as string
    const patch: Record<string, unknown> = {
      email,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    // Only overwrite name when we got one and the row doesn't already have
    // a longer/cleaner value.
    if (args.name && (!((existing as any).name) || String((existing as any).name).trim().length < args.name.trim().length)) {
      patch.name = args.name.trim().slice(0, 200)
    }
    const { error } = await supabaseAdmin
      .from('customers')
      .update(patch)
      .eq('id', id)
    if (error) return { ok: false, error: 'update_failed', detail: error.message }
    return { ok: true, created: false, id }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('customers')
    .insert({
      business_id: args.businessId,
      phone_digits: phoneDigits,
      name: args.name ? args.name.trim().slice(0, 200) : null,
      email,
    })
    .select('id')
    .maybeSingle()
  if (error || !inserted) {
    logger.warn('customers insert failed', { error: error?.message })
    return { ok: false, error: 'insert_failed', detail: error?.message }
  }
  return { ok: true, created: true, id: (inserted as any).id }
}

/**
 * Touch a customer row from a booking. Doesn't require email; if the
 * row doesn't exist we create it with just name so future lookups
 * recognise the number even before they hand over an email.
 */
export async function touchCustomerFromBooking(args: {
  businessId: string
  phone: string
  name: string | null
}): Promise<void> {
  const phoneDigits = digits(args.phone)
  if (phoneDigits.length < 7) return
  const name = args.name ? args.name.trim().slice(0, 200) : null

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id, name')
    .eq('business_id', args.businessId)
    .eq('phone_digits', phoneDigits)
    .maybeSingle()

  if ((existing as any)?.id) {
    const patch: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (name && (!((existing as any).name) || String((existing as any).name).trim().length < name.length)) {
      patch.name = name
    }
    await supabaseAdmin
      .from('customers')
      .update(patch)
      .eq('id', (existing as any).id)
    return
  }

  await supabaseAdmin
    .from('customers')
    .insert({
      business_id: args.businessId,
      phone_digits: phoneDigits,
      name,
    })
    .then(undefined, () => null)
}
