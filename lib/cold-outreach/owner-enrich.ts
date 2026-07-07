import { supabaseAdmin } from '@/lib/supabase'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { normalizeContactName } from '@/lib/scrapers/normalize'
import { logger } from '@/lib/monitoring'

/*
 * Website owner-name enrichment. Fills leads.contact_name for leads that
 * have a website but no decision-maker name (the case for everything
 * outside the Texas HVAC/plumbing/pest license DBs). Crawls the
 * business's own about/team/contact pages via scrapeWebsite (OpenAI
 * extraction in prod, manual fallback) and writes a validated human name.
 *
 * Marker: a lead that's been ATTEMPTED but yielded nothing gets
 * contact_name = '' (empty string, not null), so the null-filter never
 * re-crawls it - same pattern the email-enrich cron uses for email.
 */

// Words that show up in bad manual extractions ("serve home", "our team")
// and are never a person's name.
const JUNK_WORDS = new Set([
  'home', 'about', 'contact', 'team', 'services', 'service', 'our', 'us',
  'serve', 'welcome', 'menu', 'page', 'call', 'email', 'phone', 'now',
  'llc', 'inc', 'co', 'company', 'the', 'and', 'more', 'read', 'learn',
  'get', 'quote', 'free', 'today', 'owner', 'staff', 'here',
])

/**
 * Accept only strings that look like a real person's name: 2-3 words,
 * each alphabetic (allowing . - '), none of them junk words. Returns a
 * cleaned name or null.
 */
export function validateOwnerName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = String(raw).trim().replace(/\s+/g, ' ')
  if (t.length < 4 || t.length > 50) return null
  const words = t.split(' ')
  if (words.length < 2 || words.length > 4) return null
  for (const w of words) {
    if (!/^[A-Za-z][A-Za-z.'-]*$/.test(w)) return null
    if (JUNK_WORDS.has(w.toLowerCase())) return null
  }
  // Title-case it (websites vary: "JOHN SMITH", "john smith").
  const titled = words
    .map((w) => w.length <= 3 && w === w.toUpperCase() ? w // keep initials/suffixes like "JR"
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return normalizeContactName(titled) || titled
}

export type OwnerEnrichResult = { processed: number; found: number; failed: number }

export async function enrichOwnerNames(batch = 8): Promise<OwnerEnrichResult> {
  const result: OwnerEnrichResult = { processed: 0, found: 0, failed: 0 }

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, website, business_name')
    .is('contact_name', null)
    .not('website', 'is', null)
    .neq('website', '')
    .not('status', 'eq', 'disqualified')
    .order('created_at', { ascending: true })
    .limit(batch)

  for (const lead of (leads || []) as any[]) {
    result.processed += 1
    let name: string | null = null
    try {
      const scraped = await scrapeWebsite(lead.website)
      name = validateOwnerName(scraped?.ownerName)
    } catch (e) {
      logger.warn('owner-enrich: scrape failed', { leadId: lead.id, error: e instanceof Error ? e.message : 'unknown' })
    }
    // Write the name, or '' to mark it attempted-but-empty so we don't
    // re-crawl this lead forever.
    await supabaseAdmin.from('leads').update({ contact_name: name ?? '' }).eq('id', lead.id)
    if (name) result.found += 1
    else result.failed += 1
  }

  return result
}
