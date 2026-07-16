import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { proxyBookingUrl } from '@/lib/booking-url'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/send-booking-link
 *   body: { email: string }
 *
 * Emails the prospect a demo booking link, mid-call or after. Whose
 * calendar depends on who's sending:
 *   - sales rep: their own sales_reps.booking_url
 *   - setter:    their assigned rep's booking_url (custom_users.
 *                assigned_rep_id) - setters book onto the closing rep's
 *                calendar, mirroring how mark-demo routes their demos.
 *
 * The cal.com URL goes out proxied through cloudgreet.com/book/* (same
 * as send-onboarding) so webmail spam filters don't eat it. Also
 * backfills leads.email when it was blank and drops a lead_notes row
 * so the send shows in the timeline.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const isSetter = auth.role === 'setter'

  const body = await request.json().catch(() => ({} as any))
  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  // When sent from the "mark demo set" flow the time is already chosen, so
  // the email should state it rather than ask the prospect to pick one.
  const scheduledAt = typeof body?.scheduled_at === 'string' ? body.scheduled_at : null
  const prospectTz = typeof body?.tz === 'string' ? body.tz : null

  // Only leads assigned to the caller.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Whose calendar link goes out.
  let calendarOwnerId: string | null = auth.userId
  if (isSetter) {
    const { data: setterUser } = await supabaseAdmin
      .from('custom_users')
      .select('assigned_rep_id')
      .eq('id', auth.userId)
      .maybeSingle()
    calendarOwnerId = setterUser?.assigned_rep_id || null
    if (!calendarOwnerId) {
      return NextResponse.json({
        error: "You don't have an assigned rep yet, so there's no calendar to send. Ask admin to assign one under Setters.",
      }, { status: 409 })
    }
  }

  const [{ data: repProfile }, { data: ownerUser }] = await Promise.all([
    supabaseAdmin
      .from('sales_reps')
      .select('booking_url')
      .eq('id', calendarOwnerId)
      .maybeSingle(),
    supabaseAdmin
      .from('custom_users')
      .select('email, name, first_name, last_name')
      .eq('id', calendarOwnerId)
      .maybeSingle(),
  ])

  const rawBookingUrl = repProfile?.booking_url || null
  if (!rawBookingUrl) {
    const who = isSetter ? 'Your assigned rep' : 'You'
    return NextResponse.json({
      error: `${who} doesn't have a booking URL saved yet - it's set under the rep's Settings (or by admin) before links can go out.`,
    }, { status: 409 })
  }
  const bookingUrl = proxyBookingUrl(rawBookingUrl)

  const ownerName = ownerUser?.name
    || [ownerUser?.first_name, ownerUser?.last_name].filter(Boolean).join(' ')
    || 'our team'
  const firstName = (lead.contact_name || '').split(' ')[0] || null

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'Email sending is not configured (RESEND_API_KEY missing).' }, { status: 503 })
  }

  // Sender info: reply-to reaches the human, and the from-name +
  // signature carry their first name so it reads like a person's
  // follow-up, not a mail merge.
  const { data: sender } = await supabaseAdmin
    .from('custom_users')
    .select('email, first_name, name')
    .eq('id', auth.userId)
    .maybeSingle()
  const senderFirst = (sender?.first_name || sender?.name || '').split(' ')[0] || null

  // If a specific time was booked, format it in the prospect's timezone
  // (e.g. "Thursday, July 16 at 10:00 AM CDT") for the email.
  let whenLine: string | null = null
  if (scheduledAt) {
    const d = new Date(scheduledAt)
    if (!isNaN(d.getTime())) {
      try {
        whenLine = new Intl.DateTimeFormat('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
          ...(prospectTz ? { timeZone: prospectTz } : {}),
        }).format(d)
      } catch { /* bad tz - fall back to the no-time copy */ }
    }
  }

  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const signoff = senderFirst ? `Talk soon,\n${senderFirst}\nCloudGreet` : 'Talk soon,\nCloudGreet'
  const bodyText = whenLine
    ? `${greeting}

Good talking with you just now. You're all set for your demo on ${whenLine}. Here's the link to join when it's time:

${bookingUrl}

It's 15 minutes. You'll hear the AI pick up a call for a business like yours, live, and you can grill us on anything after.

Need to move it? Just reply here.

${signoff}`
    : `${greeting}

Good talking with you just now. Here's that link - pick whatever time works and it'll go straight on the calendar:

${bookingUrl}

It's 15 minutes. You'll hear the AI pick up a call for a business like yours, live, and you can grill us on anything after.

If none of those times fit, just reply here and we'll make one work.

${signoff}`

  try {
    const resend = new Resend(resendKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
    await resend.emails.send({
      from: `${senderFirst ? `${senderFirst} at CloudGreet` : 'CloudGreet'} <${fromEmail}>`,
      to: email,
      replyTo: sender?.email || process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com',
      subject: 'That demo we talked about',
      text: bodyText,
    })
  } catch (e) {
    logger.error('send-booking-link: email send failed', {
      leadId: lead.id, error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Email failed to send - try again.' }, { status: 502 })
  }

  // Best-effort bookkeeping: backfill the lead's email + timeline note.
  if (!lead.email) {
    void supabaseAdmin.from('leads').update({ email }).eq('id', lead.id).then(() => {})
  }
  void supabaseAdmin.from('lead_notes').insert({
    lead_id: lead.id,
    rep_id: auth.userId,
    body: `Booking link sent to ${email} (${ownerName}'s calendar)`,
  }).then(({ error }) => {
    if (error) logger.warn('send-booking-link: note insert failed', { leadId: lead.id, error: error.message })
  })

  // Owner text alert (best-effort, fire-and-forget).
  void (async () => {
    const { textOwnerSetterActivity } = await import('@/lib/notifications/setter-alerts')
    await textOwnerSetterActivity([
      `${senderFirst || 'A setter'} sent a booking link`,
      `${lead.business_name || 'a lead'} -> ${email}`,
      `Calendar: ${ownerName}`,
    ])
  })()

  logger.info('Booking link sent', {
    senderId: auth.userId, leadId: lead.id, calendarOwnerId, role: auth.role,
  })

  return NextResponse.json({
    success: true,
    sent_to: email,
    booking_url: bookingUrl,
    calendar_owner: ownerName,
  })
}
