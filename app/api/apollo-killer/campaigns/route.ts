import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Campaign Management
 * 
 * Create and manage outreach campaigns
 */

// GET: List all campaigns
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { data, error } = await supabaseAdmin
      .from('outreach_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch campaigns', { error: error.message })
      return NextResponse.json({
        error: 'Failed to fetch campaigns'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      campaigns: data || []
    })

  } catch (error) {
    logger.error('Campaign API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch campaigns'
    }, { status: 500 })
  }
}

// POST: Create new campaign
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const {
      name,
      description,
      campaignType,
      targetBusinessType,
      targetLocation,
      minScore,
      emailSequence,
      smsSequence,
      leadIds
    } = await request.json()

    if (!name) {
      return NextResponse.json({
        error: 'Campaign name required'
      }, { status: 400 })
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('outreach_campaigns')
      .insert({
        name,
        description,
        campaign_type: campaignType || 'email',
        target_business_type: targetBusinessType,
        target_location: targetLocation,
        min_score: minScore || 70,
        email_sequence: emailSequence || [],
        sms_sequence: smsSequence || [],
        status: 'draft',
        created_by: adminAuth.admin.userId
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      logger.error('Failed to create campaign', { error: campaignError?.message })
      return NextResponse.json({
        error: 'Failed to create campaign'
      }, { status: 500 })
    }

    // Add leads to campaign if provided
    if (leadIds && leadIds.length > 0) {
      const campaignContacts = leadIds.map((leadId: string) => ({
        campaign_id: campaign.id,
        lead_id: leadId,
        status: 'queued'
      }))

      await supabaseAdmin
        .from('campaign_contacts')
        .insert(campaignContacts)

      // Update campaign total_leads
      await supabaseAdmin
        .from('outreach_campaigns')
        .update({ total_leads: leadIds.length })
        .eq('id', campaign.id)
    }

    logger.info('Campaign created', {
      campaignId: campaign.id,
      name: campaign.name,
      leads: leadIds?.length || 0
    })

    return NextResponse.json({
      success: true,
      campaign
    })

  } catch (error) {
    logger.error('Campaign creation error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to create campaign'
    }, { status: 500 })
  }
}

// PUT: Update campaign
export async function PUT(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { campaignId, status, ...updates } = await request.json()

    if (!campaignId) {
      return NextResponse.json({
        error: 'campaignId required'
      }, { status: 400 })
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('outreach_campaigns')
      .update({ status, ...updates })
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update campaign', { error: error.message })
      return NextResponse.json({
        error: 'Failed to update campaign'
      }, { status: 500 })
    }

    logger.info('Campaign updated', {
      campaignId,
      status
    })

    return NextResponse.json({
      success: true,
      campaign
    })

  } catch (error) {
    logger.error('Campaign update error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to update campaign'
    }, { status: 500 })
  }
}

