import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/onboarding/forwarding/override
 *
 * Manual override for the verify-by-test-call step. Flips forwarding_verified_at
 * and onboarding_completed without requiring an actual inbound call to land
 * in our DB. Used when the test call detection mis-fires during a demo or
 * the contractor has already proven forwarding works another way.
 */
export async function POST(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const { error } = await supabaseAdmin
  .from('businesses')
  .update({
   forwarding_verified_at: new Date().toISOString(),
   onboarding_completed: true,
   updated_at: new Date().toISOString(),
  })
  .eq('id', auth.businessId)
 if (error) {
  logger.error('Forwarding override failed', { businessId: auth.businessId, error: error.message })
  return NextResponse.json({ error: error.message }, { status: 500 })
 }
 logger.info('Forwarding manually overridden', { businessId: auth.businessId, userId: auth.userId })
 return NextResponse.json({ success: true })
}
