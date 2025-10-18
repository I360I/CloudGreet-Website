/**
 * Trigger-Based Automation Engine
 * Executes automated actions based on lead behavior and campaign triggers
 */

import { leadStatusManager, LeadStatus } from './lead-status-system'
import { responseTracker } from './response-tracking'
import { followUpSequenceManager } from './follow-up-sequences'
import { conversionTracker } from './conversion-tracking'

export interface AutomationTrigger {
  id: string
  name: string
  description: string
  triggerType: 'lead_status_change' | 'email_opened' | 'email_clicked' | 'email_replied' | 'sms_replied' | 'time_based' | 'score_threshold' | 'engagement_level'
  conditions: TriggerCondition[]
  isActive: boolean
  priority: number
  createdAt: string
  createdBy: string
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logic: 'AND' | 'OR'
}

export interface AutomationAction {
  id: string
  name: string
  actionType: 'send_email' | 'send_sms' | 'update_status' | 'start_sequence' | 'pause_sequence' | 'schedule_call' | 'add_tag' | 'remove_tag' | 'create_task' | 'send_notification'
  parameters: Record<string, any>
  delayMinutes?: number
  isActive: boolean
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
  isActive: boolean
  executionCount: number
  successCount: number
  failureCount: number
  lastExecuted?: string
  createdAt: string
  createdBy: string
}

export interface AutomationExecution {
  id: string
  ruleId: string
  leadId: string
  triggerData: any
  actions: AutomationAction[]
  status: 'pending' | 'executing' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  errorMessage?: string
  results: AutomationActionResult[]
}

export interface AutomationActionResult {
  actionId: string
  actionName: string
  status: 'success' | 'failed'
  message?: string
  executedAt: string
  data?: any
}

export class AutomationEngine {
  private rules: Map<string, AutomationRule> = new Map()
  private executions: Map<string, AutomationExecution> = new Map()
  private isRunning: boolean = false
  private executionQueue: string[] = []

