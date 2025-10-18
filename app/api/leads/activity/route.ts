import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LeadActivity {
  id: string
  leadId: string
  activityType: string
  description: string
  metadata: Record<string, any>
  createdBy?: string
  createdAt: string
  updatedAt: string
}

interface LeadNote {
  id: string
  leadId: string
  note: string
  noteType: 'general' | 'call_outcome' | 'email_response' | 'meeting' | 'follow_up' | 'research'
  createdBy?: string
  createdAt: string
  updatedAt: string
}

interface LeadInteraction {
  id: string
  leadId: string
  interactionType: 'call' | 'email' | 'sms' | 'meeting' | 'demo' | 'proposal' | 'contract'
  direction: 'inbound' | 'outbound'
  status: 'completed' | 'scheduled' | 'cancelled' | 'no_answer' | 'voicemail'
  duration?: number
  subject?: string
  content?: string
  outcome?: string
  nextAction?: string
  scheduledAt?: string
  completedAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

interface LeadTimeline {
  leadId: string
  activities: LeadActivity[]
  notes: LeadNote[]
  interactions: LeadInteraction[]
  milestones: Array<{
    id: string
    type: string
    title: string
    description: string
    achievedAt: string
    metadata: Record<string, any>
  }>
}

interface ActivityAnalytics {
  totalActivities: number
  activitiesByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  activitiesByUser: Array<{
    userId: string
    userName: string
    count: number
    percentage: number
  }>
  recentActivity: LeadActivity[]
  activityTrends: Array<{
    date: string
    count: number
  }>
  interactionStats: {
    totalInteractions: number
    callsCompleted: number
    emailsSent: number
    meetingsScheduled: number
    averageResponseTime: number
  }
}

// GET /api/leads/activity - Get lead activity data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || 'default'
    const leadId = searchParams.get('leadId')
    const activityType = searchParams.get('activityType')
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let query = supabase
      .from('lead_activity_log')
      .select(`
        *,
        admin_users!lead_activity_log_created_by_fkey(name, email)
      `)
      .eq('business_id', businessId)

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    query = query.order('created_at', { ascending: false })

    const { data: activities, error: activitiesError } = await query

