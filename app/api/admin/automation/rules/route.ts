/**
 * Admin Automation Rules API
 * Manages automation rules and workflows
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
    const adminAuth = requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    // Query automation rules from database
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error && error.code !== 'PGRST116') { // Ignore "table doesn't exist" error
      console.error('Error fetching automation rules:', error)
    }

    // If table doesn't exist or no rules, return empty array
    const automationRules = rules || []

    // Calculate execution stats for each rule
    const rulesWithStats = await Promise.all(
      automationRules.map(async (rule) => {
        // Get execution count and success rate from logs
        const { data: executions } = await supabase
          .from('automation_executions')
          .select('status')
          .eq('rule_id', rule.id)

        const totalExecutions = executions?.length || 0
        const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0
        const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

        // Get last execution time
        const { data: lastExecution } = await supabase
          .from('automation_executions')
          .select('created_at')
          .eq('rule_id', rule.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const lastRun = lastExecution?.created_at 
          ? formatTimeAgo(new Date(lastExecution.created_at))
          : 'Never'

        return {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          status: rule.is_active ? 'active' : 'paused',
          trigger: rule.trigger_description || 'Manual trigger',
          action: rule.action_description || 'Execute workflow',
          executions: totalExecutions,
          success_rate: Math.round(successRate * 10) / 10,
          last_run: lastRun,
          created_at: rule.created_at
        }
      })
    )

    return NextResponse.json({
      success: true,
      rules: rulesWithStats
    })

  } catch (error) {
    console.error('Admin automation rules API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      rules: [] // Return empty array on error to prevent frontend crash
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const adminAuth = requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const body = await request.json()
    const { name, type, trigger, action, is_active = true } = body

    if (!name || !type) {
      return NextResponse.json({
        success: false,
        error: 'Name and type are required'
      }, { status: 400 })
    }

    // Create new automation rule
    const { data: newRule, error } = await supabase
      .from('automation_rules')
      .insert({
        name,
        type,
        trigger_description: trigger,
        action_description: action,
        is_active,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automation rule:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create automation rule'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rule: newRule
    })

  } catch (error) {
    console.error('Admin create automation rule error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require admin authentication
    const adminAuth = requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const body = await request.json()
    const { id, is_active } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 })
    }

    // Update automation rule status
    const { data: updatedRule, error } = await supabase
      .from('automation_rules')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating automation rule:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update automation rule'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rule: updatedRule
    })

  } catch (error) {
    console.error('Admin update automation rule error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  
  return date.toLocaleDateString()
}

