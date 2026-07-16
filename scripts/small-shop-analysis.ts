/**
 * ANALYSIS ONLY - writes nothing to the DB. Scrapes a couple metros the
 * current way, then cross-references each shop's Google review count with
 * Apollo's employee estimate (free org enrich) to find the threshold that
 * isolates small owner-run shops. Goal: decide what to add to the scraper.
 *   APOLLO_API_KEY=xxx npx tsx --env-file=.env.local scripts/small-shop-analysis.ts
 */
import { discoverPlaces } from '../lib/scrapers/google-places'
import { orgEnrich, domainFromWebsite } from '../lib/apollo'

const METROS = [
  { city: 'Dallas',  state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
]
const VERTICALS = [
  { q: 'HVAC and air conditioning contractor', type: 'hvac' },
  { q: 'plumber', type: 'plumbing', includedType: 'plumber' },
]

// Expanded franchise / consolidator list (Neighborly brands + the big
// home-service franchises) - these are never owner-answered.
const FRANCHISE = new RegExp([
  'mr\\.? rooter','mr\\.? electric','mr\\.? appliance','mr\\.? handyman','aire serv','molly maid',
  'glass doctor','rainbow','roto-rooter','one hour','benjamin franklin','mister sparky','\\bars\\b',
  'rescue rooter','service experts','horizon services','michael & son','goettl','parker & sons',
  'george brazil','four seasons','super service','\\bradiant\\b','dr\\.? energy','apollo home',
  'legacy hvac','bill howe','service champions','western rooter','fast water heater','hunter super',
  'milestone','baker brothers','berkeys','tioga','john moore','abacus','christianson','airco',
].join('|'), 'i')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const rows: { name: string; reviews: number; rating: number|null; domain: string|null; franchise: boolean }[] = []
  const seen = new Set<string>()
  for (const m of METROS) {
    for (const v of VERTICALS) {
      try {
        for await (const p of discoverPlaces(`${v.q} in ${m.city} ${m.state}`, {
          maxResults: 40,
          locationBias: { lat: m.lat, lng: m.lng, radiusMeters: 45_000 },
          includedType: (v as any).includedType,
          minReviewCount: 1, minRating: 3.0, excludeClosed: true, stateAllowList: [m.state],
        })) {
          const name = (p.business_name || p.name || '').trim()
          if (!name || seen.has(name.toLowerCase())) continue
          seen.add(name.toLowerCase())
          rows.push({
            name,
            reviews: p.review_count ?? 0,
            rating: p.rating ?? null,
            domain: domainFromWebsite(p.website),
            franchise: FRANCHISE.test(name),
          })
        }
      } catch (e) { console.warn('scrape err', (e as Error).message) }
    }
  }

  // Apollo employee enrich for the ones with a website (cap to be gentle).
  let enriched = 0
  for (const r of rows) {
    if (enriched >= 60) break
    if (!r.domain) continue
    try {
      const org = await orgEnrich(r.domain)
      ;(r as any).emp = org?.employees ?? null
      enriched++
      await sleep(200)
    } catch { /* skip */ }
  }

  rows.sort((a, b) => a.reviews - b.reviews)
  console.log(`\nScraped ${rows.length} unique shops (Dallas+Houston, HVAC+plumbing). Sorted by review count:\n`)
  console.log('  REVIEWS  EMP(apollo)  FRAN  RATING  NAME')
  for (const r of rows) {
    const emp = (r as any).emp
    console.log(
      `  ${String(r.reviews).padStart(6)}  ${String(emp ?? '-').padStart(10)}  ${r.franchise ? ' Y ' : '   '}  ${String(r.rating ?? '-').padStart(4)}   ${r.name.slice(0, 44)}`,
    )
  }

  // Distribution + franchise stats
  const buckets = { '<=15': 0, '16-40': 0, '41-100': 0, '101-300': 0, '300+': 0 }
  for (const r of rows) {
    const n = r.reviews
    if (n <= 15) buckets['<=15']++
    else if (n <= 40) buckets['16-40']++
    else if (n <= 100) buckets['41-100']++
    else if (n <= 300) buckets['101-300']++
    else buckets['300+']++
  }
  const withEmp = rows.filter((r) => (r as any).emp != null)
  const smallByEmp = withEmp.filter((r) => (r as any).emp <= 10)
  console.log('\n=== Review-count distribution ===')
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(8)} ${v} shops`)
  console.log(`\n  franchises flagged: ${rows.filter((r) => r.franchise).length}`)
  console.log(`  had Apollo employee data: ${withEmp.length}`)
  console.log(`  of those, <=10 employees: ${smallByEmp.length}`)
  // correlation snapshot: avg reviews for small vs big by employees
  const avg = (a: any[]) => a.length ? Math.round(a.reduce((s, r) => s + r.reviews, 0) / a.length) : 0
  console.log(`  avg reviews where emp<=10:  ${avg(smallByEmp)}`)
  console.log(`  avg reviews where emp>10:   ${avg(withEmp.filter((r) => (r as any).emp > 10))}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
