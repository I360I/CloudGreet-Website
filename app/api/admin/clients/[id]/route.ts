import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { deleteWebhook } from '@/lib/calcom'
import { retellAgentManager } from '@/lib/retell-agent-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Client Detail
 *
 * Per-query try/catch so one missing table or schema mismatch never
 * blanks the whole detail page. Anything that fails contributes to a
 * `warnings` array but the response stays 200/success: true with
 * whatever data we did manage to fetch.
 */
export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
   return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
  }

  const clientId = params.id
  const warnings: string[] = []

  // Business is required - without it there's nothing to show.
  const { data: business, error: businessError } = await supabaseAdmin
   .from('businesses')
   .select('*')
   .eq('id', clientId)
   .maybeSingle()

  if (businessError || !business) {
   logger.error('Admin detail: business missing', {
    clientId, error: businessError?.message,
   })
   return NextResponse.json(
    { error: businessError?.message || 'Client not found' },
    { status: businessError ? 500 : 404 },
   )
  }

  // Self-heal: if this business has a Cal.com API key but no booking
  // webhook registered, fire the registration in the background. Means
  // admins never have to click the yellow "Register now" button - just
  // loading the client page auto-fixes it. Fire-and-forget so the page
  // returns immediately even if Cal.com is slow.
  if ((business as any).cal_com_api_key && !(business as any).cal_com_webhook_id) {
   void import('@/lib/calcom-auto-webhook').then(({ ensureCalcomWebhookForBusiness }) =>
    ensureCalcomWebhookForBusiness(clientId)
   ).catch(() => {})
  }

  // Owner - auth lives in custom_users.
  let owner: any = null
  try {
   const { data: ownerRow } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, phone, created_at, last_login')
    .eq('id', business.owner_id)
    .maybeSingle()
   if (ownerRow) {
    owner = {
     id: ownerRow.id,
     email: ownerRow.email,
     name: [ownerRow.first_name, ownerRow.last_name].filter(Boolean).join(' ') || null,
     phone: ownerRow.phone || null,
     created_at: ownerRow.created_at,
     last_login: ownerRow.last_login,
    }
   }
  } catch (e) {
   warnings.push(`owner: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  // Recent calls
  let recentCalls: any[] = []
  let totalCalls = 0
  let answeredCalls = 0
  let missedCalls = 0
  try {
   const { data } = await supabaseAdmin
    .from('calls')
    .select('id, call_id, from_number, to_number, duration, status, recording_url, transcript, created_at, caller_name, call_extractions, call_summary')
    .eq('business_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)
   recentCalls = data || []

   const counts = await Promise.all([
    supabaseAdmin.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', clientId),
    supabaseAdmin.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', clientId).eq('status', 'answered'),
    supabaseAdmin.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', clientId).eq('status', 'missed'),
   ])
   totalCalls = counts[0].count || 0
   answeredCalls = counts[1].count || 0
   missedCalls = counts[2].count || 0
  } catch (e) {
   warnings.push(`calls: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  // Recent appointments
  let recentAppointments: any[] = []
  let totalAppointments = 0
  let completedAppointments = 0
  let totalRevenue = 0
  try {
   const { data } = await supabaseAdmin
    .from('appointments')
    .select('id, customer_name, customer_phone, service_type, scheduled_date, status, estimated_value, actual_value')
    .eq('business_id', clientId)
    .order('scheduled_date', { ascending: false })
    .limit(20)
   recentAppointments = data || []

   const apptCounts = await Promise.all([
    supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', clientId),
    supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', clientId).eq('status', 'completed'),
   ])
   totalAppointments = apptCounts[0].count || 0
   completedAppointments = apptCounts[1].count || 0

   const { data: rev } = await supabaseAdmin
    .from('appointments')
    .select('estimated_value, actual_value')
    .eq('business_id', clientId)
   totalRevenue = (rev || []).reduce((sum, apt) => {
    const v = parseFloat(apt.actual_value?.toString() || '0') || parseFloat(apt.estimated_value?.toString() || '0') || 0
    return sum + v
   }, 0)
  } catch (e) {
   warnings.push(`appointments: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  // AI agent. The ai_agents table is the canonical home, but the admin
  // create-client flow stores retell_agent_id on businesses directly and
  // doesn't always seed an ai_agents row. Fall back to businesses so a
  // client with a Retell agent attached doesn't show as "not connected".
  let aiAgent: any = null
  try {
   const { data } = await supabaseAdmin
    .from('ai_agents')
    .select('id, agent_name, status, retell_agent_id, phone_number, created_at')
    .eq('business_id', clientId)
    .maybeSingle()
   aiAgent = data || null
  } catch (e) {
   // ai_agents may not exist; this is fine.
  }
  if (!aiAgent && (business as any).retell_agent_id) {
   aiAgent = {
    id: `business:${clientId}`,
    agent_name: 'Retell agent',
    status: 'connected',
    retell_agent_id: (business as any).retell_agent_id,
    phone_number: null,
    created_at: business.created_at ?? null,
   }
  }

  // The provisioned Retell phone is stored in phone_numbers (provider='retell').
  // ai_agents.phone_number is the legacy location and isn't always populated,
  // so phone_numbers is the authoritative source. We surface both so the UI
  // can offer a single editable field.
  let retellPhone: string | null = null
  try {
   const { data } = await supabaseAdmin
    .from('phone_numbers')
    .select('phone_number')
    .eq('business_id', clientId)
    .eq('provider', 'retell')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
   retellPhone = data?.phone_number || aiAgent?.phone_number || null
  } catch (e) {
   retellPhone = aiAgent?.phone_number || null
  }
  if (aiAgent && !aiAgent.phone_number && retellPhone) {
   aiAgent.phone_number = retellPhone
  }

  // Resolve the assigned rep (if any) so the admin UI can show their
  // name + email next to the dropdown.
  let assignedRep: { id: string; name: string | null; email: string | null } | null = null
  if ((business as any).rep_id) {
   try {
    const { data: r } = await supabaseAdmin
     .from('custom_users')
     .select('id, name, first_name, last_name, email')
     .eq('id', (business as any).rep_id)
     .maybeSingle()
    if (r) {
     assignedRep = {
      id: r.id,
      name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
      email: r.email || null,
     }
    }
   } catch { /* non-fatal */ }
  }

  return NextResponse.json({
   success: true,
   client: { ...business, owner, assigned_rep: assignedRep },
   activity: {
    calls: { total: totalCalls, answered: answeredCalls, missed: missedCalls, recent: recentCalls },
    appointments: { total: totalAppointments, completed: completedAppointments, recent: recentAppointments },
    revenue: { total: Math.round(totalRevenue * 100) / 100 },
   },
   aiAgent,
   retellPhone,
   warnings: warnings.length ? warnings : undefined,
  })
 } catch (error) {
  logger.error('Failed to fetch client detail', {
   error: error instanceof Error ? error.message : 'Unknown error',
   clientId: params.id,
  })
  return NextResponse.json(
   { error: error instanceof Error ? error.message : 'Failed to fetch client details' },
   { status: 500 },
  )
 }
}

/**
 * PATCH - admin can edit business profile + status fields without
 * routing through the client-side update flow. Whitelist for safety.
 */
export async function PATCH(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const ALLOWED: Record<string, true> = {
   business_name: true,
   business_type: true,
   email: true,
   phone_number: true,
   subscription_status: true,
   account_status: true,
   onboarding_completed: true,
   greeting_message: true,
   ai_tone: true,
   services: true,
   voice_id: true,
   rep_id: true,
   monthly_price_cents: true,
   setup_fee_cents: true,
  }
  const AGENT_TUNING_FIELDS = new Set(['greeting_message', 'voice_id'])
  const update: Record<string, any> = {}
  for (const k of Object.keys(body)) {
   if (ALLOWED[k]) update[k] = body[k]
  }

  // Validate rep_id: must be null or a real sales rep id.
  if ('rep_id' in update) {
   if (update.rep_id === null || update.rep_id === '') {
    update.rep_id = null
   } else {
    const { data: rep } = await supabaseAdmin
     .from('sales_reps')
     .select('id')
     .eq('id', update.rep_id)
     .maybeSingle()
    if (!rep) {
     return NextResponse.json({ error: 'rep_id is not a valid sales rep' }, { status: 400 })
    }
   }
  }

  if (Object.keys(update).length === 0) {
   return NextResponse.json({ error: 'No editable fields' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
   .from('businesses')
   .update(update)
   .eq('id', params.id)
   .select('*')
   .maybeSingle()

  if (error) {
   return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If anything that affects the live Retell agent changed, push it to Retell.
  // We swallow the error onto a warning so the DB save isn't lost - admin
  // sees the warning and can retry the agent push.
  let agentSyncWarning: string | null = null
  const tunedFields = Object.keys(update).filter((k) => AGENT_TUNING_FIELDS.has(k))
  if (tunedFields.length > 0) {
   try {
    await retellAgentManager().updateBusinessAgent(params.id, {
     greetingMessage: typeof update.greeting_message === 'string' ? update.greeting_message : undefined,
     voiceId: typeof update.voice_id === 'string' ? update.voice_id : undefined,
    })
   } catch (syncErr) {
    agentSyncWarning = syncErr instanceof Error ? syncErr.message : 'Failed to sync to Retell'
    logger.warn('Retell agent sync after PATCH failed', {
     businessId: params.id, error: agentSyncWarning,
    })
   }
  }

  return NextResponse.json({
   success: true,
   client: data,
   agent_synced: tunedFields.length > 0 && !agentSyncWarning,
   agent_sync_warning: agentSyncWarning,
  })
 } catch (e) {
  logger.error('Admin client PATCH failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
 }
}

/**
 * Admin Delete Client - hard delete a business + owner user.
 */
export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } },
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

  if (business.cal_com_api_key && business.cal_com_webhook_id) {
   await deleteWebhook(business.cal_com_api_key, business.cal_com_webhook_id)
  }

  const childTables = [
   "calls", "appointments", "phone_numbers", "sms_messages",
   "messages", "notes", "tags", "notifications",
   "ai_agents", "knowledge_base", "knowledge_articles",
   "billing_records", "subscription_events", "audit_logs",
  ]
  const stepErrors: string[] = []
  const isMissingTable = (err: any) =>
   err?.code === "42P01" ||
   err?.code === "PGRST205" ||
   /Could not find the table|does not exist|schema cache/i.test(err?.message || "")
  for (const table of childTables) {
   const { error } = await supabaseAdmin.from(table).delete().eq("business_id", clientId)
   if (error && !isMissingTable(error)) {
    stepErrors.push(`${table}: ${error.message}`)
   }
  }

  const { error: uByBizErr } = await supabaseAdmin
   .from("custom_users").delete().eq("business_id", clientId)
  if (uByBizErr && !isMissingTable(uByBizErr)) {
   stepErrors.push(`custom_users (by business_id): ${uByBizErr.message}`)
  }
  if (business.owner_id) {
   const { error: uByOwnerErr } = await supabaseAdmin
    .from("custom_users").delete().eq("id", business.owner_id)
   if (uByOwnerErr && uByOwnerErr.code !== "PGRST116" && !isMissingTable(uByOwnerErr)) {
    stepErrors.push(`custom_users (by owner_id): ${uByOwnerErr.message}`)
   }
  }

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
   clientId,
   businessName: business.business_name,
   stepErrorCount: stepErrors.length,
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
