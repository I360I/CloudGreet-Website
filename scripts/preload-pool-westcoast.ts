/**
 * Fill the UNASSIGNED lead pool with ~300 West Coast home-service shops
 * so Fahad (and any future West Coast setter) never runs dry. Looser
 * net than the assigned preloads: 2.5-4.5 stars, up to 250 reviews.
 * Inserted worst-band-first so the pool page (created_at DESC) shows
 * the best leads at the top: in-band (2.5-4.0, <=120 reviews) land
 * last = surface first. No lead_assignments rows - this is the pool.
 *
 * Run AFTER any assigned preload (shares the Places daily cap + phone
 * dedupe is loaded at start):
 *   PLACES_DAILY_CAP=1200 PRELOAD_CALL_BUDGET=500 npx tsx --env-file=.env.local scripts/preload-pool-westcoast.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces, getPlacesCallCount, PLACES_COST_PER_CALL } from '../lib/scrapers/google-places'

const TARGET = 300
const MIN_RATING = 2.5
const MAX_RATING = 4.5
const MIN_REVIEWS = 3
const MAX_REVIEWS = 250

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const METROS = [
  { city: 'Los Angeles',    state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Long Beach',     state: 'CA', lat: 33.7701, lng: -118.1937 },
  { city: 'Anaheim',        state: 'CA', lat: 33.8366, lng: -117.9143 },
  { city: 'Riverside',      state: 'CA', lat: 33.9533, lng: -117.3962 },
  { city: 'San Bernardino', state: 'CA', lat: 34.1083, lng: -117.2898 },
  { city: 'San Diego',      state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Bakersfield',    state: 'CA', lat: 35.3733, lng: -119.0187 },
  { city: 'Fresno',         state: 'CA', lat: 36.7378, lng: -119.7871 },
  { city: 'Sacramento',     state: 'CA', lat: 38.5816, lng: -121.4944 },
  { city: 'Stockton',       state: 'CA', lat: 37.9577, lng: -121.2908 },
  { city: 'San Jose',       state: 'CA', lat: 37.3382, lng: -121.8863 },
  { city: 'Oakland',        state: 'CA', lat: 37.8044, lng: -122.2712 },
  { city: 'Las Vegas',      state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Reno',           state: 'NV', lat: 39.5296, lng: -119.8138 },
  { city: 'Phoenix',        state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Mesa',           state: 'AZ', lat: 33.4152, lng: -111.8315 },
  { city: 'Tucson',         state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Portland',       state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Salem',          state: 'OR', lat: 44.9429, lng: -123.0351 },
  { city: 'Seattle',        state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Tacoma',         state: 'WA', lat: 47.2529, lng: -122.4443 },
  { city: 'Spokane',        state: 'WA', lat: 47.6588, lng: -117.4260 },
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
  { city: 'Boise',          state: 'ID', lat: 43.6150, lng: -116.2023 },
]

const QUERIES: { q: string; type: string }[] = [
  { q: 'hvac repair',          type: 'hvac' },
  { q: 'plumber',              type: 'plumbing' },
  { q: 'electrician',          type: 'electrical' },
  { q: 'garage door repair',   type: 'garage_door' },
  { q: 'appliance repair',     type: 'appliance_repair' },
  { q: 'roofing contractor',   type: 'roofing' },
]

const CHAIN_RE = new RegExp(
  ['roto-rooter','mr\\.? rooter','mister sparky','one hour','benjamin franklin','aire serv',
   'ars','rescue rooter','service experts','horizon services','michael & son','home depot',
   "lowe'?s",'sears','goettl','parker & sons','george brazil','four seasons','super service',
   'radiant','dr\\.? energy','apollo home','legacy hvac','bill howe','service champions',
   'western rooter','fast water heater','sears home','a1 garage','precision door',
   'overhead door','neighborly','mr\\.? appliance','mr\\.? electric'].join('|'), 'i')

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

  const OFFSETS = [
    [0, 0], [0.32, 0], [-0.32, 0], [0, 0.38], [0, -0.38],
    [0.24, 0.28], [-0.24, 0.28], [0.24, -0.28], [-0.24, -0.28],
  ]
  const CALL_BUDGET = Number(process.env.PRELOAD_CALL_BUDGET || '500')

  type Cell = { m: (typeof METROS)[number]; lat: number; lng: number; q: (typeof QUERIES)[number] }
  const cells: Cell[] = []
  METROS.forEach((m, mi) => {
    OFFSETS.forEach(([dy, dx], oi) => {
      cells.push({ m, lat: m.lat + dy, lng: m.lng + dx, q: QUERIES[(mi + oi) % QUERIES.length] })
    })
  })
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  const kept: any[] = []
  const seen = new Set<string>()
  outer:
  for (const cell of cells) {
    if (kept.length >= TARGET) break
    if (getPlacesCallCount() >= CALL_BUDGET) {
      console.log(`  call budget (${CALL_BUDGET}) reached - stopping with ${kept.length}`)
      break
    }
    const query = `${cell.q.q} near ${cell.m.city} ${cell.m.state}`
    let got = 0
    try {
      for await (const p of discoverPlaces(query, {
        maxResults: 20,
        locationRestriction: { lat: cell.lat, lng: cell.lng, radiusMeters: 20_000 },
        minReviewCount: MIN_REVIEWS,
        maxReviewCount: MAX_REVIEWS,
        minRating: MIN_RATING,
        maxRating: MAX_RATING,
        excludeClosed: true,
        stateAllowList: [cell.m.state],
      })) {
        const d = digits(p.phone)
        if (d.length !== 10 || existing.has(d) || seen.has(d)) continue
        const bn = (p.business_name || p.name || '').trim()
        if (!bn || CHAIN_RE.test(bn)) continue
        seen.add(d)
        kept.push({
          name: bn, business_name: bn, phone: p.phone, website: p.website || null,
          address: p.address || null, city: p.city || cell.m.city, state: p.state || cell.m.state,
          zip: p.zip || null, business_type: cell.q.type, google_rating: p.rating ?? null,
          google_review_count: p.review_count ?? null, google_business_status: p.business_status || null,
          source: 'preload:pool-westcoast', status: 'new', score: 0,
        })
        got++
        if (kept.length >= TARGET) break outer
      }
    } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
    if (got > 0) console.log(`  ${query.padEnd(52)} +${got}  (total ${kept.length}, calls ${getPlacesCallCount()})`)
  }

  // Insert weakest band FIRST so the pool page (created_at DESC) shows
  // the premium band (2.5-4.0, <=120 reviews) at the top.
  const premium = (k: any) =>
    k.google_rating != null && k.google_rating <= 4.0 && (k.google_review_count ?? 999) <= 120
  const ordered = [...kept.filter((k) => !premium(k)), ...kept.filter(premium)]
  const nPrem = kept.filter(premium).length
  console.log(`\nScraped ${kept.length} pool leads (${nPrem} premium-band, inserted last = shown first).`)
  console.log(`Places calls: ${getPlacesCallCount()} (~$${(getPlacesCallCount() * PLACES_COST_PER_CALL).toFixed(2)})`)

  let inserted = 0
  for (let i = 0; i < ordered.length; i += 100) {
    const { error } = await supabase.from('leads').insert(ordered.slice(i, i + 100))
    if (error) { console.log('  insert err', error.message); continue }
    inserted += Math.min(100, ordered.length - i)
  }
  const byState: Record<string, number> = {}
  for (const k of kept) byState[k.state] = (byState[k.state] || 0) + 1
  console.log(`Inserted ${inserted} UNASSIGNED pool leads. By state:`, byState)
}

main().catch((e) => { console.error(e); process.exit(1) })