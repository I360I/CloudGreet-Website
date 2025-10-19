import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get automation statistics
    const [
      { data: rules, error: rulesError },
      { data: activeRules, error: activeRulesError },
      { data: executions, error: executionsError },
      { data: leadsProcessed, error: leadsError },
      { data: emailsSent, error: emailsError },
      { data: callsScheduled, error: callsError }
    ] = await Promise.all([
      supabase.from('automation_rules').select('id'),
      supabase.from('automation_rules').select('id').eq('is_active', true),
      supabase.from('automation_executions').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('leads').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('email_logs').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('calls').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    if (rulesError || activeRulesError || executionsError || leadsError || emailsError || callsError) {
      console.error('Error fetching automation stats:', { rulesError, activeRulesError, executionsError, leadsError, emailsError, callsError })
    }

    const stats = {
      total_rules: rules?.length || 0,
      active_rules: activeRules?.length || 0,
      executions_today: executions?.length || 0,
      success_rate: executions?.length > 0 ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100) : 0,
      leads_processed: leadsProcessed?.length || 0,
      emails_sent: emailsSent?.length || 0,
      calls_scheduled: callsScheduled?.length || 0
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Automation stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}