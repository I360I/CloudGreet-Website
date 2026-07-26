/**
 * One-off: measure Apollo owner-contact coverage on a real sample of
 * Hazem's leads. Search-level only (no reveal, no export credits) - we
 * only measure whether Apollo HAS the owner's name / email / phone.
 * Run: APOLLO_API_KEY=xxx npx tsx --env-file=.env.local scripts/apollo-coverage-test.ts
 */
import { createClient } from '@supabase/supabase-js'
import { findOwner, domainFromWebsite, apolloEnabled } from '../lib/apollo'

const HAZEM_ID = 'e94d9beb-347f-4cdb-8077-591742e73689'
const SAMPLE = 40

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  if (!apolloEnabled()) { console.error('APOLLO_API_KEY not set'); process.exit(1) }

  // Hazem's leads that have a website (Apollo matches on domain).
  const { data: assigns, error } = await supabase
    .from('lead_assignments').select('lead_id').eq('rep_id', HAZEM_ID).limit(2000)
  if (error) throw error
  // Sample the first ~120 assignment ids (a big .in() on 550 UUIDs
  // overflows the query string and returns nothing).
  const ids = (assigns || []).map((a) => a.lead_id).slice(0, 120)
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('business_name, website, phone, city, state')
    .in('id', ids)
    .not('website', 'is', null)
    .neq('website', '')
    .limit(SAMPLE)
  if (lErr) throw lErr

  const rows = (leads || []).filter((l) => domainFromWebsite(l.website))
  console.log(`Testing ${rows.length} leads (of Hazem's, with a website)\n`)

  let found = 0, withEmail = 0, withPhone = 0, withBoth = 0
  const withWebsiteTotal = rows.length

  for (const l of rows) {
    const domain = domainFromWebsite(l.website)!
    let owner = null
    try { owner = await findOwner(domain) } catch (e) { /* count as miss */ }
    if (owner) {
      found++
      if (owner.has_email) withEmail++
      if (owner.has_phone) withPhone++
      if (owner.has_email && owner.has_phone) withBoth++
    }
    const tag = owner
      ? `${owner.name} (${owner.title || '?'})  email:${owner.has_email ? 'Y' : '-'} phone:${owner.has_phone ? 'Y' : '-'}`
      : 'no owner found'
    console.log(`  ${(l.business_name || '').slice(0, 34).padEnd(35)} ${domain.padEnd(28)} ${tag}`)
    await sleep(250) // be gentle on rate limits
  }

  const pct = (n: number) => `${Math.round((n / Math.max(1, withWebsiteTotal)) * 100)}%`
  console.log('\n================ COVERAGE (of leads WITH a website) ================')
  console.log(`  sample size           ${withWebsiteTotal}`)
  console.log(`  owner NAME found      ${found}  (${pct(found)})`)
  console.log(`  owner has EMAIL       ${withEmail}  (${pct(withEmail)})`)
  console.log(`  owner has PHONE       ${withPhone}  (${pct(withPhone)})   <-- the number that matters`)
  console.log(`  owner has BOTH        ${withBoth}  (${pct(withBoth)})`)
  console.log('====================================================================')
  console.log('Note: "has phone" = Apollo has a number behind the paywall; revealing it costs 1 export credit each.')
}

main().catch((e) => { console.error(e); process.exit(1) })
