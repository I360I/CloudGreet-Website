import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { validateAnalyticsData, detectDataAnomalies, sanitizeAnalyticsData, logValidationResult } from '@/lib/data-validation'
import { createSecureAnalyticsData, createDataAuditTrail } from '@/lib/data-signing'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Require admin authentication
  const authCheck = requireAdmin(request)
  if (authCheck.error) return authCheck.response
  
  try {
    // Fetch real analytics data from database
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('*')

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*')

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('*')

    const { data: smsLogs } = await supabaseAdmin
      .from('sms_messages')
      .select('*')

    // Calculate real analytics
    const callsArray = Array.isArray(calls) ? calls : []
    const appointmentsArray = Array.isArray(appointments) ? appointments : []
    const businessesArray = Array.isArray(businesses) ? businesses : []
    
    const totalCalls = callsArray.length || 0
    const answeredCalls = callsArray.filter((call: any) => call.status === 'completed').length || 0
    const missedCalls = callsArray.filter((call: any) => call.status === 'no_answer').length || 0
    const conversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    const avgDuration = callsArray.reduce((sum: number, call: any) => sum + (call.duration || 0), 0) / totalCalls || 0

    const totalAppointments = appointmentsArray.length || 0
    const completedAppointments = appointmentsArray.filter((apt: any) => apt.status === 'completed').length || 0
    const cancelledAppointments = appointmentsArray.filter((apt: any) => apt.status === 'cancelled').length || 0
    const noShowAppointments = appointmentsArray.filter((apt: any) => apt.status === 'no_show').length || 0
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0

    const totalClients = businessesArray.length || 0
    const activeClients = businessesArray.filter((biz: any) => biz.onboarding_completed).length || 0
    const totalRevenue = appointmentsArray.reduce((sum: number, apt: any) => sum + (apt.estimated_value || 0), 0) || 0
    const avgClientValue = totalClients > 0 ? totalRevenue / totalClients : 0

    // Calculate REAL churn rate with proper time-based formula
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Get customers at start of period (30 days ago)
    const { data: customersAtStart } = await supabaseAdmin
      .from('businesses')
      .select('id, created_at, subscription_status')
      .lte('created_at', thirtyDaysAgo.toISOString())
    
    // Get customers who churned (cancelled subscriptions) in the last 30 days
    const { data: churnedCustomers } = await supabaseAdmin
      .from('subscription_events')
      .select('business_id, event_type, created_at')
      .eq('event_type', 'cancelled')
      .gte('created_at', thirtyDaysAgo.toISOString())
    
    const customersAtStartCount = customersAtStart?.length || 0
    const churnedCount = churnedCustomers?.length || 0
    
    // REAL churn rate calculation: (Customers Lost / Customers at Start) × 100
    const churnRate = customersAtStartCount > 0 ? (churnedCount / customersAtStartCount) * 100 : 0
    const retentionRate = 100 - churnRate

    const smsLogsArray = Array.isArray(smsLogs) ? smsLogs : []
    const totalSMS = smsLogsArray.length || 0
    const deliveredSMS = smsLogsArray.filter((sms: any) => sms.status === 'delivered').length || 0
    const repliedSMS = smsLogsArray.filter((sms: any) => sms.status === 'replied').length || 0
    const responseRate = totalSMS > 0 ? (repliedSMS / totalSMS) * 100 : 0

    const analytics = {
      revenue: {
        total: totalRevenue,
        monthly: totalRevenue, // Simplified for now
        average: avgClientValue
      },
      calls: {
        total: totalCalls,
        answered: answeredCalls,
        missed: missedCalls,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageDuration: Math.round(avgDuration * 10) / 10
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        noShow: noShowAppointments,
        completionRate: Math.round(completionRate * 10) / 10
      },
      clients: {
        total: totalClients,
        active: activeClients,
        churned: churnedCount, // REAL churn count
        churnRate: Math.round(churnRate * 10) / 10, // REAL churn rate
        retentionRate: Math.round(retentionRate * 10) / 10, // REAL retention rate
        averageValue: Math.round(avgClientValue)
      },
      sms: {
        sent: totalSMS,
        delivered: deliveredSMS,
        replied: repliedSMS,
        responseRate: Math.round(responseRate * 10) / 10
      },
      performance: {
        systemUptime: 99.8, // This would come from actual monitoring
        responseTime: 1.2, // This would come from actual monitoring
        errorRate: 0.1, // This would come from actual monitoring
        satisfaction: 4.7 // This would come from actual feedback
      }
    }

    // Sanitize and validate analytics data
    const sanitizedAnalytics = sanitizeAnalyticsData(analytics)
    const validation = validateAnalyticsData(sanitizedAnalytics)
    
    // Log validation results for audit trail
    logValidationResult(sanitizedAnalytics, validation, 'admin', 'system')
    
    if (!validation.isValid) {
      logger.error('Analytics data validation failed', {
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        errors: validation.errors.join(', '),
        warnings: validation.warnings.join(', '),
        totalCalls: sanitizedAnalytics.totalCalls,
        totalAppointments: sanitizedAnalytics.totalAppointments,
        totalRevenue: sanitizedAnalytics.totalRevenue
      })
      
      return NextResponse.json({
        success: false,
        error: 'Data validation failed',
        details: validation.errors
      }, { status: 400 })
    }
    
    // Create secure signed data
    const secureData = createSecureAnalyticsData({
      ...sanitizedAnalytics,
      businessId: 'system',
      userId: 'admin'
    })
    
    // Create audit trail
    createDataAuditTrail('analytics_access', 'admin', 'system', 'admin_analytics', secureData)
    
    return NextResponse.json({
      success: true,
      data: sanitizedAnalytics,
      signedData: secureData,
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings
      }
    })
    
  } catch (error) {
    logger.error('Admin analytics API error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      endpoint: 'admin/analytics',
      method: 'GET'
    })
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch analytics data' 
    }, { status: 500 })
  }
}

