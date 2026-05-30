/**
 * Cost rates for the per-client cost-to-serve tracker.
 *
 * These convert measured usage (tokens, SMS segments, API calls) into a
 * cents cost TO US. Retell and Stripe report their actual cost in the
 * webhook, so they don't need a rate here - they're recorded exactly.
 * The rest are quantity x rate; tune via env without a deploy.
 *
 * All values are cents. "Per million tokens" rates are stored as cents so
 * the math stays integer-friendly.
 */

function envCents(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export const COST_RATES = {
  // Anthropic claude-sonnet-4-6 (the SMS agent model). Public list price
  // is ~$3 / 1M input tokens and ~$15 / 1M output tokens.
  anthropic: {
    inputCentsPerMTok: envCents('COST_ANTHROPIC_INPUT_CENTS_PER_MTOK', 300),
    outputCentsPerMTok: envCents('COST_ANTHROPIC_OUTPUT_CENTS_PER_MTOK', 1500),
  },
  // Telnyx SMS. Long-code / toll-free outbound + inbound land around
  // $0.004 per segment once carrier fees are folded in. One rate covers
  // both directions; we record segment count so it can be re-priced later.
  telnyx: {
    centsPerSmsSegment: envCents('COST_TELNYX_CENTS_PER_SMS_SEGMENT', 0.4),
  },
  // Google Routes/Geocoding (quote engine). Routes is ~$5 / 1000 calls.
  google: {
    centsPerRoutesCall: envCents('COST_GOOGLE_CENTS_PER_ROUTES_CALL', 0.5),
  },
  // Flat infra (Vercel + Supabase + Cal.com + Resend) that can't be
  // measured per client. Total monthly bill in cents, allocated evenly
  // across active clients at read time. Default 0 so we never fabricate a
  // number - set COST_INFRA_MONTHLY_CENTS to turn allocation on.
  infraMonthlyCents: envCents('COST_INFRA_MONTHLY_CENTS', 0),
} as const

/**
 * GSM-7 SMS segments for a body: 160 chars for a single segment, 153 per
 * segment once concatenated. Unicode (emoji etc.) would be 70/67, but the
 * agent's copy is plain ASCII, so GSM-7 is the right default here.
 */
export function smsSegments(body: string): number {
  const len = (body || '').length
  if (len === 0) return 0
  if (len <= 160) return 1
  return Math.ceil(len / 153)
}

export function anthropicCostCents(inputTokens: number, outputTokens: number): number {
  const inCents = (inputTokens / 1_000_000) * COST_RATES.anthropic.inputCentsPerMTok
  const outCents = (outputTokens / 1_000_000) * COST_RATES.anthropic.outputCentsPerMTok
  return Math.round(inCents + outCents)
}
