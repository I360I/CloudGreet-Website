/**
 * APOLLO KILLER: LinkedIn Scraper
 * 
 * Advanced LinkedIn company/people scraping with anti-bot evasion
 * Extracts decision makers from company LinkedIn pages
 */

import { logger } from '@/lib/monitoring'
import * as cheerio from 'cheerio'

export interface LinkedInProfile {
  name: string
  title: string
  company: string
  profileUrl: string
  photoUrl?: string
  location?: string
  connectionDegree?: string
  verified: boolean
  email?: string
  phone?: string
  website?: string
  contactMethods?: string[]
}

export interface LinkedInCompany {
  name: string
  industry?: string
  size?: string
  headquarters?: string
  website?: string
  employees: LinkedInProfile[]
  verified: boolean
}

export interface LinkedInScrapingResult {
  company?: LinkedInCompany
  decisionMakers: LinkedInProfile[]
  confidence: number
  source: string
  limitations?: string[]
}

/**
 * Search for company and decision makers on LinkedIn
 */
export async function scrapeLinkedIn(
  companyName: string,
  businessType: string = '',
  location: string = ''
): Promise<LinkedInScrapingResult> {
  
  try {
    // Method 1: Try Google LinkedIn search (most reliable)
    const googleResults = await searchLinkedInViaGoogle(companyName, businessType, location)
    
    if (googleResults.decisionMakers.length > 0) {
      return googleResults
    }
    
    // Method 2: Try direct LinkedIn company search
    const directResults = await searchLinkedInDirect(companyName)
    
    if (directResults.decisionMakers.length > 0) {
      return directResults
    }
    
    // Method 3: Try Bing LinkedIn search (backup)
    const bingResults = await searchLinkedInViaBing(companyName, businessType)
    
    return bingResults
    
  } catch (error) {
    logger.error('LinkedIn scraping failed', {
      company: companyName,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      decisionMakers: [],
      confidence: 0,
      source: 'scraping_failed',
      limitations: ['LinkedIn scraping encountered errors']
    }
  }
}

/**
 * Method 1: Search LinkedIn via Google (most effective)
 * Google indexes LinkedIn pages and they're easier to scrape
 */
async function searchLinkedInViaGoogle(
  companyName: string,
  businessType: string,
  location: string
): Promise<LinkedInScrapingResult> {
  
  try {
    // Build search query for LinkedIn company pages
    const companyQuery = `site:linkedin.com/company/ "${companyName}" ${businessType}`
    // Enhanced query to find business owners and decision makers
    const peopleQuery = `site:linkedin.com/in/ "${companyName}" (CEO OR President OR Owner OR Founder OR Director OR Manager OR "Business Owner" OR "Company Owner" OR "Small Business Owner") ${location}`
    
    const results: LinkedInProfile[] = []
    
    // Search for company page
    const companyResults = await googleSearch(companyQuery)
    let company: LinkedInCompany | undefined
    
    if (companyResults.length > 0) {
      company = await scrapeLinkedInCompanyPage(companyResults[0].url)
    }
    
    // Search for people associated with the company
    const peopleResults = await googleSearch(peopleQuery)
    
    /**

    
     * for - Add description here

    
     * 

    
     * @param {...any} args - Method parameters

    
     * @returns {Promise<any>} Method return value

    
     * @throws {Error} When operation fails

    
     * 

    
     * @example

    
     * ```typescript

    
     * await this.for(param1, param2)

    
     * ```

    
     */

    
    for (const result of peopleResults.slice(0, 10)) { // Limit to first 10 results
      /**

       * if - Add description here

       * 

       * @param {...any} args - Method parameters

       * @returns {Promise<any>} Method return value

       * @throws {Error} When operation fails

       * 

       * @example

       * ```typescript

       * await this.if(param1, param2)

       * ```

       */

      if (result.url.includes('linkedin.com/in/')) {
        const profile = await scrapeLinkedInProfile(result.url, result.title, result.snippet)
        
        /**

        
         * if - Add description here

        
         * 

        
         * @param {...any} args - Method parameters

        
         * @returns {Promise<any>} Method return value

        
         * @throws {Error} When operation fails

        
         * 

        
         * @example

        
         * ```typescript

        
         * await this.if(param1, param2)

        
         * ```

        
         */

        
        if (profile && isDecisionMaker(profile.title)) {
          results.push(profile)
        }
      }
    }
    
    return {
      company,
      decisionMakers: results,
      confidence: calculateConfidence(results, company),
      source: 'google_linkedin_search',
      limitations: company ? [] : ['Company page not found']
    }
    
  } catch (error) {
    logger.error('Google LinkedIn search failed', {
      company: companyName,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      decisionMakers: [],
      confidence: 0,
      source: 'google_search_failed'
    }
  }
}

/**
 * Method 2: Direct LinkedIn search (higher risk of blocking)
 */
async function searchLinkedInDirect(companyName: string): Promise<LinkedInScrapingResult> {
  try {
    // This is more limited due to LinkedIn's anti-bot measures
    // We can only get basic public information
    
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive'
      }
    })
    
    if (!response.ok) {
      throw new Error(`LinkedIn returned ${response.status}`)
    }
    
    const html = await response.text()
    
    // LinkedIn heavily obfuscates their HTML, so this is limited
    const $ = cheerio.load(html)
    
    const results: LinkedInProfile[] = []
    
    // Try to extract any visible profile information
    $('[data-test-id*="people"], [data-test-id*="profile"]').each((_, element) => {
      try {
        const name = $(element).find('[data-test-id*="name"], .name').text().trim()
        const title = $(element).find('[data-test-id*="headline"], .headline').text().trim()
        const profileUrl = $(element).find('a[href*="/in/"]').attr('href')
        
        /**

        
         * if - Add description here

        
         * 

        
         * @param {...any} args - Method parameters

        
         * @returns {Promise<any>} Method return value

        
         * @throws {Error} When operation fails

        
         * 

        
         * @example

        
         * ```typescript

        
         * await this.if(param1, param2)

        
         * ```

        
         */

        
        if (name && title && profileUrl && isDecisionMaker(title)) {
          results.push({
            name: cleanName(name),
            title: cleanTitle(title),
            company: companyName,
            profileUrl: normalizeLinkedInUrl(profileUrl),
            verified: false // Can't verify from search results
          })
        }
      } catch (err) {
        // Skip malformed entries
      }
    })
    
    return {
      decisionMakers: results,
      confidence: results.length > 0 ? 60 : 0,
      source: 'linkedin_direct_search',
      limitations: ['Limited by LinkedIn anti-bot measures', 'May be incomplete']
    }
    
  } catch (error) {
    logger.error('Direct LinkedIn search failed', {
      company: companyName,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      decisionMakers: [],
      confidence: 0,
      source: 'linkedin_direct_failed',
      limitations: ['LinkedIn blocked or rate limited access']
    }
  }
}

