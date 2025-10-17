/**
 * Response Tracking System for Email/SMS Campaigns
 * Tracks opens, clicks, replies, and conversions
 */

export interface ResponseEvent {
  id: string
  leadId: string
  campaignId: string
  messageId: string
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'converted'
  timestamp: string
  metadata?: Record<string, any>
  source: 'email' | 'sms'
  ipAddress?: string
  userAgent?: string
  linkUrl?: string
  responseText?: string
}

export interface CampaignResponse {
  campaignId: string
  leadId: string
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalConverted: number
  openRate: number
  clickRate: number
  replyRate: number
  conversionRate: number
  lastActivity: string
}

export interface LeadResponseHistory {
  leadId: string
  totalCampaigns: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalConverted: number
  lastActivity: string
  engagementScore: number
  responseHistory: ResponseEvent[]
}

export class ResponseTracker {
  private events: Map<string, ResponseEvent[]> = new Map()
  private campaignStats: Map<string, CampaignResponse> = new Map()
  private leadStats: Map<string, LeadResponseHistory> = new Map()

  /**
   * Track a response event
   */
  async trackEvent(event: Omit<ResponseEvent, 'id' | 'timestamp'>): Promise<ResponseEvent> {
    const responseEvent: ResponseEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    }

    // Store event
    const leadEvents = this.events.get(event.leadId) || []
    leadEvents.push(responseEvent)
    this.events.set(event.leadId, leadEvents)

    // Update campaign stats
    await this.updateCampaignStats(event.campaignId, event.leadId, event.eventType)

    // Update lead stats
    await this.updateLeadStats(event.leadId, event.eventType)

    return responseEvent
  }

  /**
   * Track email open
   */
  async trackEmailOpen(leadId: string, campaignId: string, messageId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType: 'opened',
      source: 'email',
      ipAddress,
      userAgent
    })
  }

  /**
   * Track email click
   */
  async trackEmailClick(leadId: string, campaignId: string, messageId: string, linkUrl: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType: 'clicked',
      source: 'email',
      linkUrl,
      ipAddress,
      userAgent
    })
  }

  /**
   * Track email reply
   */
  async trackEmailReply(leadId: string, campaignId: string, messageId: string, responseText: string): Promise<void> {
    await this.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType: 'replied',
      source: 'email',
      responseText
    })
  }

  /**
   * Track SMS reply
   */
  async trackSMSReply(leadId: string, campaignId: string, messageId: string, responseText: string): Promise<void> {
    await this.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType: 'replied',
      source: 'sms',
      responseText
    })
  }

  /**
   * Track conversion
   */
  async trackConversion(leadId: string, campaignId: string, messageId: string, source: 'email' | 'sms'): Promise<void> {
    await this.trackEvent({
      leadId,
      campaignId,
      messageId,
      eventType: 'converted',
      source
    })
  }

  /**
   * Get campaign response stats
   */
  getCampaignStats(campaignId: string): CampaignResponse | null {
    return this.campaignStats.get(campaignId) || null
  }

  /**
   * Get lead response history
   */
  getLeadStats(leadId: string): LeadResponseHistory | null {
    return this.leadStats.get(leadId) || null
  }

  /**
   * Get all events for a lead
   */
  getLeadEvents(leadId: string): ResponseEvent[] {
    return this.events.get(leadId) || []
  }

  /**
   * Calculate engagement score for a lead
   */
  calculateEngagementScore(leadId: string): number {
    const events = this.getLeadEvents(leadId)
    if (events.length === 0) return 0

    let score = 0
    const eventWeights = {
      sent: 1,
      delivered: 2,
      opened: 5,
      clicked: 10,
      replied: 25,
      converted: 100
    }

    events.forEach(event => {
      score += eventWeights[event.eventType] || 0
    })

    // Normalize to 0-100
    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get top performing campaigns
   */
  getTopPerformingCampaigns(limit: number = 10): CampaignResponse[] {
    const campaigns = Array.from(this.campaignStats.values())
    return campaigns
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, limit)
  }

  /**
   * Get most engaged leads
   */
  getMostEngagedLeads(limit: number = 10): LeadResponseHistory[] {
    const leads = Array.from(this.leadStats.values())
    return leads
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit)
  }

  /**
   * Update campaign statistics
   */
  private async updateCampaignStats(campaignId: string, leadId: string, eventType: string): Promise<void> {
    const existing = this.campaignStats.get(campaignId)
    const events = this.getLeadEvents(leadId)
    const campaignEvents = events.filter(e => e.campaignId === campaignId)

    const stats: CampaignResponse = {
      campaignId,
      leadId,
      totalSent: campaignEvents.filter(e => e.eventType === 'sent').length,
      totalDelivered: campaignEvents.filter(e => e.eventType === 'delivered').length,
      totalOpened: campaignEvents.filter(e => e.eventType === 'opened').length,
      totalClicked: campaignEvents.filter(e => e.eventType === 'clicked').length,
      totalReplied: campaignEvents.filter(e => e.eventType === 'replied').length,
      totalConverted: campaignEvents.filter(e => e.eventType === 'converted').length,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      conversionRate: 0,
      lastActivity: new Date().toISOString()
    }

    // Calculate rates
    if (stats.totalSent > 0) {
      stats.openRate = (stats.totalOpened / stats.totalSent) * 100
      stats.clickRate = (stats.totalClicked / stats.totalSent) * 100
      stats.replyRate = (stats.totalReplied / stats.totalSent) * 100
      stats.conversionRate = (stats.totalConverted / stats.totalSent) * 100
    }

    this.campaignStats.set(campaignId, stats)
  }

  /**
   * Update lead statistics
   */
  private async updateLeadStats(leadId: string, eventType: string): Promise<void> {
    const events = this.getLeadEvents(leadId)
    const existing = this.leadStats.get(leadId)

    const stats: LeadResponseHistory = {
      leadId,
      totalCampaigns: new Set(events.map(e => e.campaignId)).size,
      totalSent: events.filter(e => e.eventType === 'sent').length,
      totalOpened: events.filter(e => e.eventType === 'opened').length,
      totalClicked: events.filter(e => e.eventType === 'clicked').length,
      totalReplied: events.filter(e => e.eventType === 'replied').length,
      totalConverted: events.filter(e => e.eventType === 'converted').length,
      lastActivity: new Date().toISOString(),
      engagementScore: this.calculateEngagementScore(leadId),
      responseHistory: events
    }

    this.leadStats.set(leadId, stats)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const responseTracker = new ResponseTracker()

