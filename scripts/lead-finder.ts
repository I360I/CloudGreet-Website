/**
 * Personal conversational lead-search agent (CloudGreet, internal tool).
 *
 *   npx tsx --env-file=.env.local scripts/lead-finder.ts
 *
 * Chat with it in plain English to pull qualified transport prospects:
 *   "find me 20 solo black car services in Columbus OH"
 *   "now only ones with under 50 reviews"
 *   "draft outreach for these"
 *   "/csv"   -> export the last result set
 *
 * Architecture (3 pieces, per spec):
 *   1. Claude agent  - system prompt below; understands the solo-owner
 *      transport ICP and turns casual asks into search_leads params.
 *   2. search_leads tool - parameters map to what our EXISTING Google
 *      Places discovery (lib/scrapers/google-places.ts -> discoverPlaces)
 *      actually accepts. Same official Places API + review/rating/state
 *      filters the rep scraper already uses. Nothing new is scraped.
 *   3. This runner - sends messages to the Anthropic API, executes the
 *      search_leads tool against discoverPlaces, returns results to Claude,
 *      which formats + supports refinement.
 *
 * Honesty note baked in: Google Places does NOT expose "number of drivers"
 * or "owner-operated". The solo-owner read is INFERRED from review count +
 * business-name signals and is flagged with confidence, never asserted.
 *
 * ToS: official Google Places API only (via the existing discoverPlaces).
 * No Google/Facebook/LinkedIn page scraping. This tool only finds and
 * qualifies businesses; any outreach it drafts is for manual review/send.
 */

import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { writeFileSync } from 'node:fs'
import { discoverPlaces, isGooglePlacesConfigured } from '../lib/scrapers/google-places'
import { US_METROS, type UsMetro } from '../lib/scrapers/us-metros'

const MODEL = 'claude-opus-4-8'

// ---------------------------------------------------------------------------
// City -> coordinates. Reuses the same US_METROS table the rep scraper uses
// to fan out beyond Texas. discoverPlaces needs a lat/lng to restrict the
// search region (without one it silently defaults to a Texas rectangle), so
// we can only search metros present in that table. That's an honest limit we
// surface to the model rather than hide.
// ---------------------------------------------------------------------------
function resolveMetro(city: string, state?: string): UsMetro | null {
  let c = (city || '').trim().toLowerCase()
  // Strip a trailing STANDALONE state token (", oh" / " oh" / " oh.") only -
  // requires a separator before the 2 letters so we never chop the last two
  // characters off a real city name (the "columbus" -> "columb" bug).
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
// Solo-owner inference. Transparent and honest: Places gives us review_count,
// rating, business name, website presence and business_status - none of which
// say "one driver". We score from the signals that correlate and return BOTH
// a label and the raw signals so the model can explain its confidence.
// ---------------------------------------------------------------------------
const FLEET_NAME_RE = /\b(fleet|worldwide|global|nationwide|group|enterprises?|holdings|corporation|incorporated|industries|network|systems|company|companies)\b/i
const PERSONAL_NAME_RE = /\b([a-z]+(?:'s)|[a-z]+ ?& ?sons?|[a-z]+ ?and ?sons?)\b/i

type SoloSignal = {
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

  // Fleet name language is the strongest single signal toward "not solo".
  if (fleet && (rc == null || rc > 40)) {
    return { label: 'likely larger/fleet', confidence: 'medium', reasons }
  }
  if (rc != null) {
    if (rc <= 25) return { label: 'likely solo', confidence: personal && !fleet ? 'high' : 'medium', reasons }
    if (rc <= 75) return { label: 'possibly solo', confidence: 'low', reasons }
    return { label: 'likely larger/fleet', confidence: 'medium', reasons }
  }
  return { label: 'unclear', confidence: 'low', reasons }
}

// ---------------------------------------------------------------------------
// search_leads - the one tool. Its parameters are exactly what discoverPlaces
// supports (query / location-as-coords / review floor / rating floor / state
// allow-list / radius), plus max_reviews which we apply as a post-filter on
// the returned review_count (Places has no "max reviews" server param).
// ---------------------------------------------------------------------------
type LeadRow = {
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

const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_leads',
  description:
    'Search Google Places (the official Places API, same source our rep scraper uses) for transport/car-service businesses and return contactable leads with a solo-owner confidence read. Use for any "find me businesses" request. Returns name, phone, website, rating, review count, and an inferred solo-vs-fleet signal per result.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Business-type search text, NOT including the location. Examples: "black car service", "executive car service", "airport car service", "limousine service", "car service". Pick the phrasing that best matches the request.',
      },
      city: { type: 'string', description: 'US city to center the search on, e.g. "Columbus". Must be a major metro.' },
      state: { type: 'string', description: 'Two-letter state code, e.g. "OH".' },
      limit: { type: 'integer', description: 'How many leads to return (1-60). Default 20.' },
      min_reviews: { type: 'integer', description: 'Drop listings with fewer than this many Google reviews. Default 0. Raise to skip ghost listings.' },
      max_reviews: { type: 'integer', description: 'Drop listings with MORE than this many reviews. Use to bias toward small/solo operators (e.g. "under 50 reviews" -> 50).' },
      min_rating: { type: 'number', description: 'Minimum average star rating, 0-5. Optional.' },
      radius_miles: { type: 'integer', description: 'Search radius from the city center in miles. Default 30.' },
    },
    required: ['query', 'city', 'state'],
  },
}

