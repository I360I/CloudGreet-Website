import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/change-password
 *
 * Lets a signed-in user change their own password by providing the
 * current password + a new one. We verify the current hash before
 * accepting the change so a stolen JWT can't pivot into a permanent
 * account takeover.
 */
export async function POST(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
 }

 const body = await request.json().catch(() => ({})) as {
  currentPassword?: string
  newPassword?: string
 }
 const currentPassword = (body.currentPassword || '').trim()
 const newPassword = (body.newPassword || '').trim()

 if (!currentPassword || !newPassword) {
  return NextResponse.json(
   { success: false, error: 'Current and new password required' },
   { status: 400 },
  )
 }
 if (newPassword.length < 8) {
  return NextResponse.json(
   { success: false, error: 'New password must be at least 8 characters' },
   { status: 400 },
  )
 }
 if (newPassword.length > 128) {
  return NextResponse.json(
   { success: false, error: 'New password too long (max 128)' },
   { status: 400 },
  )
 }
 if (newPassword === currentPassword) {
  return NextResponse.json(
   { success: false, error: 'New password must be different from current' },
   { status: 400 },
  )
 }

 try {
  const { data: user, error: fetchErr } = await supabaseAdmin
   .from('custom_users')
   .select('id, password_hash')
   .eq('id', auth.userId)
   .maybeSingle()

  if (fetchErr || !user) {
   return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash || '')
  if (!matches) {
   return NextResponse.json(
    { success: false, error: 'Current password is incorrect' },
    { status: 401 },
   )
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  const { error: updateErr } = await supabaseAdmin
   .from('custom_users')
   .update({ password_hash: newHash, updated_at: new Date().toISOString() })
   .eq('id', auth.userId)

  if (updateErr) {
   logger.error('Change password DB update failed', { error: updateErr.message, userId: auth.userId })
   return NextResponse.json({ success: false, error: 'Failed to update password' }, { status: 500 })
  }

  logger.info('User changed own password', { userId: auth.userId })
  return NextResponse.json({ success: true })
 } catch (e) {
  logger.error('Change password failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed to update password' }, { status: 500 })
 }
}
