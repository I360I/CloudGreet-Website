import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export type LeadScope = 'self' | 'team'

export interface LeadListOptions {
  userId: string
  businessId?: string | null
  role: string
  scope?: LeadScope
  status?: string
  search?: string
  limit?: number
}

export interface LeadSummary {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  status: string
  score: number | null
  tags: string[] | null
  last_outreach_at: string | null
  next_touch_at: string | null
  sequence_status: string | null
  updated_at: string | null
}

export interface LeadListResponse {
  leads: LeadSummary[]
  stats: {
    total: number
    statusCounts: Record<string, number>
    upcomingFollowUps: number
    overdueFollowUps: number
  }
}

export interface LeadDetail extends LeadSummary {
  industry: string | null
  job_title: string | null
  city: string | null
  state: string | null
  country: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  outreach_events: Array<{
    id: string
    channel: string
    status: string
    created_at: string
    metadata: Record<string, unknown> | null
  }>
  activities: SalesActivity[]
  tasks: SalesTask[]
}

export interface SalesActivity {
  id: string
  activity_type: string
  direction: string | null
  outcome: string | null
  notes: string | null
  logged_at: string
  follow_up_at: string | null
  user_id: string
}

export interface SalesTask {
  id: string
  task_type: string
  status: 'pending' | 'completed' | 'overdue'
  priority: 'low' | 'normal' | 'high'
  due_at: string
  completed_at: string | null
  prospect_id: string
  notes: string | null
}

export interface LogActivityInput {
  businessId: string
  prospectId: string
  userId: string
  activityType: 'call' | 'email' | 'sms' | 'meeting' | 'note'
  direction?: 'outbound' | 'inbound'
  outcome?: string
  notes?: string
  loggedAt?: string
  followUpAt?: string
  metadata?: Record<string, unknown>
  updateStatus?: string
  commissionAmount?: number
  commissionDescription?: string
}

export interface CommissionSummary {
  totalPending: number
  totalApproved: number
  totalPaid: number
  leaderboard: Array<{
    rep_id: string
    amount: number
    pending: number
    paid: number
  }>
  recent: Array<{
    id: string
    rep_id: string
    amount: number
    status: string
    recorded_at: string
  }>
}

const DEFAULT_LEAD_FIELDS =
  'id, first_name, last_name, email, phone, company_name, status, score, tags, last_outreach_at, next_touch_at, sequence_status, updated_at, assigned_to'

function sanitizeSearch(value?: string | null) {
  if (!value) return null
  return value.replace(/%/g, '').replace(/_/g, '').trim()
}