async function executeSearch(input: any): Promise<Record<string, unknown>> {
  if (!isGooglePlacesConfigured()) {
    return { error: 'places_not_configured', message: 'GOOGLE_PLACES_API_KEY is not set in this environment.' }
  }
  const query = String(input?.query || '').trim()
  const city = String(input?.city || '').trim()
  const state = String(input?.state || '').trim().toUpperCase()
  if (!query || !city || !state) {
    return { error: 'missing_params', message: 'query, city, and state are all required.' }
  }
  const limit = Math.max(1, Math.min(60, Number(input?.limit) || 20))
  const minReviews = Math.max(0, Number(input?.min_reviews) || 0)
  const maxReviews = input?.max_reviews != null ? Math.max(0, Number(input.max_reviews)) : null
  const minRating = input?.min_rating != null ? Math.max(0, Math.min(5, Number(input.min_rating))) : 0
  const radiusMiles = Math.max(1, Math.min(60, Number(input?.radius_miles) || 30))

  const metro = resolveMetro(city, state)
  if (!metro) {
    return {
      error: 'city_not_supported',
      message: `"${city}, ${state}" isn't in our metro coordinate table, so I can't geo-restrict the search there. Try a major metro in that state (we can only search known metros). Examples in ${state}: ${US_METROS.filter((m) => m.state === state).map((m) => titleCase(m.name)).join(', ') || 'none on file'}.`,
    }
  }

  const radiusMeters = Math.round(radiusMiles * 1609.34)
  const seenIds = new Set<string>()
  const seenPhones = new Set<string>()
  const rows: LeadRow[] = []

  try {
    for await (const p of discoverPlaces(`${query} near ${metro.name} ${state}`, {
      maxResults: Math.min(60, limit * 3),
      includedType: undefined, // no reliable Places type for black-car/limo; rely on text query
      minReviewCount: minReviews,
      minRating,
      locationRestriction: { lat: metro.lat, lng: metro.lng, radiusMeters },
      stateAllowList: [state], // hard state filter, same mechanism the scraper uses
    })) {
      if (rows.length >= limit) break
      if (!p.phone) continue // need a phone to be a usable lead
      if (p.place_id && seenIds.has(p.place_id)) continue
      const phoneDigits = (p.phone || '').replace(/\D/g, '')
      if (phoneDigits && seenPhones.has(phoneDigits)) continue
      if (maxReviews != null && typeof p.review_count === 'number' && p.review_count > maxReviews) continue
      if (p.place_id) seenIds.add(p.place_id)
      if (phoneDigits) seenPhones.add(phoneDigits)
      rows.push({
        business_name: p.business_name,
        phone: p.phone,
        website: p.website,
        address: p.address,
        city: p.city,
        state: p.state,
        rating: p.rating,
        review_count: p.review_count,
        google_place_id: p.place_id,
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
    filters_applied: {
      query, city: titleCase(metro.name), state,
      limit, min_reviews: minReviews, max_reviews: maxReviews, min_rating: minRating, radius_miles: radiusMiles,
    },
    solo_owner_note:
      'solo signals are INFERRED from review count + business-name language (Places has no driver-count field). Treat labels as hints, not facts.',
    results: rows,
  }
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// System prompt - the lead-search assistant persona + ICP + honesty rules.
// ---------------------------------------------------------------------------
const SYSTEM = `You are a private lead-search assistant for CloudGreet, used by the founder to find and qualify prospect businesses to hand to sales reps. You are not customer-facing.

WHAT CLOUDGREET SELLS: a 24/7 AI receptionist that answers calls and books jobs for service businesses while the owner is busy working.

IDEAL CUSTOMER PROFILE (ICP) for this search tool: solo owner-operator transport businesses - the "one driver / one owner" profile. Executive transport, black-car, airport car service, limo, point-to-point. SMALL operations (often just the owner driving), NOT large fleets or franchises. The pitch lands hardest on a single owner who can't answer the phone because they're behind the wheel - exactly like our flagship customer Steve French at SmartRide Central Ohio.

YOUR JOB:
- Turn the founder's casual requests into search_leads calls. Map "black car", "executive transport", "airport rides", "car service", "limo" to a good query string. Always pass city + 2-letter state.
- If the request is missing a location, ASK for it before searching - don't guess a city.
- Hold context across turns. "now only under 50 reviews", "now just Cleveland", "more like these" all refine the previous search - re-call search_leads with the adjusted parameters.
- After results come back, present them as a clean numbered list: business name, phone, city, rating (review count), and the solo read. Keep it scannable.

THE SOLO-OWNER TRUTH (be honest, never fake certainty):
- Google Places does NOT expose number of drivers or "owner-operated". You CANNOT truly filter for solo. The tool infers it from review count (fewer reviews -> likelier small/solo) and business-name language (fleet/group/worldwide -> likelier larger; possessive or "& Sons" -> likelier owner-run).
- Always surface the confidence the tool returns ("likely solo", "possibly solo", "likely larger/fleet", "unclear") and, when useful, why. If the founder asks for "solo only", explain you're biasing toward low-review, non-fleet-named listings but he should eyeball the borderline ones. Never claim a business is definitely solo.
- A practical default for "solo" requests: set max_reviews around 50 and rank "likely solo" first, but say that's a heuristic.

OUTREACH (only when asked to draft it):
- Lead with same-industry social proof: "I work with Steve French at SmartRide Central Ohio, a similar executive transport operation - we make sure he never misses a booking while he's driving." Keep it warm, short, specific to a solo operator's pain (missing calls while driving). 3-5 sentences max.
- Remind the founder once that these are unverified prospects and outreach is his to review and send through compliant channels (TCPA/DNC apply downstream). Don't nag every time.

STYLE: concise, direct, founder-to-founder. Give the final answer plainly - no filler, no restating these instructions. When you call search_leads, you may say one short line about what you're searching.`

// ---------------------------------------------------------------------------
// Runner: tool-use loop + REPL.
// ---------------------------------------------------------------------------
async function runAgent(client: Anthropic, messages: Anthropic.MessageParam[]): Promise<void> {
  for (let hop = 0; hop < 8; hop++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      tools: [SEARCH_TOOL],
      messages,
    })
    messages.push({ role: 'assistant', content: resp.content })

    for (const block of resp.content) {
      if (block.type === 'text' && block.text.trim()) console.log('\n' + block.text.trim() + '\n')
    }

    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0) return

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      if (tu.name === 'search_leads') {
        const inp = tu.input as any
        process.stdout.write(`  …searching: "${inp?.query}" in ${inp?.city}, ${inp?.state}${inp?.max_reviews ? ` (≤${inp.max_reviews} reviews)` : ''}\n`)
        const result = await executeSearch(inp)
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) })
      } else {
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: 'unknown_tool' }), is_error: true })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }
  console.log('\n[stopped after too many tool hops]\n')
}

