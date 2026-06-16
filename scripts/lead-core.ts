/**
 * Lead-finder CORE - shared agent logic for both the CLI (lead-finder.ts)
 * and the local web console (lead-console.ts). One source of truth.
 *
 * Reuses the rep scraper's official Google Places search (discoverPlaces) to
 * FIND businesses, plus Places Details (review text), the prospect's OWN
 * website, and Anthropic web search to ENRICH. LinkedIn is link-only, never
 * scraped. Solo-vs-fleet is INFERRED and flagged, never asserted.
 */

import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
import { discoverPlaces, isGooglePlacesConfigured } from '../lib/scrapers/google-places'
import { US_METROS, type UsMetro } from '../lib/scrapers/us-metros'

export const MODEL = process.env.LEAD_FINDER_MODEL || 'claude-sonnet-4-6'

// Per-request cap so a stalled model/tool call fails loudly in ~2.5 min
// instead of silently hanging at the SDK's 10-minute default.
export function makeClient(): Anthropic {
  return new Anthropic({ timeout: 150_000, maxRetries: 1 })
}

export function envReady(): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY')
  if (!isGooglePlacesConfigured()) missing.push('GOOGLE_PLACES_API_KEY')
  return { ok: missing.length === 0, missing }
}

// ---------------------------------------------------------------------------
// City -> coordinates (reuses US_METROS). discoverPlaces needs lat/lng or it
// defaults to a Texas rectangle, so we can only search metros in that table.
// ---------------------------------------------------------------------------
function resolveMetro(city: string, state?: string): UsMetro | null {
  let c = (city || '').trim().toLowerCase()
  const stripped = c.replace(/[\s,]+[a-z]{2}\.?$/i, '').trim()
  if (stripped) c = stripped
  const st = (state || '').trim().toUpperCase()
  const matches = US_METROS.filter((m) => m.name === c)
  if (!matches.length) return null
  if (st) {
    const inState = matches.find((m) => m.state === st)
    if (inState) return inState
  }
  return matches[0]
}

// ---------------------------------------------------------------------------
// Solo-owner inference (transparent + honest).
// ---------------------------------------------------------------------------
const FLEET_NAME_RE = /\b(fleet|worldwide|global|nationwide|group|enterprises?|holdings|corporation|incorporated|industries|network|systems|company|companies)\b/i
const PERSONAL_NAME_RE = /\b([a-z]+(?:'s)|[a-z]+ ?& ?sons?|[a-z]+ ?and ?sons?)\b/i

export type SoloSignal = {
  label: 'likely solo' | 'possibly solo' | 'likely larger/fleet' | 'unclear'
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
}

function soloSignal(name: string, reviewCount: number | null, website: string | null): SoloSignal {
  const reasons: string[] = []
  const rc = typeof reviewCount === 'number' ? reviewCount : null
  const fleet = FLEET_NAME_RE.test(name || '')
  const personal = PERSONAL_NAME_RE.test(name || '')
  if (fleet) reasons.push('name uses fleet/company language')
  if (personal) reasons.push("name reads owner-operated (e.g. possessive or '& Sons')")
  if (rc != null) reasons.push(`${rc} Google reviews`)
  else reasons.push('review count unknown')
  if (!website) reasons.push('no website on file (small/personal presence)')
  if (fleet && (rc == null || rc > 40)) return { label: 'likely larger/fleet', confidence: 'medium', reasons }
  if (rc != null) {
    if (rc <= 25) return { label: 'likely solo', confidence: personal && !fleet ? 'high' : 'medium', reasons }
    if (rc <= 75) return { label: 'possibly solo', confidence: 'low', reasons }
    return { label: 'likely larger/fleet', confidence: 'medium', reasons }
  }
  return { label: 'unclear', confidence: 'low', reasons }
}

export type LeadRow = {
  business_name: string
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  rating: number | null
  review_count: number | null
  google_place_id: string
  solo: SoloSignal
}

let LAST_RESULTS: LeadRow[] = []
let LAST_QUERY_DESC = ''
export function getLastResults(): LeadRow[] { return LAST_RESULTS }
export function lastQueryDesc(): string { return LAST_QUERY_DESC }

function titleCase(s: string): string { return s.replace(/\b\w/g, (c) => c.toUpperCase()) }

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_leads',
  description:
    'Search Google Places (the official Places API, same source our rep scraper uses) for transport/car-service businesses and return contactable leads with a solo-owner confidence read.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Business-type text, NOT the location. e.g. "black car service", "executive car service", "airport car service", "limousine service".' },
      city: { type: 'string', description: 'US city to center on, e.g. "Columbus". Must be a major metro.' },
      state: { type: 'string', description: 'Two-letter state code, e.g. "OH".' },
      limit: { type: 'integer', description: 'How many leads (1-60). Default 20.' },
      min_reviews: { type: 'integer', description: 'Drop listings below this many reviews. Default 0.' },
      max_reviews: { type: 'integer', description: 'Drop listings ABOVE this many reviews. Bias toward small/solo (e.g. "under 50" -> 50).' },
      min_rating: { type: 'number', description: 'Min average star rating 0-5. Optional.' },
      radius_miles: { type: 'integer', description: 'Search radius from city center. Default 30.' },
    },
    required: ['query', 'city', 'state'],
  },
}

