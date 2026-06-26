import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/brevo-inbound
 * Handles inbound emails from Brevo (prospect replies).
 *
 * Flow:
 *   1. Brevo catches email to r+{leadId}@replies.getcloudgreet.com
 *   2. Fires this webhook
 *   3. We store the reply, mark the lead as replied, stop follow-ups
 *   4. Forward the reply to the rep's reply_to address
 *
 * DNS required (GoDaddy):
 *   Type: MX  Host: replies  Points to: inbound.brevo.com  Priority: 10
 *
 * Brevo inbound webhook config:
 *   Dashboard → Inbound Parsing → Add domain → replies.getcloudgreet.com
 *   Webhook URL: https://cloudgreet.com/api/webhooks/brevo-inbound
 */
export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  // Brevo inbound format uses PascalCase fields
  const toAddresses: Array<{ Name?: string; Address?: string; name?: string; address?: string }> =
    body.To || body.to || []
  const from = body.From || body.from || {}
  const fromEmail: string = from.Address || from.address || ''
  const fromName: string = from.Name || from.name || ''
  const subject: string = body.Subject || body.subject || ''
  const rawBody: string = body.RawTextBody || body.text_content || body.TextBody || ''
  const messageId: string = body.MessageId || body.message_id || ''
  const inReplyTo: string = body.InReplyTo || body.in_reply_to || ''

  logger.info('brevo inbound webhook', { fromEmail, subject: subject.slice(0, 60) })

  // Extract leadId from To address: r+{uuid}@replies.getcloudgreet.com
  let leadId: string | null = null
  for (const addr of toAddresses) {
    const address = addr.Address || addr.address || ''
    const match = address.match(/^r\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@replies\.getcloudgreet\.com$/i)
    if (match) {
      leadId = match[1]
      break
    }
  }

  if (!leadId) {
    logger.warn('brevo inbound: no lead ID found in To addresses', { to: JSON.stringify(toAddresses) })
    return NextResponse.json({ ok: true })
  }

  // Look up the lead and campaign
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('email_leads')
    .select('id, campaign_id, email, status')
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !lead) {
    logger.warn('brevo inbound: lead not found', { leadId })
    return NextResponse.json({ ok: true })
  }

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, from_name, from_email, reply_to, reply_count')
    .eq('id', lead.campaign_id)
    .maybeSingle()

  if (campErr || !campaign) {
    logger.warn('brevo inbound: campaign not found', { campaignId: lead.campaign_id })
    return NextResponse.json({ ok: true })
  }

  // Store the reply
  await supabaseAdmin.from('email_lead_replies').insert({
    lead_id: leadId,
    campaign_id: lead.campaign_id,
    message_id: messageId || null,
    in_reply_to: inReplyTo || null,
    from_email: fromEmail,
    from_name: fromName || null,
    subject: subject || null,
    body: rawBody || null,
  })

  // Mark lead as replied and stop follow-ups (only if not already replied)
  if (lead.status !== 'replied') {
    await supabaseAdmin
      .from('email_leads')
      .update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        next_follow_up_at: null,
      })
      .eq('id', leadId)

    // Increment campaign reply_count
    await supabaseAdmin
      .from('email_campaigns')
      .update({ reply_count: (campaign.reply_count || 0) + 1 })
      .eq('id', lead.campaign_id)
  }

  logger.info('brevo inbound: reply processed', { leadId, campaignId: lead.campaign_id })

  // Forward to rep's reply_to email
  const forwardTo = campaign.reply_to || campaign.from_email
  if (forwardTo && process.env.BREVO_API_KEY) {
    const forwardSubject = subject.startsWith('Fwd:') || subject.startsWith('FW:')
      ? subject
      : `Fwd: ${subject}`

    const forwardBody = [
      `--- Reply from ${fromName ? `${fromName} ` : ''}<${fromEmail}> ---`,
      '',
      rawBody,
    ].join('\n')

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'CloudGreet', email: campaign.from_email },
        to: [{ email: forwardTo }],
        replyTo: { email: fromEmail, name: fromName || undefined },
        subject: forwardSubject,
        textContent: forwardBody,
      }),
    }).catch((err) => {
      logger.warn('brevo inbound: forward failed', { error: String(err) })
    })
  }

  return NextResponse.json({ ok: true })
}
