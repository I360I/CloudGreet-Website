import { supabaseAdmin } from '@/lib/supabase'

/**
 * Looks up whether the inbound caller has called this business before
 * and pulls the most recent extracted name + service so the agent can
 * greet them by name.
 *
 * Returns flat strings (not objects) because Retell's dynamic_variables
 * substitution expects scalar values - {{caller_name}} renders the
 * string directly into the prompt at call start.
 *
 * Address is intentionally NOT returned - addresses change (people move,
 * job sites differ) and a confidently-wrong address makes the agent
 * sound clueless. Re-asking is cheaper than guessing.
 */

export type CallerHistory = {
  /** "true" / "false" as strings - Retell dynamic_variables substitute as text */
  returning_caller: string
  caller_name: string
  last_service: string
}

const EMPTY: CallerHistory = {
  returning_caller: 'false',
  caller_name: '',
  last_service: '',
}

/**
 * Normalize phone numbers to digits-only so "+15125551234",
 * "(512) 555-1234", and "5125551234" all match. We don't enforce E.164
 * length since some legacy rows may have shorter strings.
 */
function digits(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '')
}

export async function lookupCallerHistory(
  businessId: string,
  fromNumber: string,
): Promise<CallerHistory> {
  if (!businessId || !fromNumber) return EMPTY
  const fromDigits = digits(fromNumber)
  if (fromDigits.length < 7) return EMPTY

  // Pull recent calls for this business; we filter by digits-only match
  // in JS rather than SQL because storage format isn't guaranteed.
  // 50-row cap is plenty: a business with >50 calls from the same
  // number is almost certainly a known recurring customer anyway, and
  // the most recent one we see wins.
  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('from_number, caller_name, call_extractions, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return EMPTY

  const match = data.find((row) => digits((row as any).from_number) === fromDigits)
  if (!match) return EMPTY

  // Prefer the dedicated caller_name column (set when book_appointment
  // fires), fall back to whatever the post-call extraction captured.
  const extractions = (match as any).call_extractions || {}
  const name =
    (match as any).caller_name ||
    extractions.customer_name ||
    extractions.name ||
    extractions.caller_name ||
    ''
  const service =
    extractions.service_requested ||
    extractions.service ||
    extractions.service_type ||
    ''

  if (!name && !service) return EMPTY

  return {
    returning_caller: 'true',
    caller_name: String(name).trim(),
    last_service: String(service).trim(),
  }
}
