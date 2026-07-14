import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { authRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/setter/accept-invite
 * body: { token, password, first_name, last_name }
 *
 * Consumes a one-time setter invite token and creates the account. No
 * Stripe Connect / contractor agreement step (mirrors
 * /api/sales/accept-invite structurally but a setter doesn't earn
 * commission, so it skips the sales_reps profile insert and the
 * personal Telnyx number provisioning - both are commission/payout-
 * specific and unnecessary for v1; see plan's explicit scope note.
 */
export async function POST(request: NextRequest) {
  const rl = await authRateLimit(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } },
    )
  }

  const body = await request.json().catch(() => ({})) as Record<string, any>
  const token = (body.token || '').trim()
  const password = (body.password || '').trim()
  const firstName = (body.first_name || '').trim()
  const lastName = (body.last_name || '').trim()

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'First and last name required' }, { status: 400 })
  }

  const { data: invite } = await supabaseAdmin
    .from('setter_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invite not found or already consumed' }, { status: 404 })
  if (invite.consumed_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired - ask the admin for a new one' }, { status: 410 })
  }

  const { data: existingUser } = await supabaseAdmin
    .from('custom_users')
    .select('id')
    .eq('email', invite.email)
    .maybeSingle()
  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { data: newUser, error: userErr } = await supabaseAdmin
    .from('custom_users')
    .insert({
      email: invite.email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      role: 'setter',
      is_admin: false,
      is_active: true,
      status: 'active',
      // Pay/goal the admin pre-set on the invite carry over to the new
      // account; null falls through to the custom_users column defaults
      // (weekly_demo_goal 2, hourly rates 0). See sql/setter-invite-pay.sql.
      ...(invite.weekly_demo_goal != null ? { weekly_demo_goal: invite.weekly_demo_goal } : {}),
      ...(invite.base_hourly_rate != null ? { base_hourly_rate: invite.base_hourly_rate } : {}),
      ...(invite.bonus_hourly_rate != null ? { bonus_hourly_rate: invite.bonus_hourly_rate } : {}),
    })
    .select('id, email')
    .single()

  if (userErr || !newUser) {
    logger.error('Failed to create setter user', { error: userErr?.message })
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  await supabaseAdmin
    .from('setter_invites')
    .update({ consumed_at: new Date().toISOString(), consumed_by: newUser.id })
    .eq('token', token)

  // Assign any leads an admin pre-staged for this setter's email before the
  // account existed (scraped + tagged source='preload:<email>'), so their
  // queue is populated the moment they first log in. Best-effort - never
  // fail account creation over this.
  try {
    const { data: preLeads } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('source', `preload:${invite.email}`)
    if (preLeads && preLeads.length > 0) {
      const now = new Date().toISOString()
      const rows = preLeads.map((l) => ({
        lead_id: l.id,
        rep_id: newUser.id,
        status: 'new',
        claimed: false,
        assigned_at: now,
        touch_count: 0,
      }))
      for (let i = 0; i < rows.length; i += 500) {
        await supabaseAdmin.from('lead_assignments').insert(rows.slice(i, i + 500))
      }
      logger.info('Setter invite: assigned preloaded leads', { setter: newUser.id, count: rows.length })
    }
  } catch (e) {
    logger.warn('Setter invite: preloaded lead assignment failed', { error: e instanceof Error ? e.message : 'unknown' })
  }

  const jwt = JWTManager.createUserToken(newUser.id, '', newUser.email, 'setter')
  const res = NextResponse.json({ success: true, userId: newUser.id })
  res.cookies.set('token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
