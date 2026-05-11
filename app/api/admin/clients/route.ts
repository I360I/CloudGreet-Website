import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { syncBusinessFromLead } from '@/lib/business-sync'

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
 const status = searchParams.get('status')
 const limit = parseInt(searchParams.get('limit') || '50')
 const offset = parseInt(searchParams.get('offset') || '0')
 const sortBy = searchParams.get('sortBy') || 'created_at'
 const sortOrder = searchParams.get('sortOrder') || 'desc'

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

 // Minimal version: just return the businesses list. Stats aggregation is
 // handled per-client in /api/admin/clients/[id] for now.
 return NextResponse.json({
 success: true,
 clients: businesses || [],
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
 * POST /api/admin/clients - admin-only.
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

  // 3) link - if this fails the business exists with no usable owner,
  // and that owner can't log in (their JWT will have businessId='').
  // Roll the whole creation back so the admin doesn't end up with a
  // half-built tenant they have to clean up by hand.
  const { error: linkErr } = await supabaseAdmin
   .from('custom_users')
   .update({ business_id: business.id })
   .eq('id', user.id)
  if (linkErr) {
   await supabaseAdmin.from('businesses').delete().eq('id', business.id)
   await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
   logger.error('Failed to link user to business - rolled back', {
    error: linkErr.message, businessId: business.id, userId: user.id,
   })
   return NextResponse.json({
    error: 'Failed to finalize client creation. Try again.',
    detail: linkErr.message,
   }, { status: 500 })
  }

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

  // 5) Pull website + address from the originating lead row if one
  // exists. Lead-promotion paths populate the lead but not the
  // business, so without this every newly-created client shows up
  // with a blank website in admin/sales/dashboard.
  void syncBusinessFromLead({
   businessId: business.id,
   phone: phone_number || null,
   businessName: business_name,
  })

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
