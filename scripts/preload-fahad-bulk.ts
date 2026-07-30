/**
 * Bulk-load ~200 SMALL home-service shops for Fahad Mahmood, cheaply.
 * Key difference from preload-fahad-lowstar: NO rating band. The strict
 * 2.5-4.0 filter made us discard ~95% of every result page (=$1+/lead).
 * Here we keep any small, non-chain home-service shop (review count is
 * the "owner answers the phone" proxy), so yield per Places call jumps
 * ~10x and cost drops to pennies/lead. Low-rated shops still float to
 * the TOP of Fahad's list (worst rating = newest assigned_at) so the
 * best-profile targets lead his queue.
 *
 * Run:
 *   PLACES_DAILY_CAP=1500 PRELOAD_CALL_BUDGET=200 npx tsx --env-file=.env.local scripts/preload-fahad-bulk.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces, getPlacesCallCount, PLACES_COST_PER_CALL } from '../lib/scrapers/google-places'

const FAHAD_ID = '7d98205d-b439-47a0-81e4-cda3991abb56'
const TARGET = 200
const MIN_RATING = 1.0
const MAX_RATING = 5.0   // ANY rating - the band is what made it expensive
const MIN_REVIEWS = 3    // below this = ghost listing
const MAX_REVIEWS = 150  // "small" = owner-operated, no front desk

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Broad national net = more fresh supply before dedupe exhaustion.
const METROS = [
  { city: 'Los Angeles',    state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'San Diego',      state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'Fresno',         state: 'CA', lat: 36.7378, lng: -119.7871 },
  { city: 'Sacramento',     state: 'CA', lat: 38.5816, lng: -121.4944 },
  { city: 'San Jose',       state: 'CA', lat: 37.3382, lng: -121.8863 },
  { city: 'Las Vegas',      state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Phoenix',        state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Tucson',         state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { city: 'Portland',       state: 'OR', lat: 45.5152, lng: -122.6784 },
  { city: 'Seattle',        state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
  { city: 'Denver',         state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'San Antonio',    state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'Fort Worth',     state: 'TX', lat: 32.7555, lng: -97.3308 },
  { city: 'El Paso',        state: 'TX', lat: 31.7619, lng: -106.4850 },
  { city: 'Oklahoma City',  state: 'OK', lat: 35.4676, lng: -97.5164 },
  { city: 'Kansas City',    state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'Memphis',        state: 'TN', lat: 35.1495, lng: -90.0490 },
  { city: 'Nashville',      state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Indianapolis',   state: 'IN', lat: 39.7684, lng: -86.1581 },
  { city: 'Columbus',       state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Cleveland',      state: 'OH', lat: 41.4993, lng: -81.6944 },
  { city: 'Charlotte',      state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'Jacksonville',   state: 'FL', lat: 30.3322, lng: -81.6557 },
  { city: 'Tampa',          state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Atlanta',        state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Pittsburgh',     state: 'PA', lat: 40.4406, lng: -79.9959 },
  { city: 'St. Louis',      state: 'MO', lat: 38.6270, lng: -90.1994 },
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
  const CALL_BUDGET = Number(process.env.PRELOAD_CALL_BUDGET || '200') // ~$7 hard stop

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
          source: 'preload:fahad-bulk', status: 'new', score: 0,
        })
        got++
        if (kept.length >= TARGET) break outer
      }
    } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
    if (got > 0) console.log(`  ${query.padEnd(48)} +${got}  (total ${kept.length}, calls ${getPlacesCallCount()})`)
  }

  // Rank so the best-PROFILE (lowest rating, then fewest reviews) get the
  // NEWEST assigned_at = top of Fahad's list (sorted assigned_at DESC).
  kept.sort((a, b) =>
    (b.google_rating ?? 5) - (a.google_rating ?? 5) ||
    (b.google_review_count ?? 999) - (a.google_review_count ?? 999))

  const dist: Record<string, number> = {}
  for (const k of kept) {
    const b = k.google_rating == null ? '?' : k.google_rating <= 3.0 ? '<=3.0' : k.google_rating <= 4.0 ? '3.1-4.0' : '4.1-5.0'
    dist[b] = (dist[b] || 0) + 1
  }
  console.log(`\nScraped ${kept.length} small home-service shops. Rating spread:`, dist)
  console.log(`Places calls: ${getPlacesCallCount()} (~$${(getPlacesCallCount() * PLACES_COST_PER_CALL).toFixed(2)}) = $${(getPlacesCallCount() * PLACES_COST_PER_CALL / Math.max(1, kept.length)).toFixed(3)}/lead`)

  console.log(`\nInserting + assigning to Fahad (best-profile first = top of list)...`)
  const now = Date.now()
  let inserted = 0
  for (let i = 0; i < kept.length; i += 100) {
    const chunk = kept.slice(i, i + 100)
    const { data, error } = await supabase.from('leads').insert(chunk).select('id')
    if (error) { console.log('  insert err', error.message); continue }
    // stagger assigned_at: earlier index (worse rating) = newer timestamp = top
    const rows = (data || []).map((r, j) => ({
      lead_id: r.id, rep_id: FAHAD_ID, status: 'new', claimed: false,
      assigned_at: new Date(now - (i + j) * 1000).toISOString(), touch_count: 0,
    }))
    for (let j = 0; j < rows.length; j += 100) {
      const { error: aerr } = await supabase.from('lead_assignments').insert(rows.slice(j, j + 100))
      if (aerr) console.log('  assign err', aerr.message)
    }
    inserted += rows.length
  }
  const byState: Record<string, number> = {}
  for (const k of kept) byState[k.state] = (byState[k.state] || 0) + 1
  console.log(`Inserted + assigned ${inserted} leads to Fahad. By state:`, byState)
}

main().catch((e) => { console.error(e); process.exit(1) })