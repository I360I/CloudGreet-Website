import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
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
  status: string
  sent_count: number
  bounce_count: number
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
}

export async function personalizeLead(
  template: string,
  lead: EmailLead,
  fromName?: string,
): Promise<string> {
  const firstName = getFirstName(lead.owner_name)

  // Replace {{from_name}} which isn't an AI task
  const withFromName = template.replace(/\{\{from_name\}\}/g, fromName || 'CloudGreet')

  if (!process.env.ANTHROPIC_API_KEY) {
    return simpleReplace(withFromName, lead)
  }

  const hasVariables = /\{\{(owner_name|first_name|business_name|city)\}\}/.test(withFromName)
  if (!hasVariables) return withFromName

  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 1 })

    const prompt = `Fill in the template variables for this cold outreach email. Return only the completed email text, nothing else.

Template:
${withFromName}

Variables:
- {{first_name}} = ${firstName}
- {{owner_name}} = ${lead.owner_name || ''}
- {{business_name}} = ${lead.business_name || ''}
- {{city}} = ${lead.city || ''}

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendCampaignBatch(
  campaignId: string,
  batchSize = 50,
): Promise<{ sent: number; errors: number }> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, name, from_name, from_email, reply_to, subject, body_template, status, sent_count, bounce_count')
    .eq('id', campaignId)
    .single()

  if (campErr || !campaign) {
    throw new Error(`Campaign not found: ${campErr?.message}`)
  }

  const { data: leads, error: leadsErr } = await supabaseAdmin
    .from('email_leads')
    .select('id, campaign_id, email, owner_name, business_name, city, phone, source, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .limit(batchSize)

  if (leadsErr) {
    throw new Error(`Failed to fetch leads: ${leadsErr.message}`)
  }

  if (!leads || leads.length === 0) {
    return { sent: 0, errors: 0 }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let errors = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i] as EmailLead

    // Rate limit: 2 per second (500ms between sends)
    if (i > 0) await delay(500)

    // Mark as sending
    await supabaseAdmin
      .from('email_leads')
      .update({ status: 'sending' })
      .eq('id', lead.id)

    try {
      const personalizedBody = await personalizeLead(
        campaign.body_template,
        lead,
        campaign.from_name,
      )

      const firstName = getFirstName(lead.owner_name)
      const personalizedSubject = campaign.subject
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{owner_name\}\}/g, lead.owner_name || '')
        .replace(/\{\{business_name\}\}/g, lead.business_name || '')
        .replace(/\{\{city\}\}/g, lead.city || '')

      const response = await resend.emails.send({
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: lead.email,
        subject: personalizedSubject,
        text: personalizedBody,
        replyTo: campaign.reply_to || campaign.from_email,
        headers: {
          'X-Campaign-Id': campaignId,
          'X-Lead-Id': lead.id,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Resend API error')
      }

      const messageId = response.data?.id || null

      await supabaseAdmin
        .from('email_leads')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_message_id: messageId,
          personalized_subject: personalizedSubject,
          personalized_body: personalizedBody,
          error: null,
        })
        .eq('id', lead.id)

      sent++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('Email send failed', { leadId: lead.id, campaignId, error: errMsg })

      await supabaseAdmin
        .from('email_leads')
        .update({
          status: 'bounced',
          error: errMsg,
        })
        .eq('id', lead.id)

      errors++
    }
  }

  // Update campaign counts
  const { data: updated } = await supabaseAdmin
    .from('email_campaigns')
    .select('sent_count, bounce_count')
    .eq('id', campaignId)
    .single()

  if (updated) {
    await supabaseAdmin
      .from('email_campaigns')
      .update({
        sent_count: (updated.sent_count || 0) + sent,
        bounce_count: (updated.bounce_count || 0) + errors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
  }

  return { sent, errors }
}
