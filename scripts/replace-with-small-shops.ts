/**
 * Replace big-shop leads with small owner-operated shops, for all setters.
 * Strategy: query SUBURBS (small shops rank top in their own town), cap
 * review count at 80 (big review counts = staffed shops, owner never
 * answers), filter franchises, dedupe against everything already in the
 * system. Keeps each setter's small (<=80 review) and worked leads; only
 * the big, unworked ones are deleted and backfilled.
 *   APOLLO_API_KEY unused. Run:
 *   npx tsx --env-file=.env.local scripts/replace-with-small-shops.ts
 */
import { createClient } from '@supabase/supabase-js'
import { discoverPlaces } from '../lib/scrapers/google-places'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Materialize an async generator with a HARD wall-clock cap. If a query
// stalls (a response body that never arrives, which the fetch abort didn't
// catch), we return whatever we have and move on instead of freezing the
// whole run. The stalled generator lingers but no longer blocks the loop.
async function collectWithTimeout<T>(gen: AsyncGenerator<T>, ms: number): Promise<T[]> {
  const out: T[] = []
  let stop = false
  const consume = (async () => { for await (const x of gen) { if (stop) break; out.push(x) } })()
  await Promise.race([consume.catch(() => {}), sleep(ms)])
  stop = true
  return out
}

const MAX_REVIEWS = 80
const MIN_REVIEWS = 4
const MIN_RATING = 4.0

const VERTICALS = [
  { q: 'HVAC and air conditioning contractor', type: 'hvac' },
  { q: 'plumber', type: 'plumbing', includedType: 'plumber' },
  { q: 'electrician', type: 'electrical', includedType: 'electrician' },
  { q: 'roofing contractor', type: 'roofing', includedType: 'roofing_contractor' },
]

const FRANCHISE = new RegExp([
  'mr\\.? rooter','mr\\.? electric','mr\\.? appliance','mr\\.? handyman','aire serv','molly maid',
  'glass doctor','rainbow','roto-rooter','one hour','benjamin franklin','mister sparky','\\bars\\b',
  'rescue rooter','service experts','horizon services','michael & son','goettl','parker & sons',
  'george brazil','four seasons','super service','\\bradiant\\b','dr\\.? energy','apollo home',
  'legacy hvac','bill howe','service champions','western rooter','fast water heater','hunter super',
  'milestone','baker brothers','berkeys','tioga','john moore','abacus','christianson','airco',
  'home depot',"lowe'?s",'sears','service titan','anytime','\\bpuls\\b','neighborly',
].join('|'), 'i')

type Metro = { state: string; lat: number; lng: number; suburbs: string[] }

const HAZEM: Metro[] = [
  { state:'TX', lat:32.7767, lng:-96.7970, suburbs:['Plano','Garland','Mesquite','Richardson','Rowlett','Carrollton','Rockwall','DeSoto','Cedar Hill','Wylie'] },
  { state:'TX', lat:32.7555, lng:-97.3308, suburbs:['Arlington','Bedford','Euless','Hurst','Grapevine','Mansfield','Burleson','Keller','North Richland Hills'] },
  { state:'TX', lat:29.7604, lng:-95.3698, suburbs:['Pasadena','Pearland','Katy','Sugar Land','Spring','Humble','Cypress','Baytown','Missouri City','Tomball'] },
  { state:'TX', lat:29.4241, lng:-98.4936, suburbs:['New Braunfels','Schertz','Converse','Universal City','Boerne','Seguin','Cibolo'] },
  { state:'TX', lat:30.2672, lng:-97.7431, suburbs:['Round Rock','Pflugerville','Cedar Park','Georgetown','Leander','Kyle','Buda','Hutto'] },
  { state:'AZ', lat:33.4484, lng:-112.0740, suburbs:['Mesa','Chandler','Gilbert','Glendale','Tempe','Peoria','Surprise','Avondale','Goodyear'] },
  { state:'CO', lat:39.7392, lng:-104.9903, suburbs:['Aurora','Lakewood','Arvada','Westminster','Thornton','Centennial','Parker','Littleton','Broomfield'] },
  { state:'NV', lat:36.1699, lng:-115.1398, suburbs:['Henderson','North Las Vegas','Summerlin','Spring Valley','Enterprise'] },
  { state:'OK', lat:35.4676, lng:-97.5164, suburbs:['Edmond','Norman','Moore','Midwest City','Yukon','Mustang'] },
]

