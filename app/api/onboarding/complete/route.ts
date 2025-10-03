import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telynyx } from '@/lib/telynyx'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const completeOnboardingSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.enum(['HVAC', 'Paint', 'Roofing', 'Plumbing', 'Electrical', 'Cleaning', 'Landscaping', 'General'], {
    message: 'Invalid business type'
  }),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  services: z.array(z.string()).min(1, 'At least one service is required'),
  serviceAreas: z.array(z.string()).min(1, 'At least one service area is required'),
  businessHours: z.record(z.string(), z.any()),
  greetingMessage: z.string().min(1, 'Greeting message is required'),
  tone: z.enum(['professional', 'friendly', 'casual'], {
    message: 'Invalid tone'
  }),
  billingPlan: z.string().optional(),
  promoCode: z.string().optional()
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    // Parse and validate request
    const body = await request.json()
    const validatedData = completeOnboardingSchema.parse(body)

    await logger.info('Completing onboarding', {
      requestId,
      businessName: validatedData.businessName
    })

    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        message: 'Invalid token'
      }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token data'
      }, { status: 401 })
    }

    // Update business with onboarding data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .update({
        business_name: validatedData.businessName,
        business_type: validatedData.businessType,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        address: validatedData.address,
        city: 'Unknown',
        state: 'Unknown', 
        zip_code: '00000',
        phone_number: validatedData.phone,
        services: validatedData.services,
        service_areas: validatedData.serviceAreas,
        business_hours: validatedData.businessHours,
        greeting_message: validatedData.greetingMessage,
        ai_tone: validatedData.tone,
        billing_plan: validatedData.billingPlan || 'pro',
        onboarding_completed: true,
        promo_code_used: validatedData.promoCode || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .eq('owner_id', userId)
      .select()
      .single()

    if (businessError || !business) {
      console.error('Business update failed:', {
        businessError,
        business,
        businessId,
        userId,
        validatedData: {
          businessName: validatedData.businessName,
          businessType: validatedData.businessType,
          email: validatedData.email,
          phone: validatedData.phone
        }
      })
      logger.error("Error", { 
        error: businessError || new Error('Business not found'), 
        requestId,
        businessId,
        userId,
        action: 'update_business_onboarding'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to complete onboarding',
        error: businessError?.message || 'Business not found'
      }, { status: 500 })
    }

    // Create AI agent record in database
    let agentId = null
    try {
      await logger.info('Creating AI agent record', {
        requestId,
        businessId,
        businessName: validatedData.businessName
      })

        const { data: agent, error: agentError } = await supabaseAdmin
        .from('ai_agents')
        .insert({
          business_id: businessId,
          agent_name: `${validatedData.businessName} AI Assistant`,
          business_name: validatedData.businessName,
          is_active: true,
          greeting_message: validatedData.greetingMessage,
          tone: validatedData.tone,
          configuration: {
            services: validatedData.services,
            service_areas: validatedData.serviceAreas,
            business_hours: validatedData.businessHours,
            created_at: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (agentError) {
        throw new Error(`Agent creation failed: ${agentError.message}`)
      }

      agentId = agent.id

      await logger.info('AI agent created successfully', {
        requestId,
        businessId,
        agentId
      })

      // AI agent is ready for OpenAI voice conversations
      await logger.info('AI agent ready for OpenAI voice conversations', {
        requestId,
        businessId,
        agentId,
        voice: validatedData.voice || 'alloy'
      })

    } catch (agentError) {
      console.error('AI agent creation failed:', {
        agentError,
        businessId,
        businessName: validatedData.businessName,
        requestId
      })
      logger.error("Error creating AI agent", { 
        error: agentError instanceof Error ? agentError.message : 'Unknown error', 
        requestId,
        businessId,
        userId,
        action: 'create_ai_agent'
      })
      // Don't fail the entire onboarding for agent creation issues
      // The business can still function without the agent initially
      console.warn('AI agent creation failed, continuing with onboarding:', agentError)
    }

    // Provision phone number for the business
    let phoneNumber = null
    let phoneRecordId = null
    
    try {
      // Extract area code from business phone or use default
      const areaCode = validatedData.phone ? validatedData.phone.replace(/\D/g, '').substring(0, 3) : '555'
      
      await logger.info('Provisioning phone number', {
        requestId,
        businessId,
        areaCode
      })
      
      // Call our phone provisioning API
      const provisionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/phone/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId,
          areaCode
        })
      })
      
      if (provisionResponse.ok) {
        const provisionData = await provisionResponse.json()
        phoneNumber = provisionData.phoneNumber
        phoneRecordId = provisionData.phoneRecordId
        
        await logger.info('Phone number provisioned successfully', {
          requestId,
          businessId,
          phoneNumber,
          phoneRecordId
        })
      } else {
        throw new Error('Phone provisioning API failed')
      }
    } catch (phoneError) {
      logger.error("Error provisioning phone number", { 
        error: phoneError instanceof Error ? phoneError.message : 'Unknown error', 
        requestId,
        businessId,
        action: 'provision_phone_number'
      })
      // Continue without phone number - user can set it up later
    }

    // Update business with phone number if provisioned
    if (phoneNumber) {
      await supabaseAdmin
        .from('businesses')
        .update({
          phone_number: phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
    }

    // Handle promo code if provided
    if (validatedData.promoCode) {
      try {
        // Validate and apply promo code
        const { data: promo } = await supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('code', validatedData.promoCode.toUpperCase())
          .eq('is_active', true)
          .single()

        if (promo) {
          const now = new Date()
          const trialEndDate = new Date(now.getTime() + (promo.trial_days * 24 * 60 * 60 * 1000))

          await supabaseAdmin
            .from('businesses')
            .update({
              promo_code_used: promo.code,
              trial_start_date: now.toISOString(),
              trial_end_date: trialEndDate.toISOString(),
              is_trial_active: true,
              subscription_status: 'trialing',
              updated_at: new Date().toISOString()
            })
            .eq('id', businessId)

          // Increment promo code usage
          await supabaseAdmin
            .from('promo_codes')
            .update({
              current_uses: promo.current_uses + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', promo.id)
        }
      } catch (promoError) {
        logger.error("Error", { 
          error: promoError instanceof Error ? promoError.message : 'Unknown error', 
          requestId,
          businessId,
          action: 'apply_promo_code_onboarding'
        })
        // Continue without failing the onboarding
      }
    }

    // Onboarding completed successfully - no audit logging needed

    await logger.info('Onboarding completed successfully', {
      requestId,
      businessId,
      userId,
      businessName: validatedData.businessName,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      businessId: business.id,
      agentId: agentId,
      data: {
        business: {
          id: business.id,
          business_name: business.business_name,
          onboarding_completed: business.onboarding_completed,
          phone_number: phoneNumber
        },
        agent: {
          id: agentId,
          name: `${validatedData.businessName} AI Receptionist`,
          is_active: !!agentId
        }
      },
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error("Error", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      endpoint: 'complete_onboarding',
      responseTime: Date.now() - startTime
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to complete onboarding'
    }, { status: 500 })
  }
}
