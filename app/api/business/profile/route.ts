import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Business Profile
 */
export async function GET(request: NextRequest) {
 try {
 const authResult = await requireAuth(request)
 if (!authResult.success || !authResult.userId) {
 return NextResponse.json(
 { success: false, message: 'Unauthorized' },
 { status: 401 }
 )
 }

 const userId = authResult.userId
 // Always trust only the JWT's businessId. Never read it from query
 // params or body - that's a cross-tenant leak vector.
 const businessId = authResult.businessId

 if (!businessId) {
 return NextResponse.json(
 { success: false, message: 'No business attached to this account' },
 { status: 400 }
 )
 }

 // Get business profile (owner_id check stays as defense in depth)
 const { data: business, error } = await supabaseAdmin
 .from('businesses')
 .select('*')
 .eq('id', businessId)
 .eq('owner_id', userId)
 .single()

 if (error || !business) {
 logger.error('Failed to fetch business profile', { 
 error: error instanceof Error ? error.message : String(error), 
 userId, 
 businessId 
 })
 return NextResponse.json(
 { success: false, message: 'Business not found' },
 { status: 404 }
 )
 }

 return NextResponse.json({
 success: true,
 data: {
 businessName: business.business_name,
 businessType: business.business_type,
 services: business.services || [],
 businessHours: business.business_hours || {},
 phoneNumber: business.phone_number || business.phone,
 email: business.email,
 address: business.address,
 city: business.city,
 state: business.state,
 zipCode: business.zip_code,
 website: business.website,
 greetingMessage: business.greeting_message || business.greeting || '',
 aiTone: business.ai_tone || business.tone || 'professional',
 voiceId: business.voice_id || null,
 voiceSpeed: business.voice_speed != null ? Number(business.voice_speed) : null,
 retellAgentId: business.retell_agent_id || null,
 forwardingCarrier: business.forwarding_carrier || null,
 forwardingLineType: business.forwarding_line_type || null,
 forwardingMode: business.forwarding_mode || null,
 forwardingVerifiedAt: business.forwarding_verified_at || null,
 }
 })
 } catch (error) {
 logger.error('Error fetching business profile', { error: error instanceof Error ? error.message : 'Unknown error' })
 return NextResponse.json(
 { success: false, message: 'Failed to fetch business profile' },
 { status: 500 }
 )
 }
}

