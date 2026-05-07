import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import { provisionRepNumber } from '@/lib/telnyx/provision-number'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const AGREEMENT_VERSION = '2026-05-04'

/**
 * POST /api/sales/accept-invite
 * body: { token, password, first_name, last_name, agreement_accepted, legal_name?, street_address?, city?, state?, zip? }
 *
 * Consumes a one-time invite token, creates the rep's user account,
 * stores their KYC profile, and signs them in. Returns a Stripe
 * Connect Express onboarding URL the rep should visit next to add
 * their bank info.
 */
export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => ({})) as Record<string, any>
 const token = (body.token || '').trim()
 const password = (body.password || '').trim()
 const firstName = (body.first_name || '').trim()
 const lastName = (body.last_name || '').trim()
 const agreementAccepted = !!body.agreement_accepted
 const legalName = (body.legal_name || `${firstName} ${lastName}`).trim()

 if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
 if (!password || password.length < 8) {
  return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
 }
 if (!firstName || !lastName) {
  return NextResponse.json({ error: 'First and last name required' }, { status: 400 })
 }
 if (!agreementAccepted) {
  return NextResponse.json({ error: 'You must accept the contractor agreement to continue' }, { status: 400 })
 }

 const { data: invite } = await supabaseAdmin
  .from('sales_rep_invites')
  .select('*')
  .eq('token', token)
  .maybeSingle()

 if (!invite) return NextResponse.json({ error: 'Invite not found or already consumed' }, { status: 404 })
 if (invite.consumed_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
 if (new Date(invite.expires_at) < new Date()) {
  return NextResponse.json({ error: 'This invite has expired - ask the admin for a new one' }, { status: 410 })
 }

 // Block if (somehow) an account exists at this email already.
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
   role: 'sales',
   is_admin: false,
   is_active: true,
   status: 'active',
  })
  .select('id, email')
  .single()

 if (userErr || !newUser) {
  logger.error('Failed to create rep user', { error: userErr?.message })
  return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
 }

 const { error: profileErr } = await supabaseAdmin.from('sales_reps').insert({
  id: newUser.id,
  legal_name: legalName,
  street_address: body.street_address || null,
  city: body.city || null,
  state: body.state || null,
  zip_code: body.zip_code || null,
  agreement_version: AGREEMENT_VERSION,
  agreement_signed_at: new Date().toISOString(),
  status: 'active',
 })
 if (profileErr) {
  logger.warn('Rep profile insert failed (continuing)', { error: profileErr.message })
 }

 // Mark invite consumed.
 await supabaseAdmin
  .from('sales_rep_invites')
  .update({ consumed_at: new Date().toISOString(), consumed_by: newUser.id })
  .eq('token', token)

 // Best-effort: provision a personal Telnyx DID for this rep so their
 // outbound dialer caller-ID matches their identity, not the shared
 // company number. Runs async-fire-and-forget - if it fails the rep
 // can still call (token endpoint falls back to env default), and
 // admin can manually retry from the rep page.
 void provisionRepNumber(newUser.id).catch((e) => {
   logger.warn('rep number provision threw', { repId: newUser.id, error: e instanceof Error ? e.message : 'Unknown' })
 })

 // Issue a JWT and set the cookie so they're signed in immediately.
 const jwt = JWTManager.createUserToken(newUser.id, '', newUser.email, 'sales')
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