const ENRICH_TOOL: Anthropic.Tool = {
  name: 'enrich_lead',
  description:
    "Deeper intel on ONE business: Google review TEXT + summary + hours (official Places API), signals from the business's OWN website (owner/team/fleet language, emails, LinkedIn/Facebook links they published), and LinkedIn search deep-links to open manually. Does NOT scrape LinkedIn.",
  input_schema: {
    type: 'object',
    properties: {
      business_name: { type: 'string', description: 'Exact business name, ideally from the last search.' },
      place_id: { type: 'string', description: 'Google place_id if known. Optional.' },
      website: { type: 'string', description: 'Website URL if known. Optional.' },
      city: { type: 'string', description: 'City to disambiguate. Optional.' },
      state: { type: 'string', description: 'Two-letter state. Optional.' },
    },
    required: ['business_name'],
  },
}

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 4 } as unknown as Anthropic.Tool

async function executeSearch(input: any): Promise<Record<string, unknown>> {
  if (!isGooglePlacesConfigured()) return { error: 'places_not_configured', message: 'GOOGLE_PLACES_API_KEY is not set.' }
  const query = String(input?.query || '').trim()
  const city = String(input?.city || '').trim()
  const state = String(input?.state || '').trim().toUpperCase()
  if (!query || !city || !state) return { error: 'missing_params', message: 'query, city, and state are required.' }
  const limit = Math.max(1, Math.min(60, Number(input?.limit) || 20))
  const minReviews = Math.max(0, Number(input?.min_reviews) || 0)
  const maxReviews = input?.max_reviews != null ? Math.max(0, Number(input.max_reviews)) : null
  const minRating = input?.min_rating != null ? Math.max(0, Math.min(5, Number(input.min_rating))) : 0
  const radiusMiles = Math.max(1, Math.min(60, Number(input?.radius_miles) || 30))

  const metro = resolveMetro(city, state)
  if (!metro) {
    return {
      error: 'city_not_supported',
      message: `"${city}, ${state}" isn't in our metro coordinate table. Try a major metro. Known in ${state}: ${US_METROS.filter((m) => m.state === state).map((m) => titleCase(m.name)).join(', ') || 'none on file'}.`,
    }
  }

  const radiusMeters = Math.round(radiusMiles * 1609.34)
  const seenIds = new Set<string>()
  const seenPhones = new Set<string>()
  const rows: LeadRow[] = []
  try {
    for await (const p of discoverPlaces(`${query} near ${metro.name} ${state}`, {
      maxResults: Math.min(60, limit * 3),
      includedType: undefined,
      minReviewCount: minReviews,
      minRating,
      locationRestriction: { lat: metro.lat, lng: metro.lng, radiusMeters },
      stateAllowList: [state],
    })) {
      if (rows.length >= limit) break
      if (!p.phone) continue
      if (p.place_id && seenIds.has(p.place_id)) continue
      const phoneDigits = (p.phone || '').replace(/\D/g, '')
      if (phoneDigits && seenPhones.has(phoneDigits)) continue
      if (maxReviews != null && typeof p.review_count === 'number' && p.review_count > maxReviews) continue
      if (p.place_id) seenIds.add(p.place_id)
      if (phoneDigits) seenPhones.add(phoneDigits)
      rows.push({
        business_name: p.business_name, phone: p.phone, website: p.website,
        address: p.address, city: p.city, state: p.state, rating: p.rating,
        review_count: p.review_count, google_place_id: p.place_id,
        solo: soloSignal(p.business_name, p.review_count, p.website),
      })
    }
  } catch (e) {
    return { error: 'search_failed', message: e instanceof Error ? e.message : 'unknown error' }
  }

  LAST_RESULTS = rows
  LAST_QUERY_DESC = `${query} - ${titleCase(metro.name)}, ${state}`
  return {
    count: rows.length,
    filters_applied: { query, city: titleCase(metro.name), state, limit, min_reviews: minReviews, max_reviews: maxReviews, min_rating: minRating, radius_miles: radiusMiles },
    solo_owner_note: 'solo signals are INFERRED from review count + business-name language (Places has no driver-count field). Treat as hints.',
    results: rows,
  }
}

