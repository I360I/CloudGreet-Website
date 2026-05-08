import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/payment/close-info?close=<close_id>
 *
 * Public endpoint - used by /payment/success to personalize the
 * confirmation card with the prospect's business name. Only returns
 * data for closes that have already paid; pre-payment closes return
 * 404 even if the UUID is correct, so a guessed-UUID attacker can't
 * map a close ID to a business name during the deal pipeline.
 */
export async function GET(request: NextRequest) {
  const closeId = new URL(request.url).searchParams.get('close')
  if (!closeId) return NextResponse.json({ error: 'close required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('closes')
    .select('prospect_business_name, status')
    .eq('id', closeId)
    .eq('status', 'paid')
    .maybeSingle()

  if (!data) return NextResponse.json({ success: false }, { status: 404 })

  return NextResponse.json({
    success: true,
    business_name: data.prospect_business_name || null,
  })
}
