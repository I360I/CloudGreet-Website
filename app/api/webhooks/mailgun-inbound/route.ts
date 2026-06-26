import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/webhooks/mailgun-inbound
 * Handles inbound emails from Mailgun (prospect replies).
 *
 * Mailgun catches emails to r+{leadId}@replies.cloudgreet.com and POSTs
 * multipart/form-data to this endpoint.
 *
 * DNS: replies.cloudgreet.com MX → mxa.mailgun.org / mxb.mailgun.org
 * Mailgun route: match_recipient("r+.+@replies.cloudgreet.com") → forward here + stop()
 */
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Bad form data' }, { status: 400 })
  }

  const recipient: string = formData.get('recipient') as string || ''
  const fromHeader: string = formData.get('From') as string || formData.get('from') as string || ''
  const sender: string = formData.get('sender') as string || ''
  const subject: string = formData.get('subject') as string || ''
  const bodyPlain: string = formData.get('body-plain') as string || ''
  const messageId: string = formData.get('Message-Id') as string || ''
  const inReplyTo: string = formData.get('In-Reply-To') as string || ''

  logger.info('mailgun inbound', { recipient, sender, subject: subject.slice(0, 60) })

  // Extract leadId from recipient: r+{uuid}@replies.cloudgreet.com
  const match = recipient.match(/^r\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i)
  if (!match) {
    logger.warn('mailgun inbound: no lead ID in recipient', { recipient })
    return NextResponse.json({ ok: true })
  }
  const leadId = match[1]

  // Parse from name + email out of "Name <email>" header
  const fromMatch = fromHeader.match(/^(.+?)\s*<([^>]+)>$/)
  const fromName = fromMatch ? fromMatch[1].trim().replace(/^"|"$/g, '') : ''
  const fromEmail = fromMatch ? fromMatch[2] : sender

  // Look up lead + campaign
  const { data: lead } = await supabaseAdmin
    .from('email_leads')
    .select('id, campaign_id, status')
    .eq('id', leadId)
    .maybeSingle()

  if (!lead) {
    logger.warn('mailgun inbound: lead not found', { leadId })
    return NextResponse.json({ ok: true })
  }

  const { data: campaign } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, from_name, from_email, reply_to, reply_count')
    .eq('id', lead.campaign_id)
    .maybeSingle()

  if (!campaign) {
    logger.warn('mailgun inbound: campaign not found', { campaignId: lead.campaign_id })
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
    body: bodyPlain || null,
  })

  // Mark lead as replied and stop follow-ups
  if (lead.status !== 'replied') {
    await supabaseAdmin
      .from('email_leads')
      .update({ status: 'replied', replied_at: new Date().toISOString(), next_follow_up_at: null })
      .eq('id', leadId)

    await supabaseAdmin
      .from('email_campaigns')
      .update({ reply_count: (campaign.reply_count || 0) + 1 })
      .eq('id', lead.campaign_id)
  }

  logger.info('mailgun inbound: reply processed', { leadId, campaignId: lead.campaign_id })

  // Forward to rep's real inbox
  const forwardTo = campaign.reply_to || campaign.from_email
  if (forwardTo && process.env.BREVO_API_KEY) {
    const fwdSubject = subject.startsWith('Fwd:') || subject.startsWith('FW:') ? subject : `Fwd: ${subject}`
    const fwdBody = `--- Reply from ${fromName ? `${fromName} ` : ''}<${fromEmail}> ---\n\n${bodyPlain}`

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'CloudGreet', email: campaign.from_email },
        to: [{ email: forwardTo }],
        replyTo: { email: fromEmail, name: fromName || undefined },
        subject: fwdSubject,
        textContent: fwdBody,
      }),
    }).catch((err) => logger.warn('mailgun inbound: forward failed', { error: String(err) }))
  }

  return NextResponse.json({ ok: true })
}
