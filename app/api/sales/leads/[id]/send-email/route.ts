import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/send-email  { to, subject, body }
 *
 * 1:1 personal prospect email for setters/reps - the "email them
 * instead of texting" flow (some businesses aren't cell numbers). Sends
 * from {rep}@getcloudgreet.com (the cold-safe domain, NOT cloudgreet.com)
 * via Brevo, reply-to the rep's own inbox so the prospect's reply reaches
 * them, and logs it as a note on the lead. Not a campaign - one email,
 * one person, fully personal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { to?: string; subject?: string; body?: string }
  const to = (body.to || '').trim().toLowerCase()
  const subject = (body.subject || '').trim()
  const text = (body.body || '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!subject || !text) {
    return NextResponse.json({ error: 'Subject and body are required.' }, { status: 400 })
  }

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 503 })

  // Verify the lead is the rep's, and grab a name for logging.
  const { data: lead } = await supabaseAdmin
    .from('leads').select('id, business_name, email').eq('id', params.id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: sender } = await supabaseAdmin
    .from('custom_users').select('email, first_name, name').eq('id', auth.userId).maybeSingle()
  const senderFirst = (sender?.first_name || sender?.name || '').split(' ')[0] || 'CloudGreet'
  // From + reply-to are BOTH the rep's own getcloudgreet.com mailbox (the
  // cold-safe domain, not cloudgreet.com), so prospect replies land in the
  // inbox the rep actually logs into. A per-rep mailbox is created at
  // onboarding (e.g. ed@getcloudgreet.com).
  const fromEmail = `${senderFirst.toLowerCase().replace(/[^a-z]/g, '') || 'team'}@getcloudgreet.com`
  const replyTo = fromEmail

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: `${senderFirst} at CloudGreet`, email: fromEmail },
        to: [{ email: to }],
        replyTo: { email: replyTo, name: senderFirst },
        subject,
        textContent: text,
        headers: { 'X-Lead-Id': lead.id, 'X-Rep-Id': auth.userId },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      return NextResponse.json({ error: err.message || `Email failed (${res.status})` }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Email failed' }, { status: 502 })
  }

  // Save the lead's email if it was blank, log the send, and mark touched.
  if (!lead.email) void supabaseAdmin.from('leads').update({ email: to }).eq('id', lead.id).then(() => {})
  void supabaseAdmin.from('lead_notes').insert({
    lead_id: lead.id, rep_id: auth.userId,
    body: `Emailed ${to} — "${subject}"`,
  }).then(() => {})
  void supabaseAdmin.from('lead_assignments')
    .update({ last_touched_at: new Date().toISOString() })
    .eq('lead_id', lead.id).eq('rep_id', auth.userId).then(() => {})

  logger.info('rep prospect email sent', { repId: auth.userId, leadId: lead.id, to })
  return NextResponse.json({ success: true, sent_to: to, from: fromEmail })
}
