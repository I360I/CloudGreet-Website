import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/clients/[id]/reset-login
 *
 * Rep-scoped version of the admin reset-password endpoint. Generates a
 * fresh temporary password for the client's owner account, hashes it,
 * stores it on custom_users, and returns the plaintext ONCE plus the
 * login email + URL so the rep can copy the full login block and send it
 * to a freshly-signed client.
 *
 * The existing password can't be read back (it's bcrypt-hashed), so
 * "copy login info" necessarily mints a new password. Any password the
 * client already had stops working - intended for onboarding a client
 * who hasn't logged in yet.
 *
 * A rep can only do this for businesses they brought in
 * (businesses.rep_id === their userId), same gate as impersonate.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.success || !auth.userId || auth.role !== 'sales') {
      return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
    }

    const { data: business, error: bErr } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, owner_id, rep_id')
      .eq('id', params.id)
      .single()

    if (bErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // A rep can only reset logins for their own clients.
    if (business.rep_id !== auth.userId) {
      return NextResponse.json({ error: 'Not your client' }, { status: 403 })
    }

    if (!business.owner_id) {
      return NextResponse.json({
        error: 'No owner account is linked to this client yet.',
      }, { status: 400 })
    }

    const { data: owner, error: oErr } = await supabaseAdmin
      .from('custom_users')
      .select('id, email')
      .eq('id', business.owner_id)
      .single()

    if (oErr || !owner || !owner.email) {
      return NextResponse.json({ error: 'Owner account not found' }, { status: 404 })
    }

    // Readable 12-char password (no ambiguous chars), same recipe as the
    // admin reset endpoint.
    const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const newPassword = Array.from(crypto.randomBytes(12))
      .map((b) => ALPHA[b % ALPHA.length])
      .join('')

    const hash = await bcrypt.hash(newPassword, 10)

    const { error: updateErr } = await supabaseAdmin
      .from('custom_users')
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', business.owner_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'

    void logComplianceEvent({
      channel: 'onboarding',
      eventType: 'rep_reset_client_login',
      path: `/api/sales/clients/${params.id}/reset-login`,
      tenantId: business.id,
      metadata: {
        rep_id: auth.userId,
        target_user_id: owner.id,
        target_email: owner.email,
        business_id: business.id,
        business_name: business.business_name,
      },
    })

    logger.info('rep reset client login', {
      rep_id: auth.userId, clientId: params.id, businessName: business.business_name,
    })

    return NextResponse.json({
      success: true,
      email: owner.email,
      password: newPassword,
      login_url: `${baseUrl}/login`,
    })
  } catch (e) {
    logger.error('rep reset-login failed', {
      error: e instanceof Error ? e.message : 'Unknown', clientId: params.id,
    })
    return NextResponse.json({ error: 'Failed to reset login' }, { status: 500 })
  }
}
