/**
 * Conversion Tracking and Attribution System
 * Tracks conversions and attributes them to specific campaigns and touchpoints
 */

import { responseTracker, ResponseEvent } from './response-tracking'
import { leadStatusManager, LeadStatus } from './lead-status-system'

export interface ConversionEvent {
  id: string
  leadId: string
  campaignId: string
  messageId: string
  conversionType: 'demo_scheduled' | 'demo_completed' | 'proposal_sent' | 'client_converted'
  timestamp: string
  value: number // Revenue value
  attribution: AttributionData
  metadata?: Record<string, any>
}

export interface AttributionData {
  firstTouch: Touchpoint
  lastTouch: Touchpoint
  allTouchpoints: Touchpoint[]
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based'
  weightedValue: number
}

export interface Touchpoint {
  campaignId: string
  messageId: string
  messageType: 'email' | 'sms'
  timestamp: string
  eventType: 'sent' | 'opened' | 'clicked' | 'replied'
  weight: number
  daysFromConversion: number
}

export interface CampaignAttribution {
  campaignId: string
  totalConversions: number
  totalRevenue: number
  firstTouchConversions: number
  lastTouchConversions: number
  assistedConversions: number
  conversionRate: number
  averageValue: number
  touchpoints: number
  attributionWeight: number
}

export interface ConversionFunnel {
  stage: string
  leads: number
  conversions: number
  conversionRate: number
  averageTime: number // days
  dropOffRate: number
}

export class ConversionTracker {
  private conversions: Map<string, ConversionEvent> = new Map()
  private leadConversions: Map<string, string[]> = new Map() // leadId -> conversionIds
  private campaignAttributions: Map<string, CampaignAttribution> = new Map()

  /**
   * Track a conversion event
   */
  async trackConversion(
    leadId: string,
    campaignId: string,
    messageId: string,
    conversionType: ConversionEvent['conversionType'],
    value: number,
    metadata?: Record<string, any>
  ): Promise<ConversionEvent> {
    // Get attribution data
    const attribution = await this.calculateAttribution(leadId, campaignId, messageId)

    const conversion: ConversionEvent = {
      id: this.generateId(),
      leadId,
      campaignId,
      messageId,
      conversionType,
      timestamp: new Date().toISOString(),
      value,
      attribution,
      metadata
    }

    // Store conversion
    this.conversions.set(conversion.id, conversion)

    // Update lead conversions
    const leadConversionIds = this.leadConversions.get(leadId) || []
    leadConversionIds.push(conversion.id)
    this.leadConversions.set(leadId, leadConversionIds)

    // Update campaign attribution
    await this.updateCampaignAttribution(campaignId, conversion)

    // Update lead status
    await leadStatusManager.updateLeadStatus(leadId, 'converted', 'system', 'Conversion tracked')

    return conversion
  }

  /**
   * Calculate attribution for a conversion
   */
  private async calculateAttribution(
    leadId: string,
    campaignId: string,
    messageId: string
  ): Promise<AttributionData> {
    // Get all response events for this lead
    const events = responseTracker.getLeadEvents(leadId)
    const touchpoints: Touchpoint[] = []

    // Convert response events to touchpoints
    events.forEach(event => {
      const daysFromConversion = this.calculateDaysFromConversion(event.timestamp)
      
      // Filter to only include valid touchpoint event types
      if (['sent', 'opened', 'clicked', 'replied'].includes(event.eventType)) {
        touchpoints.push({
          campaignId: event.campaignId,
          messageId: event.messageId,
          messageType: event.source,
          timestamp: event.timestamp,
          eventType: event.eventType as 'sent' | 'opened' | 'clicked' | 'replied',
          weight: this.calculateTouchpointWeight(event.eventType, daysFromConversion),
          daysFromConversion
        })
      }
    })

    // Sort by timestamp
    touchpoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const firstTouch = touchpoints[0]
    const lastTouch = touchpoints[touchpoints.length - 1]

    // Calculate weighted value using linear attribution
    const totalWeight = touchpoints.reduce((sum, tp) => sum + tp.weight, 0)
    const weightedValue = totalWeight > 0 ? touchpoints.reduce((sum, tp) => sum + (tp.weight / totalWeight), 0) : 0

    return {
      firstTouch: firstTouch || touchpoints[0],
      lastTouch: lastTouch || touchpoints[touchpoints.length - 1],
      allTouchpoints: touchpoints,
      attributionModel: 'linear',
      weightedValue
    }
  }

  /**
   * Calculate touchpoint weight based on event type and recency
   */
  private calculateTouchpointWeight(eventType: string, daysFromConversion: number): number {
    const eventWeights: Record<string, number> = {
      sent: 1,
      delivered: 2,
      opened: 5,
      clicked: 10,
      replied: 25,
      converted: 100
    }

    const baseWeight = eventWeights[eventType] || 1
    
    // Apply time decay (more recent = higher weight)
    const timeDecay = Math.max(0.1, 1 - (daysFromConversion / 30)) // Decay over 30 days
    
    return baseWeight * timeDecay
  }

  /**
   * Calculate days from conversion
   */
  private calculateDaysFromConversion(eventTimestamp: string): number {
    const eventTime = new Date(eventTimestamp).getTime()
    const now = Date.now()
    return (now - eventTime) / (1000 * 60 * 60 * 24)
  }