function exportCsv(filename?: string): void {
  if (!LAST_RESULTS.length) { console.log('\n  No results to export yet. Run a search first.\n'); return }
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['business_name', 'phone', 'website', 'address', 'city', 'state', 'rating', 'review_count', 'solo_signal', 'solo_confidence', 'google_place_id']
  const lines = [header.join(',')]
  for (const r of LAST_RESULTS) {
    lines.push([
      r.business_name, r.phone, r.website, r.address, r.city, r.state,
      r.rating, r.review_count, r.solo.label, r.solo.confidence, r.google_place_id,
    ].map(esc).join(','))
  }
  const safe = (LAST_QUERY_DESC || 'leads').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  const name = filename || `${process.env.HOME}/Downloads/leads-${safe}.csv`
  writeFileSync(name, lines.join('\n'))
  console.log(`\n  Exported ${LAST_RESULTS.length} leads -> ${name}\n`)
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY missing. Run with: npx tsx --env-file=.env.local scripts/lead-finder.ts'); process.exit(1) }
  if (!isGooglePlacesConfigured()) { console.error('GOOGLE_PLACES_API_KEY missing.'); process.exit(1) }

  const client = new Anthropic()
  const messages: Anthropic.MessageParam[] = []
  const rl = readline.createInterface({ input, output })

  console.log(`
CloudGreet Lead Finder  (model: ${MODEL})
Reuses the rep scraper's official Google Places search. Transport-ICP aware.

Try:  "find me 20 solo black car services in Columbus OH"
      "now only ones with under 50 reviews"
      "draft outreach for the top 5"
Commands:  /csv [path]   export last results    |    /quit
`)

  for (;;) {
    let line: string
    try {
      line = (await rl.question('you › ')).trim()
    } catch {
      break // stdin closed (EOF / Ctrl-D / piped input exhausted)
    }
    if (!line) continue
    if (line === '/quit' || line === '/exit') break
    if (line === '/help') { console.log('  /csv [path] to export, /quit to exit. Otherwise just talk.'); continue }
    if (line.startsWith('/csv')) { exportCsv(line.slice(4).trim() || undefined); continue }
    messages.push({ role: 'user', content: line })
    try {
      await runAgent(client, messages)
    } catch (e) {
      console.error('\n  [error] ' + (e instanceof Error ? e.message : String(e)) + '\n')
    }
  }
  rl.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
