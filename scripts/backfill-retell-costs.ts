/**
 * Backfill Retell voice cost into usage_costs for calls we already have.
 *
 * Going forward the voice webhook records call_cost.combined_cost live, but
 * the 95 historical calls predate that. This walks every call with a
 * retell_call_id + business_id, fetches its cost from Retell's API, and
 * upserts a usage_costs row. Idempotent: re-running skips rows already
 * present (unique on provider+kind+ref_id).
 *
 * Run: npx tsx --env-file=.env.local scripts/backfill-retell-costs.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RETELL_BASE = 'https://api.retellai.com'
const RETELL_API_KEY = process.env.RETELL_API_KEY!

async function main() {
  if (!RETELL_API_KEY) throw new Error('RETELL_API_KEY not set')
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: calls, error } = await db
    .from('calls')
    .select('id, business_id, retell_call_id, created_at')
    .not('retell_call_id', 'is', null)
    .not('business_id', 'is', null)
  if (error) throw error

  console.log(`Found ${calls?.length || 0} calls with a retell_call_id + business_id`)
  let recorded = 0
  let skippedNoCost = 0
  let failed = 0
  let totalCents = 0

  for (const call of calls || []) {
    const callId = (call as any).retell_call_id as string
    try {
      const res = await fetch(`${RETELL_BASE}/v2/get-call/${encodeURIComponent(callId)}`, {
        headers: { Authorization: `Bearer ${RETELL_API_KEY}` },
      })
      if (!res.ok) {
        console.warn(`  ${callId}: Retell ${res.status}`)
        failed++
        continue
      }
      const body = await res.json()
      const combined = body?.call_cost?.combined_cost
      if (typeof combined !== 'number' || combined <= 0) {
        skippedNoCost++
        continue
      }
      const amountCents = Math.round(combined)
      const durationSec =
        typeof body?.duration_ms === 'number' ? Math.round(body.duration_ms / 1000) : null
      const { error: upErr } = await db.from('usage_costs').upsert(
        {
          business_id: (call as any).business_id,
          provider: 'retell',
          kind: 'voice',
          amount_cents: amountCents,
          quantity: durationSec != null ? durationSec / 60 : null,
          unit: 'minute',
          ref_type: 'call',
          ref_id: callId,
          occurred_at: (call as any).created_at || new Date().toISOString(),
          metadata: { retell_call_id: callId, backfilled: true },
        },
        { onConflict: 'provider,kind,ref_id', ignoreDuplicates: true },
      )
      if (upErr) {
        console.warn(`  ${callId}: upsert failed - ${upErr.message}`)
        failed++
        continue
      }
      recorded++
      totalCents += amountCents
    } catch (e) {
      console.warn(`  ${callId}: ${e instanceof Error ? e.message : 'error'}`)
      failed++
    }
  }

  console.log('\nDone.')
  console.log(`  recorded:      ${recorded}`)
  console.log(`  no cost:       ${skippedNoCost}`)
  console.log(`  failed:        ${failed}`)
  console.log(`  total backfilled: $${(totalCents / 100).toFixed(2)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
