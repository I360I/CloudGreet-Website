import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
  SequenceInput,
  SequenceUpdateInput,
  TemplateInput,
  sequenceInputSchema,
  sequenceUpdateSchema,
  templateInputSchema,
  statsQuerySchema
} from '@/lib/prospecting/outreach-schema'

type RawSequence = {
  id: string
  name: string
  description: string | null
  throttle_per_day: number | null
  send_window_start: string | null
  send_window_end: string | null
  timezone: string | null
  status: string | null
  auto_pause_on_reply: boolean | null
  config: Record<string, unknown> | null
  created_at: string
  updated_at: string
  business_id: string | null
}

type RawStep = {
  id: string
  sequence_id: string
  step_order: number
  channel: string
  wait_minutes: number
  template_id: string | null
  fallback_channel: string | null
  send_window_start: string | null
  send_window_end: string | null
  metadata: Record<string, unknown> | null
}

type RawTemplate = {
  id: string
  business_id: string | null
  name: string
  channel: string
  subject: string | null
  body: string
  compliance_footer: string
  is_active: boolean
  is_default: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

const STEP_STATUS_IN_SEQUENCE = ['draft', 'active', 'paused'] as const

function mapSequence(
  sequence: RawSequence,
  steps: RawStep[],
  metrics: Record<string, number> = {}
) {
  return {
    id: sequence.id,
    name: sequence.name,
    description: sequence.description,
    throttlePerDay: sequence.throttle_per_day ?? 100,
    sendWindowStart: sequence.send_window_start,
    sendWindowEnd: sequence.send_window_end,
    timezone: sequence.timezone ?? 'UTC',
    status: (sequence.status ?? 'draft') as (typeof STEP_STATUS_IN_SEQUENCE)[number],
    autoPauseOnReply: sequence.auto_pause_on_reply ?? true,
    config: sequence.config ?? {},
    createdAt: sequence.created_at,
    updatedAt: sequence.updated_at,
    businessId: sequence.business_id,
    steps: steps
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        id: step.id,
        stepOrder: step.step_order,
        channel: step.channel,
        waitMinutes: step.wait_minutes,
        templateId: step.template_id,
        fallbackChannel: step.fallback_channel,
        sendWindowStart: step.send_window_start,
        sendWindowEnd: step.send_window_end,
        metadata: step.metadata ?? {}
      })),
    metrics
  }
}

export async function listTemplates(businessId?: string) {
  let query = supabaseAdmin.from('outreach_templates').select('*').order('updated_at', { ascending: false })

  if (businessId) {
    query = query.eq('business_id', businessId)
  }

  const { data, error } = await query
  if (error) {
    logger.error('Failed to fetch outreach templates', { error })
    throw new Error(error.message)
  }

  return (data as RawTemplate[]).map((template) => ({
    id: template.id,
    businessId: template.business_id,
    name: template.name,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    complianceFooter: template.compliance_footer,
    isActive: template.is_active,
    isDefault: template.is_default,
    metadata: template.metadata ?? {},
    createdAt: template.created_at,
    updatedAt: template.updated_at
  }))
}

export async function createTemplate(
  payload: TemplateInput,
  businessId: string | undefined,
  userId: string | undefined
) {
  const parsed = templateInputSchema.parse(payload)
  const insertPayload = {
    business_id: businessId ?? null,
    created_by: userId ?? null,
    name: parsed.name,
    channel: parsed.channel,
    subject: parsed.subject ?? null,
    body: parsed.body,
    compliance_footer: parsed.complianceFooter,
    is_active: parsed.isActive,
    is_default: parsed.isDefault,
    metadata: parsed.metadata ?? {}
  }

  const { data, error } = await supabaseAdmin
    .from('outreach_templates')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    logger.error('Failed to create outreach template', { error })
    throw new Error(error?.message ?? 'Failed to create template')
  }

  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
    channel: data.channel,
    subject: data.subject,
    body: data.body,
    complianceFooter: data.compliance_footer,
    isActive: data.is_active,
    isDefault: data.is_default,
    metadata: data.metadata ?? {},
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export async function updateTemplate(
  templateId: string,
  payload: Partial<TemplateInput>,
  businessId?: string
) {
  const parsed = templateInputSchema.partial().parse(payload)

  const updatePayload = {
    ...(parsed.name ? { name: parsed.name } : {}),
    ...(parsed.channel ? { channel: parsed.channel } : {}),
    ...(parsed.subject !== undefined ? { subject: parsed.subject } : {}),
    ...(parsed.body ? { body: parsed.body } : {}),
    ...(parsed.complianceFooter ? { compliance_footer: parsed.complianceFooter } : {}),
    ...(parsed.isActive !== undefined ? { is_active: parsed.isActive } : {}),
    ...(parsed.isDefault !== undefined ? { is_default: parsed.isDefault } : {}),
    ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
    updated_at: new Date().toISOString()
  }

  if (Object.keys(updatePayload).length === 1) {
    return listTemplates(businessId).then((templates) => templates.find((t) => t.id === templateId))
  }

  let query = supabaseAdmin.from('outreach_templates').update(updatePayload).eq('id', templateId)
  if (businessId) {
    query = query.eq('business_id', businessId)
  }
  const { error } = await query
  if (error) {
    logger.error('Failed to update outreach template', { error })
    throw new Error(error.message)
  }

  return listTemplates(businessId).then((templates) => templates.find((t) => t.id === templateId))
}

