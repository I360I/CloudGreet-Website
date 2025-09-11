import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'
import { cache } from '../../../../lib/cache'
import { requireAuth } from '../../../lib/session-middleware'

export async function GET(request: NextRequest) {
  try {
    // For now, use test user ID to ensure API always works
    // TODO: Implement proper client-side authentication
    const userId = '00000000-0000-0000-0000-000000000001'
    
    // Check cache first
    const cacheKey = `analytics_stats_${userId}`
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return createSuccessResponse(cachedData)
    }
    
    // Fetch analytics data from database
    const { data: analytics, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      console.warn('Analytics table not found or error:', error.message)
      // Return default values if analytics table doesn't exist
      const statsData = {
        totalCalls: 0,
        successfulCalls: 0,
        conversionRate: 0,
        revenue: 0,
        activeAgents: 0,
        phoneNumbers: 0
      }
      return createSuccessResponse(statsData)
    }

    // Calculate totals (handle empty analytics array)
    const totalCalls = analytics?.reduce((sum, day) => sum + (day.total_calls || 0), 0) || 0
    const successfulCalls = analytics?.reduce((sum, day) => sum + (day.successful_calls || 0), 0) || 0
    const totalRevenue = analytics?.reduce((sum, day) => sum + (day.revenue || 0), 0) || 0
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

    // Get real agent and phone number counts
    const [agentsResult, phoneResult] = await Promise.all([
      supabase
        .from('voice_agents')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('voice_agents')
        .select('phone_number')
        .eq('user_id', userId)
        .not('phone_number', 'is', null)
    ])

    // Handle cases where voice_agents table might not exist
    const activeAgents = agentsResult.error ? 0 : (agentsResult.count || 0)
    const phoneNumbers = phoneResult.error ? 0 : (phoneResult.data?.length || 0)

    const statsData = {
      totalCalls,
      successfulCalls,
      conversionRate: Math.round(conversionRate * 10) / 10,
      revenue: totalRevenue,
      activeAgents,
      phoneNumbers
    }

    // Cache the data before returning
    cache.set(cacheKey, statsData, 300) // Cache for 5 minutes

    return createSuccessResponse(statsData)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
