import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/closes - list the calling rep's submitted closes.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('closes')
    .select(`
      *,
      business:business_id (
        id,
        business_name,
        subscription_status,
        account_status,
        customization_status,
        phone_number,
        greeting_message,
        voice_id
      )
    `)
    .eq('rep_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Inline subscription_status / customization_status onto the close so
  // the UI doesn't have to walk the join. demo_agent_* fields come
  // directly from the closes select(*).
  const closes = (data ?? []).map((c: any) => ({
    ...c,
    subscription_status: c.business?.subscription_status ?? null,
    account_status: c.business?.account_status ?? null,
    customization_status: c.business?.customization_status ?? null,
    // Agent details (only present once the close has a paid business).
    // The "agent number" the rep wants to see is whichever Retell-issued
    // forwarding line we've assigned. Retell stores it on retell_phone_number
    // when admin connects it; some legacy rows keep it on phone_number.
    business_phone_number: c.business?.phone_number || null,
    business_greeting: c.business?.greeting_message || null,
    business_voice_id: c.business?.voice_id || null,
  }))
  return NextResponse.json({ success: true, closes })
}

/**
 * POST /api/sales/closes
 *
 * The rep tells us they closed someone. We create a `closes` row in
 * `pending` status and ping the founder so they can issue the
 * payment link / start onboarding the new client. The actual
 * commission ledger is written later by the Stripe `invoice.paid`
 * webhook - this endpoint just captures the deal.
 *
 * Body: {
 *   prospect_business_name, prospect_contact_name?, prospect_email?,
 *   prospect_phone?, agreed_monthly_cents, agreed_setup_fee_cents?,
 *   notes?, lead_id?
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
  const monthly = Number.parseInt(String(body?.agreed_monthly_cents ?? ''), 10)
  const setupFee = body?.agreed_setup_fee_cents == null
    ? 0
    : Number.parseInt(String(body.agreed_setup_fee_cents), 10)

  if (!name) {
    return NextResponse.json({ error: 'Business name required' }, { status: 400 })
  }
  if (!Number.isFinite(monthly) || monthly < 1000 || monthly > 1_000_000) {
    return NextResponse.json({ error: 'Monthly must be between $10 and $10,000' }, { status: 400 })
  }
  if (!Number.isFinite(setupFee) || setupFee < 0 || setupFee > 1_000_000) {
    return NextResponse.json({ error: 'Setup fee must be between $0 and $10,000' }, { status: 400 })
  }

  const contact = body?.prospect_contact_name ? String(body.prospect_contact_name).trim() : null
  const email = body?.prospect_email ? String(body.prospect_email).trim() : null
  const phone = body?.prospect_phone ? String(body.prospect_phone).trim() : null
  const notes = body?.notes ? String(body.notes).trim().slice(0, 4000) : null
  const leadId = body?.lead_id ? String(body.lead_id) : null

  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name')
    .eq('id', auth.userId)
    .maybeSingle()

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('closes')
    .insert({
      rep_id: auth.userId,
      prospect_business_name: name,
      prospect_contact_name: contact,
      prospect_email: email,
      prospect_phone: phone,
      agreed_monthly_cents: monthly,
      agreed_setup_fee_cents: setupFee,
      notes,
      status: 'pending',
    })
    .select('*')
    .single()

  if (insertErr || !created) {
    logger.error('Close insert failed', { userId: auth.userId, error: insertErr?.message })
    return NextResponse.json({ error: insertErr?.message || 'Failed to submit' }, { status: 500 })
  }

  // If this came from a claimed lead, mark the lead "won" so it
  // disappears from the rep's pool view. Best-effort.
  if (leadId) {
    try {
      await supabaseAdmin
        .from('leads')
        .update({ status: 'won', updated_at: new Date().toISOString() })
        .eq('id', leadId)
    } catch { /* non-fatal */ }
  }

  // Best-effort founder notification.
  const resendKey = process.env.RESEND_API_KEY
  const founderEmail = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const repName = [rep?.first_name, rep?.last_name].filter(Boolean).join(' ') || rep?.email || 'A rep'
      const monthlyDisp = `$${(monthly / 100).toFixed(2)}/mo`
      const setupDisp = setupFee > 0 ? ` + $${(setupFee / 100).toFixed(2)} setup` : ''
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: founderEmail,
        replyTo: rep?.email || undefined,
        subject: `New close from ${repName}: ${name}`,
        text:
`${repName} just submitted a close.

  Business:  ${name}
  Contact:   ${contact || '-'}
  Email:     ${email || '-'}
  Phone:     ${phone || '-'}
  Pricing:   ${monthlyDisp}${setupDisp}

${notes ? `Notes:\n${notes}\n\n` : ''}Review & approve in admin: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/admin/sales/closes
`,
      })
    } catch (e) {
      logger.warn('Founder notification email failed', {
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  return NextResponse.json({ success: true, close: created })
}