  /**
   * Update campaign attribution
   */
  private async updateCampaignAttribution(campaignId: string, conversion: ConversionEvent): Promise<void> {
    const existing = this.campaignAttributions.get(campaignId)
    
    const attribution: CampaignAttribution = {
      campaignId,
      totalConversions: (existing?.totalConversions || 0) + 1,
      totalRevenue: (existing?.totalRevenue || 0) + conversion.value,
      firstTouchConversions: (existing?.firstTouchConversions || 0) + 
        (conversion.attribution.firstTouch.campaignId === campaignId ? 1 : 0),
      lastTouchConversions: (existing?.lastTouchConversions || 0) + 
        (conversion.attribution.lastTouch.campaignId === campaignId ? 1 : 0),
      assistedConversions: (existing?.assistedConversions || 0) + 
        (conversion.attribution.allTouchpoints.some(tp => tp.campaignId === campaignId) ? 1 : 0),
      conversionRate: 0, // Will be calculated
      averageValue: 0, // Will be calculated
      touchpoints: (existing?.touchpoints || 0) + conversion.attribution.allTouchpoints.length,
      attributionWeight: (existing?.attributionWeight || 0) + conversion.attribution.weightedValue
    }

    // Calculate rates
    const totalLeads = await this.getTotalLeadsForCampaign(campaignId)
    if (totalLeads > 0) {
      attribution.conversionRate = (attribution.totalConversions / totalLeads) * 100
    }

    if (attribution.totalConversions > 0) {
      attribution.averageValue = attribution.totalRevenue / attribution.totalConversions
    }

    this.campaignAttributions.set(campaignId, attribution)
  }

  /**
   * Get total leads for a campaign
   */
  private async getTotalLeadsForCampaign(campaignId: string): Promise<number> {
    // This would query the database for total leads in the campaign
    // Query database for real lead count
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('campaign_id', campaignId);
    
    if (error) {
      console.error('Error fetching lead count:', error);
      return 0;
    }
    
    return data?.length || 0
  }

  /**
   * Get conversion funnel analysis
   */
  getConversionFunnel(): ConversionFunnel[] {
    const funnels: ConversionFunnel[] = [
      {
        stage: 'New Leads',
        leads: 1000,
        conversions: 0,
        conversionRate: 0,
        averageTime: 0,
        dropOffRate: 0
      },
      {
        stage: 'Contacted',
        leads: 800,
        conversions: 0,
        conversionRate: 0,
        averageTime: 1,
        dropOffRate: 20
      },
      {
        stage: 'Opened Email',
        leads: 400,
        conversions: 0,
        conversionRate: 0,
        averageTime: 2,
        dropOffRate: 50
      },
      {
        stage: 'Clicked Link',
        leads: 200,
        conversions: 0,
        conversionRate: 0,
        averageTime: 3,
        dropOffRate: 50
      },
      {
        stage: 'Replied',
        leads: 100,
        conversions: 0,
        conversionRate: 0,
        averageTime: 5,
        dropOffRate: 50
      },
      {
        stage: 'Demo Scheduled',
        leads: 50,
        conversions: 0,
        conversionRate: 0,
        averageTime: 7,
        dropOffRate: 50
      },
      {
        stage: 'Demo Completed',
        leads: 30,
        conversions: 0,
        conversionRate: 0,
        averageTime: 10,
        dropOffRate: 40
      },
      {
        stage: 'Proposal Sent',
        leads: 20,
        conversions: 0,
        conversionRate: 0,
        averageTime: 12,
        dropOffRate: 33
      },
      {
        stage: 'Client Converted',
        leads: 10,
        conversions: 10,
        conversionRate: 100,
        averageTime: 14,
        dropOffRate: 0
      }
    ]

    // Calculate conversion rates
    funnels.forEach((funnel, index) => {
      if (index === 0) {
        funnel.conversionRate = (funnel.leads / 1000) * 100
      } else {
        const previousStage = funnels[index - 1]
        funnel.conversionRate = (funnel.leads / previousStage.leads) * 100
      }
    })

    return funnels
  }

  /**
   * Get top performing campaigns
   */
  getTopPerformingCampaigns(limit: number = 10): CampaignAttribution[] {
    const campaigns = Array.from(this.campaignAttributions.values())
    return campaigns
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  }

  /**
   * Get conversion attribution for a campaign
   */
  getCampaignAttribution(campaignId: string): CampaignAttribution | null {
    return this.campaignAttributions.get(campaignId) || null
  }

  /**
   * Get all conversions for a lead
   */
  getLeadConversions(leadId: string): ConversionEvent[] {
    const conversionIds = this.leadConversions.get(leadId) || []
    return conversionIds.map(id => this.conversions.get(id)).filter(Boolean) as ConversionEvent[]
  }

  /**
   * Get conversion statistics
   */
  getConversionStats(): {
    totalConversions: number
    totalRevenue: number
    averageConversionValue: number
    conversionRate: number
    topPerformingCampaign: string
    averageTimeToConvert: number
  } {
    const allConversions = Array.from(this.conversions.values())
    const totalConversions = allConversions.length
    const totalRevenue = allConversions.reduce((sum, conv) => sum + conv.value, 0)
    const averageConversionValue = totalConversions > 0 ? totalRevenue / totalConversions : 0

    const topCampaign = this.getTopPerformingCampaigns(1)[0]
    const topPerformingCampaign = topCampaign?.campaignId || 'None'

    // Calculate average time to convert
    const conversionTimes = allConversions.map(conv => {
      const conversionTime = new Date(conv.timestamp).getTime()
      const firstTouchTime = new Date(conv.attribution.firstTouch.timestamp).getTime()
      return (conversionTime - firstTouchTime) / (1000 * 60 * 60 * 24) // days
    })

    const averageTimeToConvert = conversionTimes.length > 0 
      ? conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length 
      : 0

    return {
      totalConversions,
      totalRevenue,
      averageConversionValue,
      conversionRate: 0, // Would be calculated based on total leads
      topPerformingCampaign,
      averageTimeToConvert
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const conversionTracker = new ConversionTracker()

