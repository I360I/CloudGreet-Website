/**
 * Data Signing and Integrity Protection
 * Prevents client-side data manipulation with cryptographic signatures
 */

import crypto from 'crypto'
import { logger } from './monitoring'

export interface SignedData {
  data: any
  signature: string
  timestamp: number
  nonce: string
}

/**
 * Sign data with HMAC to prevent tampering
 */
export function signData(data: any, secret: string = process.env.DATA_SIGNING_SECRET || 'default-secret'): SignedData {
  const timestamp = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex')
  
  // Create data payload for signing
  const payload = {
    data,
    timestamp,
    nonce
  }
  
  const payloadString = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex')
  
  logger.info('Data signed', {
    dataType: typeof data,
    timestamp,
    nonce: nonce.substring(0, 8) + '...'
  })
  
  return {
    data,
    signature,
    timestamp,
    nonce
  }
}

/**
 * Verify data signature to detect tampering
 */
export function verifyDataSignature(signedData: SignedData, secret: string = process.env.DATA_SIGNING_SECRET || 'default-secret'): boolean {
  try {
    const { data, signature, timestamp, nonce } = signedData
    
    // Recreate the payload
    const payload = {
      data,
      timestamp,
      nonce
    }
    
    const payloadString = JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
    
    const isValid = signature === expectedSignature
    
    if (!isValid) {
      logger.error('Data signature verification failed', {
        expected: expectedSignature.substring(0, 8) + '...',
        received: signature.substring(0, 8) + '...',
        timestamp,
        nonce: nonce.substring(0, 8) + '...'
      })
    }
    
    return isValid
  } catch (error) {
    logger.error('Error verifying data signature', { error: error instanceof Error ? error.message : 'Unknown error' })
    return false
  }
}

/**
 * Check if data is fresh (not too old)
 */
export function isDataFresh(signedData: SignedData, maxAgeMinutes: number = 5): boolean {
  const now = Date.now()
  const dataAge = now - signedData.timestamp
  const maxAge = maxAgeMinutes * 60 * 1000
  
  const isFresh = dataAge <= maxAge
  
  if (!isFresh) {
    logger.warn('Data is stale', {
      ageMinutes: Math.round(dataAge / (60 * 1000)),
      maxAgeMinutes,
      timestamp: new Date(signedData.timestamp).toISOString()
    })
  }
  
  return isFresh
}

/**
 * Create secure analytics data with signing
 */
export function createSecureAnalyticsData(analyticsData: any): SignedData {
  // Sanitize the data first
  const sanitizedData = {
    totalCalls: Math.max(0, Math.round(analyticsData.totalCalls || 0)),
    totalAppointments: Math.max(0, Math.round(analyticsData.totalAppointments || 0)),
    totalRevenue: Math.max(0, Math.round((analyticsData.totalRevenue || 0) * 100) / 100),
    conversionRate: Math.max(0, Math.min(100, Math.round((analyticsData.conversionRate || 0) * 10) / 10)),
    churnRate: Math.max(0, Math.min(100, Math.round((analyticsData.churnRate || 0) * 10) / 10)),
    retentionRate: Math.max(0, Math.min(100, Math.round((analyticsData.retentionRate || 0) * 10) / 10)),
    timestamp: Date.now(),
    businessId: analyticsData.businessId,
    userId: analyticsData.userId
  }
  
  return signData(sanitizedData)
}

/**
 * Validate and verify secure analytics data
 */
export function validateSecureAnalyticsData(signedData: SignedData): {
  isValid: boolean
  data: any
  errors: string[]
} {
  const errors: string[] = []
  
  // Verify signature
  if (!verifyDataSignature(signedData)) {
    errors.push('Data signature verification failed - possible tampering detected')
    return { isValid: false, data: null, errors }
  }
  
  // Check freshness
  if (!isDataFresh(signedData)) {
    errors.push('Data is stale - please refresh')
    return { isValid: false, data: null, errors }
  }
  
  // Validate data structure
  const { data } = signedData
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data structure')
    return { isValid: false, data: null, errors }
  }
  
  // Check required fields
  const requiredFields = ['totalCalls', 'totalAppointments', 'totalRevenue', 'conversionRate', 'churnRate', 'retentionRate']
  for (const field of requiredFields) {
    if (typeof data[field] !== 'number') {
      errors.push(`Missing or invalid field: ${field}`)
    }
  }
  
  if (errors.length > 0) {
    return { isValid: false, data: null, errors }
  }
  
  return { isValid: true, data, errors: [] }
}

/**
 * Create audit trail for data access
 */
export function createDataAuditTrail(
  action: string,
  userId: string,
  businessId: string,
  dataType: string,
  signedData?: SignedData
): void {
  const auditEntry = {
    action,
    userId,
    businessId,
    dataType,
    timestamp: new Date().toISOString(),
    signature: signedData?.signature?.substring(0, 8) + '...' || 'none',
    dataAge: signedData ? Date.now() - signedData.timestamp : null
  }
  
  logger.info('Data access audit', auditEntry)
}

/**
 * Generate data integrity report
 */
export function generateIntegrityReport(signedData: SignedData): {
  isValid: boolean
  integrityScore: number
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let integrityScore = 100
  
  // Check signature validity
  if (!verifyDataSignature(signedData)) {
    issues.push('Invalid signature detected')
    integrityScore -= 50
    recommendations.push('Regenerate data with valid signature')
  }
  
  // Check data freshness
  if (!isDataFresh(signedData)) {
    issues.push('Data is stale')
    integrityScore -= 30
    recommendations.push('Refresh data from server')
  }
  
  // Check data consistency
  const { data } = signedData
  if (data.churnRate + data.retentionRate > 100.1) {
    issues.push('Churn and retention rates inconsistent')
    integrityScore -= 20
    recommendations.push('Recalculate rates from source data')
  }
  
  return {
    isValid: integrityScore >= 70,
    integrityScore,
    issues,
    recommendations
  }
}