export async function deleteTemplate(templateId: string, businessId?: string) {
  let query = supabaseAdmin.from('outreach_templates').delete().eq('id', templateId)
  if (businessId) {
    query = query.eq('business_id', businessId)
  }

  const { error } = await query
  if (error) {
    logger.error('Failed to delete outreach template', { error })
    throw new Error(error.message)
  }
}

async function fetchSequenceMetrics(sequenceIds: string[]) {
  if (sequenceIds.length === 0) {
    return {}
  }

  const { data, error } = await supabaseAdmin
    .from('outreach_events')
    .select('sequence_id, status, channel')
    .in('sequence_id', sequenceIds)

  if (error) {
    logger.warn('Failed to fetch outreach metrics', { error })
    return {}
  }

  return (data ?? []).reduce<Record<string, Record<string, number>>>((acc, event) => {
    const sequenceId = event.sequence_id as string
    acc[sequenceId] = acc[sequenceId] ?? {
      sent: 0,
      delivered: 0,
      replied: 0,
      failed: 0
    }

    switch (event.status) {
      case 'sent':
        acc[sequenceId].sent += 1
        break
      case 'delivered':
        acc[sequenceId].delivered += 1
        break
      case 'replied':
        acc[sequenceId].replied += 1
        break
      case 'failed':
      case 'bounced':
        acc[sequenceId].failed += 1
        break
      default:
        break
    }

    return acc
  }, {})
}

export async function listSequences(businessId?: string) {
  let sequenceQuery = supabaseAdmin.from('outreach_sequences').select('*').order('updated_at', { ascending: false })
  if (businessId) {
    sequenceQuery = sequenceQuery.or(`business_id.eq.${businessId},business_id.is.null`)
  }

  const { data: sequenceRows, error: sequenceError } = await sequenceQuery
  if (sequenceError) {
    logger.error('Failed to fetch outreach sequences', { error: sequenceError })
    throw new Error(sequenceError.message)
  }

  const sequenceIds = (sequenceRows ?? []).map((row) => row.id)
  let stepRows: RawStep[] = []
  if (sequenceIds.length > 0) {
    const { data: stepsData, error: stepsError } = await supabaseAdmin
      .from('outreach_steps')
      .select('*')
      .in('sequence_id', sequenceIds)

    if (stepsError) {
      logger.error('Failed to fetch outreach steps', { error: stepsError })
      throw new Error(stepsError.message)
    }

    stepRows = stepsData as RawStep[]
  }

  const metrics = await fetchSequenceMetrics(sequenceIds)
  return (sequenceRows as RawSequence[]).map((row) =>
    mapSequence(row, stepRows.filter((step) => step.sequence_id === row.id), metrics[row.id])
  )
}

export async function getSequence(sequenceId: string, businessId?: string) {
  let query = supabaseAdmin.from('outreach_sequences').select('*').eq('id', sequenceId).maybeSingle()
  if (businessId) {
    query = query.or(`business_id.eq.${businessId},business_id.is.null`)
  }

  const { data: sequenceRow, error } = await query
  if (error) {
    logger.error('Failed to fetch outreach sequence', { error })
    throw new Error(error.message)
  }
  if (!sequenceRow) {
    return null
  }

  const { data: stepRows, error: stepsError } = await supabaseAdmin
    .from('outreach_steps')
    .select('*')
    .eq('sequence_id', sequenceId)

  if (stepsError) {
    logger.error('Failed to fetch outreach sequence steps', { stepsError })
    throw new Error(stepsError.message)
  }

  const metrics = await fetchSequenceMetrics([sequenceId])
  return mapSequence(sequenceRow as RawSequence, (stepRows as RawStep[]) ?? [], metrics[sequenceId])
}

