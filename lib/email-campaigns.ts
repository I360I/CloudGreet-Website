import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

const HAIKU_MODEL = 'claude-haiku-4-5'

export type EmailLead = {
  id: string
  campaign_id: string
  email: string
  owner_name: string | null
  business_name: string | null
  city: string | null
  phone: string | null
  source: string
  status: string
}

type Campaign = {
  id: string
  name: string
  from_name: string
  from_email: string
  reply_to: string | null
  subject: string
  body_template: string
  signature: string | null
  status: string
  sent_count: number
  bounce_count: number
  created_at: string
}

// Cap escalates 10/week starting at 10, ceiling 200
export function getDailyCapForCampaign(createdAt: string): number {
  const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(daysSince / 7)
  return Math.min((weekNumber + 1) * 10, 200)
}

async function getSentTodayCount(campaignId: string): Promise<number> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabaseAdmin
    .from('email_leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .gte('sent_at', todayStart.toISOString())
    .not('sent_at', 'is', null)
  return count || 0
}

type SequenceStep = {
  id: string
  step_number: number
  delay_days: number
  subject_template: string
  body_template: string
}

function getFirstName(ownerName: string | null): string {
  if (!ownerName) return 'there'
  const first = ownerName.trim().split(/\s+/)[0]
  return first || 'there'
}

function simpleReplace(template: string, lead: EmailLead): string {
  const firstName = getFirstName(lead.owner_name)
  return template
    .replace(/\{\{owner_name\}\}/g, lead.owner_name || '')
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, lead.business_name || '')
    .replace(/\{\{city\}\}/g, lead.city || '')
    .replace(/\{\{unsubscribe_url\}\}/g, `https://cloudgreet.com/unsubscribe/${lead.id}`)
}

export async function personalizeLead(
  template: string,
  lead: EmailLead,
  fromName?: string,
): Promise<string> {
  const firstName = getFirstName(lead.owner_name)

  const withFromName = template.replace(/\{\{from_name\}\}/g, fromName || 'CloudGreet')

  if (!process.env.ANTHROPIC_API_KEY) {
    return simpleReplace(withFromName, lead)
  }

  const hasVariables = /\{\{(owner_name|first_name|business_name|city|unsubscribe_url)\}\}/.test(withFromName)
  if (!hasVariables) return withFromName

  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 1 })

    const unsubUrl = `https://cloudgreet.com/unsubscribe/${lead.id}`

    const prompt = `Fill in the template variables for this cold outreach email. Return only the completed email text, nothing else.

Template:
${withFromName}

Variables:
- {{first_name}} = ${firstName}
- {{owner_name}} = ${lead.owner_name || ''}
- {{business_name}} = ${lead.business_name || ''}
- {{city}} = ${lead.city || ''}
- {{unsubscribe_url}} = ${unsubUrl}

Rules: Replace every {{variable}} with the value. Keep the email natural. Return plain text only.`

    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = resp.content[0]
    if (block.type === 'text' && block.text.trim()) {
      return block.text.trim()
    }

    return simpleReplace(withFromName, lead)
  } catch (err) {
    logger.warn('Haiku personalization failed, falling back to simple replace', {
      error: err instanceof Error ? err.message : String(err),
    })
    return simpleReplace(withFromName, lead)
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function getSequenceSteps(campaignId: string): Promise<SequenceStep[]> {
  const { data } = await supabaseAdmin
    .from('campaign_sequences')
    .select('id, step_number, delay_days, subject_template, body_template')
    .eq('campaign_id', campaignId)
    .order('step_number', { ascending: true })
  return (data || []) as SequenceStep[]
}

async function sendOneEmail(
  apiKey: string,
  opts: {
    fromName: string
    fromEmail: string
    replyTo: string
    to: string
    subject: string
    body: string
    signature: string | null
    campaignId: string
    leadId: string
    prevMessageId?: string | null
  },
): Promise<{ messageId: string | null; error: string | null }> {
  const fullBody = opts.body + (opts.signature ? `\n\n${opts.signature}` : '')

  const extraHeaders: Record<string, string> = {
    'X-Campaign-Id': opts.campaignId,
    'X-Lead-Id': opts.leadId,
  }
  if (opts.prevMessageId) {
    const msgRef = opts.prevMessageId.startsWith('<')
      ? opts.prevMessageId
      : `<${opts.prevMessageId}>`
    extraHeaders['In-Reply-To'] = msgRef
    extraHeaders['References'] = msgRef
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: opts.fromEmail },
      to: [{ email: opts.to }],
      replyTo: { email: opts.replyTo },
      subject: opts.subject,
      textContent: fullBody,
      headers: extraHeaders,
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { message?: string }
    return { messageId: null, error: errBody.message || `Brevo error ${res.status}` }
  }

  const data = await res.json() as { messageId?: string }
  return { messageId: data.messageId || null, error: null }
}

