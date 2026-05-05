import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { retellAgentManager } from '@/lib/retell-agent-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/clients/[id]/agent
 *
 * Returns the agent config the rep is allowed to edit for one of
 * their clients. Auth: caller must own the business (businesses.rep_id).
 * Falls back gracefully when the agent_edge_cases column hasn't
 * been added yet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let migrationNeeded: string | null = null

  let { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select(`
      id, business_name, business_type, phone_number, email,
      greeting_message, voice_id, voice_speed,
      retell_agent_id, agent_edge_cases,
      subscription_status, account_status,
      calcom_connected, cal_com_username, cal_com_event_type_slug, cal_com_event_type_id,
      created_at
    `)
    .eq('id', params.id)
    .eq('rep_id', auth.userId)
    .maybeSingle()

  if (error && /column.*does not exist|could not find/i.test(error.message)) {
    migrationNeeded = 'agent-edge-cases'
    const fallback = await supabaseAdmin
      .from('businesses')
      .select(`
        id, business_name, business_type, phone_number, email,
        greeting_message, voice_id, voice_speed,
        retell_agent_id,
        subscription_status, account_status,
        created_at
      `)
      .eq('id', params.id)
      .eq('rep_id', auth.userId)
      .maybeSingle()
    business = fallback.data as any
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ error: 'Not your client' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    business,
    edge_cases: Array.isArray((business as any).agent_edge_cases)
      ? (business as any).agent_edge_cases
      : [],
    ...(migrationNeeded ? { migration_needed: migrationNeeded } : {}),
  })
}

/**
 * PATCH /api/sales/clients/[id]/agent
 *   { greeting_message?, voice_id?, voice_speed? }
 *
 * Rep-side update path for the simple agent fields. Mirrors the
 * client-side /api/businesses/update flow but auths the rep against
 * businesses.rep_id. Pushes to Retell after the DB write.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  // Verify rep owns the business.
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, business_type, rep_id')
    .eq('id', params.id)
    .eq('rep_id', auth.userId)
    .maybeSingle()
  if (!business) {
    return NextResponse.json({ error: 'Not your client' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({} as any))
  const update: Record<string, any> = {}
  const agentPatch: any = {
    businessId: business.id,
    businessType: business.business_type || 'service_business',
    phoneNumber: '',
    address: '',
    tone: 'professional' as const,
    services: [],
    serviceAreas: [],
    businessHours: {},
  }

  if (typeof body.greeting_message === 'string') {
    const g = body.greeting_message.trim().slice(0, 500)
    update.greeting_message = g
    agentPatch.greetingMessage = g
  }
  if (typeof body.voice_id === 'string' && body.voice_id) {
    update.voice_id = body.voice_id
    agentPatch.voiceId = body.voice_id
  }
  if (body.voice_speed !== undefined) {
    const n = Number(body.voice_speed)
    if (!Number.isFinite(n) || n < 0.5 || n > 2.0) {
      return NextResponse.json({ error: 'voice_speed must be between 0.5 and 2.0' }, { status: 400 })
    }
    update.voice_speed = n
    agentPatch.voiceSpeed = n
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('businesses')
    .update(update)
    .eq('id', business.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Push to Retell. Best-effort — DB save already landed, surface the
  // sync issue in the response so the rep can retry.
  let agentSynced = false
  let agentSyncError: string | null = null
  try {
    await retellAgentManager().updateBusinessAgent(business.id, agentPatch)
    agentSynced = true
  } catch (e) {
    agentSyncError = e instanceof Error ? e.message : 'Unknown'
    logger.warn('Rep agent edit Retell sync failed', {
      repId: auth.userId, businessId: business.id, error: agentSyncError,
    })
  }

  return NextResponse.json({
    success: true,
    agent_synced: agentSynced,
    ...(agentSyncError ? { agent_sync_error: agentSyncError } : {}),
  })
}
