import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { authRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, password }
 *
 * Verifies the token (sha256 lookup, not expired, not used), hashes
 * the new password, updates the user, marks the token used. Single
 * use - replaying the same token errors.
 */
export async function POST(request: NextRequest) {
  const rl = await authRateLimit(request)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests, try again in a few minutes' },
      { status: 429, headers: rl.headers },
    )
  }

  let body: any = {}
  try { body = await request.json() } catch { /* allow empty */ }
  const token = String(body?.token || '')
  const password = String(body?.password || '')

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 8 characters' },
      { status: 400 },
    )
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const { data: row, error: lookupErr } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (lookupErr) {
    logger.error('reset-password: lookup failed', { error: lookupErr.message })
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json(
      { success: false, error: 'This reset link is invalid. Request a new one.' },
      { status: 400 },
    )
  }
  if (row.used_at) {
    return NextResponse.json(
      { success: false, error: 'This reset link has already been used. Request a new one.' },
      { status: 400 },
    )
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: 'This reset link has expired. Request a new one.' },
      { status: 400 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const { error: updErr } = await supabaseAdmin
    .from('custom_users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', row.user_id)
  if (updErr) {
    logger.error('reset-password: user update failed', { userId: row.user_id, error: updErr.message })
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }

  // Mark token used. Best-effort - the password is already changed.
  await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  // Invalidate any other outstanding tokens for this user so a stolen
  // older link can't be used after this reset.
  await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', row.user_id)
    .is('used_at', null)

  logger.info('Password reset succeeded', { userId: row.user_id })

  return NextResponse.json({ success: true }, { headers: rl.headers })
}