// ---- Enrichment helpers ----
const PLACES_DETAILS_MASK = [
  'displayName', 'rating', 'userRatingCount', 'websiteUri', 'nationalPhoneNumber',
  'editorialSummary', 'regularOpeningHours.weekdayDescriptions',
  'reviews.rating', 'reviews.text', 'reviews.authorAttribution.displayName',
  'reviews.relativePublishTimeDescription',
].join(',')

type PlaceDetails = {
  rating: number | null; review_count: number | null; website: string | null
  phone: string | null; editorial: string | null; hours: string[]
  reviews: { rating: number | null; author: string; when: string; text: string }[]
}

async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key || !placeId) return null
  try {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACES_DETAILS_MASK },
    })
    const d: any = await r.json()
    if (!r.ok || d?.error) return null
    return {
      rating: d.rating ?? null, review_count: d.userRatingCount ?? null,
      website: d.websiteUri ?? null, phone: d.nationalPhoneNumber ?? null,
      editorial: d.editorialSummary?.text ?? null,
      hours: d.regularOpeningHours?.weekdayDescriptions ?? [],
      reviews: (d.reviews ?? []).slice(0, 5).map((rv: any) => ({
        rating: rv.rating ?? null, author: rv.authorAttribution?.displayName ?? '?',
        when: rv.relativePublishTimeDescription ?? '', text: (rv.text?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 320),
      })),
    }
  } catch { return null }
}

async function findPlaceId(name: string, city?: string, state?: string): Promise<string | null> {
  const hit = LAST_RESULTS.find((r) => r.business_name.toLowerCase() === name.toLowerCase())
  if (hit?.google_place_id) return hit.google_place_id
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return null
  try {
    const q = [name, city, state].filter(Boolean).join(' ')
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
      body: JSON.stringify({ textQuery: q, maxResultCount: 1, regionCode: 'US' }),
    })
    const d: any = await r.json()
    return d?.places?.[0]?.id ?? null
  } catch { return null }
}

type WebsiteSignals = {
  fetched: string[]; emails: string[]; linkedin_urls: string[]; facebook_urls: string[]
  owner_hints: string[]; language_signals: string[]; error?: string
}
const SOLO_LANG = [/\bowner[- ]operated\b/i, /\bfamily[- ]owned\b/i, /\bowner[- ]operator\b/i, /\bi (?:personally )?(?:drive|chauffeur)\b/i, /\bmy (?:car|vehicle|business)\b/i, /\bone[- ]man\b/i, /\bsince \d{4}\b/i]
const FLEET_LANG = [/\bfleet of\b/i, /\bour (?:drivers|chauffeurs|team of|fleet)\b/i, /\b\d{2,}\+? (?:vehicles|cars|drivers|chauffeurs)\b/i, /\bnationwide\b/i, /\bworldwide\b/i, /\blocations\b/i, /\bcorporate accounts\b/i]

