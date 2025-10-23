import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get real campaign performance data from database
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (campaignsError) {
      logger.error('Error fetching campaigns', { error: campaignsError.message })
      return NextResponse.json({
        metrics: [],
        funnelData: [],
        topCampaigns: [],
        engagedLeads: []
      })
    }
    
    // Get real leads data for engagement metrics
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (leadsError) {
      logger.error('Error fetching leads', { error: leadsError.message })
    }
    
    // Process real campaign metrics
    const metrics = campaigns?.map(campaign => ({
      campaignId: campaign.id,
      campaignName: campaign.name || 'Unnamed Campaign',
      totalSent: campaign.total_sent || 0,
      totalDelivered: campaign.total_delivered || 0,
      totalOpened: campaign.total_opened || 0,
      totalClicked: campaign.total_clicked || 0,
      totalReplied: campaign.total_replied || 0,
      totalConverted: campaign.total_converted || 0,
      openRate: campaign.open_rate || 0,
      clickRate: campaign.click_rate || 0,
      replyRate: campaign.reply_rate || 0,
      conversionRate: campaign.conversion_rate || 0,
      revenue: campaign.total_revenue || 0,
      cost: campaign.total_cost || 0,
      roi: campaign.roi || 0,
      avgTimeToConvert: campaign.avg_time_to_convert || 0,
      lastActivity: campaign.updated_at || campaign.created_at
    })) || []
    
    // Generate funnel data based on real metrics
    const funnelData = [
      {
        stage: 'Sent',
        count: metrics.reduce((sum, m) => sum + m.totalSent, 0),
        conversionRate: 100,
        dropOffRate: 0,
        avgTime: 0
      },
      {
        stage: 'Delivered',
        count: metrics.reduce((sum, m) => sum + m.totalDelivered, 0),
        conversionRate: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.totalDelivered, 0) / metrics.reduce((sum, m) => sum + m.totalSent, 0)) * 100 : 0,
        dropOffRate: 0,
        avgTime: 0
      },
      {
        stage: 'Opened',
        count: metrics.reduce((sum, m) => sum + m.totalOpened, 0),
        conversionRate: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.totalOpened, 0) / metrics.reduce((sum, m) => sum + m.totalDelivered, 0)) * 100 : 0,
        dropOffRate: 0,
        avgTime: 1
      },
      {
        stage: 'Clicked',
        count: metrics.reduce((sum, m) => sum + m.totalClicked, 0),
        conversionRate: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.totalClicked, 0) / metrics.reduce((sum, m) => sum + m.totalOpened, 0)) * 100 : 0,
        dropOffRate: 0,
        avgTime: 2
      },
      {
        stage: 'Converted',
        count: metrics.reduce((sum, m) => sum + m.totalConverted, 0),
        conversionRate: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.totalConverted, 0) / metrics.reduce((sum, m) => sum + m.totalClicked, 0)) * 100 : 0,
        dropOffRate: 0,
        avgTime: 7
      }
    ]
    
    // Get top performing campaigns
    const topCampaigns = metrics
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 3)
      .map(campaign => ({
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        conversionRate: campaign.conversionRate,
        revenue: campaign.revenue,
        roi: campaign.roi,
        trend: campaign.conversionRate > 5 ? 'up' : campaign.conversionRate > 2 ? 'stable' : 'down'
      }))
    
    // Get engaged leads
    const engagedLeads = leads?.slice(0, 10).map(lead => ({
      leadId: lead.id,
      businessName: lead.business_name || 'Unknown Business',
      engagementScore: lead.engagement_score || 75,
      lastActivity: lead.updated_at || lead.created_at,
      status: lead.status || 'new',
      totalInteractions: lead.interaction_count || 0,
      conversionProbability: lead.conversion_probability || 50
    })) || []
    
    return NextResponse.json({
      metrics,
      funnelData,
      topCampaigns,
      engagedLeads
    })
    
  } catch (error) {
    logger.error('Campaign performance endpoint error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' 
    })
    
    return NextResponse.json({
      metrics: [],
      funnelData: [],
      topCampaigns: [],
      engagedLeads: []
    })
  }
}