export async function createSequence(
  payload: SequenceInput,
  businessId: string | undefined,
  userId: string | undefined
) {
  const parsed = sequenceInputSchema.parse(payload)
  const nowIso = new Date().toISOString()

  const insertPayload = {
    name: parsed.name,
    description: parsed.description ?? null,
    throttle_per_day: parsed.throttlePerDay,
    send_window_start: parsed.sendWindowStart ?? null,
    send_window_end: parsed.sendWindowEnd ?? null,
    timezone: parsed.timezone,
    status: parsed.status,
    auto_pause_on_reply: parsed.autoPauseOnReply,
    config: parsed.config ?? {},
    business_id: businessId ?? null,
    created_by: userId ?? null,
    created_at: nowIso,
    updated_at: nowIso
  }

  const { data: sequenceData, error: sequenceError } = await supabaseAdmin
    .from('outreach_sequences')
    .insert(insertPayload)
    .select('*')
    .single()

  if (sequenceError || !sequenceData) {
    logger.error('Failed to create outreach sequence', { sequenceError })
    throw new Error(sequenceError?.message ?? 'Failed to create sequence')
  }

  const stepsPayload = parsed.steps.map((step) => ({
    sequence_id: sequenceData.id,
    step_order: step.stepOrder,
    channel: step.channel,
    wait_minutes: step.waitMinutes,
    template_id: step.templateId ?? null,
    fallback_channel: step.fallbackChannel ?? null,
    send_window_start: step.sendWindowStart ?? null,
    send_window_end: step.sendWindowEnd ?? null,
    metadata: step.metadata ?? {}
  }))

  if (stepsPayload.length > 0) {
    const { error: stepsError } = await supabaseAdmin.from('outreach_steps').insert(stepsPayload)
    if (stepsError) {
      await supabaseAdmin.from('outreach_sequences').delete().eq('id', sequenceData.id)
      logger.error('Failed to create outreach steps; rolling back sequence', { stepsError })
      throw new Error(stepsError.message)
    }
  }

  return mapSequence(sequenceData as RawSequence, stepsPayload as RawStep[])
}

export async function updateSequence(sequenceId: string, payload: Partial<SequenceInput>, businessId?: string) {
  const parsed: SequenceUpdateInput = sequenceUpdateSchema.parse(payload)
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (parsed.name) updatePayload.name = parsed.name
  if (parsed.description !== undefined) updatePayload.description = parsed.description
  if (parsed.throttlePerDay !== undefined) updatePayload.throttle_per_day = parsed.throttlePerDay
  if (parsed.sendWindowStart !== undefined) updatePayload.send_window_start = parsed.sendWindowStart
  if (parsed.sendWindowEnd !== undefined) updatePayload.send_window_end = parsed.sendWindowEnd
  if (parsed.timezone) updatePayload.timezone = parsed.timezone
  if (parsed.status) updatePayload.status = parsed.status
  if (parsed.autoPauseOnReply !== undefined) updatePayload.auto_pause_on_reply = parsed.autoPauseOnReply
  if (parsed.config) updatePayload.config = parsed.config

  let sequenceQuery = supabaseAdmin.from('outreach_sequences').update(updatePayload).eq('id', sequenceId)
  if (businessId) {
    sequenceQuery = sequenceQuery.eq('business_id', businessId)
  }

  const { error: updateError } = await sequenceQuery
  if (updateError) {
    logger.error('Failed to update outreach sequence', { updateError })
    throw new Error(updateError.message)
  }

  if (parsed.steps) {
    // Replace steps: delete and recreate to avoid partial updates.
    let deleteQuery = supabaseAdmin.from('outreach_steps').delete().eq('sequence_id', sequenceId)
    if (businessId) {
      // ensure sequence belongs to business by joining sequence check
      const { data: sequenceOwner } = await supabaseAdmin
        .from('outreach_sequences')
        .select('business_id')
        .eq('id', sequenceId)
        .maybeSingle()
      if (sequenceOwner?.business_id && sequenceOwner.business_id !== businessId) {
        throw new Error('Sequence not found for this business')
      }
    }

    const { error: deleteError } = await deleteQuery
    if (deleteError) {
      logger.error('Failed to clear outreach steps during update', { deleteError })
      throw new Error(deleteError.message)
    }

    if (parsed.steps.length > 0) {
      const stepsPayload = parsed.steps.map((step) => ({
        sequence_id: sequenceId,
        step_order: step.stepOrder,
        channel: step.channel,
        wait_minutes: step.waitMinutes,
        template_id: step.templateId ?? null,
        fallback_channel: step.fallbackChannel ?? null,
        send_window_start: step.sendWindowStart ?? null,
        send_window_end: step.sendWindowEnd ?? null,
        metadata: step.metadata ?? {}
      }))

      const { error: stepsError } = await supabaseAdmin.from('outreach_steps').insert(stepsPayload)
      if (stepsError) {
        logger.error('Failed to recreate outreach steps during update', { stepsError })
        throw new Error(stepsError.message)
      }
    }
  }

  const sequences = await listSequences(businessId)
  return sequences.find((seq) => seq.id === sequenceId) ?? null
}

