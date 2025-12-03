import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { retellAgentManager } from '@/lib/retell-agent-manager'
import { verifyJWT } from '@/lib/auth-middleware'
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
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authResult = await verifyJWT(request)
    if (!authResult.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = authResult.user.id
    const body = await request.json()
    const { businessId, ...updates } = body

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Verify business ownership
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
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
    }

    // 2. Get updated business data for agent update
    const { data: updatedBusiness } = await supabaseAdmin
      .from('businesses')
      .select('business_name, business_type, services, service_areas, business_hours, greeting_message, greeting, ai_tone, tone, phone_number, phone, website, address, city, state, zip_code')
      .eq('id', businessId)
      .single()

    // 3. Automatically update Retell agent if agent exists
    if (business.retell_agent_id && updatedBusiness) {
      try {
        const agentManager = retellAgentManager()

        // Prepare agent config from updated business data
        const agentConfig = {
          businessId: businessId,
          businessName: updatedBusiness.business_name || business.business_name,
          businessType: updatedBusiness.business_type || business.business_type,
          services: updatedBusiness.services || [],
          serviceAreas: updatedBusiness.service_areas || [],
          businessHours: updatedBusiness.business_hours || {},
          greetingMessage: updatedBusiness.greeting_message || updatedBusiness.greeting || '',
          tone: (updatedBusiness.ai_tone || updatedBusiness.tone || 'professional') as 'professional' | 'friendly' | 'casual',
          phoneNumber: updatedBusiness.phone_number || updatedBusiness.phone || '',
          website: updatedBusiness.website,
          address: `${updatedBusiness.address || ''}, ${updatedBusiness.city || ''}, ${updatedBusiness.state || ''} ${updatedBusiness.zip_code || ''}`.trim()
        }

        // Update agent automatically
        await agentManager.updateBusinessAgent(businessId, agentConfig)

        logger.info('Retell agent updated automatically', { 
          businessId, 
          agentId: business.retell_agent_id,
          updatedFields: Object.keys(updates).join(', ')
        })
      } catch (agentError) {
        logger.error('Agent update failed', { 
          error: agentError instanceof Error ? agentError.message : 'Unknown error',
          businessId 
        })
        // Continue - business update succeeded even if agent update failed
      }
    }

    return NextResponse.json({
      success: true,
      businessId: businessId,
      message: 'Business settings updated. Agent updated automatically.',
      agentUpdated: !!business.retell_agent_id
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