export async function listEmployeeLeads(options: LeadListOptions): Promise<LeadListResponse> {
  const scope = options.scope ?? 'self'
  const limit = options.limit ?? (scope === 'team' && options.role !== 'sales' ? 200 : 100)
  let leadsQuery = supabaseAdmin
    .from('prospects')
    .select(DEFAULT_LEAD_FIELDS)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (options.status) {
    leadsQuery = leadsQuery.eq('status', options.status)
  }

  if (options.role === 'sales' || scope !== 'team') {
    leadsQuery = leadsQuery.eq('assigned_to', options.userId)
  } else if (options.businessId) {
    leadsQuery = leadsQuery.or(
      `business_id.eq.${options.businessId},business_id.is.null`
    )
  }

  const sanitizedSearch = sanitizeSearch(options.search)
  if (sanitizedSearch) {
    leadsQuery = leadsQuery.or(
      `first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
    )
  }

  const { data: leadRows, error: leadError } = await leadsQuery
  if (leadError) {
    logger.error('Failed to load sales leads', { error: leadError })
    throw new Error('Unable to load leads')
  }

  let statusQuery = supabaseAdmin.from('prospects').select('status, next_touch_at, assigned_to')

  if (options.role === 'sales' || scope !== 'team') {
    statusQuery = statusQuery.eq('assigned_to', options.userId)
  } else if (options.businessId) {
    statusQuery = statusQuery.or(
      `business_id.eq.${options.businessId},business_id.is.null`
    )
  }

  const { data: statusRows, error: statusError } = await statusQuery
  if (statusError) {
    logger.warn('Failed to fetch status summary', { error: statusError })
  }

  const stats = {
    total: statusRows?.length ?? 0,
    statusCounts: {} as Record<string, number>,
    upcomingFollowUps: 0,
    overdueFollowUps: 0
  }

  if (statusRows) {
    const now = Date.now()
    for (const row of statusRows) {
      const status = row.status ?? 'unknown'
      stats.statusCounts[status] = (stats.statusCounts[status] ?? 0) + 1

      if (row.next_touch_at) {
        const due = new Date(row.next_touch_at).getTime()
        if (due > now) {
          stats.upcomingFollowUps += 1
        } else {
          stats.overdueFollowUps += 1
        }
      }
    }
  }

  const leads: LeadSummary[] =
    leadRows?.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      company_name: row.company_name,
      status: row.status,
      score: row.score,
      tags: row.tags,
      last_outreach_at: row.last_outreach_at,
      next_touch_at: row.next_touch_at,
      sequence_status: row.sequence_status,
      updated_at: row.updated_at
    })) ?? []

  return {
    leads,
    stats
  }
}

export async function getLeadDetail(options: {
  prospectId: string
  userId: string
  role: string
  businessId?: string | null
}): Promise<LeadDetail | null> {
  let leadQuery = supabaseAdmin
    .from('prospects')
    .select(
      `${DEFAULT_LEAD_FIELDS}, industry, job_title, city, state, country, last_contacted_at, sequence_id`
    )
    .eq('id', options.prospectId)
    .limit(1)
    .single()

  if (options.role === 'sales') {
    leadQuery = leadQuery.eq('assigned_to', options.userId)
  } else if (options.businessId) {
    leadQuery = leadQuery.or(
      `business_id.eq.${options.businessId},business_id.is.null`
    )
  }

  const { data: prospect, error } = await leadQuery
  if (error || !prospect) {
    logger.warn('Lead detail not found', { error, prospectId: options.prospectId })
    return null
  }

  const [{ data: activityRows }, { data: taskRows }, { data: outreachRows }] = await Promise.all([
    supabaseAdmin
      .from('sales_activities')
      .select('id, activity_type, direction, outcome, notes, logged_at, follow_up_at, user_id')
      .eq('prospect_id', options.prospectId)
      .order('logged_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('sales_tasks')
      .select('id, task_type, status, priority, due_at, completed_at, prospect_id, notes')
      .eq('prospect_id', options.prospectId)
      .order('due_at', { ascending: true }),
    supabaseAdmin
      .from('outreach_events')
      .select('id, channel, status, created_at, metadata')
      .eq('prospect_id', options.prospectId)
      .order('created_at', { ascending: false })
      .limit(25)
  ])

  return {
    id: prospect.id,
    first_name: prospect.first_name,
    last_name: prospect.last_name,
    email: prospect.email,
    phone: prospect.phone,
    company_name: prospect.company_name,
    status: prospect.status,
    score: prospect.score,
    tags: prospect.tags,
    last_outreach_at: prospect.last_outreach_at,
    next_touch_at: prospect.next_touch_at,
    sequence_status: prospect.sequence_status,
    updated_at: prospect.updated_at,
    industry: prospect.industry,
    job_title: prospect.job_title,
    city: prospect.city,
    state: prospect.state,
    country: prospect.country,
    assigned_to: prospect.assigned_to,
    last_contacted_at: prospect.last_contacted_at,
    outreach_events:
      outreachRows?.map((row) => ({
        id: row.id,
        channel: row.channel,
        status: row.status,
        created_at: row.created_at,
        metadata: row.metadata
      })) ?? [],
    activities:
      activityRows?.map((row) => ({
        id: row.id,
        activity_type: row.activity_type,
        direction: row.direction,
        outcome: row.outcome,
        notes: row.notes,
        logged_at: row.logged_at,
        follow_up_at: row.follow_up_at,
        user_id: row.user_id
      })) ?? [],
    tasks:
      taskRows?.map((row) => ({
        id: row.id,
        task_type: row.task_type,
        status: row.status,
        priority: row.priority,
        due_at: row.due_at,
        completed_at: row.completed_at,
        prospect_id: row.prospect_id,
        notes: row.notes
      })) ?? []
  }
}

export async function updateLead(options: {
  prospectId: string
  userId: string
  role: string
  businessId?: string | null
  updates: {
    status?: string
    assignedTo?: string | null
    nextTouchAt?: string | null
    score?: number | null
    tags?: string[] | null
  }
}): Promise<void> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('prospects')
    .select('assigned_to, status')
    .eq('id', options.prospectId)
    .single()

  if (existingError || !existing) {
    throw new Error('Lead not found')
  }

  if (options.role === 'sales' && existing.assigned_to !== options.userId) {
    throw new Error('You do not have access to this lead')
  }

  if (options.updates.assignedTo && options.role === 'sales') {
    throw new Error('Only managers can reassign leads')
  }

  const updates: Record<string, unknown> = {}

  if (options.updates.status && options.updates.status !== existing.status) {
    updates.status = options.updates.status
    updates.last_status_change_at = new Date().toISOString()
  }

  if (options.updates.assignedTo !== undefined) {
    updates.assigned_to = options.updates.assignedTo
  }

  if (options.updates.nextTouchAt !== undefined) {
    updates.next_touch_at = options.updates.nextTouchAt
  }

  if (options.updates.score !== undefined) {
    updates.score = options.updates.score
  }

  if (options.updates.tags !== undefined) {
    updates.tags = options.updates.tags
  }

  if (Object.keys(updates).length === 0) {
    return
  }

  updates.updated_at = new Date().toISOString()

  if (options.businessId) {
    updates.business_id = options.businessId
  }

  const { error } = await supabaseAdmin.from('prospects').update(updates).eq('id', options.prospectId)
  if (error) {
    logger.error('Failed to update prospect', { error, prospectId: options.prospectId })
    throw new Error('Unable to update lead')
  }
}

export async function logSalesActivity(input: LogActivityInput): Promise<{ activityId: string }> {
  const loggedAt = input.loggedAt ?? new Date().toISOString()
  const { data: activity, error } = await supabaseAdmin
    .from('sales_activities')
    .insert({
      business_id: input.businessId,
      prospect_id: input.prospectId,
      user_id: input.userId,
      activity_type: input.activityType,
      direction: input.direction ?? null,
      outcome: input.outcome ?? null,
      notes: input.notes ?? null,
      logged_at: loggedAt,
      follow_up_at: input.followUpAt ?? null,
      metadata: input.metadata ?? {}
    })
    .select('id')
    .single()

  if (error || !activity) {
    logger.error('Failed to log sales activity', { error, prospectId: input.prospectId })
    throw new Error('Unable to log activity')
  }

  const updates: Record<string, unknown> = {
    last_contacted_at: loggedAt,
    updated_at: new Date().toISOString()
  }

  if (input.followUpAt) {
    updates.next_touch_at = input.followUpAt
  }

  if (input.updateStatus) {
    updates.status = input.updateStatus
    updates.last_status_change_at = new Date().toISOString()
  }

  const { error: prospectUpdateError } = await supabaseAdmin
    .from('prospects')
    .update(updates)
    .eq('id', input.prospectId)

  if (prospectUpdateError) {
    logger.warn('Failed to update prospect after activity', { error: prospectUpdateError })
  }

  if (input.followUpAt) {
    await supabaseAdmin.from('sales_tasks').insert({
      business_id: input.businessId,
      prospect_id: input.prospectId,
      assigned_to: input.userId,
      created_by: input.userId,
      task_type: 'follow_up',
      status: 'pending',
      priority: 'normal',
      due_at: input.followUpAt,
      notes: input.notes ?? null
    })
  }

  if (input.commissionAmount && input.commissionAmount > 0) {
    const { error: commissionError } = await supabaseAdmin.from('sales_commissions').insert({
      business_id: input.businessId,
      rep_id: input.userId,
      prospect_id: input.prospectId,
      amount: input.commissionAmount,
      status: 'pending',
      description: input.commissionDescription ?? null
    })

    if (commissionError) {
      logger.warn('Failed to log commission', { error: commissionError })
    }
  }

  return { activityId: activity.id }
}

export async function listSalesActivities(options: {
  prospectId: string
  userId: string
  role: string
  businessId?: string | null
  limit?: number
}): Promise<SalesActivity[]> {
  const limit = options.limit ?? 50
  let query = supabaseAdmin
    .from('sales_activities')
    .select('id, activity_type, direction, outcome, notes, logged_at, follow_up_at, user_id, business_id')
    .eq('prospect_id', options.prospectId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (options.role === 'sales') {
    query = query.eq('user_id', options.userId)
  } else if (options.businessId) {
    query = query.eq('business_id', options.businessId)
  }

  const { data, error } = await query
  if (error) {
    logger.error('Failed to list sales activities', { error, prospectId: options.prospectId })
    throw new Error('Unable to load activity')
  }

  return (
    data?.map((row) => ({
      id: row.id,
      activity_type: row.activity_type,
      direction: row.direction,
      outcome: row.outcome,
      notes: row.notes,
      logged_at: row.logged_at,
      follow_up_at: row.follow_up_at,
      user_id: row.user_id
    })) ?? []
  )
}

export async function listSalesTasks(options: {
  userId: string
  role: string
  businessId?: string | null
  status?: string
  scope?: LeadScope
  limit?: number
}): Promise<SalesTask[]> {
  const scope = options.scope ?? 'self'
  const limit = options.limit ?? 50
  let query = supabaseAdmin
    .from('sales_tasks')
    .select('id, task_type, status, priority, due_at, completed_at, prospect_id, notes, assigned_to, business_id')
    .order('due_at', { ascending: true })
    .limit(limit)

  if (options.status) {
    query = query.eq('status', options.status)
  } else {
    query = query.neq('status', 'completed')
  }

  if (options.role === 'sales' || scope !== 'team') {
    query = query.eq('assigned_to', options.userId)
  } else if (options.businessId) {
    query = query.or(
      `business_id.eq.${options.businessId},business_id.is.null`
    )
  }

  const { data, error } = await query
  if (error) {
    logger.error('Failed to list sales tasks', { error })
    throw new Error('Unable to load tasks')
  }

  const now = Date.now()
  const tasks: SalesTask[] =
    data?.map((row) => {
      const isOverdue = row.status === 'pending' && row.due_at && new Date(row.due_at).getTime() < now

      return {
        id: row.id,
        task_type: row.task_type,
        status: isOverdue ? 'overdue' : row.status,
        priority: row.priority,
        due_at: row.due_at,
        completed_at: row.completed_at,
        prospect_id: row.prospect_id,
        notes: row.notes
      }
    }) ?? []

  // Update overdue statuses in background
  const overdueIds = tasks
    .filter((task) => task.status === 'overdue')
    .map((task) => task.id)
  if (overdueIds.length > 0) {
    await supabaseAdmin
      .from('sales_tasks')
      .update({ status: 'overdue' })
      .in('id', overdueIds)
  }

  return tasks
}

export async function completeTask(taskId: string, userId: string, role: string): Promise<void> {
  const { data: task, error } = await supabaseAdmin
    .from('sales_tasks')
    .select('assigned_to')
    .eq('id', taskId)
    .single()

  if (error || !task) {
    throw new Error('Task not found')
  }

  if (role === 'sales' && task.assigned_to !== userId) {
    throw new Error('You do not have access to this task')
  }

  const { error: updateError } = await supabaseAdmin
    .from('sales_tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (updateError) {
    logger.error('Failed to complete task', { error: updateError })
    throw new Error('Unable to complete task')
  }
}

export async function getCommissionSummary(options: {
  userId: string
  role: string
  businessId?: string | null
  periodDays?: number
  scope?: LeadScope
}): Promise<CommissionSummary> {
  const scope = options.scope ?? (options.role === 'sales' ? 'self' : 'team')
  const periodDays = options.periodDays ?? 90
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()

  let summaryQuery = supabaseAdmin
    .from('sales_commissions')
    .select('id, rep_id, amount, status, recorded_at')
    .gte('recorded_at', since)

  if (scope === 'self' || options.role === 'sales') {
    summaryQuery = summaryQuery.eq('rep_id', options.userId)
  } else if (options.businessId) {
    summaryQuery = summaryQuery.eq('business_id', options.businessId)
  }

  const { data, error } = await summaryQuery
  if (error) {
    logger.error('Failed to fetch commission summary', { error })
    throw new Error('Unable to load commission data')
  }

  const summary: CommissionSummary = {
    totalPending: 0,
    totalApproved: 0,
    totalPaid: 0,
    leaderboard: [],
    recent:
      data?.slice(0, 10).map((row) => ({
        id: row.id,
        rep_id: row.rep_id,
        amount: row.amount,
        status: row.status,
        recorded_at: row.recorded_at
      })) ?? []
  }

  const leaderboardMap = new Map<
    string,
    { rep_id: string; amount: number; pending: number; paid: number }
  >()

  for (const row of data ?? []) {
    if (row.status === 'pending') {
      summary.totalPending += Number(row.amount ?? 0)
    } else if (row.status === 'approved') {
      summary.totalApproved += Number(row.amount ?? 0)
    } else if (row.status === 'paid') {
      summary.totalPaid += Number(row.amount ?? 0)
    }

    if (!leaderboardMap.has(row.rep_id)) {
      leaderboardMap.set(row.rep_id, {
        rep_id: row.rep_id,
        amount: 0,
        pending: 0,
        paid: 0
      })
    }

    const entry = leaderboardMap.get(row.rep_id)!
    entry.amount += Number(row.amount ?? 0)
    if (row.status === 'pending') {
      entry.pending += Number(row.amount ?? 0)
    } else if (row.status === 'paid') {
      entry.paid += Number(row.amount ?? 0)
    }
  }

  summary.leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => b.amount - a.amount)

  return summary
}

