import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for bulk enrichment

/**
 * APOLLO KILLER: Lead Search & Enrichment API
 * 
 * Multi-stage pipeline:
 * 1. Search Google Places for businesses
 * 2. Queue for enrichment
 * 3. Return immediate results + process in background
 */

export async function POST(request: NextRequest) {
  try {
    // Admin only - this is powerful lead generation
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { searchQuery, location, businessType, filters } = await request.json()

    if (!searchQuery && !businessType) {
      return NextResponse.json({
        error: 'Search query or business type required'
      }, { status: 400 })
    }

    // Step 1: Search Google Places
    const googleResults = await searchGooglePlaces(searchQuery, location, businessType)

    if (!googleResults.success) {
      return NextResponse.json({
        error: 'Google Places search failed',
        details: googleResults.error
      }, { status: 500 })
    }

    // Step 2: Store businesses as enriched_leads (pending enrichment)
    const leads = []
    
    for (const business of googleResults.businesses) {
      try {
        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('enriched_leads')
          .select('id')
          .eq('google_place_id', business.place_id)
          .single()

        if (existing) {
          leads.push({ ...business, id: existing.id, status: 'existing' })
          continue
        }

        // Create new lead
        const { data: newLead, error } = await supabaseAdmin
          .from('enriched_leads')
          .insert({
            business_name: business.name,
            address: business.address,
            city: extractCity(business.address),
            state: extractState(business.address),
            phone: business.phone,
            website: business.website,
            google_place_id: business.place_id,
            business_type: businessType,
            google_rating: business.rating,
            google_review_count: business.reviews,
            enrichment_status: 'pending',
            enrichment_sources: ['google_places']
          })
          .select()
          .single()

        if (!error && newLead) {
          // Queue for enrichment
          await supabaseAdmin
            .from('enrichment_queue')
            .insert({
              lead_id: newLead.id,
              enrichment_tasks: [
                'website_scrape',
                'email_discovery',
                'email_verification',
                'linkedin_search',
                'ai_analysis'
              ],
              priority: 7,
              status: 'queued'
            })

          leads.push({ ...business, id: newLead.id, status: 'queued' })
        }

      } catch (error) {
        logger.error('Failed to create lead', {
          business: business.name,
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    }

    logger.info('Lead search completed', {
      query: searchQuery,
      location,
      businessType,
      resultsFound: leads.length,
      newLeads: leads.filter(l => l.status === 'queued').length
    })

    return NextResponse.json({
      success: true,
      results: googleResults.businesses.length,
      leads: leads,
      message: `Found ${leads.length} businesses. Enrichment queued for ${leads.filter(l => l.status === 'queued').length} new leads.`
    })

  } catch (error) {
    logger.error('Apollo killer search error', {
      error: error instanceof Error ? error.message : 'Unknown',
      endpoint: 'apollo-killer/search-enrich'
    })

    return NextResponse.json({
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Search Google Places API
 */
async function searchGooglePlaces(query: string, location: string, businessType: string) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      return {
        success: false,
        error: 'Google Places API not configured'
      }
    }

    const searchQuery = query || `${businessType} contractors ${location}`
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        success: false,
        error: data.error_message || `Google API error: ${data.status}`
      }
    }

    const businesses = (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 0,
      reviews: place.user_ratings_total || 0,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      types: place.types || [],
      business_status: place.business_status,
      price_level: place.price_level
    }))

    return {
      success: true,
      businesses
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Helper: Extract city from address
 */
function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  return parts.length >= 2 ? parts[parts.length - 2].trim() : ''
}

/**
 * Helper: Extract state from address
 */
function extractState(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  if (parts.length < 2) return ''
  
  const stateZip = parts[parts.length - 1].trim()
  const stateMatch = stateZip.match(/([A-Z]{2})\s+\d{5}/)
  
  return stateMatch ? stateMatch[1] : ''
}

