import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Returns onboarding state + everything the wizard needs to render the
 * current step (services, phone number, calcom + forwarding status).
 */
export async function GET(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({
    success: false,
    error: !authResult.success
     ? `Auth failed: ${authResult.error || 'unknown'}`
     : 'No businessId in token',
   }, { status: 401 })
  }

  const { data: business, error } = await supabaseAdmin
   .from('businesses')
   .select(`
    id, business_name, business_type, phone_number, services, timezone,
    onboarding_step, onboarding_completed,
    calcom_connected, cal_com_event_type_slug, cal_com_username,
    forwarding_carrier, forwarding_line_type, forwarding_mode, forwarding_verified_at
   `)
   .eq('id', authResult.businessId)
   .single()

  if (error || !business) {
   return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, business })
 } catch (e) {
  logger.error('Onboarding state error', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500 })
 }
}

/**
 * Persists the wizard's step + finalizes onboarding.
 */
export async function PATCH(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const allowed: Record<string, any> = {}
  if (typeof body.onboarding_step === 'string') allowed.onboarding_step = body.onboarding_step
  if (typeof body.onboarding_completed === 'boolean') allowed.onboarding_completed = body.onboarding_completed

  if (Object.keys(allowed).length === 0) {
   return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
   .from('businesses')
   .update({ ...allowed, updated_at: new Date().toISOString() })
   .eq('id', authResult.businessId)

  if (error) {
   return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}