async function fetchWebsiteSignals(rawUrl: string): Promise<WebsiteSignals> {
  const out: WebsiteSignals = { fetched: [], emails: [], linkedin_urls: [], facebook_urls: [], owner_hints: [], language_signals: [] }
  let base = (rawUrl || '').trim()
  if (!base) { out.error = 'no website'; return out }
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base
  base = base.replace(/\/+$/, '')
  const pages = [base, base + '/about', base + '/about-us', base + '/team']
  const emails = new Set<string>(), li = new Set<string>(), fb = new Set<string>(), owners = new Set<string>(), lang = new Set<string>()
  for (const url of pages) {
    if (out.fetched.length >= 3) break
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'CloudGreet-LeadResearch/1.0 (B2B prospect research; contact admin@cloudgreet.com)' } })
      clearTimeout(t)
      if (!res.ok) continue
      const html = await res.text()
      out.fetched.push(url)
      const $ = cheerio.load(html)
      $('script,style,noscript').remove()
      const text = ($('body').html() || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
      Array.from(text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g)).forEach((m) => emails.add(m[0].toLowerCase()))
      $('a[href*="linkedin.com"]').each((_, el) => { const h = $(el).attr('href'); if (h) li.add(h.split('?')[0]) })
      $('a[href*="facebook.com"]').each((_, el) => { const h = $(el).attr('href'); if (h) fb.add(h.split('?')[0]) })
      Array.from(text.matchAll(/\b(owner|founder|president|proprietor)\b[^.]{0,40}?\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g)).forEach((m) => owners.add(`${m[2]} (${m[1]})`))
      Array.from(text.matchAll(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b[^.]{0,20}?\b(owner|founder|president)\b/g)).forEach((m) => owners.add(`${m[1]} (${m[2]})`))
      for (const rx of SOLO_LANG) { const hit = text.match(rx); if (hit) lang.add('solo: "' + hit[0] + '"') }
      for (const rx of FLEET_LANG) { const hit = text.match(rx); if (hit) lang.add('fleet: "' + hit[0] + '"') }
    } catch { /* skip page */ }
  }
  if (out.fetched.length === 0) out.error = 'could not load site'
  out.emails = Array.from(emails).slice(0, 6)
  out.linkedin_urls = Array.from(li).slice(0, 5)
  out.facebook_urls = Array.from(fb).slice(0, 5)
  out.owner_hints = Array.from(owners).slice(0, 5)
  out.language_signals = Array.from(lang).slice(0, 8)
  return out
}

function linkedInLinks(name: string, city?: string): { company_search: string; people_search: string } {
  return {
    company_search: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}`,
    people_search: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} owner ${city || ''}`.trim())}`,
  }
}

async function executeEnrich(input: any): Promise<Record<string, unknown>> {
  const name = String(input?.business_name || '').trim()
  if (!name) return { error: 'missing_name', message: 'business_name is required.' }
  const placeId = input?.place_id ? String(input.place_id) : await findPlaceId(name, input?.city, input?.state)
  const details = placeId ? await placeDetails(placeId) : null
  const knownRow = LAST_RESULTS.find((r) => r.business_name.toLowerCase() === name.toLowerCase())
  const website = (input?.website && String(input.website)) || details?.website || knownRow?.website || null
  const site = website ? await fetchWebsiteSignals(website) : ({ error: 'no website on file' } as WebsiteSignals)

  const reviewBlob = (details?.reviews || []).map((r) => r.text).join(' ').toLowerCase()
  const reviewSignals: string[] = []
  if (/\bthe owner\b|\bowner (?:drove|picked|was)\b/.test(reviewBlob)) reviewSignals.push('reviews mention "the owner" driving - owner-operated signal')
  if (/\b(?:driver|chauffeur)s\b|\bteam\b|\bfleet\b/.test(reviewBlob)) reviewSignals.push('reviews mention drivers/team/fleet - may be larger')
  const firstName = name.replace(/'s\b.*/, '').split(/\s+/)[0]?.toLowerCase()
  if (firstName && firstName.length > 2 && new RegExp(`\\b${firstName}\\b`).test(reviewBlob)) reviewSignals.push(`reviewers name "${titleCase(firstName)}" - likely the owner by name`)

  return {
    business_name: name,
    google: details ? { rating: details.rating, review_count: details.review_count, phone: details.phone, summary: details.editorial, hours: details.hours, reviews: details.reviews } : { error: 'no Google details found' },
    website: { url: website, ...site },
    review_text_signals: reviewSignals,
    linkedin: { note: 'We do NOT scrape LinkedIn (ToS). Open these to check yourself; also see linkedin_urls found on their site.', ...linkedInLinks(name, input?.city) },
    honesty_note: 'Solo-vs-fleet remains INFERRED. Use review text + site language as evidence, not proof.',
  }
}

const SYSTEM = `You are a private lead-search assistant for CloudGreet, used by the founder to find and qualify prospect businesses to hand to sales reps. You are not customer-facing.

WHAT CLOUDGREET SELLS: a 24/7 AI receptionist that answers calls and books jobs for service businesses while the owner is busy working.

IDEAL CUSTOMER PROFILE (ICP): solo owner-operator transport businesses - the "one driver / one owner" profile. Executive transport, black-car, airport car service, limo, point-to-point. SMALL operations (often just the owner driving), NOT large fleets. The pitch lands hardest on a single owner who can't answer the phone while driving - exactly like our flagship customer Steve French at SmartRide Central Ohio.

YOUR JOB:
- Turn casual requests into search_leads calls. Map "black car", "executive transport", "airport rides", "car service", "limo" to a good query. Always pass city + 2-letter state.
- If the request has NO location, ASK for it before searching - don't guess.
- Hold context across turns. "now only under 50 reviews", "now just Cleveland", "more like these" refine the previous search - re-call search_leads with adjusted parameters.
- Present results as a clean numbered list/table: business, phone, city, rating (review count), solo read. Scannable.

