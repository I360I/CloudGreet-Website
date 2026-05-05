import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'
import bcrypt from 'bcryptjs'
import { enforceRequestSizeLimit } from '@/lib/request-limits'
import { authRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Simple Login Endpoint
 * Authenticates user and returns JWT token
 */
export async function POST(request: NextRequest) {
 try {
 // Apply rate limiting (10 auth attempts per 15 minutes)
 const rateLimitResult = await authRateLimit(request)
 if (!rateLimitResult.allowed) {
 return NextResponse.json(
 { 
 success: false, 
 message: 'Too many login attempts. Please try again later.',
 retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
 },
 { 
 status: 429,
 headers: {
 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
 'X-RateLimit-Limit': '10',
 'X-RateLimit-Remaining': '0',
 'X-RateLimit-Reset': String(rateLimitResult.resetTime)
 }
 }
 )
 }

 // Enforce request size limit (1MB)
 const sizeCheck = enforceRequestSizeLimit(request)
 if ('error' in sizeCheck) {
 return sizeCheck.error
 }

 let body
 try {
 body = await request.json()
 } catch (jsonError) {
 return NextResponse.json(
 { success: false, message: 'Invalid JSON in request body' },
 { status: 400 }
 )
 }
 const { email, password } = body || {}

 // Validate required fields
 if (!email || !password) {
 return NextResponse.json(
 { success: false, message: 'Email and password are required' },
 { status: 400 }
 )
 }

 // Find user
 const { data: user, error: userError } = await supabaseAdmin
 .from('custom_users')
 .select('id, email, password_hash, business_id, is_active, first_name, last_name, role, job_title, is_admin')
 .eq('email', email.toLowerCase())
 .single()

 if (userError || !user) {
 return NextResponse.json(
 { success: false, message: 'Invalid email or password' },
 { status: 401 }
 )
 }

 // Check if user is active
 if (!user.is_active) {
 return NextResponse.json(
 { success: false, message: 'Account is disabled' },
 { status: 403 }
 )
 }

 // Verify password
 const isValidPassword = await bcrypt.compare(password, user.password_hash)
 if (!isValidPassword) {
 return NextResponse.json(
 { success: false, message: 'Invalid email or password' },
 { status: 401 }
 )
 }

 // Get business info
 let business = null
 if (user.business_id) {
 const { data: businessData } = await supabaseAdmin
 .from('businesses')
 .select('id, business_name, business_type')
 .eq('id', user.business_id)
 .single()

 business = businessData
 }

 // Auto-heal: if custom_users.business_id is missing/stale but a business
 // exists with this user as owner_id, link it on the fly. This was a
 // recurring foot-gun - admin-create flows that didn't complete the link
 // step left users unable to log in. Better to recover than 403.
 // Skip auto-heal for admins and sales reps - they legitimately don't
 // have a business_id.
 if (!business && !user.is_admin && user.role !== 'sales') {
 const { data: ownedBusiness } = await supabaseAdmin
  .from('businesses')
  .select('id, business_name, business_type')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle()
 if (ownedBusiness) {
  business = ownedBusiness
  user.business_id = ownedBusiness.id
  await supabaseAdmin
   .from('custom_users')
   .update({ business_id: ownedBusiness.id, updated_at: new Date().toISOString() })
   .eq('id', user.id)
  logger.info('Auto-healed custom_users.business_id at login', {
   userId: user.id, businessId: ownedBusiness.id,
  })
 }
 }

 // Non-admin users must have a real business attached. If their business was
 // deleted (or was never set), refuse login here - issuing a token without a
 // businessId guarantees an immediate redirect loop on the dashboard.
 if (!user.is_admin && user.role !== 'sales' && !business) {
 // Surface enough state for a quick diagnosis instead of a generic
 // "contact support". Most likely one of:
 //  · custom_users.business_id is stale (points at a deleted business)
 //  · businesses table has no row with owner_id = user.id
 //  · the row exists but under a different owner_id (linkage broke)
 const { count: ownedCount } = await supabaseAdmin
   .from('businesses')
   .select('id', { count: 'exact', head: true })
   .eq('owner_id', user.id)
 const detail =
   user.business_id
     ? `Your account points at business ${user.business_id} but no row exists there. ${ownedCount ?? 0} businesses are owned by your user id.`
     : `Your user record has no business_id, and ${ownedCount ?? 0} businesses are owned by your user id. Admin needs to link one in /admin/clients.`
 logger.warn('Login blocked: no business attached', {
   userId: user.id, email: user.email, business_id: user.business_id, ownedCount,
 })
 return NextResponse.json(
 { success: false, message: detail },
 { status: 403 }
 )
 }

 // Update last login
 await supabaseAdmin
 .from('custom_users')
 .update({ last_login: new Date().toISOString() })
 .eq('id', user.id)

 // Generate JWT token
 const resolvedRole =
 user.role ||
 (user.is_admin ? 'admin' : user.business_id ? 'owner' : 'user')

 const token = JWTManager.createUserToken(
 user.id,
 user.business_id || '',
 user.email,
 resolvedRole
 )

 return NextResponse.json({
 success: true,
 data: {
 token,
 user: {
 id: user.id,
 email: user.email,
 first_name: user.first_name,
 last_name: user.last_name,
 business_id: user.business_id,
 role: resolvedRole,
 job_title: user.job_title
 },
 business: business ? {
 id: business.id,
 business_name: business.business_name,
 business_type: business.business_type
 } : null
 }
 })
 } catch (error) {
 logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' })
 return NextResponse.json(
 { success: false, message: 'Login failed. Please try again.' },
 { status: 500 }
 )
 }
}

