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

  // Sender info for the reply-to so answers reach a human.
  const { data: sender } = await supabaseAdmin
    .from('custom_users')
    .select('email')
    .eq('id', auth.userId)
    .maybeSingle()

  try {
    const resend = new Resend(resendKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
    await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to: email,
      replyTo: sender?.email || process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com',
      subject: `Book your CloudGreet demo${lead.business_name ? ` - ${lead.business_name}` : ''}`,
      text:
`${firstName ? `Hi ${firstName},` : 'Hi,'}

Great talking with you${lead.business_name ? ` about ${lead.business_name}` : ''}. Here's the link to grab a demo time with ${ownerName} - pick whatever works for you:

${bookingUrl}

It's a quick call: we'll show you how the AI receptionist answers your phones, books jobs, and texts back missed calls.

Questions before then? Just reply to this email.

- CloudGreet`,
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