    if (activitiesError) {
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`)
    }

    // Get notes if leadId is specified
    let notes: LeadNote[] = []
    if (leadId) {
      const { data: notesData, error: notesError } = await supabase
        .from('lead_notes')
        .select(`
          *,
          admin_users!lead_notes_created_by_fkey(name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (notesError) {
        console.error('Failed to fetch notes:', notesError.message)
      } else {
        notes = notesData || []
      }
    }

    // Get interactions if leadId is specified
    let interactions: LeadInteraction[] = []
    if (leadId) {
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('lead_interactions')
        .select(`
          *,
          admin_users!lead_interactions_created_by_fkey(name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (interactionsError) {
        console.error('Failed to fetch interactions:', interactionsError.message)
      } else {
        interactions = interactionsData || []
      }
    }

    let analytics = null
    if (includeAnalytics) {
      analytics = await calculateActivityAnalytics(businessId, activities || [])
    }

    // If leadId is specified, return timeline data
    if (leadId) {
      const timeline: LeadTimeline = {
        leadId,
        activities: activities || [],
        notes,
        interactions,
        milestones: [] // This would be calculated based on activities
      }

      return NextResponse.json({
        success: true,
        timeline,
        analytics
      })
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
      analytics
    })
  } catch (error) {
    console.error('Lead activity API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch lead activity data'
    }, { status: 500 })
  }
}

// POST /api/leads/activity - Create new activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'activity') {
      return await createLeadActivity(data)
    } else if (type === 'note') {
      return await createLeadNote(data)
    } else if (type === 'interaction') {
      return await createLeadInteraction(data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "activity", "note", or "interaction"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Lead activity creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create lead activity'
    }, { status: 500 })
  }
}

// PUT /api/leads/activity - Update activity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'activity') {
      return await updateLeadActivity(id, data)
    } else if (type === 'note') {
      return await updateLeadNote(id, data)
    } else if (type === 'interaction') {
      return await updateLeadInteraction(id, data)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "activity", "note", or "interaction"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Lead activity update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update lead activity'
    }, { status: 500 })
  }
}

// DELETE /api/leads/activity - Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({
        success: false,
        error: 'Type and ID are required'
      }, { status: 400 })
    }

    if (type === 'activity') {
      return await deleteLeadActivity(id)
    } else if (type === 'note') {
      return await deleteLeadNote(id)
    } else if (type === 'interaction') {
      return await deleteLeadInteraction(id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Must be "activity", "note", or "interaction"'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Lead activity deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete lead activity'
    }, { status: 500 })
  }
}

// Helper functions
async function createLeadActivity(data: any) {
  const { businessId = 'default', ...activityData } = data

  const { data: activity, error } = await supabase
    .from('lead_activity_log')
    .insert({
      ...activityData,
      business_id: businessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create activity: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    activity
  })
}

async function updateLeadActivity(id: string, data: any) {
  const { data: activity, error } = await supabase
    .from('lead_activity_log')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update activity: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    activity
  })
}

async function deleteLeadActivity(id: string) {
  const { error } = await supabase
    .from('lead_activity_log')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete activity: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createLeadNote(data: any) {
  const { data: note, error } = await supabase
    .from('lead_notes')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create note: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    note
  })
}

async function updateLeadNote(id: string, data: any) {
  const { data: note, error } = await supabase
    .from('lead_notes')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    note
  })
}

async function deleteLeadNote(id: string) {
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function createLeadInteraction(data: any) {
  const { data: interaction, error } = await supabase
    .from('lead_interactions')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create interaction: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    interaction
  })
}

async function updateLeadInteraction(id: string, data: any) {
  const { data: interaction, error } = await supabase
    .from('lead_interactions')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update interaction: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    interaction
  })
}

async function deleteLeadInteraction(id: string) {
  const { error } = await supabase
    .from('lead_interactions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete interaction: ${error.message}`)
  }

  return NextResponse.json({
    success: true
  })
}

async function calculateActivityAnalytics(businessId: string, activities: LeadActivity[]): Promise<ActivityAnalytics> {
  const totalActivities = activities.length

  // Activities by type
  const activityTypeCounts = activities.reduce((acc, activity) => {
    acc[activity.activityType] = (acc[activity.activityType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const activitiesByType = Object.entries(activityTypeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0
  })).sort((a, b) => b.count - a.count)

  // Activities by user
  const userCounts = activities.reduce((acc, activity) => {
    const userId = activity.createdBy || 'unknown'
    acc[userId] = (acc[userId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const activitiesByUser = Object.entries(userCounts).map(([userId, count]) => ({
    userId,
    userName: userId, // This would be fetched from user data
    count,
    percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0
  })).sort((a, b) => b.count - a.count)

  // Recent activity (last 10)
  const recentActivity = activities.slice(0, 10)

  // Activity trends (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activityTrends = activities
    .filter(activity => new Date(activity.createdAt) >= thirtyDaysAgo)
    .reduce((acc, activity) => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const activityTrendsArray = Object.entries(activityTrends).map(([date, count]) => ({
    date,
    count
  })).sort((a, b) => a.date.localeCompare(b.date))

  // Interaction stats (simplified)
  const interactionStats = {
    totalInteractions: activities.filter(a => ['call', 'email', 'sms', 'meeting'].includes(a.activityType)).length,
    callsCompleted: activities.filter(a => a.activityType === 'call' && a.metadata?.status === 'completed').length,
    emailsSent: activities.filter(a => a.activityType === 'email').length,
    meetingsScheduled: activities.filter(a => a.activityType === 'meeting').length,
    averageResponseTime: 24 // This would be calculated based on actual response times
  }

  return {
    totalActivities,
    activitiesByType,
    activitiesByUser,
    recentActivity,
    activityTrends: activityTrendsArray,
    interactionStats
  }
}
