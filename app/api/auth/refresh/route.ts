import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { JWTManager } from '@/lib/jwt-manager'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/refresh
 *
 * Re-reads the signed-in user from the database and reissues their JWT
 * with whatever business_id is currently linked. Used by the dashboard
 * to recover from "Auth succeeded but no businessId in token" without
 * forcing the user to sign out and back in (the linkage may have been
 * healed in the DB since the JWT was issued).
 *
 * Same auto-heal as login-simple: if custom_users.business_id is null
 * but a business exists with this user as owner, we link it on the fly.
 */
export async function POST(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
 }

 try {
  const { data: user, error: userErr } = await supabaseAdmin
   .from('custom_users')
   .select('id, email, business_id, role, is_admin')
   .eq('id', auth.userId)
   .maybeSingle()
  if (userErr || !user) {
   return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  let businessId = user.business_id || ''
  if (!businessId && !user.is_admin) {
   const { data: ownedBusiness } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
   if (ownedBusiness?.id) {
    businessId = ownedBusiness.id
    await supabaseAdmin
     .from('custom_users')
     .update({ business_id: ownedBusiness.id, updated_at: new Date().toISOString() })
     .eq('id', user.id)
    logger.info('Auto-healed custom_users.business_id at refresh', {
     userId: user.id, businessId,
    })
   }
  }

  if (!businessId && !user.is_admin) {
   return NextResponse.json({
    success: false,
    error: 'No business linked to this account.',
   }, { status: 403 })
  }

  const role = user.role || (user.is_admin ? 'admin' : 'owner')
  const newToken = JWTManager.createUserToken(user.id, businessId, user.email, role)

  // Re-set the cookie via /api/auth/set-token contract - same name,
  // same options. We can do it in-line here since we have NextResponse.
  const res = NextResponse.json({ success: true, businessId, refreshed: true })
  res.cookies.set('token', newToken, {
   httpOnly: true,
   secure: process.env.NODE_ENV === 'production',
   sameSite: 'lax',
   maxAge: 60 * 60 * 24 * 7,
   path: '/',
  })
  return res
 } catch (e) {
  logger.error('Token refresh failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 500 })
 }
}
