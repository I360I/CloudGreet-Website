import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

/**
 * POST /api/sales/scrape/ai-search  { query }
 *
 * Parses a natural-language lead request ("100 HVAC guys in Dallas")
 * into resolved scrape params, then the client fires the normal
 * POST /api/sales/scrape with them. Texas HVAC/plumbing/pest/electrical
 * route to the state license sources (so leads arrive WITH owner names);
 * everything else uses the generic ai_places Google source.
 */

// Texas license sources by trade -> arrive with owner names.
const TX_LICENSE_SOURCE: Record<string, string> = {
  hvac: 'tdlr_hvac',
  plumbing: 'tsbpe_plumbing',
  pest: 'tda_pest',
  electrical: 'tdlr_electrical',
}

function isTexas(state: string | null, city: string): boolean {
  if (state && state.toUpperCase() === 'TX') return true
  return /\b(tx|texas)\b/i.test(city)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { query?: string }
  const query = (body.query || '').trim()
  if (!query) return NextResponse.json({ error: 'Type what you want, e.g. "100 HVAC contractors in Dallas".' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI search is not configured.' }, { status: 503 })

  let parsed: { trade_key: string; places_query: string; trade_label: string; city: string; state: string | null; count: number }
  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 1 })
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 250, temperature: 0,
      messages: [{
        role: 'user',
        content: `Parse this lead-search request into JSON. Request: "${query}"

Return STRICT JSON only:
{"trade_key":"hvac|plumbing|pest|electrical|roofing|painting|handyman|landscaping|law|other",
 "places_query":"<google maps search term, e.g. 'hvac contractor'>",
 "trade_label":"<short Title Case label, e.g. 'HVAC'>",
 "city":"<city and state text as given, e.g. 'Dallas, TX'; empty string if none>",
 "state":"<2-letter US state or null>",
 "count":<integer 1-300, default 100>}

Rules:
- trade_key: closest match; use "other" for anything not listed.
- places_query: what you'd type into Google Maps to find these businesses.
- Infer state from the city when obvious (Dallas->TX, Miami->FL).`,
      }],
    })
    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('')
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  } catch (e) {
    logger.warn('ai-search parse failed', { query, error: e instanceof Error ? e.message : 'unknown' })
    return NextResponse.json({ error: "Couldn't understand that - try e.g. \"100 HVAC contractors in Dallas\"." }, { status: 422 })
  }

  const count = Math.max(1, Math.min(300, Number(parsed.count) || 100))
  const city = String(parsed.city || '').trim()
  const state = parsed.state ? String(parsed.state).toUpperCase().slice(0, 2) : null
  const tradeKey = String(parsed.trade_key || 'other').toLowerCase()

  // Route Texas license trades to their owner-name source.
  const licenseSource = isTexas(state, city) ? TX_LICENSE_SOURCE[tradeKey] : undefined

  const scrape = licenseSource
    ? { source: licenseSource, location: city || 'TX', limit: count }
    : {
        source: 'ai_places',
        location: city,
        limit: count,
        extra: { query: parsed.places_query || query, trade_label: parsed.trade_label || null },
      }

  return NextResponse.json({
    success: true,
    interpreted: {
      what: parsed.trade_label || parsed.places_query || query,
      where: city || 'nationwide',
      count,
      owner_names: !!licenseSource, // license sources come with owner names
    },
    scrape,
  })
}
