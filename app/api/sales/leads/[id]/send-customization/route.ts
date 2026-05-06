import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/send-customization
 *
 * Emails the prospect (who already has a CloudGreet login from the
 * earlier "Send booking link" step) a link to the customization form
 * at /dashboard/customize. Bumps businesses.customization_status
 * 'not_sent' → 'sent' so the rep + admin views reflect the nudge.
 *
 * If the rep hasn't actually sent the booking link yet (no business
 * row tied to this lead), returns 409 - they need to provision the
 * client account first.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Verify rep owns the lead.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'Not your lead' }, { status: 404 })

  // Find the close + business this rep created off this lead.
  const { data: close } = await supabaseAdmin
    .from('closes')
    .select('id, business_id, prospect_email, prospect_business_name')
    .eq('rep_id', auth.userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!close || !close.business_id) {
    return NextResponse.json({
      error: 'No client account on file - send the booking link first to provision their account.',
    }, { status: 409 })
  }

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, customization_status')
    .eq('id', close.business_id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const body = await request.json().catch(() => ({} as any))
  const email = String(body?.email || close.prospect_email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Need an email - none on file for this prospect.' }, { status: 400 })
  }

  // Bump pipeline if still in not_sent.
  if (((business as any).customization_status || 'not_sent') === 'not_sent') {
    await supabaseAdmin
      .from('businesses')
      .update({
        customization_status: 'sent',
        customization_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', business.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const formUrl = `${baseUrl}/dashboard/customize`
  const loginUrl = `${baseUrl}/login`

  let emailSent = false
  let emailError: string | null = null
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const { data: rep } = await supabaseAdmin
        .from('custom_users')
        .select('email, name, first_name, last_name')
        .eq('id', auth.userId)
        .maybeSingle()
      const replyTo = rep?.email || process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'

      const text = [
        `Hi${close.prospect_business_name ? ' ' + close.prospect_business_name : ''},`,
        '',
        'Quick form to customize your CloudGreet agent:',
        formUrl,
        '',
        `Sign in first if you're prompted: ${loginUrl}`,
        '',
        'Most fields are already filled in - just review, fill in the gaps, and submit. We\'ll have your polished agent ready in 2-3 business days.',
      ].join('\n')

      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Customize your agent</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;font-size:14px;line-height:1.6;color:#374151;">
          Most fields are already filled in. Review, fill in the gaps, and submit. We'll have your polished agent ready in 2-3 business days.
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <a href="${formUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;padding:10px 18px;font-weight:500;">Open the form</a>
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
            CloudGreet · AI receptionist for service businesses
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject: 'Customize your CloudGreet agent',
        text,
        html,
      })
      emailSent = true
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'Unknown'
      logger.warn('send-customization email failed', {
        leadId: params.id, error: emailError,
      })
    }
  } else {
    emailError = 'RESEND_API_KEY not configured'
  }

  return NextResponse.json({
    success: true,
    form_url: formUrl,
    email_sent: emailSent,
    ...(emailError ? { email_error: emailError } : {}),
  })
}
