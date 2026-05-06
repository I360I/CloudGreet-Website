/**
 * Website scraping for the agent-builder pipeline.
 *
 * Pulls a homepage + a small set of likely-relevant deeper pages
 * (about / services / contact / faq / pricing) via Cheerio. Bounded
 * by timeouts and per-page size caps so a sprawling marketing site
 * can't blow up the build.
 *
 * Output is plain text + a few extracted signals (title, h1s, phones,
 * emails, social links). The Claude generator does the actual reading
 * and sense-making; we just hand it clean source material.
 *
 * NOTE: this is intentionally separate from lib/lead-enrichment/website-scraper.ts
 * (which is contact-focused). Different shape, different needs - keep them
 * uncoupled so neither becomes a kitchen-sink helper.
 */

import * as cheerio from 'cheerio'
import { logger } from '@/lib/monitoring'

const FETCH_TIMEOUT_MS = 8_000
const MAX_BYTES_PER_PAGE = 600_000   // 600KB - chops giant pages
const MAX_PAGES_PER_SITE = 6
const USER_AGENT =
  'Mozilla/5.0 (compatible; CloudGreetAgentBuilder/1.0; +https://cloudgreet.com)'

const DISCOVERY_HINTS = [
  /about/i,
  /service/i,
  /what[-_]we[-_]do/i,
  /contact/i,
  /pricing|rates|cost/i,
  /faq|questions/i,
  /hours/i,
]

export type ScrapedPage = {
  url: string
  title: string | null
  text: string
  h1: string[]
  h2: string[]
}

export type WebsiteScrape = {
  ok: boolean
  origin: string
  pages: ScrapedPage[]
  /** Aggregated signals across all pages. */
  signals: {
    phones: string[]
    emails: string[]
    socials: { platform: string; url: string }[]
    /** Plain "Mon - Fri 8am - 6pm" style strings if found in nav/footer. */
    hoursHints: string[]
  }
  /** ms it took, for tuning. */
  ms: number
  errors: string[]
}

/**
 * Crawl up to MAX_PAGES_PER_SITE pages: the homepage and the most
 * relevant internal links discovered there.
 */
export async function scrapeWebsiteForAgent(rawUrl: string): Promise<WebsiteScrape> {
  const started = Date.now()
  const errors: string[] = []
  const url = normaliseUrl(rawUrl)
  if (!url) {
    return emptyScrape(rawUrl, ['Invalid URL'], started)
  }
  const origin = new URL(url).origin

  // 1. Fetch homepage.
  const home = await fetchPage(url)
  if (home.ok !== true) {
    return emptyScrape(origin, [`homepage: ${home.error}`], started)
  }

  const pages: ScrapedPage[] = [home.page]

  // 2. Discover candidate internal links from the homepage.
  const $ = cheerio.load(home.html)
  const candidates = new Map<string, number>() // url -> score
  $('a[href]').each((_i: number, el: any) => {
    const href = $(el).attr('href') || ''
    const abs = absoluteUrl(href, origin)
    if (!abs) return
    if (new URL(abs).origin !== origin) return
    if (abs === url) return
    const path = new URL(abs).pathname.toLowerCase()
    let score = 0
    for (const hint of DISCOVERY_HINTS) if (hint.test(path)) score += 2
    if (path.length < 40) score += 1   // shallow paths slightly preferred
    if (score > 0) {
      candidates.set(abs, Math.max(candidates.get(abs) ?? 0, score))
    }
  })

  const ranked = Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PAGES_PER_SITE - 1)
    .map(([href]) => href)

  // 3. Fetch in parallel with a small concurrency cap (5 pages,
  // already-bounded list, so just Promise.all).
  const deeper = await Promise.all(ranked.map(async (href) => {
    const r = await fetchPage(href)
    if (r.ok === true) return r.page
    errors.push(`${href}: ${r.error}`)
    return null
  }))
  for (const p of deeper) if (p) pages.push(p)

  // 4. Aggregate signals.
  const signals = aggregateSignals(pages)

  return {
    ok: true,
    origin,
    pages,
    signals,
    ms: Date.now() - started,
    errors,
  }
}

