/**
 * APOLLO KILLER: Website Scraper
 * 
 * Extracts owner names, emails, phones from business websites
 * Uses AI to parse unstructured data from Contact/About pages
 */

import { logger } from '@/lib/monitoring'
import * as cheerio from 'cheerio'

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

/**
 * Scrape a business website for contact information
 */
export async function scrapeWebsite(websiteUrl: string): Promise<ScrapedContact> {
  try {
    const url = normalizeUrl(websiteUrl)
    
    // Scrape main pages
    const homePage = await scrapePage(url)
    const contactPage = await scrapePage(`${url}/contact`)
    const aboutPage = await scrapePage(`${url}/about`)
    const teamPage = await scrapePage(`${url}/team`)
    
    // Combine all data
    const allData = {
      emails: [
        ...homePage.emails,
        ...contactPage.emails,
        ...aboutPage.emails,
        ...teamPage.emails
      ].filter((e, i, arr) => arr.indexOf(e) === i), // unique
      
      phones: [
        ...homePage.phones,
        ...contactPage.phones,
        ...aboutPage.phones,
        ...teamPage.phones
      ].filter((p, i, arr) => arr.indexOf(p) === i), // unique
      
      linkedinUrls: [
        ...homePage.linkedinUrls,
        ...contactPage.linkedinUrls,
        ...aboutPage.linkedinUrls,
        ...teamPage.linkedinUrls
      ].filter((u, i, arr) => arr.indexOf(u) === i), // unique
      
      facebookUrls: [
        ...homePage.facebookUrls,
        ...contactPage.facebookUrls,
        ...aboutPage.facebookUrls,
        ...teamPage.facebookUrls
      ].filter((u, i, arr) => arr.indexOf(u) === i), // unique
      
      rawText: [
        aboutPage.text,
        teamPage.text,
        contactPage.text,
        homePage.text
      ].join('\n\n')
    }
    
    // Use AI to extract owner name and title from text
    const ownerInfo = await extractOwnerWithAI(allData.rawText)
    
    return {
      ownerName: ownerInfo.name,
      ownerTitle: ownerInfo.title,
      emails: allData.emails,
      phones: allData.phones,
      linkedinUrls: allData.linkedinUrls,
      facebookUrls: allData.facebookUrls,
      confidence: calculateConfidence(allData, ownerInfo),
      source: 'website_scrape'
    }
    
  } catch (error) {
    logger.error('Website scraping failed', {
      url: websiteUrl,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      emails: [],
      phones: [],
      linkedinUrls: [],
      facebookUrls: [],
      confidence: 0,
      source: 'website_scrape_failed'
    }
  }
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
        'User-Agent': 'CloudGreet Lead Enrichment Bot/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove script and style tags
    $('script, style, nav, footer, header').remove()
    
    const text = $('body').text().replace(/\s+/g, ' ').trim()
    
    return {
      emails: extractEmails(html),
      phones: extractPhones(html),
      linkedinUrls: extractLinkedIn(html),
      facebookUrls: extractFacebook(html),
      text: text.substring(0, 5000) // First 5000 chars
    }
    
  } catch (error) {
    return {
      emails: [],
      phones: [],
      linkedinUrls: [],
      facebookUrls: [],
      text: ''
    }
  }
}

/**
 * Extract emails from HTML
 */
function extractEmails(html: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = html.match(emailRegex) || []
  
  // Filter out common junk emails
  return matches
    .filter(email => !email.includes('example.com'))
    .filter(email => !email.includes('test@'))
    .filter(email => !email.includes('noreply'))
    .filter(email => !email.includes('no-reply'))
    .map(email => email.toLowerCase())
}

/**
 * Extract phone numbers from HTML
 */
function extractPhones(html: string): string[] {
  const phoneRegex = /(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
  const matches = html.match(phoneRegex) || []
  
  return matches.map(phone => {
    // Normalize to (XXX) XXX-XXXX format
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`
    } else if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`
    }
    return phone
  })
}

/**
 * Extract LinkedIn URLs
 */
function extractLinkedIn(html: string): string[] {
  const linkedinRegex = /https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/g
  return html.match(linkedinRegex) || []
}

/**
 * Extract Facebook URLs
 */
function extractFacebook(html: string): string[] {
  const facebookRegex = /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/g
  return html.match(facebookRegex) || []
}

/**
 * Use AI to extract owner name and title
 */
async function extractOwnerWithAI(text: string): Promise<{
  name?: string
  title?: string
}> {
  if (!text || text.length < 50) {
    return {}
  }
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return {}
    }
    
    const prompt = `Extract the business owner's name and title from this website text. Look for phrases like "owned by", "founded by", "owner", "president", "CEO", etc.

Website text:
${text.substring(0, 2000)}

Respond in JSON format:
{
  "name": "John Smith" or null,
  "title": "Owner" or "CEO" or null
}

If you can't find a clear owner, return null for both fields.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract structured data from unstructured text and return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 150
      })
    })
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (content) {
      const parsed = JSON.parse(content)
      return {
        name: parsed.name || undefined,
        title: parsed.title || undefined
      }
    }
    
    return {}
    
  } catch (error) {
    logger.error('AI owner extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown'
    })
    return {}
  }
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(data: any, ownerInfo: any): number {
  let score = 0
  
  // Email found
  if (data.emails.length > 0) score += 30
  if (data.emails.length > 2) score += 10
  
  // Phone found
  if (data.phones.length > 0) score += 20
  if (data.phones.length > 1) score += 5
  
  // Owner name found
  if (ownerInfo.name) score += 25
  
  // Owner title found
  if (ownerInfo.title) score += 10
  
  // Social media found
  if (data.linkedinUrls.length > 0) score += 10
  if (data.facebookUrls.length > 0) score += 5
  
  return Math.min(100, score)
}

/**
 * Normalize URL
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) {
    url = 'https://' + url
  }
  return url.replace(/\/$/, '') // Remove trailing slash
}

