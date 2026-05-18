import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/calls/history
 * 
 * Fetch call history for a business
 * 
 * Query parameters:
 * - businessId: UUID of the business (required)
 * - limit: Number of calls to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - status: Filter by call status (optional)
 * 
 * Returns:
 * {
 * calls: Array<{
 * id: string
 * call_id: string
 * from_number: string
 * to_number: string
 * status: string
 * duration: number
 * recording_url: string
 * transcript: string
 * created_at: string
 * caller_name?: string
 * }>
 * total: number
 * limit: number
 * offset: number
 * }
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
 try {
 // Verify authentication. The businessId is sourced ONLY from the JWT -
 // never from query params or the body. Trusting a client-supplied
 // businessId here was the cross-tenant leak vector.
 const authResult = await requireAuth(request)
 if (!authResult.success || !authResult.businessId) {
 return NextResponse.json(
 { error: 'Unauthorized' },
 { status: 401 }
 )
 }
 const businessId = authResult.businessId

 const { searchParams } = new URL(request.url)
 const limit = parseInt(searchParams.get('limit') || '50', 10)
 const offset = parseInt(searchParams.get('offset') || '0', 10)
 const statusFilter = searchParams.get('status')

 // Build query
 let query = supabaseAdmin
 .from('calls')
 .select('id, call_id, retell_call_id, from_number, to_number, status, duration, recording_url, transcript, created_at, caller_name, call_extractions, call_summary, outcome, sentiment', { count: 'exact' })
 .eq('business_id', businessId)
 .order('created_at', { ascending: false })
 .range(offset, offset + limit - 1)

 // Apply status filter if provided
 if (statusFilter) {
 query = query.eq('status', statusFilter)
 }

 const { data: calls, error: callsError, count } = await query

 if (callsError) {
 logger.error('Error fetching call history', { businessId, error: callsError?.message || JSON.stringify(callsError) })
 return NextResponse.json(
 { error: 'Failed to fetch call history' },
 { status: 500 }
 )
 }

 // Derive a real outcome for rows that don't have one stored yet.
 // Calls that booked an appointment have a matching row in appointments
 // keyed by retell_call_id - if one exists, the call is 'booked' (or
 // 'emergency' if the appointment was flagged). This rescues legacy
 // rows from before the webhook started stamping calls.outcome and
 // keeps the calls list accurate even if a webhook event was lost.
 const callList = (calls || []) as any[]
 const needsOutcomeDerivation = callList.filter((c) => !c.outcome && c.retell_call_id)
 if (needsOutcomeDerivation.length > 0) {
  const retellIds = needsOutcomeDerivation.map((c) => c.retell_call_id)
  const { data: appts } = await supabaseAdmin
   .from('appointments')
   .select('retell_call_id, is_emergency')
   .eq('business_id', businessId)
   .in('retell_call_id', retellIds)
   .not('status', 'in', '(cancelled)')
  const byCallId = new Map<string, { is_emergency: boolean }>()
  for (const a of (appts || []) as any[]) {
   if (a.retell_call_id) byCallId.set(a.retell_call_id, { is_emergency: !!a.is_emergency })
  }
  for (const c of callList) {
   if (c.outcome || !c.retell_call_id) continue
   const a = byCallId.get(c.retell_call_id)
   if (a) c.outcome = a.is_emergency ? 'emergency' : 'booked'
  }
 }

 return NextResponse.json({
 calls: callList,
 total: count || 0,
 limit,
 offset
 })
 } catch (error) {
 logger.error('Error in calls/history endpoint', {
 error: error instanceof Error ? error.message : 'Unknown error'
 })
 return NextResponse.json(
 { error: 'Internal server error' },
 { status: 500 }
 )
 }
}

