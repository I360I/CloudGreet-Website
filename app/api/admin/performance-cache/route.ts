import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Cache for performance metrics (5 minutes)
const performanceCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    const cacheKey = 'admin-performance-metrics'
    const cachedData = performanceCache.get(cacheKey)
    
    // Return cached data if still valid
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        cached: true,
        cache_age: Math.round((Date.now() - cachedData.timestamp) / 1000)
      })
    }

    // Fetch fresh data
    const performanceData = await fetchPerformanceMetrics()
    
    // Cache the data
    performanceCache.set(cacheKey, {
      data: performanceData,
      timestamp: Date.now()
    })

    return NextResponse.json({
      success: true,
      data: performanceData,
      cached: false
    })

  } catch (error) {
    console.error('Performance cache error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch performance data'
    }, { status: 500 })
  }
}

async function fetchPerformanceMetrics() {
  // Parallel queries for maximum performance
  const [
    clientsResult,
    revenueResult,
    callsResult,
    leadsResult,
    systemHealthResult
  ] = await Promise.all([
    // Client metrics
    supabaseAdmin
      .from('businesses')
      .select('id, created_at, monthly_revenue, is_active')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    
    // Revenue metrics
    supabaseAdmin
      .from('stripe_subscriptions')
      .select('status, current_period_start, amount')
      .eq('status', 'active'),
    
    // Call metrics
    supabaseAdmin
      .from('calls')
      .select('id, created_at, duration, status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    
    // Lead metrics
    supabaseAdmin
      .from('leads')
      .select('id, created_at, status, estimated_revenue')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    
    // System health
    supabaseAdmin
      .from('system_health')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ])

  const clients = clientsResult.data || []
  const revenue = revenueResult.data || []
  const calls = callsResult.data || []
  const leads = leadsResult.data || []
  const systemHealth = systemHealthResult.data

  // Calculate metrics
  const totalClients = clients.length
  const activeClients = clients.filter(c => c.is_active).length
  const monthlyRevenue = revenue.reduce((sum, sub) => sum + (sub.amount || 0), 0)
  const callsToday = calls.length
  const avgCallDuration = calls.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0
  const leadsThisWeek = leads.length
  const conversionRate = leads.length > 0 ? (leads.filter(l => l.status === 'converted').length / leads.length) * 100 : 0
  const avgLeadValue = leads.length > 0 ? leads.reduce((sum, lead) => sum + (lead.estimated_revenue || 0), 0) / leads.length : 0

  return {
    totalClients,
    activeClients,
    monthlyRevenue,
    totalRevenue: monthlyRevenue * 12, // Annual projection
    averageClientValue: totalClients > 0 ? monthlyRevenue / totalClients : 0,
    conversionRate,
    callsToday,
    avgCallDuration,
    leadsThisWeek,
    avgLeadValue,
    systemHealth: systemHealth?.status || 'healthy',
    lastUpdated: new Date().toISOString()
  }
}

// Clear cache endpoint for admin use
export async function DELETE(request: NextRequest) {
  try {
    performanceCache.clear()
    
    return NextResponse.json({
      success: true,
      message: 'Performance cache cleared successfully'
    })
  } catch (error) {
    console.error('Cache clear error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 })
  }
}