export async function deleteSequence(sequenceId: string, businessId?: string) {
  let deleteQuery = supabaseAdmin.from('outreach_sequences').delete().eq('id', sequenceId)
  if (businessId) {
    deleteQuery = deleteQuery.eq('business_id', businessId)
  }

  const { error } = await deleteQuery
  if (error) {
    logger.error('Failed to delete outreach sequence', { error })
    throw new Error(error.message)
  }
}

export async function getOutreachStats(businessId: string | undefined, range: string) {
  const { range: parsedRange } = statsQuerySchema.parse({ range })
  const now = new Date()
  const days = parsedRange === '7d' ? 7 : parsedRange === '30d' ? 30 : 90
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

  let eventsQuery = supabaseAdmin
    .from('outreach_events')
    .select('status, channel, sequence_id, prospect_id, created_at, replied_at, metadata')
    .gte('created_at', since)

  if (businessId) {
    // Filter by sequences belonging to business
    const { data: sequences } = await supabaseAdmin
      .from('outreach_sequences')
      .select('id')
      .or(`business_id.eq.${businessId},business_id.is.null`)

    const sequenceIds = (sequences ?? []).map((seq) => seq.id)
    if (sequenceIds.length === 0) {
      return {
        totalSent: 0,
        delivered: 0,
        replies: 0,
        failed: 0,
        replyRate: 0,
        deliveryRate: 0,
        byChannel: []
      }
    }
    eventsQuery = eventsQuery.in('sequence_id', sequenceIds)
  }

  const { data: events, error } = await eventsQuery
  if (error) {
    logger.error('Failed to fetch outreach stats', { error })
    throw new Error(error.message)
  }

  const totals = {
    totalSent: 0,
    delivered: 0,
    replies: 0,
    failed: 0
  }

  const channelMap = new Map<
    string,
    { sent: number; delivered: number; replies: number; failed: number }
  >()

  for (const event of events ?? []) {
    const status = event.status as string
    const channel = (event.channel as string) ?? 'unknown'
    if (!channelMap.has(channel)) {
      channelMap.set(channel, { sent: 0, delivered: 0, replies: 0, failed: 0 })
    }
    const channelStats = channelMap.get(channel)!

    switch (status) {
      case 'sent':
        totals.totalSent += 1
        channelStats.sent += 1
        break
      case 'delivered':
        totals.totalSent += 1
        totals.delivered += 1
        channelStats.delivered += 1
        break
      case 'replied':
        totals.totalSent += 1
        totals.delivered += 1
        totals.replies += 1
        channelStats.delivered += 1
        channelStats.replies += 1
        break
      case 'failed':
      case 'bounced':
        totals.failed += 1
        channelStats.failed += 1
        break
      default:
        break
    }
  }

  const replyRate = totals.totalSent > 0 ? Number(((totals.replies / totals.totalSent) * 100).toFixed(1)) : 0
  const deliveryRate =
    totals.totalSent > 0 ? Number(((totals.delivered / totals.totalSent) * 100).toFixed(1)) : 0

  const byChannel = Array.from(channelMap.entries()).map(([channel, stats]) => ({
    channel,
    ...stats,
    replyRate: stats.sent > 0 ? Number(((stats.replies / stats.sent) * 100).toFixed(1)) : 0
  }))

  return {
    ...totals,
    replyRate,
    deliveryRate,
    byChannel
  }
}


