/**
 * Apollo.io API client - lead enrichment for the setter pipeline.
 *
 * Env: APOLLO_API_KEY (set in Vercel). Calls run server-side only.
 *
 * Credit awareness: organization enrich and people SEARCH do not burn
 * export credits; revealing an email/phone (people/match with reveal)
 * does. The coverage probe and any "does Apollo know this lead" checks
 * must stick to search-level calls; only the explicit enrichment step
 * should ever reveal, and only for leads missing contact info.
 */

const APOLLO_BASE = 'https://api.apollo.io/api/v1'

const OWNER_TITLES = ['owner', 'founder', 'co-founder', 'president', 'ceo', 'principal', 'general manager']

export function apolloEnabled(): boolean {
  return !!process.env.APOLLO_API_KEY
}

async function apolloFetch(path: string, init?: RequestInit): Promise<{ status: number; json: any }> {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error('APOLLO_API_KEY not set')
  const r = await fetch(`${APOLLO_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      ...(init?.headers || {}),
    },
  })
  const json = await r.json().catch(() => ({}))
  return { status: r.status, json }
}

export type ApolloOrg = {
  name: string | null
  domain: string
  phone: string | null
  employees: number | null
  linkedin_url: string | null
}

/** Company lookup by domain. Null when Apollo doesn't know it. */
export async function orgEnrich(domain: string): Promise<ApolloOrg | null> {
  const { status, json } = await apolloFetch(`/organizations/enrich?domain=${encodeURIComponent(domain)}`)
  if (status !== 200 || !json?.organization) return null
  const o = json.organization
  return {
    name: o.name || null,
    domain,
    phone: o.phone || o.sanitized_phone || null,
    employees: o.estimated_num_employees ?? null,
    linkedin_url: o.linkedin_url || null,
  }
}

export type ApolloOwner = {
  name: string
  title: string | null
  has_email: boolean
  has_phone: boolean
  linkedin_url: string | null
}

/**
 * Best owner/decision-maker match for a domain via people SEARCH (no
 * reveal - existence flags only, zero export credits).
 */
export async function findOwner(domain: string): Promise<ApolloOwner | null> {
  const { status, json } = await apolloFetch('/mixed_people/search', {
    method: 'POST',
    body: JSON.stringify({
      q_organization_domains_list: [domain],
      person_titles: OWNER_TITLES,
      page: 1,
      per_page: 3,
    }),
  })
  if (status !== 200) return null
  const person = (json?.people || [])[0] || (json?.contacts || [])[0]
  if (!person) return null
  const name = [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
  if (!name) return null
  return {
    name,
    title: person.title || null,
    // email_status present (verified/guessed/etc.) means Apollo HAS an
    // email behind the paywall - existence is what coverage measures.
    has_email: !!(person.email_status || (person.email && !String(person.email).includes('not_unlocked'))),
    has_phone: !!(person.sanitized_phone || (person.phone_numbers || []).length > 0),
    linkedin_url: person.linkedin_url || null,
  }
}

/** Extract a bare domain from a lead's stored website URL. */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`)
    const host = u.hostname.replace(/^www\./, '')
    return host || null
  } catch {
    return null
  }
}
