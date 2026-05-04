import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { retellAgentManager } from '@/lib/retell-agent-manager'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Update Business Settings - Fully Automated Agent Updates
 * 
 * When business settings change, this endpoint:
 * 1. Updates business profile in database
 * 2. Automatically updates Retell AI agent with new settings
 * 3. Updates greeting, hours, services, tone, etc. in real-time
 * 
 * All automated - agent updates immediately!
 */
// Whitelist what the client may write. Anything not on this list is
// silently dropped — keeps a malicious client from flipping
// subscription_status, owner_id, etc.
const ALLOWED_FIELDS = new Set([
  'business_name', 'business_type', 'phone_number', 'website',
  'address', 'city', 'state', 'zip_code', 'services', 'service_areas',
  'business_hours', 'greeting_message', 'voice_id', 'voice_speed',
])

export async function PATCH(request: NextRequest) {
 try {
 const authResult = await requireAuth(request)
 if (!authResult.success || !authResult.userId || !authResult.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const userId = authResult.userId
 // BusinessId from JWT only — never trust a client-supplied id.
 const businessId = authResult.businessId

 const body = await request.json().catch(() => ({}))
 // Drop the businessId field if the client included it, plus anything
 // outside the whitelist.
 const updates: Record<string, unknown> = {}
 for (const [k, v] of Object.entries(body || {})) {
  if (k === 'businessId') continue
  if (ALLOWED_FIELDS.has(k)) updates[k] = v
 }
 if (Object.keys(updates).length === 0) {
  return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
 }

 // Verify business ownership (defense in depth)
 const { data: business, error: businessError } = await supabaseAdmin
 .from('businesses')
 .select('id, owner_id, retell_agent_id, business_name, business_type')
 .eq('id', businessId)
 .eq('owner_id', userId)
 .single()

 if (businessError || !business) {
 return NextResponse.json({ error: 'Business not found or unauthorized' }, { status: 404 })
 }

 // 1. Update business in database
 const { error: updateError } = await supabaseAdmin
 .from('businesses')
 .update({
 ...updates,
 updated_at: new Date().toISOString()
 })
 .eq('id', businessId)

 if (updateError) {
 logger.error('Business update failed', { error: updateError?.message || JSON.stringify(updateError), businessId })
 return NextResponse.json({ error: `Failed to update business: ${updateError.message}` }, { status: 500 })
 }

 // 2. Get updated business data for agent update
 const { data: updatedBusiness } = await supabaseAdmin
 .from('businesses')
 .select('business_name, business_type, services, service_areas, business_hours, greeting_message, greeting, ai_tone, tone, phone_number, phone, website, address, city, state, zip_code, voice_id, voice_speed')
 .eq('id', businessId)
 .single()

 // 3. Always attempt the Retell sync — let the agent manager decide
 //    whether there's an agent to update. The previous gate
 //    (`business.retell_agent_id`) skipped clients whose agent id
 //    lives only in ai_agents, returning success without ever calling
 //    Retell. We also collect a per-step trace so the UI can show
 //    exactly which step failed instead of a generic message.
 let agentSynced = false
 let agentSyncError: string | null = null
 const trace: string[] = []
 try {
  const agentManager = retellAgentManager()

  // Only thread fields the user actually changed in this request into
  // the agent config. Otherwise we'd send (e.g.) an empty greeting on
  // a voice-only save — Retell interprets begin_message="" as 'switch
  // to dynamic mode' and clobbers the static greeting.
  const greetingChanged = 'greeting_message' in updates
  const voiceChanged = 'voice_id' in updates
  const speedChanged = 'voice_speed' in updates
  const nameChanged = 'business_name' in updates

  const agentConfig: any = {
   businessId,
   businessType: updatedBusiness?.business_type || business.business_type,
   phoneNumber: updatedBusiness?.phone_number || updatedBusiness?.phone || '',
   address: `${updatedBusiness?.address || ''}, ${updatedBusiness?.city || ''}, ${updatedBusiness?.state || ''} ${updatedBusiness?.zip_code || ''}`.trim(),
   tone: (updatedBusiness?.ai_tone || updatedBusiness?.tone || 'professional') as 'professional' | 'friendly' | 'casual',
   services: updatedBusiness?.services || [],
   serviceAreas: updatedBusiness?.service_areas || [],
   businessHours: updatedBusiness?.business_hours || {},
   website: updatedBusiness?.website,
  }
  if (nameChanged) agentConfig.businessName = updatedBusiness?.business_name || business.business_name
  if (greetingChanged) agentConfig.greetingMessage = updatedBusiness?.greeting_message || ''
  if (voiceChanged) agentConfig.voiceId = updatedBusiness?.voice_id || null
  if (speedChanged) agentConfig.voiceSpeed = updatedBusiness?.voice_speed != null ? Number(updatedBusiness.voice_speed) : null

  await agentManager.updateBusinessAgent(businessId, agentConfig, trace)
  agentSynced = true
  logger.info('Retell agent updated automatically', {
   businessId, updatedFields: Object.keys(updates).join(', '), trace: trace.join(' | '),
  })
 } catch (agentError) {
  agentSyncError = agentError instanceof Error ? agentError.message : 'Unknown error'
  logger.error('Agent update failed', {
   error: agentSyncError, businessId, trace: trace.join(' | '),
  })
 }

 return NextResponse.json({
  success: true,
  businessId,
  message: agentSynced
   ? 'Business settings updated. AI agent synced.'
   : `Settings saved, but the AI agent didn't sync: ${agentSyncError || 'unknown reason'}`,
  agentSynced,
  agentSyncError,
  // Step-by-step Retell trace so the UI can show where the chain
  // broke (no agent id found, agent not in Retell, LLM patch 404, etc).
  retellTrace: trace,
 })

 } catch (error) {
 logger.error('Business update failed', { 
 error: error instanceof Error ? error.message : 'Unknown error' 
 })
 return NextResponse.json(
 { error: 'Failed to update business', details: error instanceof Error ? error.message : 'Unknown error' },
 { status: 500 }
 )
 }
}



