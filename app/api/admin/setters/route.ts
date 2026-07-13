import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { getRepCallStats, getWeeklyDemoGoalStatus } from '@/lib/sales/dialer-stats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - list every setter with today's call activity (no commission/
 * Stripe fields - setters aren't paid through that pipeline).
 *
 * POST - invite a new setter by email. Mirrors app/api/admin/sales/reps
 * POST, but writes to setter_invites (not sales_rep_invites) and the
 * email copy has no Stripe Connect / 1099 contractor language, since
 * that doesn't apply to a setter.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: users, error } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, name, last_login, last_active_at, created_at, is_active, weekly_demo_goal, base_hourly_rate, bonus_hourly_rate, assigned_rep_id, personal_cell')
    .eq('role', 'setter')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const setters = users || []

  const [statsResults, goalResults, { data: invites }, { data: repRows }] = await Promise.all([
    Promise.all(setters.map((u) => getRepCallStats(u.id))),
    Promise.all(setters.map((u) => getWeeklyDemoGoalStatus(u.id, (u as any).weekly_demo_goal ?? 2, Number((u as any).base_hourly_rate ?? 0), Number((u as any).bonus_hourly_rate ?? 0)))),
    supabaseAdmin
      .from('setter_invites')
      .select('token, email, invited_at, expires_at, consumed_at')
      .is('consumed_at', null)
      .order('invited_at', { ascending: false }),
    // Assignable closing reps for the per-setter dropdown.
    supabaseAdmin
      .from('custom_users')
      .select('id, email, first_name, last_name, name, is_active')
      .eq('role', 'sales')
      .order('created_at', { ascending: true }),
  ])

  const reps = (repRows || [])
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      id: r.id,
      name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email,
      email: r.email,
    }))

  return NextResponse.json({
    success: true,
    setters: setters.map((u, i) => ({
      id: u.id,
      email: u.email,
      name: u.name || [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
      is_active: !!u.is_active,
      last_login: u.last_login,
      last_active: [u.last_active_at, u.last_login].filter(Boolean).sort().pop() || null,
      created_at: u.created_at,
      personal_cell: (u as any).personal_cell ?? null,
      calls_today: statsResults[i],
      weekly_goal: goalResults[i],
      assigned_rep_id: (u as any).assigned_rep_id || null,
    })),
    reps,
    open_invites: (invites || []).map((i) => ({
      token: i.token,
      email: i.email,
      invited_at: i.invited_at,
      expires_at: i.expires_at,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: `Auth failed: ${auth.error || 'unknown'}` }, { status: 401 })
  }
  if (!auth.userId) {
    return NextResponse.json({ error: 'Token has no userId - sign out and back in.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { email?: string; name?: string }
  const email = (body.email || '').trim().toLowerCase()
  const name = (body.name || '').trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('custom_users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `An account already exists for ${email} (role: ${existing.role}). Use a different email.` },
      { status: 409 },
    )
  }
  const { data: openInvite } = await supabaseAdmin
    .from('setter_invites')
    .select('token, expires_at')
    .eq('email', email)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (openInvite) {
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/setter/accept-invite?token=${encodeURIComponent(openInvite.token)}`
    return NextResponse.json({
      error: `An open invite already exists for ${email}. Send them this link instead: ${acceptUrl}`,
    }, { status: 409 })
  }

  const token = crypto.randomBytes(24).toString('base64url')
  const { error: insertErr } = await supabaseAdmin.from('setter_invites').insert({
    token,
    email,
    invited_by: auth.userId,
  })
  if (insertErr) {
    logger.error('Failed to create setter invite', { error: insertErr.message })
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const acceptUrl = `${baseUrl}/setter/accept-invite?token=${encodeURIComponent(token)}`

  let emailSent = false
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
      const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
      await resend.emails.send({
        from: `CloudGreet <${fromEmail}>`,
        to: email,
        replyTo,
        subject: 'Your CloudGreet setter account',
        text:
`${name ? `Hi ${name},` : 'Hi,'}

You're invited to join CloudGreet as a setter. Set up your account here (link expires in 14 days):

${acceptUrl}

Once you're set up, you'll see your lead list, the dialer, and the scraper.

Questions? Reply to this email.

- CloudGreet`,
      })
      emailSent = true
    } catch (e) {
      logger.warn('Setter invite email send failed', { error: e instanceof Error ? e.message : 'Unknown' })
    }
  }

  return NextResponse.json({
    success: true,
    email,
    acceptUrl,
    emailSent,
    message: emailSent
      ? `Invite sent to ${email}.`
      : `Invite created - RESEND_API_KEY isn't set, so copy this link and send it manually: ${acceptUrl}`,
  })
}
