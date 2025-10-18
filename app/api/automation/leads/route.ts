import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { leadStatusManager } from '@/lib/lead-status-system'
import { responseTracker } from '@/lib/response-tracking'
import { followUpSequenceManager } from '@/lib/follow-up-sequences'
import { conversionTracker } from '@/lib/conversion-tracking'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Lead Management API for Automated Client Acquisition
 * Handles lead processing, scoring, and automated outreach
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'

    switch (action) {
      case 'list':
        return await getLeads(request)
      case 'status':
        return await getLeadStatus(request)
      case 'engagement':
        return await getLeadEngagement(request)
      case 'conversions':
        return await getLeadConversions(request)
      case 'funnel':
        return await getFunnelData()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Lead API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'automation/leads'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'process_lead':
        return await processLead(body)
      case 'score_lead':
        return await scoreLead(body)
      case 'start_outreach':
        return await startOutreach(body)
      case 'update_engagement':
        return await updateEngagement(body)
      case 'track_conversion':
        return await trackConversion(body)
      case 'bulk_process':
        return await bulkProcess(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Lead API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'automation/leads'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getLeads(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const businessType = searchParams.get('businessType')
    const minScore = searchParams.get('minScore')

    let query = supabaseAdmin
      .from('enriched_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (businessType) {
      query = query.eq('business_type', businessType)
    }
    if (minScore) {
      query = query.gte('total_score', parseInt(minScore))
    }

    const { data: leads, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      leads: leads || []
    })
  } catch (error) {
    throw error
  }
}

async function getLeadStatus(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const statusHistory = leadStatusManager.getLeadStatusHistory(leadId)
    const nextAction = leadStatusManager.getNextAction(leadId)

    return NextResponse.json({
      success: true,
      status: statusHistory,
      nextAction
    })
  } catch (error) {
    throw error
  }
}

async function getLeadEngagement(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const engagement = responseTracker.getLeadStats(leadId)
    const events = responseTracker.getLeadEvents(leadId)

    return NextResponse.json({
      success: true,
      engagement,
      events
    })
  } catch (error) {
    throw error
  }
}

async function getLeadConversions(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const conversions = conversionTracker.getLeadConversions(leadId)

    return NextResponse.json({
      success: true,
      conversions
    })
  } catch (error) {
    throw error
  }
}

async function getFunnelData() {
  try {
    const funnel = conversionTracker.getConversionFunnel()
    const stats = leadStatusManager.getFunnelStats()

    return NextResponse.json({
      success: true,
      funnel,
      stats
    })
  } catch (error) {
    throw error
  }
}

async function processLead(body: any) {
  try {
    const { leadData, businessType, source } = body

    // Create lead in database
    const { data: lead, error } = await supabaseAdmin
      .from('enriched_leads')
      .insert({
        business_name: leadData.business_name,
        business_type: businessType,
        address: leadData.address,
        city: leadData.city,
        state: leadData.state,
        owner_name: leadData.owner_name,
        owner_email: leadData.owner_email,
        owner_phone: leadData.owner_phone,
        website_url: leadData.website_url,
        enrichment_status: 'pending',
        source: source,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Initialize lead status
    await leadStatusManager.updateLeadStatus(lead.id, 'new', 'system', 'Lead created')

    return NextResponse.json({
      success: true,
      lead
    })
  } catch (error) {
    throw error
  }
}

async function scoreLead(body: any) {
  try {
    const { leadId, scoreData } = body

    // Update lead score
    const { data: lead, error } = await supabaseAdmin
      .from('enriched_leads')
      .update({
        total_score: scoreData.totalScore,
        score_breakdown: scoreData.breakdown,
        last_scored_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    // Update lead status based on score
    let newStatus = 'contacted'
    if (scoreData.totalScore >= 80) {
      newStatus = 'high_priority'
    } else if (scoreData.totalScore >= 60) {
      newStatus = 'qualified'
    } else if (scoreData.totalScore < 30) {
      newStatus = 'unqualified'
    }

    await leadStatusManager.updateLeadStatus(leadId, newStatus as any, 'system', 'Lead scored')

    return NextResponse.json({
      success: true,
      lead,
      newStatus
    })
  } catch (error) {
    throw error
  }
}

async function startOutreach(body: any) {
  try {
    const { leadId, campaignType, sequenceId } = body

    // Start outreach sequence
    if (sequenceId) {
      await followUpSequenceManager.startSequence(leadId, sequenceId)
    }

    // Update lead status
    await leadStatusManager.updateLeadStatus(leadId, 'contacted', 'system', 'Outreach started')

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    throw error
  }
}

async function updateEngagement(body: any) {
  try {
    const { leadId, eventType, campaignId, messageId, metadata } = body

    // Track engagement event
    await responseTracker.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType,
      source: 'email',
      metadata
    })

    // Update lead status based on engagement
    let newStatus = 'contacted'
    if (eventType === 'opened') {
      newStatus = 'opened'
    } else if (eventType === 'clicked') {
      newStatus = 'clicked'
    } else if (eventType === 'replied') {
      newStatus = 'replied'
    }

    await leadStatusManager.updateLeadStatus(leadId, newStatus as any, 'system', `Engagement: ${eventType}`)

    return NextResponse.json({
      success: true,
      newStatus
    })
  } catch (error) {
    throw error
  }
}

async function trackConversion(body: any) {
  try {
    const { leadId, campaignId, messageId, conversionType, value, metadata } = body

    // Track conversion
    const conversion = await conversionTracker.trackConversion(
      leadId,
      campaignId,
      messageId,
      conversionType,
      value,
      metadata
    )

    return NextResponse.json({
      success: true,
      conversion
    })
  } catch (error) {
    throw error
  }
}

async function bulkProcess(body: any) {
  try {
    const { leads, action, parameters } = body

    const results = []

    for (const leadId of leads) {
      try {
        let result
        switch (action) {
          case 'start_sequence':
            result = await followUpSequenceManager.startSequence(leadId, parameters.sequenceId)
            break
          case 'update_status':
            result = await leadStatusManager.updateLeadStatus(leadId, parameters.status, 'system', parameters.reason)
            break
          case 'score_lead':
            result = await scoreLead({ leadId, scoreData: parameters.scoreData })
            break
          default:
            throw new Error(`Unknown bulk action: ${action}`)
        }
        results.push({ leadId, success: true, result })
      } catch (error) {
        results.push({ leadId, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    throw error
  }
}

