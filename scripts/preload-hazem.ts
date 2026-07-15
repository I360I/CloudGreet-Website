/**
 * One-off: preload + assign a cold-call queue for the setter Hazem.
 *
 * Hazem already consumed his invite (account e94d9beb-...), so the
 * accept-invite auto-assign already ran with no preload leads waiting.
 * This script therefore assigns DIRECTLY to his rep_id rather than
 * relying on the source='preload:<email>' hook. Central/West metros so
 * he never overlaps Bridget's East-Coast book. Run:
 *   npx tsx --env-file=.env.local scripts/preload-hazem.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces } from '../lib/scrapers/google-places'

const HAZEM_ID = 'e94d9beb-347f-4cdb-8077-591742e73689'
const HAZEM_EMAIL = 'hazemkarim2002@gmail.com'
const TARGET = 400 // stop once we've kept this many

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Central / Mountain / West metros — zero overlap with Bridget's NE/SE set.
// Texas-heavy on purpose: same Central timezone as the CloudGreet line, so
// Hazem's calling hours line up with the businesses.
const METROS: { city: string; state: string; lat: number; lng: number }[] = [
  { city: 'Dallas',        state: 'TX', lat: 32.7767,  lng: -96.7970 },
  { city: 'Fort Worth',    state: 'TX', lat: 32.7555,  lng: -97.3308 },
  { city: 'Houston',       state: 'TX', lat: 29.7604,  lng: -95.3698 },
  { city: 'San Antonio',   state: 'TX', lat: 29.4241,  lng: -98.4936 },
  { city: 'Austin',        state: 'TX', lat: 30.2672,  lng: -97.7431 },
  { city: 'Phoenix',       state: 'AZ', lat: 33.4484,  lng: -112.0740 },
  { city: 'Denver',        state: 'CO', lat: 39.7392,  lng: -104.9903 },
  { city: 'Las Vegas',     state: 'NV', lat: 36.1699,  lng: -115.1398 },
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676,  lng: -97.5164 },
  { city: 'Kansas City',   state: 'MO', lat: 39.0997,  lng: -94.5786 },
]

const VERTICALS: { q: string; type: string; includedType?: string }[] = [
  { q: 'HVAC contractor',        type: 'hvac',       includedType: 'hvac_contractor' },
  { q: 'plumber',                type: 'plumbing',   includedType: 'plumber' },
  { q: 'electrician',            type: 'electrical', includedType: 'electrician' },
  { q: 'roofing contractor',     type: 'roofing',    includedType: 'roofing_contractor' },
]

// Franchises / large multi-location ops — CloudGreet targets owner-operated
// shops that miss calls, not outfits with a receptionist already.
const CHAIN_RE = new RegExp(
  [
    'roto-rooter', 'mr\\.? rooter', 'mister sparky', 'one hour', 'benjamin franklin',
    'aire serv', 'ars', 'rescue rooter', 'service experts', 'horizon services',
    'michael & son', 'home depot', "lowe'?s", 'sears', 'wm\\.? winkler',
    'go green', 'apollo home', 'legacy hvac', 'goettl', 'parker & sons',
    'george brazil', 'four seasons', 'super service', 'radiant', 'dr\\.? energy',
  ].join('|'),
  'i',
)

function digits(p: string | null): string {
  return (p || '').replace(/\D/g, '').slice(-10)
}

async function main() {
  console.log('Loading existing lead phones for dedupe...')
  const existing = new Set<string>()
  {
    let from = 0
    const page = 1000
    for (;;) {
      const { data, error } = await supabase
        .from('leads')
        .select('phone')
        .range(from, from + page - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data) { const d = digits(r.phone); if (d.length === 10) existing.add(d) }
      if (data.length < page) break
      from += page
    }
  }
  console.log(`  ${existing.size} existing phones in system`)

  const kept: any[] = []
  const seenBatch = new Set<string>()

  outer:
  for (const m of METROS) {
    for (const v of VERTICALS) {
      if (kept.length >= TARGET) break outer
      const query = `${v.q} in ${m.city} ${m.state}`
      let got = 0
      try {
        for await (const p of discoverPlaces(query, {
          maxResults: 20,
          locationBias: { lat: m.lat, lng: m.lng, radiusMeters: 45_000 },
          includedType: v.includedType,
          minReviewCount: 5,
          minRating: 3.5,
          excludeClosed: true,
          stateAllowList: [m.state],
        })) {
          const phone = p.phone
          const d = digits(phone)
          if (d.length !== 10) continue
          if (existing.has(d) || seenBatch.has(d)) continue
          const bn = (p.business_name || p.name || '').trim()
          if (!bn) continue
          if (CHAIN_RE.test(bn)) continue
          seenBatch.add(d)
          kept.push({
            name: bn,
            business_name: bn,
            phone,
            website: p.website || null,
            address: p.address || null,
            city: p.city || m.city,
            state: p.state || m.state,
            zip: p.zip || null,
            business_type: v.type,
            google_rating: p.rating ?? null,
            google_review_count: p.review_count ?? null,
            google_business_status: p.business_status || null,
            source: `preload:${HAZEM_EMAIL}`,
            status: 'new',
            score: 0,
          })
          got++
          if (kept.length >= TARGET) break
        }
      } catch (e) {
        console.warn(`  ! ${query}: ${(e as Error).message}`)
      }
      console.log(`  ${query.padEnd(42)} +${got}  (total ${kept.length})`)
    }
  }

  console.log(`\nScraped ${kept.length} fresh, deduped leads. Inserting...`)
  const insertedIds: string[] = []
  for (let i = 0; i < kept.length; i += 200) {
    const chunk = kept.slice(i, i + 200)
    const { data, error } = await supabase.from('leads').insert(chunk).select('id')
    if (error) throw error
    for (const r of data || []) insertedIds.push(r.id)
  }
  console.log(`Inserted ${insertedIds.length} leads.`)

  const now = new Date().toISOString()
  const assigns = insertedIds.map((id) => ({
    lead_id: id, rep_id: HAZEM_ID, status: 'new', claimed: false, assigned_at: now, touch_count: 0,
  }))
  let assigned = 0
  for (let i = 0; i < assigns.length; i += 200) {
    const { error } = await supabase.from('lead_assignments').insert(assigns.slice(i, i + 200))
    if (error) throw error
    assigned += Math.min(200, assigns.length - i)
  }
  console.log(`Assigned ${assigned} leads to Hazem (${HAZEM_ID}).`)

  // breakdown
  const byMetro: Record<string, number> = {}
  const byType: Record<string, number> = {}
  for (const k of kept) {
    byMetro[k.state] = (byMetro[k.state] || 0) + 1
    byType[k.business_type] = (byType[k.business_type] || 0) + 1
  }
  console.log('\nBy state:', byMetro)
  console.log('By vertical:', byType)
  console.log('\nDone. Leads will appear in Hazem\'s queue on next /setter/overview load.')
}

main().catch((e) => { console.error(e); process.exit(1) })
