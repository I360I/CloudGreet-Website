import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId } = body

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const userBusinessId = decoded.businessId

    if (!userId || !userBusinessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Use the businessId from token if not provided in body
    const targetBusinessId = businessId || userBusinessId

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', targetBusinessId)
      .eq('owner_id', userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', targetBusinessId)
      .single()

    let agentId

    if (existingAgent) {
      // Update existing agent
      const { data: updatedAgent, error: updateError } = await supabaseAdmin
        .from('ai_agents')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: 'Failed to activate agent' }, { status: 500 })
      }

      agentId = updatedAgent.id
    } else {
      // Create new agent
      const { data: newAgent, error: createError } = await supabaseAdmin
        .from('ai_agents')
        .insert({
          business_id: targetBusinessId,
          agent_name: `${business.business_name} AI Assistant`,
          business_name: business.business_name,
          is_active: true,
          greeting_message: business.greeting_message || `Hello! Thank you for calling ${business.business_name}. How can I help you today?`,
          tone: business.ai_tone || 'professional',
          configuration: {
            services: business.services || ['General Services'],
            service_areas: business.service_areas || ['Local Area'],
            business_hours: business.business_hours || {
              monday: '9 AM - 5 PM',
              tuesday: '9 AM - 5 PM',
              wednesday: '9 AM - 5 PM',
              thursday: '9 AM - 5 PM',
              friday: '9 AM - 5 PM',
              saturday: 'closed',
              sunday: 'closed'
            },
            created_at: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
      }

      agentId = newAgent.id
    }

    // Update business to mark as active
    await supabaseAdmin
      .from('businesses')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetBusinessId)

    return NextResponse.json({
      success: true,
      message: 'AI agent activated successfully',
      agentId,
      businessId: targetBusinessId,
      phoneNumber: business.phone_number || 'Not assigned'
    })

  } catch (error) {
    console.error('Agent activation error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to activate agent. Please try again.' 
    }, { status: 500 })
  }
}