const FAHAD: Metro[] = [
  { state:'CA', lat:34.0522, lng:-118.2437, suburbs:['Long Beach','Glendale','Pasadena','Torrance','Burbank','Pomona','El Monte','Downey','West Covina','Norwalk'] },
  { state:'CA', lat:32.7157, lng:-117.1611, suburbs:['Chula Vista','Oceanside','Escondido','El Cajon','Carlsbad','Vista','San Marcos','Encinitas'] },
  { state:'CA', lat:37.3382, lng:-121.8863, suburbs:['Sunnyvale','Santa Clara','Mountain View','Milpitas','Cupertino','Campbell','Gilroy'] },
  { state:'CA', lat:38.5816, lng:-121.4944, suburbs:['Elk Grove','Roseville','Folsom','Citrus Heights','Rancho Cordova','Rocklin'] },
  { state:'CA', lat:36.7378, lng:-119.7871, suburbs:['Clovis','Madera','Visalia','Selma','Reedley'] },
  { state:'WA', lat:47.6062, lng:-122.3321, suburbs:['Bellevue','Kent','Renton','Federal Way','Kirkland','Auburn','Redmond','Shoreline','Burien'] },
  { state:'OR', lat:45.5152, lng:-122.6784, suburbs:['Gresham','Hillsboro','Beaverton','Tigard','Lake Oswego','Oregon City','Milwaukie','Tualatin'] },
]

const BRIDGET: Metro[] = [
  { state:'MA', lat:42.3601, lng:-71.0589, suburbs:['Quincy','Newton','Somerville','Framingham','Waltham','Medford','Malden','Brookline'] },
  { state:'CT', lat:41.7658, lng:-72.6734, suburbs:['New Britain','Bristol','West Hartford','Manchester','Newington','Wethersfield'] },
  { state:'NY', lat:40.7891, lng:-73.1350, suburbs:['Hempstead','Levittown','Hicksville','Freeport','Islip','Babylon','Huntington'] },
  { state:'NJ', lat:40.7357, lng:-74.1724, suburbs:['Elizabeth','Union','Bloomfield','Irvington','East Orange','Clifton','West Orange'] },
  { state:'PA', lat:39.9526, lng:-75.1652, suburbs:['Upper Darby','Norristown','Levittown','Bensalem','King of Prussia','Media'] },
  { state:'MD', lat:39.2904, lng:-76.6122, suburbs:['Towson','Dundalk','Glen Burnie','Catonsville','Columbia','Essex'] },
  { state:'VA', lat:37.5407, lng:-77.4360, suburbs:['Henrico','Chesterfield','Mechanicsville','Midlothian','Glen Allen'] },
  { state:'NC', lat:35.2271, lng:-80.8431, suburbs:['Concord','Gastonia','Huntersville','Matthews','Mint Hill','Monroe','Kannapolis'] },
  { state:'GA', lat:33.7490, lng:-84.3880, suburbs:['Marietta','Sandy Springs','Roswell','Alpharetta','Smyrna','Duluth','Kennesaw','Lawrenceville'] },
  { state:'FL', lat:27.9506, lng:-82.4572, suburbs:['Brandon','Clearwater','Largo','Riverview','Plant City','Wesley Chapel'] },
]

const SETTERS = [
  { email: 'hazemkarim2002@gmail.com', metros: HAZEM },
  { email: 'mahmoodfahad264@gmail.com', metros: FAHAD },
  { email: 'bridgetkscott@gmail.com', metros: BRIDGET },
]

const digits = (p: string | null) => (p || '').replace(/\D/g, '').slice(-10)

async function loadAllPhones(): Promise<Set<string>> {
  const set = new Set<string>()
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from('leads').select('phone').range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) { const d = digits(r.phone); if (d.length === 10) set.add(d) }
    if (data.length < 1000) break
    from += 1000
  }
  return set
}

async function scrapeSmallShops(metros: Metro[], target: number, existing: Set<string>, tag: string) {
  const kept: any[] = []
  const seen = new Set<string>()
  const dist = { '<=15':0, '16-40':0, '41-80':0 }
  outer:
  for (const m of metros) {
    for (const suburb of m.suburbs) {
      const before = kept.length
      for (const v of VERTICALS) {
        if (kept.length >= target) break outer
        try {
          const results = await collectWithTimeout(discoverPlaces(`${v.q} in ${suburb} ${m.state}`, {
            maxResults: 20,
            locationBias: { lat: m.lat, lng: m.lng, radiusMeters: 45_000 },
            includedType: (v as any).includedType,
            minReviewCount: MIN_REVIEWS, maxReviewCount: MAX_REVIEWS,
            minRating: MIN_RATING, excludeClosed: true, stateAllowList: [m.state],
          }), 25_000)
          for (const p of results) {
            const d = digits(p.phone)
            if (d.length !== 10 || existing.has(d) || seen.has(d)) continue
            const bn = (p.business_name || p.name || '').trim()
            if (!bn || FRANCHISE.test(bn)) continue
            seen.add(d)
            const rc = p.review_count ?? 0
            if (rc <= 15) dist['<=15']++; else if (rc <= 40) dist['16-40']++; else dist['41-80']++
            kept.push({
              name: bn, business_name: bn, phone: p.phone, website: p.website || null,
              address: p.address || null, city: p.city || suburb, state: p.state || m.state,
              zip: p.zip || null, business_type: v.type, google_rating: p.rating ?? null,
              google_review_count: rc, google_business_status: p.business_status || null,
              source: tag, status: 'new', score: 0,
            })
            if (kept.length >= target) break
          }
        } catch (e) { /* skip suburb-vertical on error */ }
      }
      console.log(`    ${suburb}, ${m.state}: +${kept.length - before} (total ${kept.length}/${target})`)
    }
  }
  return { kept, dist }
}

