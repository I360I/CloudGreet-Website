/**
 * Automated Follow-up Sequence System
 * Creates intelligent, personalized follow-up campaigns
 */

import { EmailTemplate, getTemplateById } from './email-templates'
import { SMSTemplate, getSMSTemplateById } from './sms-templates'
import { LeadStatus, leadStatusManager } from './lead-status-system'
import { responseTracker } from './response-tracking'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

export interface FollowUpStep {
  id: string
  sequenceId: string
  stepNumber: number
  delayHours: number
  messageType: 'email' | 'sms'
  templateId: string
  conditions?: FollowUpCondition[]
  isActive: boolean
}

export interface FollowUpCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: unknown
}

export interface FollowUpSequence {
  id: string
  name: string
  businessType: string[]
  triggerStatus: LeadStatus
  steps: FollowUpStep[]
  isActive: boolean
  totalSteps: number
  estimatedDuration: number // hours
  conversionRate: number
  createdBy: string
  createdAt: string
}

export interface SequenceExecution {
  id: string
  sequenceId: string
  leadId: string
  currentStep: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  startedAt: string
  lastStepAt: string
  nextStepAt: string
  completedAt?: string
  metadata?: Record<string, unknown>
}

export class FollowUpSequenceManager {
  private sequences: Map<string, FollowUpSequence> = new Map()
  private executions: Map<string, SequenceExecution> = new Map()
  private leadExecutions: Map<string, string> = new Map() // leadId -> executionId

  /**
   * Create a new follow-up sequence
   */
  async createSequence(sequence: Omit<FollowUpSequence, 'id' | 'createdAt' | 'totalSteps' | 'estimatedDuration' | 'conversionRate'>): Promise<FollowUpSequence> {
    const newSequence: FollowUpSequence = {
      ...sequence,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      totalSteps: sequence.steps.length,
      estimatedDuration: sequence.steps.reduce((total, step) => total + step.delayHours, 0),
      conversionRate: 0
    }

    this.sequences.set(newSequence.id, newSequence)
    return newSequence
  }

  /**
   * Start a follow-up sequence for a lead
   */
  async startSequence(leadId: string, sequenceId: string, metadata?: Record<string, unknown>): Promise<SequenceExecution> {
    const sequence = this.sequences.get(sequenceId)
    if (!sequence) {
      throw new Error('Sequence not found')
    }

    // Check if lead already has an active sequence
    const existingExecutionId = this.leadExecutions.get(leadId)
    if (existingExecutionId) {
      const existingExecution = this.executions.get(existingExecutionId)
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

      if (existingExecution && existingExecution.status === 'active') {
        throw new Error('Lead already has an active sequence')
      }
    }

    const execution: SequenceExecution = {
      id: this.generateId(),
      sequenceId,
      leadId,
      currentStep: 0,
      status: 'active',
      startedAt: new Date().toISOString(),
      lastStepAt: new Date().toISOString(),
      nextStepAt: this.calculateNextStepTime(sequence.steps[0]?.delayHours || 0),
      metadata
    }

    this.executions.set(execution.id, execution)
    this.leadExecutions.set(leadId, execution.id)

    // Start the first step immediately if delay is 0
    if (sequence.steps[0]?.delayHours === 0) {
      await this.executeStep(execution.id)
    }

    return execution
  }

  /**
   * Execute the next step in a sequence
   */
  async executeStep(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId)
    if (!execution || execution.status !== 'active') {
      return false
    }

    const sequence = this.sequences.get(execution.sequenceId)
    if (!sequence) {
      return false
    }

    const currentStep = sequence.steps[execution.currentStep]
    if (!currentStep) {
      // Sequence completed
      execution.status = 'completed'
      execution.completedAt = new Date().toISOString()
      this.executions.set(executionId, execution)
      return true
    }

    // Check conditions
    if (currentStep.conditions && !this.evaluateConditions(currentStep.conditions, execution.leadId)) {
      // Skip this step
      execution.currentStep++
      execution.lastStepAt = new Date().toISOString()
      execution.nextStepAt = this.calculateNextStepTime(sequence.steps[execution.currentStep]?.delayHours || 0)
      this.executions.set(executionId, execution)
      return await this.executeStep(executionId)
    }

    // Execute the step
    await this.sendMessage(execution.leadId, currentStep)

    // Move to next step
    execution.currentStep++
    execution.lastStepAt = new Date().toISOString()
    
    const nextStep = sequence.steps[execution.currentStep]
    if (nextStep) {
      execution.nextStepAt = this.calculateNextStepTime(nextStep.delayHours)
    } else {
      execution.status = 'completed'
      execution.completedAt = new Date().toISOString()
    }

