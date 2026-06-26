import * as cheerio from 'cheerio'
import { scrapeWebsite } from './website-scraper'
import { logger } from '@/lib/monitoring'

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g

// Domains that belong to directories/platforms, not the actual business
const PLATFORM_DOMAINS = new Set([
  'yelp.com', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com',
  'manta.com', 'bbb.org', 'yellowpages.com', 'duckduckgo.com',
  'wix.com', 'wordpress.com', 'squarespace.com', 'godaddy.com',
  'angi.com', 'angieslist.com', 'thumbtack.com', 'homeadvisor.com',
  'superpages.com', 'mapquest.com', 'whitepages.com', 'bizapedia.com',
  'sentry.io', 'gravatar.com', 'example.com', 'amazonaws.com',
])

const JUNK_PREFIXES = /^(noreply|no-reply|donotreply|privacy|unsubscribe|bounce|mailer-daemon|postmaster)/i

export function isBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase()
  const [prefix, domain] = lower.split('@')
  if (!prefix || !domain) return false
  if (JUNK_PREFIXES.test(prefix)) return false
  // Check if domain or parent domain is a known platform
  const parts = domain.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    if (PLATFORM_DOMAINS.has(parts.slice(i).join('.'))) return false
  }
  return true
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractEmailsFromText(text: string): string[] {
  // Deobfuscate common patterns before regexing
  const clean = text
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s+AT\s+/g, '@')
    .replace(/\s*\[dot\]\s*/gi, '.')
    .replace(/\s*\(dot\)\s*/gi, '.')

  const matches = clean.match(EMAIL_REGEX) || []
  return Array.from(new Set(matches.filter(isBusinessEmail)))
}

// Source 1: DuckDuckGo HTML search
// Searches across all directories at once -- snippets often contain emails from BBB, YP, Manta, etc.
async function searchDuckDuckGo(businessName: string, city: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`"${businessName}" "${city}" email contact`)
    const html = await fetchHtml(`https://html.duckduckgo.com/html/?q=${query}`)
    if (!html) return null

    const $ = cheerio.load(html)
    // Extract text from result snippets only (not nav/footer which has DDG's own emails)
    const snippetText = $('.result__snippet, .result__body, .result__title').map((_, el) => $(el).text()).get().join('\n')
    const emails = extractEmailsFromText(snippetText)
    return emails[0] || null
  } catch (err) {
    logger.warn('multi-source: DDG search failed', { businessName, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// Source 2: Manta business directory
async function searchManta(businessName: string, city: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${businessName} ${city}`)
    const searchHtml = await fetchHtml(`https://www.manta.com/mb?search=${query}`)
    if (!searchHtml) return null

    const $ = cheerio.load(searchHtml)

    // Try to follow first result to its profile page
    const firstHref = $('h2 a, .company-name a, [data-automation="company-name"] a, .search-result-title a').first().attr('href')
    if (firstHref) {
      const profileUrl = firstHref.startsWith('http') ? firstHref : `https://www.manta.com${firstHref}`
      const profileHtml = await fetchHtml(profileUrl)
      if (profileHtml) {
        const profileEmails = extractEmailsFromText(cheerio.load(profileHtml)('body').text())
        if (profileEmails[0]) return profileEmails[0]
      }
    }

    // Fall back to emails visible directly on the search results page
    const emails = extractEmailsFromText($('body').text())
    return emails[0] || null
  } catch (err) {
    logger.warn('multi-source: Manta search failed', { businessName, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// Source 3: YellowPages
async function searchYellowPages(businessName: string, city: string): Promise<string | null> {
  try {
    const nameQ = encodeURIComponent(businessName)
    const cityQ = encodeURIComponent(city)
    const searchHtml = await fetchHtml(
      `https://www.yellowpages.com/search?search_terms=${nameQ}&geo_location_terms=${cityQ}`,
    )
    if (!searchHtml) return null

    const $ = cheerio.load(searchHtml)

    // Follow first business listing to its detail page
    const firstHref = $('a.business-name').first().attr('href')
    if (firstHref) {
      const detailUrl = firstHref.startsWith('http') ? firstHref : `https://www.yellowpages.com${firstHref}`
      const detailHtml = await fetchHtml(detailUrl)
      if (detailHtml) {
        const emails = extractEmailsFromText(cheerio.load(detailHtml)('body').text())
        if (emails[0]) return emails[0]
      }
    }

    return null
  } catch (err) {
    logger.warn('multi-source: YellowPages search failed', { businessName, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// Source 4: Superpages (old-school, very scraper-friendly, often has emails)
async function searchSuperpages(businessName: string, city: string): Promise<string | null> {
  try {
    const nameQ = encodeURIComponent(businessName)
    const cityQ = encodeURIComponent(city)
    const html = await fetchHtml(
      `https://www.superpages.com/search?search=${nameQ}&city=${cityQ}`,
    )
    if (!html) return null

    const $ = cheerio.load(html)

    // Follow first result
    const firstHref = $('a.business-name, .listing-name a').first().attr('href')
    if (firstHref) {
      const detailUrl = firstHref.startsWith('http') ? firstHref : `https://www.superpages.com${firstHref}`
      const detailHtml = await fetchHtml(detailUrl)
      if (detailHtml) {
        const emails = extractEmailsFromText(cheerio.load(detailHtml)('body').text())
        if (emails[0]) return emails[0]
      }
    }

    const emails = extractEmailsFromText($('body').text())
    return emails[0] || null
  } catch (err) {
    logger.warn('multi-source: Superpages search failed', { businessName, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export type LeadForEnrichment = {
  id: string
  business_name: string | null
  city: string | null
  website: string | null
}

export async function findLeadEmail(lead: LeadForEnrichment): Promise<string | null> {
  const sources: Array<Promise<string | null>> = []

  // Website scraper (existing) -- only if we have a URL
  if (lead.website) {
    sources.push(
      scrapeWebsite(lead.website)
        .then((r) => r.emails.find(isBusinessEmail) || null)
        .catch(() => null),
    )
  }

  // Directory sources -- only if we have business name + city
  if (lead.business_name && lead.city) {
    sources.push(
      searchDuckDuckGo(lead.business_name, lead.city),
      searchManta(lead.business_name, lead.city),
      searchYellowPages(lead.business_name, lead.city),
      searchSuperpages(lead.business_name, lead.city),
    )
  }

  if (sources.length === 0) return null

  // Run all sources concurrently, return first non-null
  const results = await Promise.allSettled(sources)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) return r.value
  }
  return null
}
