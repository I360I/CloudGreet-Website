/**
 * Lead Status Management System
 * Tracks lead progression through the sales funnel
 */

export type LeadStatus = 
  | 'new'           // Just discovered
  | 'contacted'     // Initial outreach sent
  | 'opened'        // Email opened
  | 'clicked'        // Link clicked
  | 'replied'        // Responded to outreach
  | 'interested'    // Expressed interest
  | 'demo_scheduled' // Demo call scheduled
  | 'demo_completed' // Demo call completed
  | 'proposal_sent'  // Proposal sent
  | 'negotiating'   // In negotiations
  | 'converted'      // Became a client
  | 'lost'          // Not interested
  | 'unqualified'   // Not a good fit

export interface LeadStatusUpdate {
  id: string
  leadId: string
  fromStatus: LeadStatus
  toStatus: LeadStatus
  timestamp: string
  reason?: string
  notes?: string
  updatedBy: string
  metadata?: Record<string, any>
}

export interface LeadStatusHistory {
  leadId: string
  currentStatus: LeadStatus
  statusHistory: LeadStatusUpdate[]
  timeInStatus: number // minutes
  totalTime: number // minutes
  conversionProbability: number // 0-100
  nextAction?: string
  lastActivity: string
}

export interface LeadFunnelStats {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  interestedLeads: number
  demoScheduledLeads: number
  convertedLeads: number
  lostLeads: number
  conversionRate: number
  averageTimeToConvert: number // days
  averageTimeInStatus: Record<LeadStatus, number> // minutes
}

export class LeadStatusManager {
  private statusHistory: Map<string, LeadStatusHistory> = new Map()
  private statusUpdates: Map<string, LeadStatusUpdate[]> = new Map()

  /**
   * Update lead status
   */
  async updateLeadStatus(
    leadId: string, 
    newStatus: LeadStatus, 
    updatedBy: string, 
    reason?: string, 
    notes?: string,
    metadata?: Record<string, any>
  ): Promise<LeadStatusUpdate> {
    const currentHistory = this.statusHistory.get(leadId)
    const currentStatus = currentHistory?.currentStatus || 'new'

    const statusUpdate: LeadStatusUpdate = {
      id: this.generateId(),
      leadId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      timestamp: new Date().toISOString(),
      reason,
      notes,
      updatedBy,
      metadata
    }

    // Store status update
    const updates = this.statusUpdates.get(leadId) || []
    updates.push(statusUpdate)
    this.statusUpdates.set(leadId, updates)

    // Update lead history
    await this.updateLeadHistory(leadId, newStatus, statusUpdate)

    return statusUpdate
  }

  /**
   * Get lead status history
   */
  getLeadStatusHistory(leadId: string): LeadStatusHistory | null {
    return this.statusHistory.get(leadId) || null
  }

  /**
   * Get all status updates for a lead
   */
  getLeadStatusUpdates(leadId: string): LeadStatusUpdate[] {
    return this.statusUpdates.get(leadId) || []
  }

  /**
   * Get leads by status
   */
  getLeadsByStatus(status: LeadStatus): string[] {
    const leads: string[] = []
    this.statusHistory.forEach((history, leadId) => {
      if (history.currentStatus === status) {
        leads.push(leadId)
      }
    })
    return leads
  }

  /**
   * Get funnel statistics
   */
  getFunnelStats(): LeadFunnelStats {
    const allLeads = Array.from(this.statusHistory.values())
    const totalLeads = allLeads.length

    const stats: LeadFunnelStats = {
      totalLeads,
      newLeads: this.getLeadsByStatus('new').length,
      contactedLeads: this.getLeadsByStatus('contacted').length,
      interestedLeads: this.getLeadsByStatus('interested').length,
      demoScheduledLeads: this.getLeadsByStatus('demo_scheduled').length,
      convertedLeads: this.getLeadsByStatus('converted').length,
      lostLeads: this.getLeadsByStatus('lost').length,
      conversionRate: 0,
      averageTimeToConvert: 0,
      averageTimeInStatus: {} as Record<LeadStatus, number>
    }

    // Calculate conversion rate
    if (totalLeads > 0) {
      stats.conversionRate = (stats.convertedLeads / totalLeads) * 100
    }

    // Calculate average time to convert
    const convertedLeads = allLeads.filter(lead => lead.currentStatus === 'converted')
    if (convertedLeads.length > 0) {
      const totalTime = convertedLeads.reduce((sum, lead) => sum + lead.totalTime, 0)
      stats.averageTimeToConvert = (totalTime / convertedLeads.length) / (1000 * 60 * 60 * 24) // Convert to days
    }

    // Calculate average time in each status
    const statusTimes: Record<LeadStatus, number[]> = {} as any
    allLeads.forEach(lead => {
      lead.statusHistory.forEach(update => {
        if (!statusTimes[update.fromStatus]) {
          statusTimes[update.fromStatus] = []
        }
        // Calculate time in status (simplified)
        statusTimes[update.fromStatus].push(lead.timeInStatus)
      })
    })

    Object.keys(statusTimes).forEach(status => {
      const times = statusTimes[status as LeadStatus]
      stats.averageTimeInStatus[status as LeadStatus] = times.reduce((sum, time) => sum + time, 0) / times.length
    })

    return stats
  }

