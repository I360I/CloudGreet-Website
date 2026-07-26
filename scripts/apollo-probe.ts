/**
 * Diagnostic: is Apollo actually responding, or silently failing/gated?
 * Prints raw status + counts for a known-covered company and a couple
 * of trade domains. Run:
 *   APOLLO_API_KEY=xxx npx tsx scripts/apollo-probe.ts
 */
const APOLLO_BASE = 'https://api.apollo.io/api/v1'
const OWNER_TITLES = ['owner', 'founder', 'co-founder', 'president', 'ceo', 'principal', 'general manager']

async function post(path: string, body: any) {
  const r = await fetch(`${APOLLO_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.APOLLO_API_KEY! },
    body: JSON.stringify(body),
  })
  const json = await r.json().catch(() => ({}))
  return { status: r.status, json }
}
async function get(path: string) {
  const r = await fetch(`${APOLLO_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.APOLLO_API_KEY! },
  })
  const json = await r.json().catch(() => ({}))
  return { status: r.status, json }
}

async function probe(domain: string) {
  const search = await post('/mixed_people/search', {
    q_organization_domains_list: [domain], person_titles: OWNER_TITLES, page: 1, per_page: 3,
  })
  const org = await get(`/organizations/enrich?domain=${encodeURIComponent(domain)}`)
  const people = search.json?.people || search.json?.contacts || []
  console.log(`\n[${domain}]`)
  console.log(`  people_search: status ${search.status} | people=${people.length}` +
    (search.json?.error ? ` | ERROR: ${JSON.stringify(search.json.error).slice(0,120)}` : ''))
  if (people[0]) {
    const p = people[0]
    console.log(`     -> ${[p.first_name,p.last_name].filter(Boolean).join(' ')} (${p.title}) email_status=${p.email_status||'-'} phones=${(p.phone_numbers||[]).length}`)
  }
  console.log(`  org_enrich:    status ${org.status} | org=${org.json?.organization ? 'FOUND' : 'none'}` +
    (org.json?.organization ? ` (${org.json.organization.name}, ~${org.json.organization.estimated_num_employees} emp)` : ''))
  // surface any pagination / plan info
  if (search.json?.pagination) console.log(`  pagination:`, JSON.stringify(search.json.pagination))
}

async function main() {
  console.log('key set:', !!process.env.APOLLO_API_KEY, '| len:', (process.env.APOLLO_API_KEY||'').length)
  for (const d of ['hubspot.com', 'berkeys.com', 'mrelectricdallas.com', 'atlasacrepair.com']) {
    await probe(d)
    await new Promise((r) => setTimeout(r, 400))
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
