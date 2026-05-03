import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/clients/[id]/reset-password
 *
 * Generates a fresh temporary password for the business owner, hashes
 * it with bcrypt, and stores it on custom_users. Returns the plaintext
 * password ONCE in the response so the admin can copy + send it
 * securely (Signal, in-person, etc).
 */
export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabaseAdmin
   .from('businesses')
   .select('id, owner_id, business_name')
   .eq('id', params.id)
   .maybeSingle()

  if (!business || !business.owner_id) {
   return NextResponse.json({ error: 'Client or owner not found' }, { status: 404 })
  }

  // 12-char readable password (no l/1, O/0 to avoid copy mistakes).
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const newPassword = Array.from(crypto.randomBytes(12))
   .map((b) => ALPHA[b % ALPHA.length])
   .join('')

  const hash = await bcrypt.hash(newPassword, 10)

  const { error: updateErr } = await supabaseAdmin
   .from('custom_users')
   .update({
    password_hash: hash,
    updated_at: new Date().toISOString(),
   })
   .eq('id', business.owner_id)

  if (updateErr) {
   return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  logger.info('Admin reset client password', {
   clientId: params.id, businessName: business.business_name,
  })

  return NextResponse.json({
   success: true,
   password: newPassword,
   note: 'Shown once — copy now. The hash is stored on the user; the plaintext is not.',
  })
 } catch (e) {
  logger.error('Admin reset-password failed', {
   error: e instanceof Error ? e.message : 'Unknown',
   clientId: params.id,
  })
  return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
 }
}
