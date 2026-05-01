import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Client Management API
 * 
 * GET: List all clients (businesses) with activity summary
 * GET /:id: Get detailed client information with full activity
 */
export async function GET(request: NextRequest) {
 try {
 // Verify admin authentication
 const adminAuth = await requireAdmin(request)
 if (!adminAuth.success) {
 return NextResponse.json(
 { error: 'Unauthorized - Admin access required' },
 { status: 401 }
 )
 }

 // Return list of all clients
 return await getClientsList(request)

 } catch (error) {
 logger.error('Admin clients GET failed', {
 error: error instanceof Error ? error.message : 'Unknown error'
 })
 return NextResponse.json(
 { error: 'Failed to fetch clients' },
 { status: 500 }
 )
 }
}

/**
 * Get list of all clients with activity summary
 */
async function getClientsList(request: NextRequest) {
 try {
 const { searchParams } = new URL(request.url)
 const search = searchParams.get('search')
 const status = searchParams.get('status') // 'active', 'inactive', 'suspended', 'cancelled'
 const limit = parseInt(searchParams.get('limit') || '50')
 const offset = parseInt(searchParams.get('offset') || '0')
 const sortBy = searchParams.get('sortBy') || 'created_at'
 const sortOrder = searchParams.get('sortOrder') || 'desc'

 // Build query for businesses
 let query = supabaseAdmin
 .from('businesses')
 .select('id, business_name, email, phone_number, business_type, subscription_status, account_status, onboarding_completed, created_at, updated_at', { count: 'exact' })

 // Apply filters
 if (status) {
 if (status === 'active') {
 query = query.eq('subscription_status', 'active')
 } else {
 query = query.eq('account_status', status)
 }
 }
 if (search) {
 query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`)
 }

 // Apply sorting
 query = query.order(sortBy, { ascending: sortOrder === 'asc' })

 // Apply pagination
 query = query.range(offset, offset + limit - 1)

 const { data: businesses, error, count } = await query

 if (error) {
 logger.error('Failed to fetch clients', { error: error.message })
 return NextResponse.json(
 { error: 'Failed to fetch clients' },
 { status: 500 }
 )
 }

 // Optimize: Use SQL aggregation to get all stats in one query per business
 // This eliminates N+1 query pattern
 const businessIds = (businesses || []).map(b => b.id)
 
 if (businessIds.length === 0) {
 return NextResponse.json({
 success: true,
 clients: [],
 statistics: {
 total: count || 0,
 active: 0,
 inactive: 0,
 suspended: 0,
 cancelled: 0
 },
 pagination: {
 total: count || 0,
 limit,
 offset,
 hasMore: false
 }
 })
 }

 // Batch fetch call stats using SQL aggregation
 const { data: callStats } = await supabaseAdmin.rpc('get_business_call_stats', {
 business_ids: businessIds
 }).catch(async () => {
 // Fallback: If RPC doesn't exist, use optimized batch queries
 const { data: allCalls } = await supabaseAdmin
 .from('calls')
 .select('business_id, created_at')
 .in('business_id', businessIds)
 .order('created_at', { ascending: false })

 // Group by business_id and get counts and latest dates
 const statsMap = new Map<string, { count: number; lastCall: string | null }>()
 businessIds.forEach(id => statsMap.set(id, { count: 0, lastCall: null }))
 
 // Process calls to get counts and latest dates per business
 const callMap = new Map<string, string[]>()
 allCalls?.forEach(call => {
 if (!callMap.has(call.business_id)) {
 callMap.set(call.business_id, [])
 }
 callMap.get(call.business_id)!.push(call.created_at)
 })
 
 // Update stats with correct counts and latest dates
 callMap.forEach((dates, businessId) => {
 const stats = statsMap.get(businessId)
 if (stats) {
 stats.count = dates.length
 // Get latest date (dates are already sorted DESC from query)
 stats.lastCall = dates[0] || null
 }
 })
 
 return { data: Array.from(statsMap.entries()).map(([business_id, stats]) => ({
 business_id,
 call_count: stats.count,
 last_call_date: stats.lastCall
 })) }
 })

 // Batch fetch appointment stats using SQL aggregation
 const { data: appointmentStats } = await supabaseAdmin.rpc('get_business_appointment_stats', {
 business_ids: businessIds
 }).catch(async () => {
 // Fallback: If RPC doesn't exist, use optimized batch queries
 const { data: allAppointments } = await supabaseAdmin
 .from('appointments')
 .select('business_id, scheduled_date')
 .in('business_id', businessIds)
 .order('scheduled_date', { ascending: false })

 // Group by business_id and get counts and latest dates
 const statsMap = new Map<string, { count: number; lastAppointment: string | null }>()
 businessIds.forEach(id => statsMap.set(id, { count: 0, lastAppointment: null }))
 
 // Process appointments to get counts and latest dates per business
 const appointmentMap = new Map<string, string[]>()
 allAppointments?.forEach(apt => {
 if (!appointmentMap.has(apt.business_id)) {
 appointmentMap.set(apt.business_id, [])
 }
 if (apt.scheduled_date) {
 appointmentMap.get(apt.business_id)!.push(apt.scheduled_date)
 }
 })
 
 // Update stats with correct counts and latest dates
 appointmentMap.forEach((dates, businessId) => {
 const stats = statsMap.get(businessId)
 if (stats) {
 stats.count = dates.length
 // Get latest date (dates are already sorted DESC from query)
 stats.lastAppointment = dates[0] || null
 }
 })
 
 return { data: Array.from(statsMap.entries()).map(([business_id, stats]) => ({
 business_id,
 appointment_count: stats.count,
 last_appointment_date: stats.lastAppointment
 })) }
 })

 // Create lookup maps for O(1) access
 const callStatsMap = new Map(
 (callStats || []).map((stat: any) => [
 stat.business_id,
 { count: stat.call_count || 0, lastCall: stat.last_call_date || null }
 ])
 )
 const appointmentStatsMap = new Map(
 (appointmentStats || []).map((stat: any) => [
 stat.business_id,
 { count: stat.appointment_count || 0, lastAppointment: stat.last_appointment_date || null }
 ])
 )

 // Combine business data with stats
 const clientsWithActivity = (businesses || []).map((business) => {
 const callStats = callStatsMap.get(business.id) || { count: 0, lastCall: null }
 const appointmentStats = appointmentStatsMap.get(business.id) || { count: 0, lastAppointment: null }

 return {
 ...business,
 totalCalls: callStats.count,
 totalAppointments: appointmentStats.count,
 lastCallDate: callStats.lastCall,
 lastAppointmentDate: appointmentStats.lastAppointment
 }
 })

 // Get statistics
 const { data: allBusinesses } = await supabaseAdmin
 .from('businesses')
 .select('subscription_status, account_status')

 const statistics = {
 total: count || 0,
 active: allBusinesses?.filter(b => b.subscription_status === 'active').length || 0,
 inactive: allBusinesses?.filter(b => b.subscription_status === 'inactive').length || 0,
 suspended: allBusinesses?.filter(b => b.account_status === 'suspended').length || 0,
 cancelled: allBusinesses?.filter(b => b.account_status === 'cancelled').length || 0
 }

 return NextResponse.json({
 success: true,
 clients: clientsWithActivity,
 statistics,
 pagination: {
 total: count || 0,
 limit,
 offset,
 hasMore: (count || 0) > offset + limit
 }
 })

 } catch (error) {
 logger.error('Failed to fetch clients list', {
 error: error instanceof Error ? error.message : 'Unknown error'
 })
 return NextResponse.json(
 { error: 'Failed to fetch clients' },
 { status: 500 }
 )
 }
}


/**
 * POST /api/admin/clients — admin-only.
 * Creates: custom_users (owner) + businesses + phone_numbers (Retell, optional).
 *
 * Order matters because businesses.owner_id is NOT NULL:
 *   1) insert custom_users (no business_id yet)
 *   2) insert businesses (owner_id = user.id)
 *   3) update custom_users.business_id
 *   4) insert phone_numbers (provider='retell') if a Retell number was supplied
 */
export async function POST(request: NextRequest) {
 try {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
   return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
   business_name, business_type, email, password,
   first_name, last_name, phone_number,
   retell_agent_id, retell_phone_number,
  } = body as Record<string, string | undefined>

  if (!business_name || !business_type || !email || !password) {
   return NextResponse.json(
    { error: 'business_name, business_type, email, and password are required' },
    { status: 400 }
   )
  }

  const { data: existing } = await supabaseAdmin
   .from('custom_users')
   .select('id')
   .eq('email', email)
   .maybeSingle()
  if (existing) {
   return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const fName = first_name || (business_name.split(' ')[0] || 'Owner')
  const lName = last_name || 'User'
  const fullName = `${fName} ${lName}`.trim()

  // 1) user
  const { data: user, error: uErr } = await supabaseAdmin
   .from('custom_users')
   .insert({
    email, password_hash,
    name: fullName, first_name: fName, last_name: lName,
    role: 'owner', is_admin: false, is_active: true, status: 'active',
   })
   .select('id, email')
   .single()

  if (uErr || !user) {
   logger.error('Failed to create owner user', { error: uErr?.message })
   return NextResponse.json({ error: 'Failed to create user', detail: uErr?.message }, { status: 500 })
  }

  // 2) business
  const businessInsert: Record<string, unknown> = {
   owner_id: user.id,
   business_name, business_type, email,
   phone_number: phone_number || null,
   subscription_status: 'pending',
   account_status: 'active',
   onboarding_completed: false,
  }
  if (retell_agent_id) businessInsert.retell_agent_id = retell_agent_id

  const { data: business, error: bErr } = await supabaseAdmin
   .from('businesses')
   .insert(businessInsert)
   .select('id, business_name, email')
   .single()

  if (bErr || !business) {
   await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
   logger.error('Failed to create business, rolled back user', { error: bErr?.message })
   return NextResponse.json({ error: 'Failed to create business', detail: bErr?.message }, { status: 500 })
  }

  // 3) link
  await supabaseAdmin.from('custom_users').update({ business_id: business.id }).eq('id', user.id)

  // 4) Retell phone number → phone_numbers table
  if (retell_phone_number) {
   const { error: pErr } = await supabaseAdmin.from('phone_numbers').insert({
    business_id: business.id,
    phone_number: retell_phone_number,
    provider: 'retell',
    status: 'active',
   })
   if (pErr) {
    logger.warn('phone_numbers insert failed (non-fatal)', { error: pErr.message })
   }
  }

  return NextResponse.json({
   success: true,
   business,
   user: { id: user.id, email: user.email, business_id: business.id },
  }, { status: 201 })
 } catch (error) {
  logger.error('Admin clients POST failed', { error: error instanceof Error ? error.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
 }
}
