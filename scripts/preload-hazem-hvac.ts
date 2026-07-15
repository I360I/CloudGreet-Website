/**
 * Supplemental: HVAC-only pass for Hazem. The main script's HVAC vertical
 * came back empty because includedType 'hvac_contractor' is not a valid
 * Places (New) type. Here we drop includedType and let the text query do
 * the filtering. Dedupes against everything already in the system
 * (including the 400 just inserted). Run:
 *   npx tsx --env-file=.env.local scripts/preload-hazem-hvac.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces } from '../lib/scrapers/google-places'

const HAZEM_ID = 'e94d9beb-347f-4cdb-8077-591742e73689'
const HAZEM_EMAIL = 'hazemkarim2002@gmail.com'
const TARGET = 150

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const METROS = [
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
]

const CHAIN_RE = new RegExp(
  ['roto-rooter','mr\\.? rooter','mister sparky','one hour','benjamin franklin','aire serv',
   'ars','rescue rooter','service experts','horizon services','michael & son','home depot',
   "lowe'?s",'sears','goettl','parker & sons','george brazil','four seasons','super service',
   'radiant','dr\\.? energy','apollo home','legacy hvac'].join('|'), 'i')

const digits = (p: string | null) => (p || '').replace(/\D/g, '').slice(-10)

async function main() {
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
  console.log(`${existing.size} existing phones (incl. Hazem's first 400)`)

  const kept: any[] = []
  const seen = new Set<string>()
  for (const m of METROS) {
    if (kept.length >= TARGET) break
    const query = `HVAC and air conditioning contractor in ${m.city} ${m.state}`
    let got = 0
    try {
      for await (const p of discoverPlaces(query, {
        maxResults: 20,
        locationBias: { lat: m.lat, lng: m.lng, radiusMeters: 45_000 },
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
          zip: p.zip || null, business_type: 'hvac', google_rating: p.rating ?? null,
          google_review_count: p.review_count ?? null, google_business_status: p.business_status || null,
          source: `preload:${HAZEM_EMAIL}`, status: 'new', score: 0,
        })
        got++
        if (kept.length >= TARGET) break
      }
    } catch (e) { console.warn(`  ! ${query}: ${(e as Error).message}`) }
    console.log(`  ${query.padEnd(50)} +${got}  (total ${kept.length})`)
  }

  console.log(`\nInserting ${kept.length} HVAC leads...`)
  const ids: string[] = []
  for (let i = 0; i < kept.length; i += 200) {
    const { data, error } = await supabase.from('leads').insert(kept.slice(i, i + 200)).select('id')
    if (error) throw error
    for (const r of data || []) ids.push(r.id)
  }
  const now = new Date().toISOString()
  const assigns = ids.map((id) => ({ lead_id: id, rep_id: HAZEM_ID, status: 'new', claimed: false, assigned_at: now, touch_count: 0 }))
  for (let i = 0; i < assigns.length; i += 200) {
    const { error } = await supabase.from('lead_assignments').insert(assigns.slice(i, i + 200))
    if (error) throw error
  }
  console.log(`Assigned ${ids.length} HVAC leads to Hazem.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
