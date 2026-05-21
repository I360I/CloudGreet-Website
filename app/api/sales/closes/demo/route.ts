import { NextRequest, NextResponse } from 'next/server'
import { notifyAdmin } from '@/lib/notifications/notify'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/closes/demo
 *
 * Demo-only client submission - for EXTERNAL leads that the rep
 * doesn't have priced yet. Creates the same `closes` row that
 * `/api/sales/closes` does, but skips the agreed_monthly_cents
 * minimum so reps can register a prospect the moment a demo is
 * booked, BEFORE they've negotiated pricing.
 *
 * The row is still status='pending' on submit, with monthly=0 +
 * setup=0; admin sees the same review queue and the rep can come
 * back later to edit the deal with real pricing once they close.
 *
 * Body: {
 *   prospect_business_name (required),
 *   prospect_contact_name?, prospect_email?, prospect_phone?,
 *   website?, notes?, demo_scheduled_at?
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const name = String(body?.prospect_business_name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Business name required' }, { status: 400 })
  }

  const contact = body?.prospect_contact_name ? String(body.prospect_contact_name).trim() : null
  const email = body?.prospect_email ? String(body.prospect_email).trim() : null
  const phone = body?.prospect_phone ? String(body.prospect_phone).trim() : null
  const website = body?.website ? String(body.website).trim() : null
  const notes = body?.notes ? String(body.notes).trim().slice(0, 4000) : null

  // demo_scheduled_at is optional. Accept ISO strings; ignore garbage
  // so a typo in the rep's input doesn't kill the submission.
  let demoScheduledAt: string | null = null
  if (body?.demo_scheduled_at) {
    const t = new Date(String(body.demo_scheduled_at))
    if (!Number.isNaN(t.getTime())) demoScheduledAt = t.toISOString()
  }

  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name')
    .eq('id', auth.userId)
    .maybeSingle()

  // Build the insert payload. website + demo_scheduled_at are columns
  // already on `closes` (see sql/closes-prebuild-agent.sql +
  // sql/closes-demo-result.sql / customization-and-demo-agents.sql).
  const insertRow: Record<string, unknown> = {
    rep_id: auth.userId,
    prospect_business_name: name,
    prospect_contact_name: contact,
    prospect_email: email,
    prospect_phone: phone,
    agreed_monthly_cents: 0,
    agreed_setup_fee_cents: 0,
    notes,
    status: 'pending',
  }
  if (website) insertRow.website = website
  if (demoScheduledAt) insertRow.demo_scheduled_at = demoScheduledAt

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('closes')
    .insert(insertRow)
    .select('*')
    .single()

  if (insertErr || !created) {
    logger.error('Demo-client insert failed', { userId: auth.userId, error: insertErr?.message })
    return NextResponse.json({ error: insertErr?.message || 'Failed to submit' }, { status: 500 })
  }

  // Founder email - distinct subject so it's clearly a demo-only
  // submission, not a priced close.
  const resendKey = process.env.RESEND_API_KEY
  const founderEmail = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const repName = [rep?.first_name, rep?.last_name].filter(Boolean).join(' ') || rep?.email || 'A rep'
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: founderEmail,
        replyTo: rep?.email || undefined,
        subject: `New demo client from ${repName}: ${name}`,
        text:
`${repName} submitted a new external demo client (no pricing yet).

  Business:  ${name}
  Contact:   ${contact || '-'}
  Email:     ${email || '-'}
  Phone:     ${phone || '-'}
  Website:   ${website || '-'}
  Demo at:   ${demoScheduledAt ? new Date(demoScheduledAt).toLocaleString() : '-'}

${notes ? `Notes:\n${notes}\n\n` : ''}Review in admin: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/admin/sales/closes
`,
      })
    } catch (e) {
      logger.warn('Demo-client founder email failed', {
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  const repName2 = [rep?.first_name, rep?.last_name].filter(Boolean).join(' ') || rep?.email || 'A rep'
  void notifyAdmin({
    type: 'demo_client_submitted',
    title: `New demo client from ${repName2}`,
    body: `${name} - demo booked, no pricing yet`,
    link: `/admin/sales/closes`,
    severity: 'info',
    metadata: {
      close_id: created.id,
      rep_id: auth.userId,
      business_name: name,
      demo_scheduled_at: demoScheduledAt,
    },
  })

  return NextResponse.json({ success: true, close: created })
}
