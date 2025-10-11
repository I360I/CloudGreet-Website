/**
 * Admin Automation Stats API
 * Provides statistics and metrics for automation rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'

    // Calculate date range
    const now = new Date()
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 30
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Get automation rules count
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('id, is_active')

    const totalRules = rules?.length || 0
    const activeRules = rules?.filter(r => r.is_active).length || 0

    // Get automation executions for the timeframe
    const { data: executions, error: executionsError } = await supabase
      .from('automation_executions')
      .select('*')
      .gte('created_at', startDate.toISOString())

    const executionsToday = executions?.filter(e => {
      const executionDate = new Date(e.created_at)
      return executionDate.toDateString() === now.toDateString()
    }).length || 0

    const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0
    const totalExecutions = executions?.length || 0
    const successRate = totalExecutions > 0 
      ? Math.round((successfulExecutions / totalExecutions) * 1000) / 10 
      : 0

    // Get leads processed (businesses created in timeframe)
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id')
      .gte('created_at', startDate.toISOString())

    const leadsProcessed = businesses?.length || 0

    // Get emails sent (from automation logs or email tracking)
    const { data: emailLogs } = await supabase
      .from('automation_executions')
      .select('id')
      .eq('type', 'email_sent')
      .gte('created_at', startDate.toISOString())

    const emailsSent = emailLogs?.length || 0

    // Get calls scheduled (appointments created via automation)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .gte('created_at', startDate.toISOString())

    const callsScheduled = appointments?.length || 0

    // Compile stats
    const stats = {
      total_rules: totalRules,
      active_rules: activeRules,
      executions_today: executionsToday,
      success_rate: successRate,
      leads_processed: leadsProcessed,
      emails_sent: emailsSent,
      calls_scheduled: callsScheduled,
      timeframe: timeframe,
      last_updated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Admin automation stats API error:', error)
    
    // Return default stats on error to prevent frontend crash
    return NextResponse.json({
      success: true,
      stats: {
        total_rules: 0,
        active_rules: 0,
        executions_today: 0,
        success_rate: 0,
        leads_processed: 0,
        emails_sent: 0,
        calls_scheduled: 0,
        timeframe: '30d',
        last_updated: new Date().toISOString()
      }
    })
  }
}

