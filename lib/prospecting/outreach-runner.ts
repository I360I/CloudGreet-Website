import { Resend } from 'resend'
import { TelnyxClient } from '@/lib/telnyx'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

type ProspectRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  sequence_id: string | null
  sequence_step: number | null
  sequence_status: string | null
  next_touch_at: string | null
}

type SequenceBundle = {
  id: string
  name: string
  throttle_per_day: number
  send_window_start: string | null
  send_window_end: string | null
  timezone: string
  auto_pause_on_reply: boolean
  steps: Array<{
    id: string
    step_order: number
    channel: string
    wait_minutes: number
    template_id: string | null
  }>
}

type TemplateRow = {
  id: string
  channel: string
  subject: string | null
  body: string
  compliance_footer: string
}

const EMAIL_SENDER = process.env.OUTREACH_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? 'CloudGreet Outreach <noreply@cloudgreet.com>'
const SMS_FROM = process.env.OUTREACH_SMS_FROM ?? process.env.TELNYX_PHONE_NUMBER ?? process.env.TELNYX_CONNECTION_ID ?? ''

function hydrateTemplates(templates: TemplateRow[]) {
  return templates.reduce<Record<string, TemplateRow>>((acc, template) => {
    acc[template.id] = template
    return acc
  }, {})
}

function renderBody(template: TemplateRow, prospect: ProspectRow) {
  const tokens: Record<string, string> = {
    first_name: prospect.first_name ?? '',
    last_name: prospect.last_name ?? '',
    company: prospect.company_name ?? '',
    email: prospect.email ?? '',
    phone: prospect.phone ?? ''
  }

  const replacer = (text: string) =>
    text.replace(/\{\{(.*?)\}\}/g, (_, key: string) => tokens[key.trim()] ?? '')

  const body = replacer(template.body)
  return `${body}\n\n${template.compliance_footer}`
}

function withinSendWindow(sequence: SequenceBundle) {
  if (!sequence.send_window_start || !sequence.send_window_end) {
    return true
  }
  const now = new Date()
  const [startHour, startMinute] = sequence.send_window_start.split(':').map(Number)
  const [endHour, endMinute] = sequence.send_window_end.split(':').map(Number)
  const start = new Date(now)
  start.setHours(startHour, startMinute, 0, 0)
  const end = new Date(now)
  end.setHours(endHour, endMinute, 0, 0)
  return now >= start && now <= end
}

async function sendEmail(template: TemplateRow, prospect: ProspectRow) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key missing')
  }
  if (!prospect.email) {
    throw new Error('Prospect is missing email address')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const body = renderBody(template, prospect)

  const response = await resend.emails.send({
    from: EMAIL_SENDER,
    to: prospect.email,
    subject: template.subject ?? `Hello ${prospect.first_name ?? 'there'}`,
    text: body
  })

  return response.data?.id ?? null
}

async function sendSMS(template: TemplateRow, prospect: ProspectRow) {
  if (!process.env.TELNYX_API_KEY && !process.env.TELYNX_API_KEY) {
    throw new Error('Telnyx API key missing')
  }
  if (!prospect.phone) {
    throw new Error('Prospect is missing phone number')
  }
  if (!SMS_FROM) {
    throw new Error('No SMS sending number configured')
  }

  const telnyx = new TelnyxClient()
  const body = renderBody(template, prospect)
  const payload = await telnyx.sendSMS(prospect.phone, body, SMS_FROM)
  return payload?.data?.id ?? null
}

function nextStep(sequence: SequenceBundle, currentOrder: number) {
  const sorted = [...sequence.steps].sort((a, b) => a.step_order - b.step_order)
  const index = sorted.findIndex((step) => step.step_order === currentOrder)
  return index >= 0 ? sorted[index + 1] : sorted[0]
}

async function logEvent(payload: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('outreach_events').insert(payload)
  if (error) {
    logger.error('Failed to log outreach event', { error })
  }
}

async function updateProspectAfterStep(prospect: ProspectRow, step: { step_order: number; wait_minutes: number } | null, sequence: SequenceBundle) {
  const updates: Record<string, unknown> = {
    last_outreach_at: new Date().toISOString()
  }

  if (!step) {
    updates.sequence_status = 'completed'
    updates.next_touch_at = null
    updates.sequence_step = step ? step.step_order : sequence.steps.length
  } else {
    updates.sequence_step = step.step_order
    if (step.wait_minutes > 0) {
      const nextTouch = new Date()
      nextTouch.setMinutes(nextTouch.getMinutes() + step.wait_minutes)
      updates.next_touch_at = nextTouch.toISOString()
    } else {
      updates.next_touch_at = new Date().toISOString()
    }
    updates.sequence_status = 'running'
  }

  const { error } = await supabaseAdmin
    .from('prospects')
    .update(updates)
    .eq('id', prospect.id)

  if (error) {
    logger.error('Failed to update prospect after outreach step', { error })
  }
}

