import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

// POST /api/sales/email-campaigns/[id]/pause - pause a campaign
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', auth.userId)
      .select('id, status')
      .single()

    if (error || !data) {
      logger.error('Failed to pause campaign', { error: error?.message, campaignId: id })
      return NextResponse.json({ error: 'Failed to pause campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data })
  } catch (err) {
    logger.error('POST /api/sales/email-campaigns/[id]/pause failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
