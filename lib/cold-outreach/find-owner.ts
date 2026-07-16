import { validateOwnerName } from './owner-enrich'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { logger } from '@/lib/monitoring'

/*
 * On-demand "find the owner" lookup for the leads workspace button.
 *
 * A rep clicks "Find owner" on a lead; this returns the owner's real name
 * so they can ask for them BY NAME and walk past the gatekeeper, instead
 * of asking a receptionist for "the owner".
 *
 * GROUNDED, not guessed: it uses Gemini WITH Google Search grounding, so
 * the model searches the web (the business's own site, its Google
 * listing, state license records, LinkedIn) and answers from what it
 * finds - it does NOT hallucinate a name. When nothing real turns up it
 * returns name=null so the rep knows to just ask, rather than confidently
 * asking for a made-up "Mike". Falls back to scraping the business
 * website if grounding is unavailable.
 *
 * Cheap: one on-demand LLM text call per click, cached on the lead
 * (leads.owner_verified_at) so a repeat click is free. Nothing like the
 * Places API - this can't run away.
 */

export type FoundOwner = {
  name: string | null
  title: string | null
  confidence: 'high' | 'medium' | 'low'
  source: string // human-readable, e.g. 'business website', 'state license record', 'not_found'
}

const GEMINI_MODEL = process.env.GEMINI_OWNER_MODEL || 'gemini-2.0-flash'

async function geminiGroundedOwner(input: {
  businessName: string; city?: string | null; state?: string | null; website?: string | null
}): Promise<FoundOwner | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const loc = [input.city, input.state].filter(Boolean).join(', ')
  const prompt = `You help a sales rep find the OWNER (or primary decision-maker) of a small local business, so they can ask for that person by name and get past a receptionist.

Business: ${input.businessName}${loc ? `\nLocation: ${loc}` : ''}${input.website ? `\nWebsite: ${input.website}` : ''}

Search the web - the business's own website/about page, its Google Business listing, state contractor license records, LinkedIn, local news - and find the owner's real full name. Only report a name you actually find a source for. If you cannot find a real name, say so. Do NOT guess or invent a name.

Respond with ONLY a JSON object, no other text:
{"name": "<full name, or null if none found>", "title": "<owner/president/etc, or null>", "confidence": "high|medium|low", "source": "<short phrase, e.g. 'business website', 'state license record', 'google listing'>"}
Use confidence "high" only when an authoritative source clearly names them as owner, "medium" when reasonably inferred, "low" when uncertain. If no name is found: name=null, confidence="low".`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    )
    if (!res.ok) {
      logger.warn('find-owner: gemini http error', { status: res.status })
      return null
    }
    const j = await res.json()
    const text: string = (j?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text).filter(Boolean).join('') || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])
    const validated = validateOwnerName(parsed?.name)
    if (!validated) return { name: null, title: null, confidence: 'low', source: 'not_found' }

    const conf = ['high', 'medium', 'low'].includes(parsed?.confidence) ? parsed.confidence : 'medium'
    const source = typeof parsed?.source === 'string' && parsed.source.trim()
      ? parsed.source.trim().slice(0, 60) : 'web search'
    return {
      name: validated,
      title: typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 40) : null,
      confidence: conf,
      source,
    }
  } catch (e) {
    logger.warn('find-owner: gemini failed', { error: e instanceof Error ? e.message : 'unknown' })
    return null
  }
}

export async function findOwner(input: {
  businessName: string; city?: string | null; state?: string | null; website?: string | null
}): Promise<FoundOwner> {
  // 1. Grounded web lookup - works even with no website (most small shops).
  const web = await geminiGroundedOwner(input)
  if (web?.name) return web

  // 2. Website-scrape fallback when grounding found nothing but a site exists.
  if (input.website) {
    try {
      const scraped = await scrapeWebsite(input.website)
      const name = validateOwnerName(scraped?.ownerName)
      if (name) return { name, title: null, confidence: 'medium', source: 'business website' }
    } catch { /* non-fatal */ }
  }

  // 3. Nothing real found - tell the rep honestly.
  return { name: null, title: null, confidence: 'low', source: 'not_found' }
}