export async function runOutreachRunner(limit = 100) {
  const { data: sequencesData, error: sequencesError } = await supabaseAdmin
    .from('outreach_sequences')
    .select('id, name, throttle_per_day, send_window_start, send_window_end, timezone, auto_pause_on_reply')
    .eq('status', 'active')

  if (sequencesError) {
    logger.error('Failed to load active outreach sequences', { sequencesError })
    throw new Error(sequencesError.message)
  }

  const sequences: SequenceBundle[] = []
  const sequenceIds: string[] = []

  for (const row of sequencesData ?? []) {
    sequenceIds.push(row.id)
  }

  if (sequenceIds.length === 0) {
    logger.info('Outreach runner: no active sequences to process')
    return { processed: 0 }
  }

  const { data: stepsData, error: stepsError } = await supabaseAdmin
    .from('outreach_steps')
    .select('*')
    .in('sequence_id', sequenceIds)

  if (stepsError) {
    logger.error('Failed to load outreach steps', { stepsError })
    throw new Error(stepsError.message)
  }

  const templateIds = Array.from(
    new Set(
      (stepsData ?? [])
        .map((step) => step.template_id)
        .filter((value): value is string => typeof value === 'string')
    )
  )

  let templateMap: Record<string, TemplateRow> = {}
  if (templateIds.length > 0) {
    const { data: templateRows, error: templateError } = await supabaseAdmin
      .from('outreach_templates')
      .select('id, channel, subject, body, compliance_footer')
      .in('id', templateIds)

    if (templateError) {
      logger.error('Failed to load outreach templates for runner', { templateError })
      throw new Error(templateError.message)
    }

    templateMap = hydrateTemplates((templateRows ?? []) as TemplateRow[])
  }

  // Build sequence bundles
  for (const sequence of sequencesData ?? []) {
    const steps = (stepsData ?? [])
      .filter((step) => step.sequence_id === sequence.id)
      .map((step) => ({
        id: step.id,
        step_order: step.step_order,
        channel: step.channel,
        wait_minutes: step.wait_minutes,
        template_id: step.template_id
      }))
      .sort((a, b) => a.step_order - b.step_order)

    if (steps.length === 0) {
      logger.warn('Outreach sequence has no steps; skipping', { sequenceId: sequence.id })
      continue
    }

    sequences.push({
      id: sequence.id,
      name: sequence.name,
      throttle_per_day: sequence.throttle_per_day ?? 100,
      send_window_start: sequence.send_window_start,
      send_window_end: sequence.send_window_end,
      timezone: sequence.timezone ?? 'UTC',
      auto_pause_on_reply: sequence.auto_pause_on_reply ?? true,
      steps
    })
  }

  if (sequences.length === 0) {
    logger.info('Outreach runner: sequences had no actionable steps')
    return { processed: 0 }
  }

  const nowIso = new Date().toISOString()
  const { data: prospects, error: prospectsError } = await supabaseAdmin
    .from('prospects')
    .select('id, first_name, last_name, email, phone, company_name, sequence_id, sequence_step, sequence_status, next_touch_at')
    .in(
      'sequence_id',
      sequences.map((seq) => seq.id)
    )
    .or('sequence_status.eq.running,sequence_status.eq.not_started')
    .lte('next_touch_at', nowIso)
    .limit(limit)

  if (prospectsError) {
    logger.error('Failed to load prospects for outreach runner', { prospectsError })
    throw new Error(prospectsError.message)
  }

  let processed = 0
  for (const prospect of (prospects ?? []) as ProspectRow[]) {
    const sequence = sequences.find((seq) => seq.id === prospect.sequence_id)
    if (!sequence) continue
    if (!withinSendWindow(sequence)) {
      continue
    }

    const currentOrder = prospect.sequence_step ?? 0
    const next = currentOrder === 0 ? sequence.steps[0] : sequence.steps.find((step) => step.step_order > currentOrder)

    if (!next) {
      await updateProspectAfterStep(prospect, null, sequence)
      continue
    }

    processed += 1
    const template = next.template_id ? templateMap[next.template_id] : null
    let status: string = 'sent'
    let messageId: string | null = null

    try {
      if (next.channel === 'email') {
        if (!template) {
          throw new Error('Email template missing for step')
        }
        messageId = await sendEmail(template, prospect)
        status = 'sent'
      } else if (next.channel === 'sms') {
        if (!template) {
          throw new Error('SMS template missing for step')
        }
        messageId = await sendSMS(template, prospect)
        status = 'sent'
      } else {
        // Call steps are queued for manual follow-up
        status = 'scheduled'
      }

      await logEvent({
        prospect_id: prospect.id,
        sequence_id: sequence.id,
        step_id: next.id,
        channel: next.channel,
        status,
        message_id: messageId,
        scheduled_at: status === 'scheduled' ? new Date().toISOString() : null,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      })

      const upcoming = sequence.steps.find((step) => step.step_order > next.step_order) ?? null
      await updateProspectAfterStep(
        { ...prospect, sequence_step: next.step_order },
        upcoming ? { step_order: upcoming.step_order, wait_minutes: upcoming.wait_minutes } : null,
        sequence
      )
    } catch (error) {
      logger.error('Outreach runner failed to execute step', {
        error,
        prospectId: prospect.id,
        sequenceId: sequence.id,
        stepId: next.id
      })

      await logEvent({
        prospect_id: prospect.id,
        sequence_id: sequence.id,
        step_id: next.id,
        channel: next.channel,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown delivery error',
        metadata: {
          stack: error instanceof Error ? error.stack : undefined
        }
      })
    }
  }

  logger.info('Outreach runner completed cycle', { processed })
  return { processed }
}