  /**
   * Get next recommended action for a lead
   */
  getNextAction(leadId: string): string | null {
    const history = this.statusHistory.get(leadId)
    if (!history) return null

    const currentStatus = history.currentStatus
    const lastActivity = new Date(history.lastActivity)
    const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)

    switch (currentStatus) {
      case 'new':
        return 'Send initial outreach email'
      
      case 'contacted':
        if (hoursSinceActivity > 24) {
          return 'Send follow-up email or SMS'
        }
        return 'Wait for response'
      
      case 'opened':
        if (hoursSinceActivity > 48) {
          return 'Send follow-up with different angle'
        }
        return 'Wait for click or reply'
      
      case 'clicked':
        if (hoursSinceActivity > 24) {
          return 'Send demo invitation'
        }
        return 'Wait for reply'
      
      case 'replied':
        return 'Respond to their message'
      
      case 'interested':
        return 'Schedule demo call'
      
      case 'demo_scheduled':
        return 'Prepare for demo call'
      
      case 'demo_completed':
        return 'Send proposal and pricing'
      
      case 'proposal_sent':
        if (hoursSinceActivity > 72) {
          return 'Follow up on proposal'
        }
        return 'Wait for response'
      
      case 'negotiating':
        return 'Continue negotiations'
      
      case 'converted':
        return 'Onboard new client'
      
      case 'lost':
        return 'Mark as lost, no further action'
      
      case 'unqualified':
        return 'Remove from active campaigns'
      
      default:
        return 'Review lead status'
    }
  }

  /**
   * Calculate conversion probability
   */
  calculateConversionProbability(leadId: string): number {
    const history = this.statusHistory.get(leadId)
    if (!history) return 0

    const currentStatus = history.currentStatus
    const engagementScore = history.statusHistory.length
    const timeInFunnel = history.totalTime

    // Base probability by status
    const statusProbabilities: Record<LeadStatus, number> = {
      new: 5,
      contacted: 10,
      opened: 15,
      clicked: 25,
      replied: 40,
      interested: 60,
      demo_scheduled: 75,
      demo_completed: 85,
      proposal_sent: 90,
      negotiating: 95,
      converted: 100,
      lost: 0,
      unqualified: 0
    }

    let probability = statusProbabilities[currentStatus] || 0

    // Adjust based on engagement
    if (engagementScore > 5) probability += 10
    if (engagementScore > 10) probability += 15

    // Adjust based on time in funnel
    if (timeInFunnel > 7 * 24 * 60 * 60 * 1000) { // More than 7 days
      probability -= 10
    }

    return Math.min(100, Math.max(0, probability))
  }

  /**
   * Get leads needing attention
   */
  getLeadsNeedingAttention(): Array<{ leadId: string; action: string; priority: 'high' | 'medium' | 'low' }> {
    const leads: Array<{ leadId: string; action: string; priority: 'high' | 'medium' | 'low' }> = []

    this.statusHistory.forEach((history, leadId) => {
      const action = this.getNextAction(leadId)
      if (action && action !== 'Wait for response' && action !== 'Wait for click or reply') {
        const priority = this.getActionPriority(history.currentStatus, action)
        leads.push({ leadId, action, priority })
      }
    })

    return leads.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Update lead history
   */
  private async updateLeadHistory(leadId: string, newStatus: LeadStatus, statusUpdate: LeadStatusUpdate): Promise<void> {
    const existing = this.statusHistory.get(leadId)
    const updates = this.statusUpdates.get(leadId) || []

    const history: LeadStatusHistory = {
      leadId,
      currentStatus: newStatus,
      statusHistory: updates,
      timeInStatus: 0, // Will be calculated
      totalTime: existing?.totalTime || 0,
      conversionProbability: this.calculateConversionProbability(leadId),
      nextAction: this.getNextAction(leadId),
      lastActivity: new Date().toISOString()
    }

    this.statusHistory.set(leadId, history)
  }

  /**
   * Get action priority
   */
  private getActionPriority(status: LeadStatus, action: string): 'high' | 'medium' | 'low' {
    if (action.includes('demo') || action.includes('proposal') || action.includes('negotiating')) {
      return 'high'
    }
    if (action.includes('follow-up') || action.includes('respond')) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const leadStatusManager = new LeadStatusManager()

