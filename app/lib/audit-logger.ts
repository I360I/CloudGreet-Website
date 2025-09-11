import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase'

export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, any>
  timestamp?: string
}

export class AuditLogger {
  private static instance: AuditLogger
  private queue: AuditLogEntry[] = []
  private batchSize = 10
  private flushInterval = 5000 // 5 seconds

  private constructor() {
    // Start batch processing
    setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  public log(entry: AuditLogEntry): void {
    this.queue.push({
      ...entry,
      timestamp: new Date().toISOString()
    })

    // Flush immediately if queue is full
    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const entries = [...this.queue]
    this.queue = []

    try {
      const { error } = await supabaseAdmin
        .from('system_logs')
        .insert(entries)

      if (error) {
        console.error('Error writing audit logs:', error)
        // Re-queue failed entries
        this.queue.unshift(...entries)
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error)
      // Re-queue failed entries
      this.queue.unshift(...entries)
    }
  }

  // Convenience methods for common actions
  public logUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ): void {
    this.log({
      userId,
      action,
      resource,
      resourceId,
      details
    })
  }

  public logSystemAction(
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ): void {
    this.log({
      action,
      resource,
      resourceId,
      details
    })
  }

  public logSecurityEvent(
    action: string,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.log({
      action,
      resource: 'security',
      details,
      ipAddress: request ? this.getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined
    })
  }

  public logAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    request?: NextRequest
  ): void {
    this.log({
      userId,
      action: 'api_call',
      resource: 'api',
      resourceId: endpoint,
      details: {
        method,
        statusCode,
        responseTime,
        endpoint
      },
      ipAddress: request ? this.getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined
    })
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    
    return request.ip || 'unknown'
  }
}

// Predefined audit actions
export const AuditActions = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_UPDATE_PROFILE: 'user_update_profile',
  USER_CHANGE_PASSWORD: 'user_change_password',
  
  // Business actions
  BUSINESS_ONBOARDING_START: 'business_onboarding_start',
  BUSINESS_ONBOARDING_COMPLETE: 'business_onboarding_complete',
  BUSINESS_SETTINGS_UPDATE: 'business_settings_update',
  
  // Call actions
  CALL_STARTED: 'call_started',
  CALL_ENDED: 'call_ended',
  CALL_TRANSCRIPT_UPDATED: 'call_transcript_updated',
  CALL_ANALYZED: 'call_analyzed',
  
  // Booking actions
  BOOKING_CREATED: 'booking_created',
  BOOKING_UPDATED: 'booking_updated',
  BOOKING_DELETED: 'booking_deleted',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  
  // Subscription actions
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  
  // System actions
  SYSTEM_ERROR: 'system_error',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_BACKUP: 'system_backup',
  
  // Security actions
  SECURITY_LOGIN_FAILED: 'security_login_failed',
  SECURITY_RATE_LIMIT_EXCEEDED: 'security_rate_limit_exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security_suspicious_activity',
  SECURITY_DATA_EXPORT: 'security_data_export',
  SECURITY_DATA_DELETION: 'security_data_deletion'
} as const

// Audit middleware for API routes
export function withAuditLog(
  action: string,
  resource: string,
  options: {
    extractUserId?: (request: NextRequest) => string | undefined
    extractResourceId?: (request: NextRequest) => string | undefined
    extractDetails?: (request: NextRequest, response?: NextResponse) => Record<string, any>
  } = {}
) {
  return function auditMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now()
      const logger = AuditLogger.getInstance()
      
      try {
        const response = await handler(request)
        const responseTime = Date.now() - startTime
        
        // Log successful API call
        logger.logAPICall(
          request.nextUrl.pathname,
          request.method,
          response.status,
          responseTime,
          options.extractUserId?.(request),
          request
        )
        
        // Log specific action
        logger.log({
          userId: options.extractUserId?.(request),
          action,
          resource,
          resourceId: options.extractResourceId?.(request),
          details: options.extractDetails?.(request, response),
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined
        })
        
        return response
        
      } catch (error) {
        const responseTime = Date.now() - startTime
        
        // Log failed API call
        logger.logAPICall(
          request.nextUrl.pathname,
          request.method,
          500,
          responseTime,
          options.extractUserId?.(request),
          request
        )
        
        // Log error
        logger.log({
          userId: options.extractUserId?.(request),
          action: AuditActions.SYSTEM_ERROR,
          resource: 'api',
          resourceId: request.nextUrl.pathname,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            method: request.method,
            responseTime
          },
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined
        })
        
        throw error
      }
    }
  }
}

// Utility functions for common audit scenarios
export const auditUtils = {
  // Extract user ID from session
  extractUserIdFromSession: (request: NextRequest): string | undefined => {
    // This would extract user ID from the session/JWT token
    // Implementation depends on your auth system
    return undefined
  },

  // Extract resource ID from URL
  extractResourceIdFromURL: (request: NextRequest): string | undefined => {
    const pathSegments = request.nextUrl.pathname.split('/')
    return pathSegments[pathSegments.length - 1] || undefined
  },

  // Extract request details
  extractRequestDetails: (request: NextRequest): Record<string, any> => {
    return {
      method: request.method,
      url: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        'referer': request.headers.get('referer')
      }
    }
  }
}

export default AuditLogger