  /**
   * Create a new automation rule
   */
  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'executionCount' | 'successCount' | 'failureCount'>): Promise<AutomationRule> {
    const newRule: AutomationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0
    }

    this.rules.set(newRule.id, newRule)
    return newRule
  }

  /**
   * Start the automation engine
   */
  async start(): Promise<void> {
    this.isRunning = true
    console.log('Automation engine started')
    
    // Process execution queue every 30 seconds
    setInterval(() => {
      if (this.isRunning) {
        this.processExecutionQueue()
      }
    }, 30000)

    // Check for triggers every 60 seconds
    setInterval(() => {
      if (this.isRunning) {
        this.checkTriggers()
      }
    }, 60000)
  }

  /**
   * Stop the automation engine
   */
  async stop(): Promise<void> {
    this.isRunning = false
    console.log('Automation engine stopped')
  }

  /**
   * Check for triggers and execute rules
   */
  async checkTriggers(): Promise<void> {
    const activeRules = Array.from(this.rules.values()).filter(rule => rule.isActive)
    
    for (const rule of activeRules) {
      try {
        const shouldExecute = await this.evaluateTrigger(rule.trigger)
        if (shouldExecute) {
          await this.executeRule(rule)
        }
      } catch (error) {
        console.error(`Error checking trigger for rule ${rule.id}:`, error)
      }
    }
  }

  /**
   * Evaluate if a trigger should fire
   */
  private async evaluateTrigger(trigger: AutomationTrigger): Promise<boolean> {
    // This would evaluate the trigger conditions against current lead data
    // For now, return a simple evaluation
    return trigger.isActive && trigger.conditions.length > 0
  }

  /**
   * Execute an automation rule
   */
  async executeRule(rule: AutomationRule, leadId?: string): Promise<AutomationExecution> {
    const execution: AutomationExecution = {
      id: this.generateId(),
      ruleId: rule.id,
      leadId: leadId || 'system',
      triggerData: {},
      actions: rule.actions,
      status: 'pending',
      startedAt: new Date().toISOString(),
      results: []
    }

    this.executions.set(execution.id, execution)
    this.executionQueue.push(execution.id)

    // Update rule statistics
    rule.executionCount++
    rule.lastExecuted = new Date().toISOString()
    this.rules.set(rule.id, rule)

    return execution
  }

  /**
   * Process the execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const executionId = this.executionQueue.shift()
      if (executionId) {
        await this.processExecution(executionId)
      }
    }
  }

  /**
   * Process a single execution
   */
  private async processExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)
    if (!execution) return

    execution.status = 'executing'
    this.executions.set(executionId, execution)

    try {
      for (const action of execution.actions) {
        if (action.isActive) {
          const result = await this.executeAction(action, execution.leadId)
          execution.results.push(result)

          // Add delay if specified
          if (action.delayMinutes && action.delayMinutes > 0) {
            await this.delay(action.delayMinutes * 60 * 1000)
          }
        }
      }

      execution.status = 'completed'
      execution.completedAt = new Date().toISOString()

      // Update rule success count
      const rule = this.rules.get(execution.ruleId)
      if (rule) {
        rule.successCount++
        this.rules.set(rule.id, rule)
      }

    } catch (error) {
      execution.status = 'failed'
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date().toISOString()

      // Update rule failure count
      const rule = this.rules.get(execution.ruleId)
      if (rule) {
        rule.failureCount++
        this.rules.set(rule.id, rule)
      }
    }

    this.executions.set(executionId, execution)
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: AutomationAction, leadId: string): Promise<AutomationActionResult> {
    const result: AutomationActionResult = {
      actionId: action.id,
      actionName: action.name,
      status: 'success',
      executedAt: new Date().toISOString()
    }

    try {
      switch (action.actionType) {
        case 'send_email':
          await this.sendEmail(leadId, action.parameters)
          break
        case 'send_sms':
          await this.sendSMS(leadId, action.parameters)
          break
        case 'update_status':
          await this.updateLeadStatus(leadId, action.parameters)
          break
        case 'start_sequence':
          await this.startSequence(leadId, action.parameters)
          break
        case 'pause_sequence':
          await this.pauseSequence(leadId, action.parameters)
          break
        case 'schedule_call':
          await this.scheduleCall(leadId, action.parameters)
          break
        case 'add_tag':
          await this.addTag(leadId, action.parameters)
          break
        case 'remove_tag':
          await this.removeTag(leadId, action.parameters)
          break
        case 'create_task':
          await this.createTask(leadId, action.parameters)
          break
        case 'send_notification':
          await this.sendNotification(leadId, action.parameters)
          break
        default:
          throw new Error(`Unknown action type: ${action.actionType}`)
      }
    } catch (error) {
      result.status = 'failed'
      result.message = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  /**
   * Send email action
   */
  private async sendEmail(leadId: string, parameters: any): Promise<void> {
    console.log(`Sending email to lead ${leadId}:`, parameters)
    // Implementation would integrate with email service
  }

  /**
   * Send SMS action
   */
  private async sendSMS(leadId: string, parameters: any): Promise<void> {
    console.log(`Sending SMS to lead ${leadId}:`, parameters)
    // Implementation would integrate with SMS service
  }

  /**
   * Update lead status action
   */
  private async updateLeadStatus(leadId: string, parameters: any): Promise<void> {
    const newStatus = parameters.status as LeadStatus
    await leadStatusManager.updateLeadStatus(leadId, newStatus, 'automation', parameters.reason)
  }

  /**
   * Start sequence action
   */
  private async startSequence(leadId: string, parameters: any): Promise<void> {
    const sequenceId = parameters.sequenceId
    await followUpSequenceManager.startSequence(leadId, sequenceId, parameters.metadata)
  }

  /**
   * Pause sequence action
   */
  private async pauseSequence(leadId: string, parameters: any): Promise<void> {
    const execution = followUpSequenceManager.getLeadExecution(leadId)
    if (execution) {
      await followUpSequenceManager.pauseSequence(execution.id)
    }
  }

  /**
   * Schedule call action
   */
  private async scheduleCall(leadId: string, parameters: any): Promise<void> {
    console.log(`Scheduling call for lead ${leadId}:`, parameters)
    // Implementation would integrate with calendar service
  }

  /**
   * Add tag action
   */
  private async addTag(leadId: string, parameters: any): Promise<void> {
    console.log(`Adding tag to lead ${leadId}:`, parameters)
    // Implementation would add tags to lead
  }

  /**
   * Remove tag action
   */
  private async removeTag(leadId: string, parameters: any): Promise<void> {
    console.log(`Removing tag from lead ${leadId}:`, parameters)
    // Implementation would remove tags from lead
  }

  /**
   * Create task action
   */
  private async createTask(leadId: string, parameters: any): Promise<void> {
    console.log(`Creating task for lead ${leadId}:`, parameters)
    // Implementation would create task in CRM
  }

  /**
   * Send notification action
   */
  private async sendNotification(leadId: string, parameters: any): Promise<void> {
    console.log(`Sending notification for lead ${leadId}:`, parameters)
    // Implementation would send notification
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AutomationRule | null {
    return this.rules.get(ruleId) || null
  }

  /**
   * Get all rules
   */
  getAllRules(): AutomationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get active rules
   */
  getActiveRules(): AutomationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive)
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): AutomationExecution | null {
    return this.executions.get(executionId) || null
  }

  /**
   * Get all executions
   */
  getAllExecutions(): AutomationExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Get executions for a rule
   */
  getExecutionsForRule(ruleId: string): AutomationExecution[] {
    return Array.from(this.executions.values()).filter(exec => exec.ruleId === ruleId)
  }

  /**
   * Get automation statistics
   */
  getAutomationStats(): {
    totalRules: number
    activeRules: number
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    successRate: number
    averageExecutionTime: number
  } {
    const rules = Array.from(this.rules.values())
    const executions = Array.from(this.executions.values())

    const totalRules = rules.length
    const activeRules = rules.filter(rule => rule.isActive).length
    const totalExecutions = executions.length
    const successfulExecutions = executions.filter(exec => exec.status === 'completed').length
    const failedExecutions = executions.filter(exec => exec.status === 'failed').length
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

    const completedExecutions = executions.filter(exec => exec.completedAt)
    const averageExecutionTime = completedExecutions.length > 0 ?
      completedExecutions.reduce((sum, exec) => {
        const start = new Date(exec.startedAt).getTime()
        const end = new Date(exec.completedAt!).getTime()
        return sum + (end - start)
      }, 0) / completedExecutions.length : 0

    return {
      totalRules,
      activeRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      averageExecutionTime
    }
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Global instance
export const automationEngine = new AutomationEngine()

// Pre-built automation rules
export const defaultAutomationRules = {
  // When lead opens email, send follow-up SMS
  emailOpenedSMS: {
    name: 'Email Opened → SMS Follow-up',
    description: 'Send SMS follow-up when lead opens email',
    trigger: {
      name: 'Email Opened',
      triggerType: 'email_opened' as const,
      conditions: [],
      isActive: true,
      priority: 1
    },
    actions: [
      {
        name: 'Send SMS Follow-up',
        actionType: 'send_sms' as const,
        parameters: { templateId: 'follow_up_sms' },
        delayMinutes: 30,
        isActive: true
      }
    ],
    isActive: true,
    createdBy: 'system'
  },

  // When lead clicks link, start demo sequence
  linkClickedDemo: {
    name: 'Link Clicked → Demo Sequence',
    description: 'Start demo sequence when lead clicks email link',
    trigger: {
      name: 'Email Link Clicked',
      triggerType: 'email_clicked' as const,
      conditions: [],
      isActive: true,
      priority: 1
    },
    actions: [
      {
        name: 'Start Demo Sequence',
        actionType: 'start_sequence' as const,
        parameters: { sequenceId: 'demo_sequence' },
        isActive: true
      }
    ],
    isActive: true,
    createdBy: 'system'
  },

  // When lead replies, update status and schedule call
  replyScheduled: {
    name: 'Reply → Schedule Call',
    description: 'Schedule call when lead replies to email',
    trigger: {
      name: 'Email Replied',
      triggerType: 'email_replied' as const,
      conditions: [],
      isActive: true,
      priority: 1
    },
    actions: [
      {
        name: 'Update Status to Interested',
        actionType: 'update_status' as const,
        parameters: { status: 'interested', reason: 'Replied to email' },
        isActive: true
      },
      {
        name: 'Schedule Demo Call',
        actionType: 'schedule_call' as const,
        parameters: { type: 'demo', duration: 15 },
        delayMinutes: 5,
        isActive: true
      }
    ],
    isActive: true,
    createdBy: 'system'
  }
}

