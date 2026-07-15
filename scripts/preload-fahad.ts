/**
 * Preload a cold-call queue for the setter Fahad. He has NOT created his
 * account yet (invite mahmoodfahad264@gmail.com unconsumed - the 2664
 * variant bounced), so we DON'T assign directly: we tag leads
 * source='preload:mahmoodfahad264@gmail.com' and let the accept-invite
 * hook auto-assign them when he signs up.
 *
 * Region: West Coast + PNW + Chicago/Minneapolis + Albuquerque. Zero
 * overlap with Bridget (NE/SE) or Hazem (TX/AZ/CO/NV/OK). Run:
 *   npx tsx --env-file=.env.local scripts/preload-fahad.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces } from '../lib/scrapers/google-places'

const FAHAD_EMAIL = 'mahmoodfahad264@gmail.com'
const TARGET = 520

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const METROS = [
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'San Diego',   state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'San Jose',    state: 'CA', lat: 37.3382, lng: -121.8863 },
  { city: 'Sacramento',  state: 'CA', lat: 38.5816, lng: -121.4944 },
  { city: 'Fresno',      state: 'CA', lat: 36.7378, lng: -119.7871 },
  { city: 'Seattle',     state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Portland',    state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { city: 'Chicago',     state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650 },
]

// HVAC gets NO includedType (hvac_contractor is not a valid Places-New type);
// the text query carries it. The other three use their valid types.
const VERTICALS: { q: string; type: string; includedType?: string }[] = [
  { q: 'HVAC and air conditioning contractor', type: 'hvac' },
  { q: 'plumber',            type: 'plumbing',   includedType: 'plumber' },
  { q: 'electrician',        type: 'electrical', includedType: 'electrician' },
  { q: 'roofing contractor', type: 'roofing',    includedType: 'roofing_contractor' },
]

const CHAIN_RE = new RegExp(
  ['roto-rooter','mr\\.? rooter','mister sparky','one hour','benjamin franklin','aire serv',
   'ars','rescue rooter','service experts','horizon services','michael & son','home depot',
   "lowe'?s",'sears','goettl','parker & sons','george brazil','four seasons','super service',
   'radiant','dr\\.? energy','apollo home','legacy hvac','bill howe','service champions',
   'western rooter','fast water heater'].join('|'), 'i')

const digits = (p: string | null) => (p || '').replace(/\D/g, '').slice(-10)

async function main() {
  console.log('Loading existing lead phones for dedupe...')
  const existing = new Set<string>()
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from('leads').select('phone').range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) { const d = digits(r.phone); if (d.length === 10) existing.add(d) }
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`  ${existing.size} existing phones in system`)

  const kept: any[] = []
  const seen = new Set<string>()
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
          minReviewCount: 5, minRating: 3.5, excludeClosed: true, stateAllowList: [m.state],
        })) {
          const d = digits(p.phone)
          if (d.length !== 10 || existing.has(d) || seen.has(d)) continue
          const bn = (p.business_name || p.name || '').trim()
          if (!bn || CHAIN_RE.test(bn)) continue
          seen.add(d)
          kept.push({
            name: bn, business_name: bn, phone: p.phone, website: p.website || null,
            address: p.address || null, city: p.city || m.city, state: p.state || m.state,
            zip: p.zip || null, business_type: v.type, google_rating: p.rating ?? null,
            google_review_count: p.review_count ?? null, google_business_status: p.business_status || null,
            source: `preload:${FAHAD_EMAIL}`, status: 'new', score: 0,
          })
          got++
          if (kept.length >= TARGET) break
        }
      } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
      console.log(`  ${query.padEnd(46)} +${got}  (total ${kept.length})`)
    }
  }

  console.log(`\nInserting ${kept.length} preload leads for ${FAHAD_EMAIL} (auto-assign on signup)...`)
  let inserted = 0
  for (let i = 0; i < kept.length; i += 200) {
    const { data, error } = await supabase.from('leads').insert(kept.slice(i, i + 200)).select('id')
    if (error) throw error
    inserted += (data || []).length
  }
  const byType: Record<string, number> = {}, byState: Record<string, number> = {}
  for (const k of kept) { byType[k.business_type] = (byType[k.business_type]||0)+1; byState[k.state]=(byState[k.state]||0)+1 }
  console.log(`Inserted ${inserted} leads. By vertical:`, byType, '\nBy state:', byState)
  console.log('These auto-assign to Fahad the moment he consumes the mahmoodfahad264 invite.')
}

main().catch((e) => { console.error(e); process.exit(1) })
