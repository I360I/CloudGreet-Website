/**
 * Load ~100 SMALL, LOW-RATED HVAC shops for Jesse Huerta (sales rep) and
 * assign them directly. Targeting 2.0-3.5 stars on purpose: shops with
 * mediocre ratings are usually missing calls, which is exactly the
 * CloudGreet pitch. "Small" = capped review count (big counts mean
 * staffed front desks) + national-chain denylist.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/preload-jesse-hvac.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces, getPlacesCallCount, PLACES_COST_PER_CALL } from '../lib/scrapers/google-places'

const JESSE_ID = '481fdcfa-4b84-40fa-b786-82c34bb75bfa' // jhuertaj1@gmail.com
const TARGET = 105
const MIN_RATING = 2.0
const MAX_RATING = 3.5
const MIN_REVIEWS = 3   // below this it's a ghost listing, not a business
const MAX_REVIEWS = 80  // above this it's a staffed shop, owner never answers

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mid-size metros spread wide - low-rated small shops are thin on the
// ground per market, so cast a broad net across regions.
const METROS = [
  { city: 'San Antonio',    state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'Fort Worth',     state: 'TX', lat: 32.7555, lng: -97.3308 },
  { city: 'Oklahoma City',  state: 'OK', lat: 35.4676, lng: -97.5164 },
  { city: 'Tulsa',          state: 'OK', lat: 36.1540, lng: -95.9928 },
  { city: 'Kansas City',    state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'St. Louis',      state: 'MO', lat: 38.6270, lng: -90.1994 },
  { city: 'Memphis',        state: 'TN', lat: 35.1495, lng: -90.0490 },
  { city: 'Louisville',     state: 'KY', lat: 38.2527, lng: -85.7585 },
  { city: 'Indianapolis',   state: 'IN', lat: 39.7684, lng: -86.1581 },
  { city: 'Columbus',       state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Jacksonville',   state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'Orlando',        state: 'FL', lat: 28.5384, lng: -81.3789 },
  { city: 'Birmingham',     state: 'AL', lat: 33.5186, lng: -86.8104 },
  { city: 'Charlotte',      state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'Richmond',       state: 'VA', lat: 37.5407, lng: -77.4360 },
  { city: 'Pittsburgh',     state: 'PA', lat: 40.4406, lng: -79.9959 },
  { city: 'Cleveland',      state: 'OH', lat: 41.4993, lng: -81.6944 },
  { city: 'Milwaukee',      state: 'WI', lat: 43.0389, lng: -87.9065 },
  { city: 'Albuquerque',    state: 'NM', lat: 35.0844, lng: -106.6504 },
  { city: 'Tucson',         state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Las Vegas',      state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Boise',          state: 'ID', lat: 43.6150, lng: -116.2023 },
]

// Same national-chain screen the other preloads use.
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

  // Low-rated small shops never crack a big metro's prominence-ranked
  // top results (88 calls proved it: 4 keepers). Instead: hyper-local
  // micro-cells offset around each metro, strict location restriction,
  // first page only, rotating query verbs. Weak shops DO rank in their
  // own neighborhood's top-20.
  const OFFSETS = [
    [0, 0], [0.32, 0], [-0.32, 0], [0, 0.38], [0, -0.38],
    [0.24, 0.28], [-0.24, 0.28], [0.24, -0.28], [-0.24, -0.28],
  ]
  const QUERIES = ['hvac repair', 'air conditioning repair', 'furnace repair', 'heating and cooling company']
  const CALL_BUDGET = 450 // ~$16 of Places spend, hard stop

  type Cell = { m: (typeof METROS)[number]; lat: number; lng: number; q: string }
  const cells: Cell[] = []
  METROS.forEach((m, mi) => {
    OFFSETS.forEach(([dy, dx], oi) => {
      cells.push({ m, lat: m.lat + dy, lng: m.lng + dx, q: QUERIES[(mi + oi) % QUERIES.length] })
    })
  })
  // Shuffle so no one metro eats the whole call budget.
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
    const query = `${cell.q} near ${cell.m.city} ${cell.m.state}`
    let got = 0
    try {
      for await (const p of discoverPlaces(query, {
        maxResults: 20, // first page only - breadth beats depth here
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
          zip: p.zip || null, business_type: 'hvac', google_rating: p.rating ?? null,
          google_review_count: p.review_count ?? null, google_business_status: p.business_status || null,
          source: 'preload:jesse-small-hvac', status: 'new', score: 0,
        })
        got++
        if (kept.length >= TARGET) break outer
      }
    } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
    if (got > 0) console.log(`  ${query.padEnd(52)} +${got}  (total ${kept.length}, calls ${getPlacesCallCount()})`)
  }

  const dist: Record<string, number> = {}
  for (const k of kept) {
    const b = k.google_rating == null ? '?' : k.google_rating <= 2.5 ? '2.0-2.5' : k.google_rating <= 3.0 ? '2.6-3.0' : '3.1-3.5'
    dist[b] = (dist[b] || 0) + 1
  }
  console.log(`\nScraped ${kept.length} small low-rated HVAC shops. Rating spread:`, dist)
  console.log(`Places calls: ${getPlacesCallCount()} (~$${(getPlacesCallCount() * PLACES_COST_PER_CALL).toFixed(2)})`)

  console.log(`\nInserting + assigning to Jesse...`)
  const now = new Date().toISOString()
  let inserted = 0
  for (let i = 0; i < kept.length; i += 200) {
    const { data, error } = await supabase.from('leads').insert(kept.slice(i, i + 200)).select('id')
    if (error) { console.log('  insert err', error.message); continue }
    const rows = (data || []).map((r) => ({
      lead_id: r.id, rep_id: JESSE_ID, status: 'new', claimed: false, assigned_at: now, touch_count: 0,
    }))
    for (let j = 0; j < rows.length; j += 200) {
      const { error: aerr } = await supabase.from('lead_assignments').insert(rows.slice(j, j + 200))
      if (aerr) console.log('  assign err', aerr.message)
    }
    inserted += rows.length
  }
  const byState: Record<string, number> = {}
  for (const k of kept) byState[k.state] = (byState[k.state] || 0) + 1
  console.log(`Inserted + assigned ${inserted} leads to Jesse. By state:`, byState)
}

main().catch((e) => { console.error(e); process.exit(1) })