/**
 * Method 3: Search LinkedIn via Bing (backup method)
 */
async function searchLinkedInViaBing(
  companyName: string,
  businessType: string
): Promise<LinkedInScrapingResult> {
  
  try {
    const query = `site:linkedin.com/in/ "${companyName}" (CEO OR President OR Owner) ${businessType}`
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const results: LinkedInProfile[] = []
    
    // Parse Bing search results
    $('#b_results .b_algo').each((_, element) => {
      try {
        const titleElement = $(element).find('h2 a')
        const title = titleElement.text().trim()
        const url = titleElement.attr('href')
        const snippet = $(element).find('.b_caption p').text().trim()
        
        /**

        
         * if - Add description here

        
         * 

        
         * @param {...any} args - Method parameters

        
         * @returns {Promise<any>} Method return value

        
         * @throws {Error} When operation fails

        
         * 

        
         * @example

        
         * ```typescript

        
         * await this.if(param1, param2)

        
         * ```

        
         */

        
        if (url && url.includes('linkedin.com/in/')) {
          const profile = extractProfileFromBingResult(title, url, snippet, companyName)
          
          /**

          
           * if - Add description here

          
           * 

          
           * @param {...any} args - Method parameters

          
           * @returns {Promise<any>} Method return value

          
           * @throws {Error} When operation fails

          
           * 

          
           * @example

          
           * ```typescript

          
           * await this.if(param1, param2)

          
           * ```

          
           */

          
          if (profile && isDecisionMaker(profile.title)) {
            results.push(profile)
          }
        }
      } catch (err) {
        // Skip malformed entries
      }
    })
    
    return {
      decisionMakers: results,
      confidence: results.length > 0 ? 70 : 0,
      source: 'bing_linkedin_search',
      limitations: results.length === 0 ? ['No decision makers found via Bing'] : []
    }
    
  } catch (error) {
    logger.error('Bing LinkedIn search failed', {
      company: companyName,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    
    return {
      decisionMakers: [],
      confidence: 0,
      source: 'bing_search_failed'
    }
  }
}

/**
 * Google search helper
 */
async function googleSearch(query: string): Promise<Array<{url: string, title: string, snippet: string}>> {
  try {
    // Note: This would need a Google Custom Search API key for production
    // For now, return empty results with proper error handling
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Google search failed: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const results: Array<{url: string, title: string, snippet: string}> = []
    
    // Parse Google search results
    $('[data-ved] h3').parent().each((_, element) => {
      try {
        const titleElement = $(element).find('h3')
        const title = titleElement.text().trim()
        const url = $(element).attr('href') || ''
        const snippet = $(element).parent().find('[data-ved]').next().text().trim()
        
        /**

        
         * if - Add description here

        
         * 

        
         * @param {...any} args - Method parameters

        
         * @returns {Promise<any>} Method return value

        
         * @throws {Error} When operation fails

        
         * 

        
         * @example

        
         * ```typescript

        
         * await this.if(param1, param2)

        
         * ```

        
         */

        
        if (title && url && url.includes('linkedin.com')) {
          results.push({ url, title, snippet })
        }
      } catch (err) {
        // Skip malformed entries
      }
    })
    
    return results.slice(0, 10) // Limit results
    
  } catch (error) {
    logger.error('Google search failed', {
      query,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    return []
  }
}

/**
 * Scrape LinkedIn company page (limited by anti-bot measures)
 */
async function scrapeLinkedInCompanyPage(url: string): Promise<LinkedInCompany | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    
    if (!response.ok) {
      return undefined
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Extract basic company info (limited by LinkedIn's structure)
    const name = $('h1').first().text().trim()
    const industry = $('.company-industries').text().trim()
    const size = $('.company-size').text().trim()
    
    return {
      name: name || 'Unknown Company',
      industry: industry || undefined,
      size: size || undefined,
      employees: [], // Would need separate API calls to get employees
      verified: false
    }
    
  } catch (error) {
    logger.error('LinkedIn company page scraping failed', {
      url,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    return undefined
  }
}

/**
 * Scrape individual LinkedIn profile (very limited due to auth requirements)
 */
async function scrapeLinkedInProfile(
  url: string, 
  searchTitle: string, 
  searchSnippet: string
): Promise<LinkedInProfile | undefined> {
  
  try {
    // Most LinkedIn profiles require login, so we extract what we can from search results
    const profile = extractProfileFromSearchResult(searchTitle, url, searchSnippet)
    
    if (profile) {
      return profile
    }
    
    // Try to fetch the public profile (limited success)
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Try to extract public information
      const name = $('[data-test-id*="name"], .name, h1').first().text().trim()
      const title = $('[data-test-id*="headline"], .headline, .sub-nav').first().text().trim()
      
      /**

      
       * if - Add description here

      
       * 

      
       * @param {...any} args - Method parameters

      
       * @returns {Promise<any>} Method return value

      
       * @throws {Error} When operation fails

      
       * 

      
       * @example

      
       * ```typescript

      
       * await this.if(param1, param2)

      
       * ```

      
       */

      
      if (name && title) {
        // Extract contact information from the page
        const contactInfo = extractContactInfo($)
        
        return {
          name: cleanName(name),
          title: cleanTitle(title),
          company: extractCompanyFromTitle(title),
          profileUrl: url,
          verified: false,
          email: contactInfo.email,
          phone: contactInfo.phone,
          website: contactInfo.website,
          contactMethods: contactInfo.contactMethods
        }
      }
    }
    
    return undefined
    
  } catch (error) {
    // Many LinkedIn profiles are behind auth, so this is expected to fail often
    return extractProfileFromSearchResult(searchTitle, url, searchSnippet)
  }
}

/**
 * Extract contact information from LinkedIn profile page
 */
function extractContactInfo($: cheerio.CheerioAPI): {
  email?: string
  phone?: string
  website?: string
  contactMethods: string[]
} {
  const contactMethods: string[] = []
  let email: string | undefined
  let phone: string | undefined
  let website: string | undefined
  
  // Look for contact information in various sections
  const text = $('body').text()
  
  // Extract email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = text.match(emailRegex)
  if (emails && emails.length > 0) {
    email = emails[0]
    contactMethods.push('email')
  }
  
  // Extract phone numbers
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
  const phones = text.match(phoneRegex)
  if (phones && phones.length > 0) {
    phone = phones[0]
    contactMethods.push('phone')
  }
  
  // Extract website URLs
  const websiteRegex = /https?:\/\/[^\s]+/g
  const websites = text.match(websiteRegex)
  if (websites && websites.length > 0) {
    // Filter out LinkedIn URLs and common social media
    const filteredWebsites = websites.filter(url => 
      !url.includes('linkedin.com') && 
      !url.includes('facebook.com') && 
      !url.includes('twitter.com') &&
      !url.includes('instagram.com')
    )
    if (filteredWebsites.length > 0) {
      website = filteredWebsites[0]
      contactMethods.push('website')
    }
  }
  
  return { email, phone, website, contactMethods }
}

/**
 * Extract profile info from search engine results
 */
function extractProfileFromSearchResult(
  searchTitle: string, 
  url: string, 
  snippet: string
): LinkedInProfile | undefined {
  
  try {
    // LinkedIn search results often have format: "Name - Title at Company | LinkedIn"
    const nameMatch = searchTitle.match(/^([^-]+?)(?:\s*-\s*(.+?))?\s*\|\s*LinkedIn$/i)
    
    if (nameMatch) {
      const name = nameMatch[1].trim()
      const titlePart = nameMatch[2]?.trim() || ''
      
      // Extract title and company from the title part
      let title = ''
      let company = ''
      
      /**

      
       * if - Add description here

      
       * 

      
       * @param {...any} args - Method parameters

      
       * @returns {Promise<any>} Method return value

      
       * @throws {Error} When operation fails

      
       * 

      
       * @example

      
       * ```typescript

      
       * await this.if(param1, param2)

      
       * ```

      
       */

      
      if (titlePart.includes(' at ')) {
        const parts = titlePart.split(' at ')
        title = parts[0].trim()
        company = parts.slice(1).join(' at ').trim()
      } else if (titlePart.includes(' | ')) {
        const parts = titlePart.split(' | ')
        title = parts[0].trim()
        company = parts[1]?.trim() || ''
      } else {
        title = titlePart
        company = extractCompanyFromSnippet(snippet)
      }
      
      /**

      
       * if - Add description here

      
       * 

      
       * @param {...any} args - Method parameters

      
       * @returns {Promise<any>} Method return value

      
       * @throws {Error} When operation fails

      
       * 

      
       * @example

      
       * ```typescript

      
       * await this.if(param1, param2)

      
       * ```

      
       */

      
      if (name && (title || company)) {
        return {
          name: cleanName(name),
          title: cleanTitle(title),
          company: company || 'Unknown Company',
          profileUrl: normalizeLinkedInUrl(url),
          verified: false
        }
      }
    }
    
    return undefined
    
  } catch (error) {
    return undefined
  }
}

/**
 * Extract profile info from Bing search result
 */
function extractProfileFromBingResult(
  title: string,
  url: string,
  snippet: string,
  companyName: string
): LinkedInProfile | undefined {
  
  try {
    const nameMatch = title.match(/^([^-|]+)/)?.[1]?.trim()
    const titleMatch = snippet.match(/(?:^|\s)((?:CEO|President|Owner|Manager|Director|VP|Chief)[^.]*)/i)?.[1]?.trim()
    
    if (nameMatch && titleMatch) {
      return {
        name: cleanName(nameMatch),
        title: cleanTitle(titleMatch),
        company: companyName,
        profileUrl: normalizeLinkedInUrl(url),
        verified: false
      }
    }
    
    return undefined
    
  } catch (error) {
    return undefined
  }
}

/**
 * Helper functions
 */

function isDecisionMaker(title: string): boolean {
  const decisionMakerTitles = [
    'ceo', 'president', 'owner', 'founder', 'principal', 'partner',
    'director', 'manager', 'vp', 'vice president', 'chief', 'head of',
    'lead', 'supervisor', 'coordinator', 'business owner', 'company owner',
    'small business owner', 'co-founder', 'managing director', 'general manager',
    'operations manager', 'sales manager', 'marketing manager', 'hr manager',
    'finance manager', 'executive', 'administrator'
  ]
  
  const normalizedTitle = title.toLowerCase()
  return decisionMakerTitles.some(keyword => normalizedTitle.includes(keyword))
}

function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .trim()
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/\|\s*LinkedIn.*$/i, '')
    .trim()
}

function extractCompanyFromTitle(title: string): string {
  const atMatch = title.match(/\s+at\s+(.+)$/i)
  return atMatch?.[1]?.trim() || 'Unknown Company'
}

function extractCompanyFromSnippet(snippet: string): string {
  // Try to find company name in snippet
  const patterns = [
    /works?\s+at\s+([^.]+)/i,
    /employed\s+by\s+([^.]+)/i,
    /\s+at\s+([A-Z][^.]+)/
  ]
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  return ''
}

function normalizeLinkedInUrl(url: string): string {
  if (url.startsWith('/')) {
    return 'https://linkedin.com' + url
  }
  return url
}

function calculateConfidence(profiles: LinkedInProfile[], company?: LinkedInCompany): number {
  let score = 0
  
  // Base score for finding profiles
  score += profiles.length * 20
  
  // Bonus for finding company
  if (company) score += 20
  
  // Bonus for verified profiles
  const verifiedCount = profiles.filter(p => p.verified).length
  score += verifiedCount * 10
  
  // Bonus for decision maker titles
  const decisionMakerCount = profiles.filter(p => isDecisionMaker(p.title)).length
  score += decisionMakerCount * 15
  
  return Math.min(100, score)
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ]
  
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}