// ---------------------------------------------------------------------------
// Initial batch send
// ---------------------------------------------------------------------------

export async function sendCampaignBatch(
  campaignId: string,
  batchSize = 50,
): Promise<{ sent: number; errors: number; dailyCap: number; sentToday: number; cappedOut: boolean }> {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set')
  }
  const brevoKey = process.env.BREVO_API_KEY

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, name, from_name, from_email, reply_to, subject, body_template, signature, status, sent_count, bounce_count, created_at')
    .eq('id', campaignId)
    .single()

  if (campErr || !campaign) {
    throw new Error(`Campaign not found: ${campErr?.message}`)
  }

  const dailyCap = getDailyCapForCampaign(campaign.created_at)
  const sentToday = await getSentTodayCount(campaignId)
  const remaining = dailyCap - sentToday

  if (remaining <= 0) {
    return { sent: 0, errors: 0, dailyCap, sentToday, cappedOut: true }
  }

  const effectiveBatchSize = Math.min(batchSize, remaining)

  const sequences = await getSequenceSteps(campaignId)
  const firstStep = sequences[0] || null

  const { data: leads, error: leadsErr } = await supabaseAdmin
    .from('email_leads')
    .select('id, campaign_id, email, owner_name, business_name, city, phone, source, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .limit(effectiveBatchSize)

  if (leadsErr) throw new Error(`Failed to fetch leads: ${leadsErr.message}`)
  if (!leads || leads.length === 0) return { sent: 0, errors: 0, dailyCap, sentToday, cappedOut: false }

  let sent = 0
  let errors = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i] as EmailLead
    if (i > 0) await wait(500)

    await supabaseAdmin.from('email_leads').update({ status: 'sending' }).eq('id', lead.id)

    try {
      const rawBody = await personalizeLead(campaign.body_template, lead, campaign.from_name)
      const hasSignaturePlaceholder = rawBody.includes('{{signature}}')
      const personalizedBody = rawBody.replace(/\{\{signature\}\}/g, campaign.signature || '')
      const firstName = getFirstName(lead.owner_name)
      const personalizedSubject = campaign.subject
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{owner_name\}\}/g, lead.owner_name || '')
        .replace(/\{\{business_name\}\}/g, lead.business_name || '')
        .replace(/\{\{city\}\}/g, lead.city || '')

      const { messageId, error: sendErr } = await sendOneEmail(brevoKey, {
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        replyTo: `r+${lead.id}@replies.getcloudgreet.com`,
        to: lead.email,
        subject: personalizedSubject,
        body: personalizedBody,
        // Don't double-append if the template already placed {{signature}}
        signature: hasSignaturePlaceholder ? null : campaign.signature,
        campaignId,
        leadId: lead.id,
      })

      if (sendErr) throw new Error(sendErr)

      await supabaseAdmin
        .from('email_leads')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_message_id: messageId,
          personalized_subject: personalizedSubject,
          personalized_body: personalizedBody,
          sequence_step: 0,
          next_follow_up_at: firstStep ? daysFromNow(firstStep.delay_days) : null,
          error: null,
        })
        .eq('id', lead.id)

      sent++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('Email send failed', { leadId: lead.id, campaignId, error: errMsg })
      await supabaseAdmin
        .from('email_leads')
        .update({ status: 'bounced', error: errMsg })
        .eq('id', lead.id)
      errors++
    }
  }

  const { data: updated } = await supabaseAdmin
    .from('email_campaigns')
    .select('sent_count, bounce_count')
    .eq('id', campaignId)
    .single()

  if (updated) {
    // Check if queue is now empty to auto-complete the campaign
    const { count: remainingQueued } = await supabaseAdmin
      .from('email_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'queued')

    const campaignUpdate: Record<string, unknown> = {
      sent_count: (updated.sent_count || 0) + sent,
      bounce_count: (updated.bounce_count || 0) + errors,
      updated_at: new Date().toISOString(),
    }
    if ((remainingQueued || 0) === 0 && campaign.status === 'sending') {
      campaignUpdate.status = 'complete'
    }

    await supabaseAdmin
      .from('email_campaigns')
      .update(campaignUpdate)
      .eq('id', campaignId)
  }

  return { sent, errors, dailyCap, sentToday: sentToday + sent, cappedOut: false }
}

