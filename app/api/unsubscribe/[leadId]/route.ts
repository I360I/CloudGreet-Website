import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { leadId: string } }

// POST /api/unsubscribe/[leadId] - marks lead as unsubscribed (no auth, public endpoint)
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { leadId } = params

  if (!leadId || !/^[0-9a-f-]{36}$/.test(leadId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  await supabaseAdmin
    .from('email_leads')
    .update({ status: 'unsubscribed', next_follow_up_at: null })
    .eq('id', leadId)
    .neq('status', 'unsubscribed')

  return NextResponse.json({ success: true })
}
