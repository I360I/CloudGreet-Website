import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/setter/accept-agreement
 *
 * Stamps custom_users.agreement_accepted_at for the calling setter. The
 * setter shell flashes a one-time confirm screen while this is null and
 * calls this when they check the box + confirm.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'setter') {
    return NextResponse.json({ error: 'Setter role required' }, { status: 401 })
  }
  const { error } = await supabaseAdmin
    .from('custom_users')
    .update({ agreement_accepted_at: new Date().toISOString() })
    .eq('id', auth.userId)
    .is('agreement_accepted_at', null)
  if (error) {
    logger.error('accept-agreement failed', { userId: auth.userId, error: error.message })
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
