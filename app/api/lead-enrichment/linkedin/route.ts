import { NextRequest, NextResponse } from 'next/server'
import { scrapeLinkedIn } from '@/lib/lead-enrichment/linkedin-scraper'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * LinkedIn Scraper API - Apollo Killer Feature
 * Finds business owners and decision makers with contact info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, businessType, location } = body

    // Input validation
    if (!companyName) {
      return NextResponse.json({
        error: 'Company name is required'
      }, { status: 400 })
    }

    logger.info('LinkedIn scraping request', {
      company: companyName,
      type: businessType,
      location
    })

    // Scrape LinkedIn for business owners and decision makers
    const result = await scrapeLinkedIn(
      companyName,
      businessType || '',
      location || ''
    )

    // Log results
    logger.info('LinkedIn scraping completed', {
      company: companyName,
      decisionMakersFound: result.decisionMakers.length,
      confidence: result.confidence,
      source: result.source
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Found ${result.decisionMakers.length} decision makers for ${companyName}`
    })

  } catch (error) {
    logger.error('LinkedIn scraping API error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json({
      success: false,
      error: 'Failed to scrape LinkedIn data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get LinkedIn scraping status and capabilities
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    capabilities: {
      companySearch: true,
      decisionMakerDetection: true,
      contactInfoExtraction: true,
      multipleSearchMethods: true,
      antiBotEvasion: true
    },
    supportedTitles: [
      'CEO', 'President', 'Owner', 'Founder', 'Director', 'Manager',
      'VP', 'Vice President', 'Chief', 'Head of', 'Business Owner',
      'Company Owner', 'Small Business Owner', 'Co-Founder',
      'Managing Director', 'General Manager', 'Operations Manager',
      'Sales Manager', 'Marketing Manager', 'HR Manager', 'Finance Manager'
    ],
    contactInfoTypes: [
      'Email addresses',
      'Phone numbers', 
      'Website URLs',
      'LinkedIn profiles'
    ],
    message: 'LinkedIn scraper is ready for Apollo Killer feature'
  })
}


