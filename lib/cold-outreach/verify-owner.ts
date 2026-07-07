import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { validateOwnerName } from '@/lib/cold-outreach/owner-enrich'
import { logger } from '@/lib/monitoring'

/*
 * AI owner-name verification. For each lead, read the business's own
 * website and have Claude confirm or correct the decision-maker name,
 * returning a confidence level. Result:
 *   owner_confidence: high | medium | low
 *   owner_source:     license | website_ai | unverified
 * so the leads UI can flag shaky names ("ask for the owner") instead of
 * presenting a guess as fact.
 *
 * Ceiling: this checks the name against what's PUBLIC on the site. It
 * can confirm/correct when the site names the owner, and say "low" when
 * it can't - it can't invent a name the web doesn't expose.
 */

const MODEL = 'claude-haiku-4-5'

type VerifyResult = {
  owner_name: string | null
  owner_confidence: 'high' | 'medium' | 'low'
  owner_source: 'license' | 'website_ai' | 'unverified'
}

// TX trades come from state license databases - the licensee IS the
// legal owner, so a matching-format name is authoritative even without
// a website. (business_type set by the license sources.)
const LICENSE_TRADES = new Set(['HVAC', 'Plumbing', 'Pest Control'])

export async function verifyOneLead(lead: {
  id: string; business_name: string | null; contact_name: string | null;
  website: string | null; city: string | null; business_type: string | null;
}): Promise<VerifyResult> {
  const candidate = (lead.contact_name || '').trim()
  const fromLicense = !!lead.business_type && LICENSE_TRADES.has(lead.business_type)

  // No website: trust a license name (authoritative), else unverified.
  let siteText = ''
  if (lead.website) {
    try {
      const scraped = await scrapeWebsite(lead.website)
      siteText = (scraped?.rawText || '').trim()
    } catch { /* fall through to no-site handling */ }
  }
  if (!siteText) {
    if (candidate && fromLicense) return { owner_name: candidate, owner_confidence: 'medium', owner_source: 'license' }
    return { owner_name: candidate || null, owner_confidence: 'low', owner_source: 'unverified' }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { owner_name: candidate || null, owner_confidence: candidate && fromLicense ? 'medium' : 'low', owner_source: fromLicense ? 'license' : 'unverified' }
  }

  try {
    const client = new Anthropic({ timeout: 20_000, maxRetries: 1 })
    const prompt = `You verify the OWNER / primary decision-maker of a small local business from its own website text.

Business: ${lead.business_name || 'unknown'}${lead.city ? ` (${lead.city})` : ''}
Candidate name on file: ${candidate || '(none)'}
Website text:
"""
${siteText.slice(0, 6000)}
"""

Return STRICT JSON only, no prose:
{"owner_name": "<full name or null>", "confidence": "high|medium|low", "matches_candidate": true|false}

Rules:
- owner_name = the owner/founder/president if the text clearly names them; else null.
- "high" only if the text explicitly ties a person to owner/founder/president/CEO.
- "medium" if a person is strongly implied (e.g. named on an About/Team page as principal).
- "low" if you're guessing or the text doesn't name an owner.
- matches_candidate = whether the candidate name is the same person as owner_name.`

    const resp = await client.messages.create({
      model: MODEL, max_tokens: 200, temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('')
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))

    const aiName = validateOwnerName(json.owner_name)
    const conf = (['high', 'medium', 'low'].includes(json.confidence) ? json.confidence : 'low') as VerifyResult['owner_confidence']

    // AI found a clear owner:
    if (aiName) {
      // Candidate agrees -> confirmed.
      if (candidate && (json.matches_candidate || sameNameish(candidate, aiName))) {
        return { owner_name: candidate, owner_confidence: conf === 'low' ? 'medium' : conf, owner_source: 'website_ai' }
      }
      // Candidate disagrees but AI is confident -> correct it.
      if (conf === 'high') return { owner_name: aiName, owner_confidence: 'high', owner_source: 'website_ai' }
      // AI unsure: keep a license candidate, else take the AI name at low conf.
      if (candidate && fromLicense) return { owner_name: candidate, owner_confidence: 'medium', owner_source: 'license' }
      return { owner_name: aiName, owner_confidence: 'low', owner_source: 'website_ai' }
    }

    // AI found no owner on the site.
    if (candidate && fromLicense) return { owner_name: candidate, owner_confidence: 'medium', owner_source: 'license' }
    return { owner_name: candidate || null, owner_confidence: 'low', owner_source: 'unverified' }
  } catch (e) {
    logger.warn('verify-owner: AI call failed', { leadId: lead.id, error: e instanceof Error ? e.message : 'unknown' })
    if (candidate && fromLicense) return { owner_name: candidate, owner_confidence: 'medium', owner_source: 'license' }
    return { owner_name: candidate || null, owner_confidence: 'low', owner_source: 'unverified' }
  }
}

/** Loose "same person" check: shared first + last token, case-insensitive. */
function sameNameish(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean)
  const wa = norm(a), wb = norm(b)
  if (!wa.length || !wb.length) return false
  return wa[0] === wb[0] && wa[wa.length - 1] === wb[wb.length - 1]
}

export type VerifyRun = { processed: number; confirmed: number; corrected: number; low: number }

export async function verifyOwnerNames(batch = 6): Promise<VerifyRun> {
  const run: VerifyRun = { processed: 0, confirmed: 0, corrected: 0, low: 0 }
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, website, city, business_type')
    .is('owner_verified_at', null)
    .not('contact_name', 'is', null)
    .neq('contact_name', '')
    .not('status', 'eq', 'disqualified')
    .order('created_at', { ascending: true })
    .limit(batch)

  for (const lead of (leads || []) as any[]) {
    run.processed += 1
    const before = (lead.contact_name || '').trim()
    const res = await verifyOneLead(lead)
    await supabaseAdmin.from('leads').update({
      contact_name: res.owner_name ?? '',
      owner_confidence: res.owner_confidence,
      owner_source: res.owner_source,
      owner_verified_at: new Date().toISOString(),
    }).eq('id', lead.id)
    if (res.owner_confidence === 'low') run.low += 1
    else if (res.owner_name && res.owner_name !== before) run.corrected += 1
    else run.confirmed += 1
  }
  return run
}
