import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { deleteWebhook } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Client Detail API
 * 
 * GET /api/admin/clients/:id - Get detailed client information with full activity
 */
export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
 // Verify admin authentication
 const adminAuth = await requireAdmin(request)
 if (!adminAuth.success) {
 return NextResponse.json(
 { error: 'Unauthorized - Admin access required' },
 { status: 401 }
 )
 }

 const clientId = params.id

 // Get business details
 const { data: business, error: businessError } = await supabaseAdmin
 .from('businesses')
 .select('*')
 .eq('id', clientId)
 .single()

 if (businessError || !business) {
 return NextResponse.json(
 { error: 'Client not found' },
 { status: 404 }
 )
 }

 // Get owner/user details
 const { data: owner } = await supabaseAdmin
 .from('users')
 .select('id, email, name, phone, created_at, last_login')
 .eq('id', business.owner_id)
 .single()

 // Get recent calls (last 20)
 const { data: recentCalls } = await supabaseAdmin
 .from('calls')
 .select('id, call_id, from_number, to_number, duration, status, recording_url, transcript, created_at, caller_name')
 .eq('business_id', clientId)
 .order('created_at', { ascending: false })
 .limit(20)

 // Get recent appointments (last 20)
 const { data: recentAppointments } = await supabaseAdmin
 .from('appointments')
 .select('id, customer_name, customer_phone, service_type, scheduled_date, status, estimated_value, actual_value')
 .eq('business_id', clientId)
 .order('scheduled_date', { ascending: false })
 .limit(20)

 // Get call statistics
 const { count: totalCalls } = await supabaseAdmin
 .from('calls')
 .select('id', { count: 'exact', head: true })
 .eq('business_id', clientId)

 const { count: answeredCalls } = await supabaseAdmin
 .from('calls')
 .select('id', { count: 'exact', head: true })
 .eq('business_id', clientId)
 .eq('status', 'answered')

 const { count: missedCalls } = await supabaseAdmin
 .from('calls')
 .select('id', { count: 'exact', head: true })
 .eq('business_id', clientId)
 .eq('status', 'missed')

 // Get appointment statistics
 const { count: totalAppointments } = await supabaseAdmin
 .from('appointments')
 .select('id', { count: 'exact', head: true })
 .eq('business_id', clientId)

 const { count: completedAppointments } = await supabaseAdmin
 .from('appointments')
 .select('id', { count: 'exact', head: true })
 .eq('business_id', clientId)
 .eq('status', 'completed')

 // Calculate revenue using SQL aggregation (much more efficient)
 const { data: revenueData } = await supabaseAdmin.rpc('calculate_business_revenue', {
 p_business_id: clientId
 }).catch(async () => {
 // Fallback: If RPC doesn't exist, use optimized SQL query with SUM
 const { data } = await supabaseAdmin
 .from('appointments')
 .select('estimated_value, actual_value')
 .eq('business_id', clientId)
 
 const total = data?.reduce((sum, apt) => {
 return sum + (parseFloat(apt.actual_value?.toString() || '0') || parseFloat(apt.estimated_value?.toString() || '0'))
 }, 0) || 0
 
 return { data: [{ total_revenue: total }] }
 })

 const totalRevenue = revenueData?.[0]?.total_revenue || 0

 // Get AI agent info
 const { data: aiAgent } = await supabaseAdmin
 .from('ai_agents')
 .select('id, agent_name, status, retell_agent_id, phone_number, created_at')
 .eq('business_id', clientId)
 .single()

 return NextResponse.json({
 success: true,
 client: {
 ...business,
 owner
 },
 activity: {
 calls: {
 total: totalCalls || 0,
 answered: answeredCalls || 0,
 missed: missedCalls || 0,
 recent: recentCalls || []
 },
 appointments: {
 total: totalAppointments || 0,
 completed: completedAppointments || 0,
 recent: recentAppointments || []
 },
 revenue: {
 total: Math.round(totalRevenue * 100) / 100
 }
 },
 aiAgent: aiAgent || null
 })

 } catch (error) {
 logger.error('Failed to fetch client detail', {
 error: error instanceof Error ? error.message : 'Unknown error',
 clientId: params.id
 })
 return NextResponse.json(
 { error: 'Failed to fetch client details' },
 { status: 500 }
 )
 }
}


/**
 * Admin Delete Client - hard delete a business + owner user.
 * Sequentially clears child tables (best-effort), drops Cal.com webhook,
 * then removes the business and the owner. Reports any failed step in
 * the response so admin can clean up manually if needed.
 */
export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
   return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
  }

  const clientId = params.id

  const { data: business, error: businessError } = await supabaseAdmin
   .from("businesses")
   .select("id, business_name, owner_id, cal_com_api_key, cal_com_webhook_id")
   .eq("id", clientId)
   .single()

  if (businessError || !business) {
   return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Best-effort Cal.com webhook teardown
  if (business.cal_com_api_key && business.cal_com_webhook_id) {
   await deleteWebhook(business.cal_com_api_key, business.cal_com_webhook_id)
  }

  // Sequentially clear child rows. We dont fail the delete if a table
  // doesnt exist or has zero rows; we collect errors and report them.
  const childTables = [
   "calls", "appointments", "phone_numbers", "sms_messages",
   "messages", "notes", "tags", "notifications",
   "ai_agents", "knowledge_base", "knowledge_articles",
   "billing_records", "subscription_events", "audit_logs",
  ]
  const stepErrors: string[] = []
  for (const table of childTables) {
   const { error } = await supabaseAdmin.from(table).delete().eq("business_id", clientId)
   if (error && error.code !== "42P01") {
    // 42P01 = relation does not exist; ignore
    stepErrors.push(`${table}: ${error.message}`)
   }
  }

  // Delete owner + any user rows still pointing at this business BEFORE the
  // business row, otherwise custom_users.business_id FK blocks the delete.
  const { error: uByBizErr } = await supabaseAdmin
   .from("custom_users").delete().eq("business_id", clientId)
  if (uByBizErr && uByBizErr.code !== "42P01") {
   stepErrors.push(`custom_users (by business_id): ${uByBizErr.message}`)
  }
  if (business.owner_id) {
   const { error: uByOwnerErr } = await supabaseAdmin
    .from("custom_users").delete().eq("id", business.owner_id)
   if (uByOwnerErr && uByOwnerErr.code !== "42P01" && uByOwnerErr.code !== "PGRST116") {
    stepErrors.push(`custom_users (by owner_id): ${uByOwnerErr.message}`)
   }
  }

  // Delete the business itself.
  const { error: bDelErr } = await supabaseAdmin
   .from("businesses").delete().eq("id", clientId)
  if (bDelErr) {
   logger.error("Admin delete client: business row failed", {
    clientId, error: bDelErr.message,
   })
   return NextResponse.json({
    error: "Could not delete business row",
    detail: bDelErr.message,
    stepErrors,
   }, { status: 409 })
  }

  logger.info("Admin deleted client", {
   clientId, businessName: business.business_name, stepErrors,
  })

  return NextResponse.json({
   success: true,
   deletedId: clientId,
   stepErrors: stepErrors.length ? stepErrors : undefined,
  })
 } catch (error) {
  logger.error("Failed to delete client", {
   error: error instanceof Error ? error.message : "Unknown",
   clientId: params.id,
  })
  return NextResponse.json({ error: "Failed to delete client" }, { status: 500 })
 }
}