// -----------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------

async function fetchPage(href: string): Promise<
  | { ok: true; page: ScrapedPage; html: string }
  | { ok: false; error: string }
> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const r = await fetch(href, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.1' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
    const ctype = r.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml/i.test(ctype)) {
      return { ok: false, error: `non-HTML (${ctype})` }
    }
    const buf = await r.arrayBuffer()
    if (buf.byteLength > MAX_BYTES_PER_PAGE) {
      return { ok: false, error: `too large (${buf.byteLength} bytes)` }
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    const page = parsePage(href, html)
    return { ok: true, page, html }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'fetch failed'
    return { ok: false, error }
  } finally {
    clearTimeout(timer)
  }
}

function parsePage(url: string, html: string): ScrapedPage {
  const $ = cheerio.load(html)
  // Drop noise.
  $('script, style, noscript, iframe, svg, header nav, footer nav').remove()

  const title = ($('title').first().text() || '').trim() || null
  const h1: string[] = []
  $('h1').each((_i, el) => { const t = $(el).text().trim(); if (t) h1.push(t) })
  const h2: string[] = []
  $('h2').each((_i, el) => { const t = $(el).text().trim(); if (t) h2.push(t) })

  // Whitespace-collapsed body text. Tag-aware spacing so words don't run
  // into each other when divs are adjacent.
  $('br').replaceWith('\n')
  $('li, p, h3, h4, h5, h6, div').each((_i, el) => { $(el).append('\n') })
  const raw = $('body').text() || $.text()
  const text = raw
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 30_000) // hard cap per page in the context document

  return { url, title, text, h1: h1.slice(0, 8), h2: h2.slice(0, 16) }
}

function aggregateSignals(pages: ScrapedPage[]): WebsiteScrape['signals'] {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const socials = new Map<string, string>() // platform -> url
  const hoursHints = new Set<string>()

  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
  const phoneRe = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g
  const socialMap: Array<[RegExp, string]> = [
    [/(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\s"'<>]+/i, 'facebook'],
    [/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[^\s"'<>]+/i, 'instagram'],
    [/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s"'<>]+/i, 'linkedin'],
    [/(?:https?:\/\/)?(?:www\.)?twitter\.com\/[^\s"'<>]+/i, 'twitter'],
    [/(?:https?:\/\/)?(?:www\.)?yelp\.com\/[^\s"'<>]+/i, 'yelp'],
  ]
  // Crude: any short line that mentions a day name + a time range.
  const hoursRe = /\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*[^\n]{0,120}?(?:am|pm|a\.m|p\.m|24)\b/gi

  for (const p of pages) {
    const haystack = `${p.title || ''}\n${p.text}`
    for (const m of haystack.match(emailRe) || []) emails.add(m.toLowerCase())
    for (const m of haystack.match(phoneRe) || []) phones.add(normalisePhone(m))
    for (const [re, key] of socialMap) {
      const m = haystack.match(re)
      if (m && !socials.has(key)) socials.set(key, m[0])
    }
    for (const m of haystack.match(hoursRe) || []) {
      hoursHints.add(m.replace(/\s+/g, ' ').trim().slice(0, 120))
    }
  }

  return {
    phones: Array.from(phones).slice(0, 10),
    emails: Array.from(emails).slice(0, 10),
    socials: Array.from(socials.entries()).map(([platform, url]) => ({ platform, url })),
    hoursHints: Array.from(hoursHints).slice(0, 10),
  }
}

function normaliseUrl(raw: string): string | null {
  if (!raw) return null
  let u = raw.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const url = new URL(u)
    return url.toString()
  } catch {
    return null
  }
}

function absoluteUrl(href: string, origin: string): string | null {
  try {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null
    return new URL(href, origin).toString()
  } catch { return null }
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return raw.trim()
}

function emptyScrape(origin: string, errors: string[], started: number): WebsiteScrape {
  return {
    ok: false,
    origin,
    pages: [],
    signals: { phones: [], emails: [], socials: [], hoursHints: [] },
    ms: Date.now() - started,
    errors,
  }
}
