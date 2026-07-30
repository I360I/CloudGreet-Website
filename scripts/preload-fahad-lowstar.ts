/**
 * Load SMALL, 2.5-4.0 STAR home-service shops for Fahad Mahmood and
 * assign them directly. The owner's target band: real businesses whose
 * mediocre rating usually traces to missed calls and no-shows - the
 * exact CloudGreet pitch - while staying above the true dumpster fires.
 * Sweeps SIX service verticals across West Coast metros (Fahad's book +
 * his PT calling window) using the micro-cell technique from the Jesse
 * preload (weak shops only rank in their own neighborhood's top-20).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/preload-fahad-lowstar.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces, getPlacesCallCount, PLACES_COST_PER_CALL } from '../lib/scrapers/google-places'

const FAHAD_ID = '7d98205d-b439-47a0-81e4-cda3991abb56'
const TARGET = 80
const MIN_RATING = 2.5
const MAX_RATING = 4.0
const MIN_REVIEWS = 3   // below this it's a ghost listing, not a business
const MAX_REVIEWS = 120 // above this it's a staffed shop, owner never answers

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// West Coast + PT-adjacent: matches Fahad's dial window and DIDs.
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
  { city: 'Phoenix',        state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Mesa',           state: 'AZ', lat: 33.4152, lng: -111.8315 },
  { city: 'Tucson',         state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Portland',       state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Seattle',        state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Tacoma',         state: 'WA', lat: 47.2529, lng: -122.4443 },
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
]

// Six verticals - the sub-2.5 band is too thin for one trade alone.
const QUERIES: { q: string; type: string }[] = [
  { q: 'hvac repair',            type: 'hvac' },
  { q: 'plumber',                type: 'plumbing' },
  { q: 'electrician',            type: 'electrical' },
  { q: 'garage door repair',     type: 'garage_door' },
  { q: 'appliance repair',       type: 'appliance_repair' },
  { q: 'roofing contractor',     type: 'roofing' },
]

// Same national-chain screen the other preloads use.
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
  const CALL_BUDGET = Number(process.env.PRELOAD_CALL_BUDGET || '240') // stay well under the shared 300/day cap

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
          source: 'preload:fahad-lowstar', status: 'new', score: 0,
        })
        got++
        if (kept.length >= TARGET) break outer
      }
    } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
    if (got > 0) console.log(`  ${query.padEnd(52)} +${got}  (total ${kept.length}, calls ${getPlacesCallCount()})`)
  }

  const dist: Record<string, number> = {}
  for (const k of kept) {
    const b = k.google_rating == null ? '?' : k.google_rating <= 3.0 ? '2.5-3.0' : k.google_rating <= 3.5 ? '3.1-3.5' : '3.6-4.0'
    dist[b] = (dist[b] || 0) + 1
  }
  const byType: Record<string, number> = {}
  for (const k of kept) byType[k.business_type] = (byType[k.business_type] || 0) + 1
  console.log(`\nScraped ${kept.length} small 2.5-4.0 star shops. Rating spread:`, dist, '| by vertical:', byType)
  console.log(`Places calls: ${getPlacesCallCount()} (~$${(getPlacesCallCount() * PLACES_COST_PER_CALL).toFixed(2)})`)

  console.log(`\nInserting + assigning to Fahad...`)
  const now = new Date().toISOString()
  let inserted = 0
  for (let i = 0; i < kept.length; i += 200) {
    const { data, error } = await supabase.from('leads').insert(kept.slice(i, i + 200)).select('id')
    if (error) { console.log('  insert err', error.message); continue }
    const rows = (data || []).map((r) => ({
      lead_id: r.id, rep_id: FAHAD_ID, status: 'new', claimed: false, assigned_at: now, touch_count: 0,
    }))
    for (let j = 0; j < rows.length; j += 200) {
      const { error: aerr } = await supabase.from('lead_assignments').insert(rows.slice(j, j + 200))
      if (aerr) console.log('  assign err', aerr.message)
    }
    inserted += rows.length
  }
  const byState: Record<string, number> = {}
  for (const k of kept) byState[k.state] = (byState[k.state] || 0) + 1
  console.log(`Inserted + assigned ${inserted} leads to Fahad. By state:`, byState)
}

main().catch((e) => { console.error(e); process.exit(1) })