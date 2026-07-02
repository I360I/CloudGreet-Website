import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/applications
 *
 * Public endpoint. Captures a rep job application and emails Anthony
 * a heads-up. Validates basic shape; rate-limits per IP (the unique
 * email constraint only stops dupes, not spam from fresh addresses).
 */
export async function POST(request: NextRequest) {
  // Public form that emails a founder + writes a row on every submit;
  // rate limit per IP so it can't be used as an inbox/DB spam vector.
  const rl = await moderateRateLimit(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } },
    )
  }

  let body: any
  try { body = await request.json() } catch { body = null }
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const str = (v: any, max = 1000) => typeof v === 'string' ? v.trim().slice(0, max) : ''
  const num = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.floor(n) : null
  }
  const bool = (v: any) => v === true || v === 'true' || v === 'on' || v === 1
  const url = (v: any): string | null => {
    const s = str(v, 500)
    if (!s) return null
    let u = s
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    try {
      const parsed = new URL(u)
      if (!['http:', 'https:'].includes(parsed.protocol)) return null
      return parsed.toString()
    } catch {
      return null
    }
  }

  const first_name = str(body.first_name, 100)
  const last_name = str(body.last_name, 100)
  const email = str(body.email, 200).toLowerCase()
  const phone = str(body.phone, 30)

  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
  }

  // Resume + video are stored as Supabase Storage paths (uploaded
  // through /api/applications/upload-url). Legacy resume_url/video_url
  // still accepted in case a future entry comes in via API.
  const resume_path = str(body.resume_path, 500) || null
  const resume_filename = str(body.resume_filename, 200) || null
  const video_path = str(body.video_path, 500) || null
  const video_filename = str(body.video_filename, 200) || null
  const resume_url = resume_path ? null : url(body.resume_url)
  const video_url = video_path ? null : url(body.video_url)
  if (!resume_path && !video_path && !resume_url && !video_url) {
    return NextResponse.json({
      error: 'Please upload at least one: resume or 90-second intro video.',
    }, { status: 400 })
  }

  const about_yourself = str(body.about_yourself, 2000)
  if (!about_yourself) {
    return NextResponse.json({
      error: 'Please answer "tell me about yourself".',
    }, { status: 400 })
  }
  const why_commission_only = str(body.why_commission_only, 2000)
  const why_cloudgreet = str(body.why_cloudgreet, 2000)

  // biggest deal - accept "$25,000" or "25000" or "25k"
  const dealRaw = str(body.biggest_deal, 30).toLowerCase().replace(/[$,\s]/g, '')
  let biggest_deal_cents: number | null = null
  const m = dealRaw.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (m) {
    let dollars = parseFloat(m[1])
    if (m[2] === 'k') dollars *= 1000
    else if (m[2] === 'm') dollars *= 1_000_000
    biggest_deal_cents = Math.round(dollars * 100)
  }

  const startDateRaw = str(body.earliest_start_date, 30)
  let earliest_start_date: string | null = null
  if (startDateRaw) {
    const d = new Date(startDateRaw)
    if (!isNaN(d.getTime())) earliest_start_date = d.toISOString().slice(0, 10)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null
  const ua = request.headers.get('user-agent') || null

  const insert = {
    first_name,
    last_name,
    email,
    phone,
    city: str(body.city, 100) || null,
    state: str(body.state, 60) || null,
    linkedin_url: url(body.linkedin_url),
    years_sales_experience: num(body.years_sales_experience),
    previous_role: str(body.previous_role, 200) || null,
    industries_sold: str(body.industries_sold, 500) || null,
    biggest_deal_cents,
    prior_commission_only: bool(body.prior_commission_only),
    prior_b2b: bool(body.prior_b2b),
    about_yourself,
    why_commission_only: why_commission_only || null,
    why_cloudgreet: why_cloudgreet || null,
    monthly_goal_deals: num(body.monthly_goal_deals),
    why_can_hit_goal: str(body.why_can_hit_goal, 2000) || null,
    earliest_start_date,
    hours_per_week: num(body.hours_per_week),
    has_workspace: bool(body.has_workspace),
    resume_url,
    video_url,
    resume_path,
    resume_filename,
    video_path,
    video_filename,
    ip_address: ip,
    user_agent: ua ? ua.slice(0, 500) : null,
  }

  // Attempt insert; if a column doesn't exist (migration hasn't run on
  // this env), drop the offending column and retry. Loops at most a
  // handful of times and only ever drops *new* fields the migration
  // would have added, so we never silently lose required data.
  const droppable = new Set([
    'about_yourself', 'resume_path', 'resume_filename',
    'video_path', 'video_filename',
  ])
  let payload: Record<string, any> = { ...insert }
  let data: any = null
  let error: any = null
  for (let i = 0; i < 8; i++) {
    const r = await supabaseAdmin
      .from('rep_applications')
      .insert(payload)
      .select('id, created_at')
      .single()
    if (!r.error) { data = r.data; error = null; break }
    error = r.error
    const m = (r.error.message || '').match(/column "?([a-z_]+)"? .* does not exist|Could not find the '([a-z_]+)' column/i)
    const col = m?.[1] || m?.[2]
    if (col && droppable.has(col) && col in payload) {
      delete payload[col]
      continue
    }
    break
  }

  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      return NextResponse.json({
        error: `You already have an active application on file. We'll be in touch${process.env.SUPPORT_EMAIL ? ` - feel free to email ${process.env.SUPPORT_EMAIL} if you need to update something` : ''}.`,
      }, { status: 409 })
    }
    logger.error('Application insert failed', { error: error.message })
    return NextResponse.json({
      error: `Could not submit application: ${error.message}`,
    }, { status: 500 })
  }

  // Best-effort founder notification.
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const founderEmail = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: founderEmail,
        replyTo: email,
        subject: `New rep application - ${first_name} ${last_name}`,
        text:
`${first_name} ${last_name} just applied for the sales-rep role.

  Email:    ${email}
  Phone:    ${phone}
  Location: ${insert.city || '-'}, ${insert.state || '-'}
  ${insert.linkedin_url ? `LinkedIn: ${insert.linkedin_url}` : ''}
  Resume:   ${resume_filename || resume_url || '-'}
  Video:    ${video_filename || video_url || '-'}

About:
${about_yourself.slice(0, 600)}${about_yourself.length > 600 ? '...' : ''}

Review: ${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/admin/applications/${data.id}
`,
      })
    }
  } catch (e) {
    logger.warn('Application founder email failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }

  // Light auto-reply to the candidate.
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const replyTo = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Application received.</div>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:16px;">
            Thanks for applying, ${first_name}. I read every application personally and respond within a few business days. If we move forward, you'll get an email with a Calendly link to pick an interview slot.
          </p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:12px;">
            - Anthony Edwards<br/>Founder, CloudGreet
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject: 'Your CloudGreet sales-rep application',
        html,
        text: `Thanks for applying, ${first_name}. I read every application personally and respond within a few business days. - Anthony, CloudGreet`,
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, application_id: data.id })
}
