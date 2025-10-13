import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { discoverAndVerifyEmail } from '@/lib/lead-enrichment/email-verification'
import { scoreLead } from '@/lib/lead-enrichment/ai-scorer'
import { scrapeLinkedIn } from '@/lib/lead-enrichment/linkedin-scraper'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * APOLLO KILLER: Enrichment Processor
 * 
 * Processes leads from enrichment queue
 * Executes: website scraping, email discovery, AI scoring
 */

export async function POST(request: NextRequest) {
  try {
    // Admin only
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, force } = await request.json()

    if (!leadId) {
      return NextResponse.json({
        error: 'leadId required'
      }, { status: 400 })
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('enriched_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }

    // Check if already enriched
    if (lead.enrichment_status === 'enriched' && !force) {
      return NextResponse.json({
        success: true,
        message: 'Lead already enriched',
        lead
      })
    }

    // Mark as processing
    await supabaseAdmin
      .from('enriched_leads')
      .update({
        enrichment_status: 'in_progress',
        enrichment_attempts: (lead.enrichment_attempts || 0) + 1
      })
      .eq('id', leadId)

    logger.info('Starting enrichment', {
      leadId,
      business: lead.business_name
    })

    // STEP 1: Scrape website for owner/contact data
    let websiteData: any = null
    let websiteContent = ''
    
    if (lead.website) {
      try {
        websiteData = await scrapeWebsite(lead.website)
        websiteContent = websiteData.rawText || ''
        
        logger.info('Website scraping completed', {
          leadId,
          emailsFound: websiteData.emails?.length || 0,
          phonesFound: websiteData.phones?.length || 0,
          ownerFound: !!websiteData.ownerName
        })
      } catch (error) {
        logger.error('Website scraping failed', {
          leadId,
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    }

    // STEP 2: Email discovery and verification
    let verifiedEmail: any = null
    
    if (websiteData?.ownerName || lead.website) {
      try {
        const domain = lead.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || ''
        
        const emailCandidates = await discoverAndVerifyEmail(
          websiteData?.ownerName || undefined,
          lead.business_name,
          domain
        )
        
        // Use highest confidence verified email
        verifiedEmail = emailCandidates.find(e => e.verified) || emailCandidates[0]
        
        logger.info('Email discovery completed', {
          leadId,
          candidatesFound: emailCandidates.length,
          verifiedFound: emailCandidates.filter(e => e.verified).length
        })
      } catch (error) {
        logger.error('Email discovery failed', {
          leadId,
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    }

    // STEP 3: LinkedIn scraping for decision makers
    let linkedinData: any = null
    
    try {
      linkedinData = await scrapeLinkedIn(
        lead.business_name,
        lead.business_type || '',
        `${lead.city || ''} ${lead.state || ''}`.trim()
      )
      
      logger.info('LinkedIn scraping completed', {
        leadId,
        decisionMakersFound: linkedinData.decisionMakers?.length || 0,
        confidence: linkedinData.confidence,
        source: linkedinData.source
      })
    } catch (error) {
      logger.error('LinkedIn scraping failed', {
        leadId,
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    // STEP 4: AI-powered lead scoring
    let scoringResult: any = null
    
    try {
      scoringResult = await scoreLead({
        business_name: lead.business_name,
        business_type: lead.business_type,
        location: {
          city: lead.city || '',
          state: lead.state || ''
        },
        google_rating: lead.google_rating,
        google_review_count: lead.google_review_count,
        owner_name: websiteData?.ownerName || undefined,
        owner_title: websiteData?.ownerTitle || undefined,
        owner_email: verifiedEmail?.email || undefined,
        owner_email_verified: verifiedEmail?.verified || false,
        owner_phone: websiteData?.phones?.[0] || lead.phone || undefined,
        website: lead.website || undefined,
        website_content: websiteContent,
        employee_count_min: lead.employee_count_min,
        employee_count_max: lead.employee_count_max,
        estimated_revenue_min: lead.estimated_revenue_min,
        estimated_revenue_max: lead.estimated_revenue_max,
        has_online_booking: lead.has_online_booking,
        has_live_chat: lead.has_live_chat,
        has_ai_receptionist: lead.has_ai_receptionist,
        detected_technologies: lead.detected_technologies,
        linkedin_profiles: linkedinData?.decisionMakers || []
      })
      
      logger.info('AI scoring completed', {
        leadId,
        totalScore: scoringResult.total_score,
        painPointsFound: scoringResult.pain_points.length
      })
    } catch (error) {
      logger.error('AI scoring failed', {
        leadId,
        error: error instanceof Error ? error.message : 'Unknown'
      })
    }

    // STEP 5: Update lead with enriched data
    const updateData: any = {
      enrichment_status: 'enriched',
      last_enriched_at: new Date().toISOString(),
      enrichment_sources: ['google_places', 'website_scrape', 'email_verification', 'linkedin_scrape', 'ai_analysis']
    }

    // Add scraped data
    if (websiteData) {
      if (websiteData.ownerName) updateData.owner_name = websiteData.ownerName
      if (websiteData.ownerTitle) updateData.owner_title = websiteData.ownerTitle
      if (websiteData.phones?.[0]) updateData.owner_phone = websiteData.phones[0]
      if (websiteData.linkedinUrls?.[0]) updateData.owner_linkedin_url = websiteData.linkedinUrls[0]
    }

    // Add email data
    if (verifiedEmail) {
      updateData.owner_email = verifiedEmail.email
      updateData.owner_email_verified = verifiedEmail.verified
      updateData.owner_email_confidence = verifiedEmail.confidence
    }

    // Add LinkedIn data
    if (linkedinData?.decisionMakers && linkedinData.decisionMakers.length > 0) {
      const primaryProfile = linkedinData.decisionMakers[0]
      
      // Use LinkedIn data to enhance owner info if not already found
      if (!updateData.owner_name && primaryProfile.name) {
        updateData.owner_name = primaryProfile.name
      }
      if (!updateData.owner_title && primaryProfile.title) {
        updateData.owner_title = primaryProfile.title
      }
      if (!updateData.owner_linkedin_url && primaryProfile.profileUrl) {
        updateData.owner_linkedin_url = primaryProfile.profileUrl
      }
      
      // Store all decision makers in JSONB field
      updateData.decision_makers = linkedinData.decisionMakers.slice(0, 10) // Limit to 10
    }

    // Add scoring data
    if (scoringResult) {
      updateData.total_score = scoringResult.total_score
      updateData.fit_score = scoringResult.fit_score
      updateData.engagement_score = scoringResult.engagement_score
      updateData.contact_quality_score = scoringResult.contact_quality_score
      updateData.opportunity_score = scoringResult.opportunity_score
      updateData.urgency_score = scoringResult.urgency_score
      updateData.personalized_pitch = scoringResult.personalized_pitch
      updateData.pain_points = scoringResult.pain_points
      updateData.recommended_approach = scoringResult.recommended_approach
      updateData.best_contact_time = scoringResult.best_contact_time
      updateData.objections_anticipated = scoringResult.objections_anticipated
    }

    const { data: enrichedLead, error: updateError } = await supabaseAdmin
      .from('enriched_leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update enriched lead', {
        leadId,
        error: updateError.message
      })
      
      return NextResponse.json({
        error: 'Failed to save enriched data'
      }, { status: 500 })
    }

    logger.info('Enrichment completed successfully', {
      leadId,
      business: lead.business_name,
      score: scoringResult?.total_score || 0
    })

    return NextResponse.json({
      success: true,
      message: 'Lead enriched successfully',
      lead: enrichedLead,
      enrichmentDetails: {
        websiteScraped: !!websiteData,
        emailsFound: websiteData?.emails?.length || 0,
        emailVerified: verifiedEmail?.verified || false,
        ownerFound: !!websiteData?.ownerName,
        linkedinProfilesFound: linkedinData?.decisionMakers?.length || 0,
        linkedinConfidence: linkedinData?.confidence || 0,
        score: scoringResult?.total_score || 0,
        painPoints: scoringResult?.pain_points || []
      }
    })

  } catch (error) {
    logger.error('Enrichment processor error', {
      error: error instanceof Error ? error.message : 'Unknown',
      endpoint: 'apollo-killer/enrichment-processor'
    })

    return NextResponse.json({
      error: 'Enrichment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET: Process next item in enrichment queue
 */
export async function GET(request: NextRequest) {
  try {
    // Admin only
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    // Get next queued item
    const { data: queueItem } = await supabaseAdmin
      .from('enrichment_queue')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!queueItem) {
      return NextResponse.json({
        success: true,
        message: 'No items in queue'
      })
    }

    // Mark as processing
    await supabaseAdmin
      .from('enrichment_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', queueItem.id)

    // Process the lead
    const processResult = await fetch(`${request.nextUrl.origin}/api/apollo-killer/enrichment-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || ''
      },
      body: JSON.stringify({
        leadId: queueItem.lead_id
      })
    })

    const processData = await processResult.json()

    // Update queue item
    await supabaseAdmin
      .from('enrichment_queue')
      .update({
        status: processData.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        error_message: processData.error || null
      })
      .eq('id', queueItem.id)

    return NextResponse.json({
      success: true,
      processed: processData.success,
      lead: processData.lead
    })

  } catch (error) {
    logger.error('Queue processor error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Queue processing failed'
    }, { status: 500 })
  }
}