async function main() {
  console.log('Loading existing phones for dedupe...')
  const existing = await loadAllPhones()
  console.log(`  ${existing.size} phones in system\n`)

  for (const s of SETTERS) {
    console.log(`\n========== ${s.email} ==========`)
    const { data: user } = await supabase.from('custom_users').select('id').eq('email', s.email).maybeSingle()
    if (!user) { console.log('  no account, skipping'); continue }
    const repId = user.id

    // Which of this setter's leads are big + unworked -> to delete.
    const { data: assigns } = await supabase.from('lead_assignments')
      .select('lead_id, status').eq('rep_id', repId).limit(3000)
    const leadIds = (assigns || []).map((a) => a.lead_id)
    // fetch review counts for those leads (in chunks to avoid URL overflow)
    const bigIds: string[] = []
    for (let i = 0; i < leadIds.length; i += 100) {
      const chunk = leadIds.slice(i, i + 100)
      const { data: rows } = await supabase.from('leads')
        .select('id, google_review_count, source').in('id', chunk)
      const statusById = new Map((assigns || []).map((a) => [a.lead_id, a.status]))
      for (const r of rows || []) {
        const st = statusById.get(r.id)
        const big = (r.google_review_count ?? 0) > MAX_REVIEWS
        const worked = st && !['new', 'voicemail'].includes(st)
        if (big && !worked) bigIds.push(r.id)
      }
    }
    console.log(`  big + unworked leads to replace: ${bigIds.length}`)

    // Scrape replacements (target = number we're deleting; MAX_TARGET caps it for testing).
    const tag = `smallshop:${s.email}`
    const target = process.env.MAX_TARGET ? Math.min(bigIds.length, +process.env.MAX_TARGET) : bigIds.length
    const { kept, dist } = await scrapeSmallShops(s.metros, target, existing, tag)
    console.log(`  scraped ${kept.length} small shops. reviews:`, dist)
    // reserve their phones so setters don't overlap in this same run
    for (const k of kept) { const d = digits(k.phone); if (d) existing.add(d) }

    if (process.env.DRY_RUN) {
      console.log(`  [DRY_RUN] would delete ${Math.min(bigIds.length, kept.length)} big leads and add ${kept.length}. Sample:`)
      for (const k of kept.slice(0, 8)) console.log(`     ${String(k.google_review_count).padStart(3)}rev  ${k.city}, ${k.state}  ${k.name}`)
      continue
    }

    // Only delete as many big leads as we found replacements for, so a
    // short region never leaves a setter depleted.
    const toDelete = bigIds.slice(0, kept.length)
    for (let i = 0; i < toDelete.length; i += 200) {
      const chunk = toDelete.slice(i, i + 200)
      await supabase.from('lead_assignments').delete().eq('rep_id', repId).in('lead_id', chunk)
      await supabase.from('lead_notes').delete().in('lead_id', chunk)
      await supabase.from('leads').delete().in('id', chunk).like('source', 'preload:%')
    }
    console.log(`  deleted ${toDelete.length} big leads`)

    // Insert new small-shop leads + assign to the setter.
    const now = new Date().toISOString()
    let inserted = 0
    for (let i = 0; i < kept.length; i += 200) {
      const chunk = kept.slice(i, i + 200)
      const { data, error } = await supabase.from('leads').insert(chunk).select('id')
      if (error) { console.log('  insert err', error.message); continue }
      const rows = (data || []).map((r) => ({ lead_id: r.id, rep_id: repId, status: 'new', claimed: false, assigned_at: now, touch_count: 0 }))
      for (let j = 0; j < rows.length; j += 200) {
        await supabase.from('lead_assignments').insert(rows.slice(j, j + 200))
      }
      inserted += rows.length
    }
    console.log(`  inserted + assigned ${inserted} small-shop leads`)
  }
  console.log('\nDONE.')
}

main().catch((e) => { console.error(e); process.exit(1) })