// ---------------------------------------------------------------------------
// Send a single queued lead immediately (bypasses daily cap)
// ---------------------------------------------------------------------------

export async function sendSingleLead(
  campaignId: string,
  leadId: string,
): Promise<{ sent: boolean; error: string | null }> {
  if (!process.env.BREVO_API_KEY) throw new Error('BREVO_API_KEY is not set')
  const brevoKey = process.env.BREVO_API_KEY

  const [{ data: campaign }, { data: lead }] = await Promise.all([
    supabaseAdmin
      .from('email_campaigns')
      .select('id, name, from_name, from_email, reply_to, subject, body_template, signature, status, sent_count, bounce_count, created_at')
      .eq('id', campaignId)
      .single(),
    supabaseAdmin
      .from('email_leads')
      .select('id, campaign_id, email, owner_name, business_name, city, phone, status')
      .eq('id', leadId)
      .eq('campaign_id', campaignId)
      .single(),
  ])

  if (!campaign) return { sent: false, error: 'Campaign not found' }
  if (!lead) return { sent: false, error: 'Lead not found' }
  if (lead.status !== 'queued') return { sent: false, error: `Lead status is "${lead.status}", expected "queued"` }

  const sequences = await getSequenceSteps(campaignId)
  const firstStep = sequences[0] || null

  await supabaseAdmin.from('email_leads').update({ status: 'sending' }).eq('id', leadId)

  try {
    const rawBody = await personalizeLead(campaign.body_template, lead as EmailLead, campaign.from_name)
    const hasSignaturePlaceholder = rawBody.includes('{{signature}}')
    const personalizedBody = rawBody.replace(/\{\{signature\}\}/g, campaign.signature || '')
    const firstName = getFirstName(lead.owner_name)
    const personalizedSubject = campaign.subject
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{owner_name\}\}/g, lead.owner_name || '')
      .replace(/\{\{business_name\}\}/g, lead.business_name || '')
      .replace(/\{\{city\}\}/g, lead.city || '')

    const { messageId, error: sendErr } = await sendOneEmail(brevoKey, {
      fromName: campaign.from_name,
      fromEmail: campaign.from_email,
      replyTo: `r+${leadId}@replies.getcloudgreet.com`,
      to: lead.email,
      subject: personalizedSubject,
      body: personalizedBody,
      signature: hasSignaturePlaceholder ? null : campaign.signature,
      campaignId,
      leadId,
    })

    if (sendErr) throw new Error(sendErr)

    await supabaseAdmin
      .from('email_leads')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_message_id: messageId,
        personalized_subject: personalizedSubject,
        personalized_body: personalizedBody,
        sequence_step: 0,
        next_follow_up_at: firstStep ? daysFromNow(firstStep.delay_days) : null,
        error: null,
      })
      .eq('id', leadId)

    await supabaseAdmin
      .from('email_campaigns')
      .update({ sent_count: (campaign.sent_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    return { sent: true, error: null }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await supabaseAdmin.from('email_leads').update({ status: 'queued', error: errMsg }).eq('id', leadId)
    return { sent: false, error: errMsg }
  }
}

// ---------------------------------------------------------------------------
// Follow-up cron: sends next sequence step for all due leads
// ---------------------------------------------------------------------------

export async function sendFollowUps(): Promise<{ sent: number; errors: number; skipped: number }> {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set')
  }
  const brevoKey = process.env.BREVO_API_KEY

  // Find all leads past their next_follow_up_at that haven't replied or bounced
  const { data: dueleads, error: fetchErr } = await supabaseAdmin
    .from('email_leads')
    .select('id, campaign_id, email, owner_name, business_name, city, phone, source, status, sequence_step, resend_message_id')
    .lte('next_follow_up_at', new Date().toISOString())
    .is('replied_at', null)
    .eq('status', 'sent')
    .limit(200)

  if (fetchErr) throw new Error(`Failed to fetch due leads: ${fetchErr.message}`)
  if (!dueleads || dueleads.length === 0) return { sent: 0, errors: 0, skipped: 0 }

  // Group by campaign_id so we only fetch each campaign + sequences once
  const campaignIds = Array.from(new Set(dueleads.map((l: any) => l.campaign_id as string)))
  const campaignMap = new Map<string, { campaign: Campaign; sequences: SequenceStep[] }>()

  for (const cid of campaignIds) {
    const { data: camp } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, name, from_name, from_email, reply_to, subject, body_template, signature, status, sent_count, bounce_count')
      .eq('id', cid)
      .single()
    if (!camp) continue
    const sequences = await getSequenceSteps(cid)
    campaignMap.set(cid, { campaign: camp as Campaign, sequences })
  }

  let sent = 0
  let errors = 0
  let skipped = 0

  for (let i = 0; i < dueleads.length; i++) {
    const lead = dueleads[i] as any
    if (i > 0) await wait(500)

    const entry = campaignMap.get(lead.campaign_id)
    if (!entry) { skipped++; continue }

    const { campaign, sequences } = entry
    const nextStepNumber = (lead.sequence_step as number) + 1
    const nextStep = sequences.find((s) => s.step_number === nextStepNumber)

    if (!nextStep) {
      // No more steps -- clear the follow-up date
      await supabaseAdmin
        .from('email_leads')
        .update({ next_follow_up_at: null })
        .eq('id', lead.id)
      skipped++
      continue
    }

    try {
      const rawFollowUpBody = await personalizeLead(nextStep.body_template, lead as EmailLead, campaign.from_name)
      const hasFollowUpSigPlaceholder = rawFollowUpBody.includes('{{signature}}')
      const personalizedBody = rawFollowUpBody.replace(/\{\{signature\}\}/g, campaign.signature || '')
      const firstName = getFirstName(lead.owner_name)
      const personalizedSubject = nextStep.subject_template
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{owner_name\}\}/g, lead.owner_name || '')
        .replace(/\{\{business_name\}\}/g, lead.business_name || '')
        .replace(/\{\{city\}\}/g, lead.city || '')
        .replace(/\{\{original_subject\}\}/g, campaign.subject)

      const { messageId, error: sendErr } = await sendOneEmail(brevoKey, {
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        replyTo: `r+${lead.id}@replies.getcloudgreet.com`,
        to: lead.email,
        subject: personalizedSubject,
        body: personalizedBody,
        signature: hasFollowUpSigPlaceholder ? null : campaign.signature,
        campaignId: lead.campaign_id,
        leadId: lead.id,
        prevMessageId: lead.resend_message_id,
      })

      if (sendErr) throw new Error(sendErr)

      // Is there a step after this one?
      const stepAfter = sequences.find((s) => s.step_number === nextStepNumber + 1)

      await supabaseAdmin
        .from('email_leads')
        .update({
          sequence_step: nextStepNumber,
          resend_message_id: messageId || lead.resend_message_id,
          next_follow_up_at: stepAfter ? daysFromNow(stepAfter.delay_days) : null,
        })
        .eq('id', lead.id)

      logger.info('follow-up sent', { leadId: lead.id, campaignId: lead.campaign_id, step: nextStepNumber })
      sent++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('follow-up send failed', { leadId: lead.id, step: nextStepNumber, error: errMsg })
      await supabaseAdmin
        .from('email_leads')
        .update({ next_follow_up_at: null, error: errMsg })
        .eq('id', lead.id)
      errors++
    }
  }

  return { sent, errors, skipped }
}