THE SOLO-OWNER TRUTH (honest, never fake certainty):
- Google Places does NOT expose number of drivers or "owner-operated". You CANNOT truly filter for solo. It's inferred from review count (fewer -> likelier solo) + name language (fleet/group/worldwide -> larger; possessive/"& Sons" -> owner-run), and from review text/website via enrich_lead.
- Always surface the confidence ("likely solo", "possibly solo", "likely larger/fleet", "unclear") and why. For "solo only", bias toward low-review non-fleet names (max_reviews ~50) but say it's a heuristic and to eyeball borderline ones. Never claim definitely solo.

TOOLS:
- search_leads: the Google Places search - the only way to FIND new businesses. Start here.
- enrich_lead: deep intel on ONE business - Google review TEXT, summary/hours, signals from their OWN website (owner/team/fleet language, emails, LinkedIn/FB links they posted), + LinkedIn search links to open. Use when the user wants detail on a lead, asks "is this really solo", or before drafting outreach. Review text is your best solo evidence.
- web_search: general web search (Anthropic-hosted, sanctioned). Confirm ownership, find their LinkedIn/site, news.

LINKEDIN: never present LinkedIn data as if scraped (we don't scrape it - ToS). Use web_search + any LinkedIn URL found on their own site + hand the user the LinkedIn search link. Never fabricate a profile or headcount.

OUTREACH (only when asked): lead with same-industry social proof - "I work with Steve French at SmartRide Central Ohio, a similar executive transport operation - we make sure he never misses a booking while he's driving." Warm, short, specific to a solo operator missing calls while driving. 3-5 sentences. Remind once that prospects are unverified and outreach is the founder's to review/send compliantly (TCPA/DNC downstream).

STYLE: concise, direct, founder-to-founder. Final answers plain - no filler, no restating instructions.`

// ---------------------------------------------------------------------------
// runTurn - one user turn through the tool-use loop. Returns the final
// assistant text. onStatus gets short progress lines (tool calls).
// `messages` is mutated in place so the caller keeps conversation state.
// ---------------------------------------------------------------------------
export async function runTurn(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  onStatus?: (line: string) => void,
): Promise<string> {
  const texts: string[] = []
  for (let hop = 0; hop < 8; hop++) {
    onStatus?.(hop === 0 ? 'thinking…' : 'reading what came back…')
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 2048, system: SYSTEM,
      tools: [SEARCH_TOOL, ENRICH_TOOL, WEB_SEARCH_TOOL], messages,
    })
    messages.push({ role: 'assistant', content: resp.content })
    // web_search runs server-side; surface that it happened.
    if (resp.content.some((b: any) => b.type === 'server_tool_use' && b.name === 'web_search')) onStatus?.('ran a web search')
    for (const block of resp.content) {
      if (block.type === 'text' && block.text.trim()) texts.push(block.text.trim())
    }
    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0) break
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      if (tu.name === 'search_leads') {
        const inp = tu.input as any
        onStatus?.(`searching "${inp?.query}" in ${inp?.city || '?'}, ${inp?.state || '?'}${inp?.max_reviews ? ` (≤${inp.max_reviews} reviews)` : ''}`)
        const out = await executeSearch(inp)
        onStatus?.(typeof (out as any)?.count === 'number' ? `found ${(out as any).count} leads — writing them up…` : 'search done — writing up…')
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) })
      } else if (tu.name === 'enrich_lead') {
        const inp = tu.input as any
        onStatus?.(`digging into ${inp?.business_name}: pulling reviews + their website…`)
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(await executeEnrich(inp)) })
        onStatus?.(`analyzing ${inp?.business_name}…`)
      } else {
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: 'unknown_tool' }), is_error: true })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }
  return texts.join('\n\n') || '(no response)'
}

export function buildCsv(rows: LeadRow[] = LAST_RESULTS): string {
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const header = ['business_name', 'phone', 'website', 'address', 'city', 'state', 'rating', 'review_count', 'solo_signal', 'solo_confidence', 'google_place_id']
  const lines = [header.join(',')]
  for (const r of rows) lines.push([r.business_name, r.phone, r.website, r.address, r.city, r.state, r.rating, r.review_count, r.solo.label, r.solo.confidence, r.google_place_id].map(esc).join(','))
  return lines.join('\n')
}
