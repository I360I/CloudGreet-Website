import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { computeDecayState } from '@/lib/sales/decay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - list every sales rep with the headline numbers admin needs:
 *   { id, email, name, status, mtd_closes, mtd_commission_cents,
 *     lifetime_commission_cents, stripe_connect_payouts_enabled }
 *
 * POST - invite a new rep by email. Creates a one-time token,
 * sends them an email with the setup link. The rep account itself
 * doesn't exist until they accept the invite.
 */

type RepRow = {
 id: string
 email: string
 first_name: string | null
 last_name: string | null
 name: string | null
}

export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 // Pull all sales-role users joined with their sales_reps profile.
 const { data: users, error } = await supabaseAdmin
  .from('custom_users')
  .select('id, email, first_name, last_name, name, last_login, created_at')
  .eq('role', 'sales')
  .order('created_at', { ascending: false })

 if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
 }
 const reps = users || []
 const repIds = reps.map((r) => r.id)

 const [{ data: profiles }, { data: ledger }, { data: closes }, { data: invites }] = await Promise.all([
  repIds.length
   ? supabaseAdmin.from('sales_reps').select('*').in('id', repIds)
   : Promise.resolve({ data: [] as any[] }),
  repIds.length
   ? supabaseAdmin
      .from('commission_ledger')
      .select('rep_id, commission_cents, payout_id, earned_at')
      .in('rep_id', repIds)
   : Promise.resolve({ data: [] as any[] }),
  // Pull qualifying closes (any status except cancelled/rejected) so we
  // can compute "days since last close" per rep for the decay column.
  repIds.length
   ? supabaseAdmin
      .from('closes')
      .select('rep_id, created_at, status')
      .in('rep_id', repIds)
      .not('status', 'in', '(cancelled,rejected)')
   : Promise.resolve({ data: [] as any[] }),
  supabaseAdmin
   .from('sales_rep_invites')
   .select('token, email, invited_at, expires_at, consumed_at')
   .is('consumed_at', null)
   .order('invited_at', { ascending: false }),
 ])

 const lastCloseByRep = new Map<string, string>()
 for (const c of closes || []) {
  const prev = lastCloseByRep.get(c.rep_id)
  if (!prev || new Date(c.created_at) > new Date(prev)) {
   lastCloseByRep.set(c.rep_id, c.created_at)
  }
 }

 const profileById = new Map<string, any>()
 for (const p of profiles || []) profileById.set(p.id, p)

 const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
 const stats = new Map<string, { mtdCommission: number; lifetimeCommission: number; mtdClosesPaid: number; outstanding: number }>()
 for (const row of ledger || []) {
  const cur = stats.get(row.rep_id) || { mtdCommission: 0, lifetimeCommission: 0, mtdClosesPaid: 0, outstanding: 0 }
  cur.lifetimeCommission += row.commission_cents
  if (new Date(row.earned_at) >= startOfMonth) {
   cur.mtdCommission += row.commission_cents
   cur.mtdClosesPaid += 1
  }
  if (!row.payout_id) cur.outstanding += row.commission_cents
  stats.set(row.rep_id, cur)
 }

 return NextResponse.json({
  success: true,
  reps: reps.map((u) => {
   const p = profileById.get(u.id) || {}
   const s = stats.get(u.id) || { mtdCommission: 0, lifetimeCommission: 0, mtdClosesPaid: 0, outstanding: 0 }
   const decay = computeDecayState({
    lastCloseAt: lastCloseByRep.get(u.id) || p.last_close_at || null,
    repStartedAt: u.created_at || new Date().toISOString(),
   })
   return {
    id: u.id,
    email: u.email,
    name: u.name || [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
    status: p.status || 'active',
    last_login: u.last_login,
    created_at: u.created_at,
    stripe_connect_account_id: p.stripe_connect_account_id || null,
    payouts_enabled: !!p.stripe_connect_payouts_enabled,
    agreement_signed_at: p.agreement_signed_at || null,
    mtd_commission_cents: s.mtdCommission,
    lifetime_commission_cents: s.lifetimeCommission,
    mtd_closes_paid: s.mtdClosesPaid,
    outstanding_commission_cents: s.outstanding,
    decay: {
     tier: decay.tier,
     multiplier: decay.multiplier,
     days_since_last_close: decay.daysSinceLastClose,
     days_until_next_drop: decay.daysUntilNextDrop,
     last_close_at: lastCloseByRep.get(u.id) || null,
    },
   }
  }),
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

 // Block if there's already an account at this email.
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
 // Also block on an open invite for the same email - otherwise we
 // pile up multiple valid tokens and only the first one consumed
 // creates a user; subsequent ones become dead links.
 const { data: openInvite } = await supabaseAdmin
  .from('sales_rep_invites')
  .select('token, expires_at')
  .eq('email', email)
  .is('consumed_at', null)
  .gt('expires_at', new Date().toISOString())
  .maybeSingle()
 if (openInvite) {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/sales/accept-invite?token=${encodeURIComponent(openInvite.token)}`
  return NextResponse.json({
   error: `An open invite already exists for ${email}. Send them this link instead: ${acceptUrl}`,
  }, { status: 409 })
 }

 const token = crypto.randomBytes(24).toString('base64url')
 const { error: insertErr } = await supabaseAdmin.from('sales_rep_invites').insert({
  token,
  email,
  invited_by: auth.userId,
 })
 if (insertErr) {
  logger.error('Failed to create rep invite', { error: insertErr.message })
  return NextResponse.json({ error: insertErr.message }, { status: 500 })
 }

 const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
 const acceptUrl = `${baseUrl}/sales/accept-invite?token=${encodeURIComponent(token)}`

 // Best-effort email; if Resend isn't configured we still return the
 // URL so the admin can send it manually.
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
    subject: 'Your CloudGreet sales rep invite',
    text:
`${name ? `Hi ${name},` : 'Hi,'}

You're invited to join the CloudGreet sales team. Set up your account here (link expires in 14 days):

${acceptUrl}

You'll be asked to:
  1. Pick a password
  2. Review and sign the contractor agreement
  3. Connect your bank via Stripe (so we can pay you weekly)

Once you're set up, you'll see your lead list, a close-submission form, and your earnings dashboard.

Questions? Reply to this email.

- CloudGreet`,
   })
   emailSent = true
  } catch (e) {
   logger.warn('Rep invite email send failed', { error: e instanceof Error ? e.message : 'Unknown' })
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