    this.executions.set(executionId, execution)
    return true
  }

  /**
   * Pause a sequence execution
   */
  async pauseSequence(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (execution) {
      execution.status = 'paused'
      this.executions.set(executionId, execution)
    }
  }

  /**
   * Resume a paused sequence
   */
  async resumeSequence(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (execution && execution.status === 'paused') {
      execution.status = 'active'
      execution.nextStepAt = this.calculateNextStepTime(0) // Execute immediately
      this.executions.set(executionId, execution)
    }
  }

  /**
   * Cancel a sequence execution
   */
  async cancelSequence(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (execution) {
      execution.status = 'cancelled'
      this.executions.set(executionId, execution)
    }
  }

  /**
   * Get sequence execution for a lead
   */
  getLeadExecution(leadId: string): SequenceExecution | null {
    const executionId = this.leadExecutions.get(leadId)
    if (!executionId) return null

    return this.executions.get(executionId) || null
  }

  /**
   * Get all sequences
   */
  getAllSequences(): FollowUpSequence[] {
    return Array.from(this.sequences.values())
  }

  /**
   * Get all active sequences
   */
  getActiveSequences(): SequenceExecution[] {
    return Array.from(this.executions.values()).filter(exec => exec.status === 'active')
  }

  /**
   * Get sequences ready for execution
   */
  getSequencesReadyForExecution(): SequenceExecution[] {
    const now = new Date()
    return this.getActiveSequences().filter(exec => {
      const nextStepTime = new Date(exec.nextStepAt)
      return nextStepTime <= now
    })
  }

  /**
   * Process all ready sequences
   */
  async processReadySequences(): Promise<void> {
    const readySequences = this.getSequencesReadyForExecution()
    
    for (const execution of readySequences) {
      await this.executeStep(execution.id)
    }
  }

  /**
   * Get sequence performance stats
   */
  getSequenceStats(sequenceId: string): {
    totalExecutions: number
    completedExecutions: number
    activeExecutions: number
    conversionRate: number
    averageCompletionTime: number
  } {
    const executions = Array.from(this.executions.values()).filter(exec => exec.sequenceId === sequenceId)
    
    return {
      totalExecutions: executions.length,
      completedExecutions: executions.filter(exec => exec.status === 'completed').length,
      activeExecutions: executions.filter(exec => exec.status === 'active').length,
      conversionRate: 0, // Will be calculated based on lead conversions
      averageCompletionTime: 0 // Will be calculated
    }
  }

  /**
   * Send message for a step
   */
  private async sendMessage(leadId: string, step: FollowUpStep): Promise<void> {
    if (step.messageType === 'email') {
      const template = getTemplateById(step.templateId)
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

      if (template) {
        // Send email (implementation would integrate with email service)
        
        
        // Track the send event
        await responseTracker.trackEvent({
          leadId,
          campaignId: step.sequenceId,
          messageId: step.id,
          eventType: 'sent',
          source: 'email'
        })
      }
    } else if (step.messageType === 'sms') {
      const template = getSMSTemplateById(step.templateId)
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

      if (template) {
        // Send SMS (implementation would integrate with SMS service)
        
        
        // Track the send event
        await responseTracker.trackEvent({
          leadId,
          campaignId: step.sequenceId,
          messageId: step.id,
          eventType: 'sent',
          source: 'sms'
        })
      }
    }
  }

  /**
   * Evaluate step conditions
   */
  private evaluateConditions(conditions: FollowUpCondition[], leadId: string): boolean {
    // This would check lead data, status, engagement, etc.
    // For now, return true (no conditions)
    return true
  }

  /**
   * Calculate next step time
   */
  private calculateNextStepTime(delayHours: number): string {
    const nextTime = new Date()
    nextTime.setHours(nextTime.getHours() + delayHours)
    return nextTime.toISOString()
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const followUpSequenceManager = new FollowUpSequenceManager()

// Pre-built sequences for different business types
export const defaultSequences = {
  hvac: {
    name: 'HVAC Follow-up Sequence',
    businessType: ['HVAC', 'Heating', 'Cooling'],
    triggerStatus: 'contacted' as LeadStatus,
    steps: [
      {
        stepNumber: 1,
        delayHours: 0,
        messageType: 'email' as const,
        templateId: 'hvac_initial',
        isActive: true
      },
      {
        stepNumber: 2,
        delayHours: 24,
        messageType: 'sms' as const,
        templateId: 'hvac_initial_sms',
        isActive: true
      },
      {
        stepNumber: 3,
        delayHours: 72,
        messageType: 'email' as const,
        templateId: 'hvac_follow_up',
        isActive: true
      },
      {
        stepNumber: 4,
        delayHours: 168, // 7 days
        messageType: 'sms' as const,
        templateId: 'hvac_follow_up_sms',
        isActive: true
      },
      {
        stepNumber: 5,
        delayHours: 336, // 14 days
        messageType: 'email' as const,
        templateId: 'final_offer',
        isActive: true
      }
    ]
  },

  plumbing: {
    name: 'Plumbing Follow-up Sequence',
    businessType: ['Plumbing', 'Emergency Plumbing'],
    triggerStatus: 'contacted' as LeadStatus,
    steps: [
      {
        stepNumber: 1,
        delayHours: 0,
        messageType: 'email' as const,
        templateId: 'plumbing_initial',
        isActive: true
      },
      {
        stepNumber: 2,
        delayHours: 12,
        messageType: 'sms' as const,
        templateId: 'plumbing_initial_sms',
        isActive: true
      },
      {
        stepNumber: 3,
        delayHours: 48,
        messageType: 'sms' as const,
        templateId: 'plumbing_emergency_sms',
        isActive: true
      },
      {
        stepNumber: 4,
        delayHours: 120, // 5 days
        messageType: 'email' as const,
        templateId: 'demo_invite',
        isActive: true
      }
    ]
  },

  roofing: {
    name: 'Roofing Follow-up Sequence',
    businessType: ['Roofing', 'Roof Repair', 'Storm Damage'],
    triggerStatus: 'contacted' as LeadStatus,
    steps: [
      {
        stepNumber: 1,
        delayHours: 0,
        messageType: 'email' as const,
        templateId: 'roofing_initial',
        isActive: true
      },
      {
        stepNumber: 2,
        delayHours: 6,
        messageType: 'sms' as const,
        templateId: 'roofing_initial_sms',
        isActive: true
      },
      {
        stepNumber: 3,
        delayHours: 24,
        messageType: 'sms' as const,
        templateId: 'roofing_storm_sms',
        isActive: true
      },
      {
        stepNumber: 4,
        delayHours: 72,
        messageType: 'email' as const,
        templateId: 'demo_invite',
        isActive: true
      }
    ]
  }
}

