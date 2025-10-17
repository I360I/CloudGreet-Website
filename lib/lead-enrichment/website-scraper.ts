import { logger } from '@/lib/monitoring'
import * as cheerio from 'cheerio'
import { retryWebsiteScrape, circuitBreakers, createFallbackResult } from './retry-handler'

export interface ScrapedContact {
  ownerName?: string
  ownerTitle?: string
  emails: string[]
  phones: string[]
  linkedinUrls: string[]
  facebookUrls: string[]
  confidence: number
  source: string
}

export async function scrapeWebsite(websiteUrl: string): Promise<ScrapedContact> {
  return circuitBreakers.websiteScraping.execute(async () => {
    return retryWebsiteScrape(async () => {
      const url = normalizeUrl(websiteUrl)
      
      // Scrape main pages with individual error handling
      const [homePage, contactPage, aboutPage, teamPage] = await Promise.allSettled([
        scrapePage(url),
        scrapePage(`${url}/contact`),
        scrapePage(`${url}/about`),
        scrapePage(`${url}/team`)
      ])
      
      // Extract successful results and track failures
      const results = {
        homePage: homePage.status === 'fulfilled' ? homePage.value : getEmptyPageResult(),
        contactPage: contactPage.status === 'fulfilled' ? contactPage.value : getEmptyPageResult(),
        aboutPage: aboutPage.status === 'fulfilled' ? aboutPage.value : getEmptyPageResult(),
        teamPage: teamPage.status === 'fulfilled' ? teamPage.value : getEmptyPageResult()
      }
      
      const failures = [homePage, contactPage, aboutPage, teamPage]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message)
    
      // Combine all data
      const allData = {
        emails: [
          ...results.homePage.emails,
          ...results.contactPage.emails,
          ...results.aboutPage.emails,
          ...results.teamPage.emails
        ].filter((e, i, arr) => arr.indexOf(e) === i), // unique
        
        phones: [
          ...results.homePage.phones,
          ...results.contactPage.phones,
          ...results.aboutPage.phones,
          ...results.teamPage.phones
        ].filter((p, i, arr) => arr.indexOf(p) === i), // unique
        
        linkedinUrls: [
          ...results.homePage.linkedinUrls,
          ...results.contactPage.linkedinUrls,
          ...results.aboutPage.linkedinUrls,
          ...results.teamPage.linkedinUrls
        ].filter((u, i, arr) => arr.indexOf(u) === i), // unique
        
        facebookUrls: [
          ...results.homePage.facebookUrls,
          ...results.contactPage.facebookUrls,
          ...results.aboutPage.facebookUrls,
          ...results.teamPage.facebookUrls
        ].filter((u, i, arr) => arr.indexOf(u) === i), // unique
        
        rawText: [
          results.aboutPage.text,
          results.teamPage.text,
          results.contactPage.text,
          results.homePage.text
        ].join('\n\n')
      }
    
      // Use AI to extract owner name and title from text
      const ownerInfo = await extractOwnerWithAI(allData.rawText)
      
      const result = {
        ownerName: ownerInfo.name,
        ownerTitle: ownerInfo.title,
        emails: allData.emails,
        phones: allData.phones,
        linkedinUrls: allData.linkedinUrls,
        facebookUrls: allData.facebookUrls,
        confidence: calculateConfidence(allData, ownerInfo, failures.length),
        source: failures.length > 0 ? 'website_scrape_partial' : 'website_scrape'
      }
      
      // Add degradation info if some pages failed
      if (failures.length > 0) {
        return createFallbackResult(result, result, failures)
      }
      
      return result
    }, websiteUrl)
  })
}

/**
 * Scrape a single page
 */
async function scrapePage(url: string): Promise<{
  emails: string[]
  phones: string[]
  linkedinUrls: string[]
  facebookUrls: string[]
  text: string
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract emails
    const emails: string[] = []
    $('*').each((_, element) => {
      const text = $(element).text()
      const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
      if (emailMatches) {
        emails.push(...emailMatches)
      }
    })

    // Extract phone numbers
    const phones: string[] = []
    $('*').each((_, element) => {
      const text = $(element).text()
      const phoneMatches = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g)
      if (phoneMatches) {
        phones.push(...phoneMatches.map(p => normalizePhone(p)))
      }
    })

    // Extract LinkedIn URLs
    const linkedinUrls: string[] = []
    $('a[href*="linkedin.com"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        linkedinUrls.push(href)
      }
    })

    // Extract Facebook URLs
    const facebookUrls: string[] = []
    $('a[href*="facebook.com"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        facebookUrls.push(href)
      }
    })

    // Extract text content
    const text = $('body').text().replace(/\s+/g, ' ').trim()

    return {
      emails: Array.from(new Set(emails)), // remove duplicates
      phones: Array.from(new Set(phones)), // remove duplicates
      linkedinUrls: Array.from(new Set(linkedinUrls)),
      facebookUrls: Array.from(new Set(facebookUrls)),
      text
    }

  } catch (error) {
    logger.error('Failed to scrape page', { url, error: error instanceof Error ? error.message : 'Unknown' })
    throw error
  }
}

/**
 * Normalize URL format
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

/**
 * Normalize phone number format
 */
function normalizePhone(phone: string): string {
  // Extract digits and format as (XXX) XXX-XXXX
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

/**
 * Extract owner information using AI
 */
async function extractOwnerWithAI(text: string): Promise<{ name?: string; title?: string }> {
  try {
    const { OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract the business owner/CEO/founder name and title from the following text. Return only a JSON object with "name" and "title" fields, or null values if not found.'
        },
        {
          role: 'user',
          content: text.slice(0, 4000) // Limit text length
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        return JSON.parse(content)
      } catch {
        // If JSON parsing fails, try to extract manually
        return extractOwnerManually(text)
      }
    }

    return { name: undefined, title: undefined }

  } catch (error) {
    logger.error('AI owner extraction failed', { error: error instanceof Error ? error.message : 'Unknown' })
    return extractOwnerManually(text)
  }
}

/**
 * Manual owner extraction as fallback
 */
function extractOwnerManually(text: string): { name?: string; title?: string } {
  const ownerPatterns = [
    /(?:owner|founder|ceo|president|manager|director):\s*([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    /([A-Z][a-z]+ [A-Z][a-z]+),?\s*(?:owner|founder|ceo|president|manager|director)/gi
  ]

  for (const pattern of ownerPatterns) {
    const match = pattern.exec(text)
    if (match) {
      return {
        name: match[1] || match[0],
        title: 'Owner'
      }
    }
  }

  return { name: undefined, title: undefined }
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(
  data: { emails: string[]; phones: string[]; linkedinUrls: string[]; facebookUrls: string[] },
  ownerInfo: { name?: string; title?: string },
  failureCount: number
): number {
  let score = 0

  // Email found: +30 points
  if (data.emails.length > 0) score += 30

  // Phone found: +25 points
  if (data.phones.length > 0) score += 25

  // Owner name found: +25 points
  if (ownerInfo.name) score += 25

  // LinkedIn found: +10 points
  if (data.linkedinUrls.length > 0) score += 10

  // Facebook found: +5 points
  if (data.facebookUrls.length > 0) score += 5

  // Owner title found: +5 points
  if (ownerInfo.title) score += 5

  // Penalty for failures: -10 points per failure
  score -= failureCount * 10

  return Math.max(0, Math.min(100, score))
}

/**
 * Get empty page result for failed scrapes
 */
function getEmptyPageResult() {
  return {
    emails: [],
    phones: [],
    linkedinUrls: [],
    facebookUrls: [],
    text: ''
  }
}