import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, settings } = body

    switch (type) {
      case 'ai_agent':
        return await updateAISettings(settings)
      case 'sms_templates':
        return await updateSMSTemplates(settings)
      case 'business_profile':
        return await updateBusinessProfile(settings)
      case 'pricing':
        return await updatePricingSettings(settings)
      default:
        return NextResponse.json({ error: 'Invalid customization type' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Admin customization error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'admin/customization',
      method: 'POST'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateAISettings(settings: any) {
  try {
    const { personality, responseSpeed, businessHours, voice, language } = settings

    // Update AI agent settings in database
    const { error } = await supabaseAdmin
      .from('ai_agent_settings')
      .upsert({
        business_id: 'admin-global',
        personality: personality || 'friendly',
        response_speed: responseSpeed || 'normal',
        business_hours: businessHours || '9 AM - 5 PM, Monday - Friday',
        voice: voice || 'alloy',
        language: language || 'en',
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Update OpenAI voice settings for all AI agents
    const { data: allAgents, error: agentsError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('is_active', true)

    if (!agentsError && allAgents) {
      for (const agent of allAgents) {
        // Update voice settings in database
        await supabaseAdmin
          .from('ai_agents')
          .update({
            voice: voice || 'alloy',
            tone: personality || 'friendly',
            configuration: {
              ...agent.configuration,
              personality: personality || 'friendly',
              response_speed: responseSpeed || 'normal',
              business_hours: businessHours || '9 AM - 5 PM, Monday - Friday',
              language: language || 'en'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id)

        // Update Telnyx agent voice if configured
        if (agent.telynyx_agent_id && voice) {
          try {
            const telnyxResponse = await fetch(`https://api.telnyx.com/v2/ai_agents/${agent.telynyx_agent_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                voice: voice,
                language: language || 'en'
              })
            })

            if (!telnyxResponse.ok) {
              logger.warn('Failed to update Telnyx agent voice', {
                agentId: agent.id,
                status: telnyxResponse.status
              })
            }
          } catch (error) {
            logger.warn('Telnyx agent voice update error', {
              agentId: agent.id,
              error: error.message
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AI agent settings updated successfully'
    })
  } catch (error) {
    logger.error('AI settings update failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      settings 
    })
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
  }
}

async function updateSMSTemplates(settings: any) {
  try {
    const { appointmentConfirmation, followUp, reminder, cancellation } = settings

    // Update SMS templates in database
    const { error } = await supabaseAdmin
      .from('sms_templates')
      .upsert({
        business_id: 'admin-global',
        appointment_confirmation: appointmentConfirmation || 'Hi [Name], your appointment is confirmed for [Date] at [Time]. We\'ll see you then! Reply STOP to opt out.',
        follow_up: followUp || 'Hi [Name], how was your service? We\'d love your feedback! Reply STOP to opt out.',
        reminder: reminder || 'Hi [Name], this is a reminder about your appointment tomorrow at [Time]. Reply STOP to opt out.',
        cancellation: cancellation || 'Hi [Name], your appointment has been cancelled. Please call us to reschedule. Reply STOP to opt out.',
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'SMS templates updated successfully'
    })
  } catch (error) {
    logger.error('SMS templates update failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      settings 
    })
    return NextResponse.json({ error: 'Failed to update SMS templates' }, { status: 500 })
  }
}

async function updateBusinessProfile(settings: any) {
  try {
    const { businessName, services, serviceArea, description, website } = settings

    // Update business profile template in database
    const { error } = await supabaseAdmin
      .from('business_templates')
      .upsert({
        business_id: 'admin-global',
        business_name: businessName || 'Your Business Name',
        services: services || 'Painting, HVAC, Plumbing',
        service_area: serviceArea || 'Local Area',
        description: description || 'Professional service business',
        website: website || 'https://yourbusiness.com',
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Business profile template updated successfully'
    })
  } catch (error) {
    logger.error('Business profile update failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      settings 
    })
    return NextResponse.json({ error: 'Failed to update business profile' }, { status: 500 })
  }
}

async function updatePricingSettings(settings: any) {
  try {
    const { monthlyPrice, perBookingPrice, trialDays, currency } = settings

    // Update pricing settings in database
    const { error } = await supabaseAdmin
      .from('pricing_settings')
      .upsert({
        business_id: 'admin-global',
        monthly_price: monthlyPrice || 200,
        per_booking_price: perBookingPrice || 50,
        trial_days: trialDays || 7,
        currency: currency || 'USD',
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing settings updated successfully'
    })
  } catch (error) {
    logger.error('Pricing settings update failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      settings 
    })
    return NextResponse.json({ error: 'Failed to update pricing settings' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'ai_agent':
        return await getAISettings()
      case 'sms_templates':
        return await getSMSTemplates()
      case 'business_profile':
        return await getBusinessProfile()
      case 'pricing':
        return await getPricingSettings()
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Admin customization fetch error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'admin/customization',
      method: 'GET'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getAISettings() {
  const { data, error } = await supabaseAdmin
    .from('ai_agent_settings')
    .select('*')
    .eq('business_id', 'admin-global')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Database error: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    settings: data || {
      personality: 'friendly',
      response_speed: 'normal',
      business_hours: '9 AM - 5 PM, Monday - Friday',
      voice: 'alloy',
      language: 'en'
    }
  })
}

async function getSMSTemplates() {
  const { data, error } = await supabaseAdmin
    .from('sms_templates')
    .select('*')
    .eq('business_id', 'admin-global')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    templates: data || {
      appointment_confirmation: 'Hi [Name], your appointment is confirmed for [Date] at [Time]. We\'ll see you then! Reply STOP to opt out.',
      follow_up: 'Hi [Name], how was your service? We\'d love your feedback! Reply STOP to opt out.',
      reminder: 'Hi [Name], this is a reminder about your appointment tomorrow at [Time]. Reply STOP to opt out.',
      cancellation: 'Hi [Name], your appointment has been cancelled. Please call us to reschedule. Reply STOP to opt out.'
    }
  })
}

async function getBusinessProfile() {
  const { data, error } = await supabaseAdmin
    .from('business_templates')
    .select('*')
    .eq('business_id', 'admin-global')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    profile: data || {
      business_name: 'Your Business Name',
      services: 'Painting, HVAC, Plumbing',
      service_area: 'Local Area',
      description: 'Professional service business',
      website: 'https://yourbusiness.com'
    }
  })
}

async function getPricingSettings() {
  const { data, error } = await supabaseAdmin
    .from('pricing_settings')
    .select('*')
    .eq('business_id', 'admin-global')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  return NextResponse.json({
    success: true,
    pricing: data || {
      monthly_price: 200,
      per_booking_price: 50,
      trial_days: 7,
      currency: 'USD'
    }
  })
}
