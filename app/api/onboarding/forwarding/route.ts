import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Persists the contractor's chosen carrier / line type / forwarding mode.
 */
export async function POST(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const carrier: string = String(body.carrier || '').slice(0, 50)
  const lineType: string = String(body.lineType || '').slice(0, 50)
  const mode: string = String(body.mode || '').slice(0, 50)

  if (!carrier || !lineType || !mode) {
   return NextResponse.json({ success: false, error: 'carrier, lineType, mode are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
   .from('businesses')
   .update({
    forwarding_carrier: carrier,
    forwarding_line_type: lineType,
    forwarding_mode: mode,
    updated_at: new Date().toISOString(),
   })
   .eq('id', authResult.businessId)

  if (error) {
   return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}

/**
 * Polled by the wizard while listening for a verification test call. Returns
 * { verified: true } once we see an inbound call on the business's Retell
 * number that arrived AFTER they hit "Start verification".
 */
export async function GET(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const since = request.nextUrl.searchParams.get('since')
  const sinceIso = since ? new Date(since).toISOString() : new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: calls } = await supabaseAdmin
   .from('calls')
   .select('id, created_at, from_number, status')
   .eq('business_id', authResult.businessId)
   .gte('created_at', sinceIso)
   .order('created_at', { ascending: false })
   .limit(1)

  const verified = !!(calls && calls.length > 0)

  if (verified) {
   await supabaseAdmin
    .from('businesses')
    .update({
     forwarding_verified_at: new Date().toISOString(),
     onboarding_step: 'done',
     onboarding_completed: true,
     updated_at: new Date().toISOString(),
    })
    .eq('id', authResult.businessId)
  }

  return NextResponse.json({
   success: true,
   verified,
   call: calls?.[0] || null,
  })
 } catch (e) {
  logger.error('Forwarding verify error', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}
