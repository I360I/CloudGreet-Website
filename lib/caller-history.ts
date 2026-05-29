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
  /** Email we have on file from a prior call/text. Empty string if none. */
  customer_email: string
  /** "true" / "false" so the prompt can branch without parsing the email itself. */
  has_email_on_file: string
}

const EMPTY: CallerHistory = {
  returning_caller: 'false',
  caller_name: '',
  last_service: '',
  customer_email: '',
  has_email_on_file: 'false',
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

  // 1. Customers table is the authoritative source for email + stable
  //    name. Cheap O(1) lookup via the (business_id, phone_digits)
  //    unique index. Calls/extractions are the fallback.
  const { data: cust } = await supabaseAdmin
    .from('customers')
    .select('name, email')
    .eq('business_id', businessId)
    .eq('phone_digits', fromDigits)
    .maybeSingle()
  const custName = (cust as any)?.name ? String((cust as any).name).trim() : ''
  const custEmail = (cust as any)?.email ? String((cust as any).email).trim() : ''

  // 2. Pull recent calls for "last service" + a name fallback. 50-row
  //    cap is plenty: a business with >50 calls from the same number
  //    is almost certainly a known recurring customer anyway, and the
  //    most recent one we see wins.
  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('from_number, caller_name, call_extractions, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) {
    // Even if calls lookup fails, surface the customer row if we have one.
    if (custName || custEmail) {
      return {
        returning_caller: 'true',
        caller_name: custName,
        last_service: '',
        customer_email: custEmail,
        has_email_on_file: custEmail ? 'true' : 'false',
      }
    }
    return EMPTY
  }

  const match = data.find((row) => digits((row as any).from_number) === fromDigits)
  const extractions = (match as any)?.call_extractions || {}
  const callName =
    (match as any)?.caller_name ||
    extractions.customer_name ||
    extractions.name ||
    extractions.caller_name ||
    ''
  const service =
    extractions.service_requested ||
    extractions.service ||
    extractions.service_type ||
    ''

  const name = custName || (callName ? String(callName).trim() : '')
  const isReturning = !!(custName || custEmail || match)

  if (!isReturning) return EMPTY

  return {
    returning_caller: 'true',
    caller_name: name,
    last_service: String(service).trim(),
    customer_email: custEmail,
    has_email_on_file: custEmail ? 'true' : 'false',
  }
}
