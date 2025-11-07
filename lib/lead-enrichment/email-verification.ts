/**
 * APOLLO KILLER: Email Discovery & Verification
 * 
 * Discovers owner emails using common patterns
 * Verifies emails are valid and deliverable
 */

import { logger } from '@/lib/monitoring'
import { retryEmailVerification, retryAPICall } from './retry-handler'

export interface EmailCandidate {
  email: string
  pattern: string
  confidence: number
  verified: boolean
  verificationMethod: string
}

/**
 * Discover and verify owner email addresses
 */
export async function discoverAndVerifyEmail(
  ownerName: string | undefined,
  businessName: string,
  domain: string
): Promise<EmailCandidate[]> {
  
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

  
  if (!domain) {
    return []
  }
  
  const domain_clean = cleanDomain(domain)
  const candidates: EmailCandidate[] = []
  
  // Generate email patterns
  const patterns = generateEmailPatterns(ownerName, domain_clean)
  
  // Verify each pattern
  for (const pattern of patterns) {
    const verification = await verifyEmail(pattern.email)
    
    candidates.push({
      ...pattern,
      verified: verification.isValid,
      verificationMethod: verification.method
    })
  }
  
  // Sort by confidence (verified + high confidence first)
  return candidates.sort((a, b) => {
    const scoreA = (a.verified ? 100 : 0) + a.confidence
    const scoreB = (b.verified ? 100 : 0) + b.confidence
    return scoreB - scoreA
  })
}

/**
 * Generate common email patterns
 */
function generateEmailPatterns(ownerName: string | undefined, domain: string): Array<{
  email: string
  pattern: string
  confidence: number
}> {
  
  const patterns = []
  
  // Always try common patterns
  patterns.push({
    email: `owner@${domain}`,
    pattern: 'owner@domain',
    confidence: 50
  })
  
  patterns.push({
    email: `info@${domain}`,
    pattern: 'info@domain',
    confidence: 40
  })
  
  patterns.push({
    email: `contact@${domain}`,
    pattern: 'contact@domain',
    confidence: 35
  })
  
  patterns.push({
    email: `admin@${domain}`,
    pattern: 'admin@domain',
    confidence: 30
  })
  
  // If we have owner name, try personalized patterns
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

  if (ownerName) {
    const nameParts = parseOwnerName(ownerName)
    
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

    
    if (nameParts.first && nameParts.last) {
      patterns.push({
        email: `${nameParts.first}.${nameParts.last}@${domain}`,
        pattern: 'firstname.lastname@domain',
        confidence: 90
      })
      
      patterns.push({
        email: `${nameParts.first}${nameParts.last}@${domain}`,
        pattern: 'firstnamelastname@domain',
        confidence: 80
      })
      
      patterns.push({
        email: `${nameParts.first}@${domain}`,
        pattern: 'firstname@domain',
        confidence: 70
      })
      
      patterns.push({
        email: `${nameParts.first[0]}${nameParts.last}@${domain}`,
        pattern: 'flastname@domain',
        confidence: 60
      })
      
      patterns.push({
        email: `${nameParts.first}${nameParts.last[0]}@${domain}`,
        pattern: 'firstnamel@domain',
        confidence: 55
      })
    }
  }
  
  return patterns
}

/**
 * Verify email address is valid and deliverable
 */
async function verifyEmail(email: string): Promise<{
  isValid: boolean
  method: string
  details?: string
}> {
  
  // Step 1: Syntax validation
  const syntaxValid = validateEmailSyntax(email)
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

  if (!syntaxValid) {
    return {
      isValid: false,
      method: 'syntax_check',
      details: 'Invalid email format'
    }
  }
  
  // Step 2: Try Hunter.io API (free tier: 50 requests/month)
  try {
    const hunterResult = await retryAPICall(() => verifyWithHunter(email), 'hunter-io')
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

    if (hunterResult !== null) {
      return hunterResult
    }
  } catch (error) {
    logger.warn('Hunter.io verification failed, continuing with other methods', {
      email,
      error: error instanceof Error ? error.message : 'Unknown'
    })
  }
  
  // Step 3: Try EmailListVerify API (free tier: 100/day)
  try {
    const elvResult = await retryAPICall(() => verifyWithEmailListVerify(email), 'emaillistverify')
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

    if (elvResult !== null) {
      return elvResult
    }
  } catch (error) {
    logger.warn('EmailListVerify verification failed, falling back to DNS', {
      email,
      error: error instanceof Error ? error.message : 'Unknown'
    })
  }
  
  // Step 4: Basic DNS check (always free)
  const dnsResult = await retryEmailVerification(() => verifyWithDNS(email), email)
  return dnsResult
}

/**
 * Validate email syntax
 */
function validateEmailSyntax(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Verify with Hunter.io API
 */
async function verifyWithHunter(email: string): Promise<{
  isValid: boolean
  method: string
  details?: string
} | null> {
  
  const apiKey = process.env.HUNTER_IO_API_KEY
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

  if (!apiKey) {
    return null
  }
  
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
    )
    
    const data = await response.json()
    
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

    
    if (data.data) {
      const result = data.data.result // 'deliverable', 'undeliverable', 'risky', 'unknown'
      const score = data.data.score // 0-100
      
      return {
        isValid: result === 'deliverable' || score >= 70,
        method: 'hunter_io_api',
        details: `Result: ${result}, Score: ${score}`
      }
    }
    
    return null
    
  } catch (error) {
    logger.error('Hunter.io verification failed', {
      email,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    return null
  }
}

/**
 * Verify with EmailListVerify API
 */
async function verifyWithEmailListVerify(email: string): Promise<{
  isValid: boolean
  method: string
  details?: string
} | null> {
  
  const apiKey = process.env.EMAILLISTVERIFY_API_KEY
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

  if (!apiKey) {
    return null
  }
  
  try {
    const response = await fetch(
      `https://apps.emaillistverify.com/api/verifyEmail?secret=${apiKey}&email=${encodeURIComponent(email)}`
    )
    
    const data = await response.json()
    
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

    
    if (data.status) {
      // 'valid', 'invalid', 'unknown', 'disposable', 'catch-all'
      const status = data.status.toLowerCase()
      
      return {
        isValid: status === 'valid' || status === 'catch-all',
        method: 'emaillistverify_api',
        details: `Status: ${status}`
      }
    }
    
    return null
    
  } catch (error) {
    logger.error('EmailListVerify verification failed', {
      email,
      error: error instanceof Error ? error.message : 'Unknown'
    })
    return null
  }
}

/**
 * Verify with DNS MX record check (always free)
 */
async function verifyWithDNS(email: string): Promise<{
  isValid: boolean
  method: string
  details?: string
}> {
  
  try {
    const domain = email.split('@')[1]
    
    // Check if domain has MX records (mail servers)
    const dns = await import('dns').then(m => m.promises)
    const mxRecords = await dns.resolveMx(domain)
    
    return {
      isValid: mxRecords && mxRecords.length > 0,
      method: 'dns_mx_check',
      details: `MX records: ${mxRecords.length}`
    }
    
  } catch (error) {
    return {
      isValid: false,
      method: 'dns_mx_check',
      details: 'No MX records found'
    }
  }
}

/**
 * Parse owner name into first and last
 */
function parseOwnerName(name: string): {
  first: string
  last: string
} {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
  
  const parts = cleaned.split(/\s+/)
  
  return {
    first: parts[0] || '',
    last: parts[parts.length - 1] || ''
  }
}

/**
 * Clean domain from URL
 */
function cleanDomain(url: string): string {
  try {
    const domain = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
    
    return domain
  } catch {
    return url
  }
}

