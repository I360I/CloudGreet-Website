import { CONFIG } from '@/lib/config'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

export interface ROIData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsBooked: number
  appointmentsCompleted: number
  totalRevenue: number
  totalFees: number
  netROI: number
  roiPercentage: number
  closeRate: number
  conversionRate: number
}

export interface CallData {
  id: string
  status: string
  duration?: number
  created_at: string
}

export interface AppointmentData {
  id: string
  status: string
  created_at: string
}

/**
 * calculateROI - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await calculateROI(param1, param2)
 * ```
 */
export function calculateROI(calls: CallData[], appointments: AppointmentData[]): ROIData {
  const totalCalls = calls.length
  const answeredCalls = calls.filter(c => c.status === 'completed').length
  const missedCalls = totalCalls - answeredCalls
  const appointmentsBooked = appointments.length
  const appointmentsCompleted = appointments.filter(a => a.status === 'completed').length

  // Calculate revenue using config values
  const averageTicket = CONFIG.BUSINESS.AVERAGE_TICKET
  const totalRevenue = appointmentsCompleted * averageTicket

  // Calculate costs using config values
  const monthlyCost = CONFIG.BUSINESS.MONTHLY_COST
  const perBookingFee = CONFIG.BUSINESS.PER_BOOKING_FEE
  const totalFees = monthlyCost + (appointmentsBooked * perBookingFee)

  // Calculate ROI
  const netROI = totalRevenue - totalFees
  const roiPercentage = totalFees > 0 ? (netROI / totalFees) * 100 : 0

  // Calculate rates
  const closeRate = appointmentsBooked > 0 ? (appointmentsCompleted / appointmentsBooked) * 100 : 0
  const conversionRate = totalCalls > 0 ? (appointmentsBooked / totalCalls) * 100 : 0

  return {
    totalCalls,
    answeredCalls,
    missedCalls,
    appointmentsBooked,
    appointmentsCompleted,
    totalRevenue,
    totalFees,
    netROI,
    roiPercentage,
    closeRate,
    conversionRate
  }
}

/**
 * calculateCallQualityMetrics - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await calculateCallQualityMetrics(param1, param2)
 * ```
 */
export function calculateCallQualityMetrics(calls: CallData[]) {
  const completedCalls = calls.filter(c => c.status === 'completed')
  const totalCalls = calls.length
  
  if (totalCalls === 0) {
    return {
      avgCallDuration: 0,
      avgResponseTime: 0,
      audioQuality: CONFIG.CALL_QUALITY.AUDIO_QUALITY_THRESHOLD,
      dropRate: 0,
      customerSatisfaction: 0
    }
  }

  const avgCallDuration = completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCalls.length
  // Calculate average response time from call data if available
  // For now, use threshold as fallback until response_time field is tracked
  const avgResponseTime = CONFIG.CALL_QUALITY.RESPONSE_TIME_THRESHOLD
  const audioQuality = CONFIG.CALL_QUALITY.AUDIO_QUALITY_THRESHOLD
  const dropRate = ((totalCalls - completedCalls.length) / totalCalls) * 100
  const customerSatisfaction = CONFIG.CALL_QUALITY.SATISFACTION_THRESHOLD

  return {
    avgCallDuration: Math.round(avgCallDuration),
    avgResponseTime,
    audioQuality,
    dropRate: Math.round(dropRate * 100) / 100,
    customerSatisfaction
  }
}

