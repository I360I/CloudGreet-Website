/**
 * Data Validation and Integrity Checks
 * Ensures client-side data authenticity and prevents manipulation
 */

import { logger } from './monitoring'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface AnalyticsData {
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  conversionRate: number
  churnRate: number
  retentionRate: number
  [key: string]: any
}

/**
 * Validate analytics data for authenticity and consistency
 */
export function validateAnalyticsData(data: AnalyticsData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for impossible values
  if (data.conversionRate < 0 || data.conversionRate > 100) {
    errors.push(`Invalid conversion rate: ${data.conversionRate}% (must be 0-100)`)
  }

  if (data.churnRate < 0 || data.churnRate > 100) {
    errors.push(`Invalid churn rate: ${data.churnRate}% (must be 0-100)`)
  }

  if (data.retentionRate < 0 || data.retentionRate > 100) {
    errors.push(`Invalid retention rate: ${data.retentionRate}% (must be 0-100)`)
  }

  if (data.totalRevenue < 0) {
    errors.push(`Invalid revenue: $${data.totalRevenue} (cannot be negative)`)
  }

  if (data.totalCalls < 0) {
    errors.push(`Invalid call count: ${data.totalCalls} (cannot be negative)`)
  }

  if (data.totalAppointments < 0) {
    errors.push(`Invalid appointment count: ${data.totalAppointments} (cannot be negative)`)
  }

  // Check for logical consistency
  if (data.churnRate + data.retentionRate > 100.1) { // Allow small floating point errors
    errors.push(`Churn rate (${data.churnRate}%) + retention rate (${data.retentionRate}%) cannot exceed 100%`)
  }

  // Check for suspicious patterns
  if (data.conversionRate > 80) {
    warnings.push(`Unusually high conversion rate: ${data.conversionRate}% (verify data accuracy)`)
  }

  if (data.churnRate > 50) {
    warnings.push(`Very high churn rate: ${data.churnRate}% (investigate customer satisfaction)`)
  }

  // Check for data manipulation indicators
  if (data.totalCalls > 0 && data.totalAppointments > data.totalCalls) {
    errors.push(`More appointments (${data.totalAppointments}) than calls (${data.totalCalls}) - data inconsistency`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Detect anomalies in data patterns
 */
export function detectDataAnomalies(currentData: AnalyticsData, historicalData: AnalyticsData[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (historicalData.length < 3) {
    warnings.push('Insufficient historical data for anomaly detection')
    return { isValid: true, errors, warnings }
  }

  // Calculate historical averages
  const avgConversionRate = historicalData.reduce((sum, d) => sum + d.conversionRate, 0) / historicalData.length
  const avgChurnRate = historicalData.reduce((sum, d) => sum + d.churnRate, 0) / historicalData.length
  const avgRevenue = historicalData.reduce((sum, d) => sum + d.totalRevenue, 0) / historicalData.length

  // Check for significant deviations (more than 50% change)
  const conversionDeviation = Math.abs(currentData.conversionRate - avgConversionRate) / avgConversionRate
  if (conversionDeviation > 0.5) {
    warnings.push(`Conversion rate anomaly: ${currentData.conversionRate}% vs historical average ${avgConversionRate.toFixed(1)}%`)
  }

  const churnDeviation = Math.abs(currentData.churnRate - avgChurnRate) / avgChurnRate
  if (churnDeviation > 0.5) {
    warnings.push(`Churn rate anomaly: ${currentData.churnRate}% vs historical average ${avgChurnRate.toFixed(1)}%`)
  }

  const revenueDeviation = Math.abs(currentData.totalRevenue - avgRevenue) / avgRevenue
  if (revenueDeviation > 0.5) {
    warnings.push(`Revenue anomaly: $${currentData.totalRevenue} vs historical average $${avgRevenue.toFixed(0)}`)
  }

  return {
    isValid: true,
    errors,
    warnings
  }
}

/**
 * Validate data integrity with cryptographic checks
 */
export function validateDataIntegrity(data: any, signature: string, timestamp: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check timestamp freshness (data should be less than 5 minutes old)
  const now = Date.now()
  const dataAge = now - timestamp
  const maxAge = 5 * 60 * 1000 // 5 minutes

  if (dataAge > maxAge) {
    errors.push(`Data is too old: ${Math.round(dataAge / 1000)}s (max: ${maxAge / 1000}s)`)
  }

  // Check signature validity (would need crypto implementation)
  // This is a placeholder for actual cryptographic validation
  if (!signature || signature.length < 10) {
    errors.push('Invalid data signature')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Log data validation results for audit trail
 */
export function logValidationResult(
  data: AnalyticsData,
  validation: ValidationResult,
  userId: string,
  businessId: string
): void {
  const logData = {
    userId,
    businessId,
    timestamp: new Date().toISOString(),
    totalCalls: data.totalCalls,
    totalAppointments: data.totalAppointments,
    totalRevenue: data.totalRevenue,
    conversionRate: data.conversionRate,
    churnRate: data.churnRate,
    retentionRate: data.retentionRate,
    isValid: validation.isValid,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length
  }

  if (validation.errors.length > 0) {
    logger.error('Data validation failed', logData)
  } else if (validation.warnings.length > 0) {
    logger.warn('Data validation warnings', logData)
  } else {
    logger.info('Data validation passed', logData)
  }
}

/**
 * Sanitize and normalize data before processing
 */
export function sanitizeAnalyticsData(data: any): AnalyticsData {
  return {
    totalCalls: Math.max(0, Math.round(data.totalCalls || 0)),
    totalAppointments: Math.max(0, Math.round(data.totalAppointments || 0)),
    totalRevenue: Math.max(0, Math.round((data.totalRevenue || 0) * 100) / 100), // Round to 2 decimal places
    conversionRate: Math.max(0, Math.min(100, Math.round((data.conversionRate || 0) * 10) / 10)),
    churnRate: Math.max(0, Math.min(100, Math.round((data.churnRate || 0) * 10) / 10)),
    retentionRate: Math.max(0, Math.min(100, Math.round((data.retentionRate || 0) * 10) / 10))
  }
}
