import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: Lead Assignment Management
 * 
 * Assign leads to team members
 * Track workload and performance per team member
 */

// POST: Assign lead(s) to team member
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadIds, assignToUserId, unassign = false } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({
        error: 'leadIds array is required'
      }, { status: 400 })
    }

    if (!unassign && !assignToUserId) {
      return NextResponse.json({
        error: 'assignToUserId is required when not unassigning'
      }, { status: 400 })
    }

    // Verify assignee exists (if assigning)
    if (!unassign) {
      const { data: assignee } = await supabaseAdmin
        .from('admin_users')
        .select('id, name, email')
        .eq('id', assignToUserId)
        .single()

      if (!assignee) {
        return NextResponse.json({
          error: 'Assignee not found'
        }, { status: 404 })
      }
    }

    // Update lead assignments
    const { data: updatedLeads, error } = await supabaseAdmin
      .from('enriched_leads')
      .update({
        assigned_to: unassign ? null : assignToUserId,
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds)
      .select('id, business_name, assigned_to')

    if (error) {
      logger.error('Failed to update lead assignments', { error: error.message })
      return NextResponse.json({
        error: 'Failed to update assignments'
      }, { status: 500 })
    }

    // Log assignment changes
    for (const lead of updatedLeads || []) {
      await supabaseAdmin
        .from('lead_activity_log')
        .insert({
          lead_id: lead.id,
          activity_type: unassign ? 'unassigned' : 'assigned',
          description: unassign 
            ? 'Lead unassigned' 
            : `Lead assigned to ${assignToUserId}`,
          created_by: adminAuth.admin.userId,
          metadata: {
            previous_assignee: unassign ? assignToUserId : null,
            new_assignee: unassign ? null : assignToUserId
          }
        })
    }

    logger.info('Lead assignments updated', {
      leadIds,
      assignToUserId: unassign ? null : assignToUserId,
      action: unassign ? 'unassign' : 'assign',
      count: leadIds.length
    })

    return NextResponse.json({
      success: true,
      message: unassign 
        ? `Unassigned ${leadIds.length} leads`
        : `Assigned ${leadIds.length} leads`,
      updatedLeads
    })

  } catch (error) {
    logger.error('Lead assignment error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to update assignments'
    }, { status: 500 })
  }
}

// GET: Get assignment statistics
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    // Get assignment distribution
    const { data: assignments } = await supabaseAdmin
      .from('enriched_leads')
      .select(`
        assigned_to,
        enrichment_status,
        outreach_status,
        total_score,
        admin_users!left(name, email)
      `)

    if (!assignments) {
      return NextResponse.json({
        success: true,
        assignments: []
      })
    }

    // Group by assignee
    const assignmentStats: Record<string, any> = {}

    assignments.forEach(lead => {
      const assigneeId = lead.assigned_to || 'unassigned'
      
      if (!assignmentStats[assigneeId]) {
        assignmentStats[assigneeId] = {
          assigneeId,
          assigneeName: (lead.admin_users as any)?.name || 'Unassigned',
          assigneeEmail: (lead.admin_users as any)?.email || null,
          totalLeads: 0,
          enrichedLeads: 0,
          contactedLeads: 0,
          highScoreLeads: 0,
          averageScore: 0,
          scores: []
        }
      }

      const stats = assignmentStats[assigneeId]
      stats.totalLeads++

      if (lead.enrichment_status === 'enriched') {
        stats.enrichedLeads++
      }

      if (lead.outreach_status && lead.outreach_status !== 'not_contacted') {
        stats.contactedLeads++
      }

      if (lead.total_score) {
        stats.scores.push(lead.total_score)
        if (lead.total_score >= 80) {
          stats.highScoreLeads++
        }
      }
    })

    // Calculate average scores
    Object.values(assignmentStats).forEach((stats: any) => {
      if (stats.scores.length > 0) {
        stats.averageScore = Math.round(
          stats.scores.reduce((sum: number, score: number) => sum + score, 0) / stats.scores.length
        )
      }
      delete stats.scores // Remove raw scores from response
    })

    return NextResponse.json({
      success: true,
      assignments: Object.values(assignmentStats)
    })

  } catch (error) {
    logger.error('Assignment statistics error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to fetch assignment statistics'
    }, { status: 500 })
  }
}
