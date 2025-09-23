import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telynyx } from '@/lib/telynyx'
import { z } from 'zod'

const completeOnboardingSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.enum(['HVAC', 'Paint', 'Roofing'], {
    message: 'Invalid business type'
  }),
  ownerName: z.string().min(1, 'Owner name is required'),
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
    // Parse and validate request
    const body = await request.json()
    const validatedData = completeOnboardingSchema.parse(body)

    await logger.info('Completing onboarding', {
      requestId,
      businessName: validatedData.businessName
    })

    // Get user ID from middleware
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Update business with onboarding data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .update({
        business_name: validatedData.businessName,
        business_type: validatedData.businessType,
        owner_name: validatedData.ownerName,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        address: validatedData.address,
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
      .eq('user_id', userId)
      .select()
      .single()

    if (businessError || !business) {
      logger.error("Error", businessError || new Error('Business not found'), {
        requestId,
        businessId,
        userId,
        action: 'update_business_onboarding'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to complete onboarding'
      }, { status: 500 })
    }

    // Update AI agent with onboarding data
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .update({
        business_name: validatedData.businessName,
        business_type: validatedData.businessType,
        prompt_template: `You are an AI assistant for ${validatedData.businessName}, a ${validatedData.businessType} company. Your services include: ${validatedData.services.join(', ')}. Your tone should be ${validatedData.tone}.`,
        greeting_message: validatedData.greetingMessage,
        tone: validatedData.tone,
        services: validatedData.services,
        service_areas: validatedData.serviceAreas,
        business_hours: validatedData.businessHours,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .select()
      .single()

    if (agentError || !agent) {
      logger.error("Error", agentError || new Error('AI agent not found'), {
        requestId,
        businessId,
        userId,
        action: 'activate_ai_agent'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to activate AI agent'
      }, { status: 500 })
    }

    // Purchase phone number from Telynyx
    let phoneNumber = null
    let telynyxPhoneId = null
    
    try {
      // Extract area code from business phone or use default
      const areaCode = validatedData.phone ? validatedData.phone.replace(/\D/g, '').substring(0, 3) : '555'
      
      await logger.info('Purchasing phone number from Telynyx', {
        requestId,
        businessId,
        areaCode
      })
      
      const purchasedPhone = await telynyx.purchasePhoneNumber(
        areaCode,
        `${validatedData.businessName} - ${validatedData.businessType}`
      )
      
      phoneNumber = purchasedPhone.phone_number
      telynyxPhoneId = purchasedPhone.id
      
      await logger.info('Phone number purchased successfully', {
        requestId,
        businessId,
        phoneNumber,
        telynyxPhoneId
      })
    } catch (phoneError) {
      logger.error("Error", phoneError as Error, {
        requestId,
        businessId,
        action: 'purchase_phone_number'
      })
      // Continue without phone number - user can set it up later
    }

    // Update business with phone number if purchased
    if (phoneNumber) {
      await supabase
        .from('businesses')
        .update({
          phone_number: phoneNumber,
          telynyx_phone_id: telynyxPhoneId,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
    }

    // Handle promo code if provided
    if (validatedData.promoCode) {
      try {
        // Validate and apply promo code
        const { data: promo } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', validatedData.promoCode.toUpperCase())
          .eq('is_active', true)
          .single()

        if (promo) {
          const now = new Date()
          const trialEndDate = new Date(now.getTime() + (promo.trial_days * 24 * 60 * 60 * 1000))

          await supabase
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
          await supabase
            .from('promo_codes')
            .update({
              current_uses: promo.current_uses + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', promo.id)
        }
      } catch (promoError) {
        logger.error("Error", promoError as Error, {
          requestId,
          businessId,
          action: 'apply_promo_code_onboarding'
        })
        // Continue without failing the onboarding
      }
    }

    // Log successful onboarding completion
    await supabase
      .from('audit_logs')
      .insert({
        action: 'onboarding_completed',
        details: {
          business_id: businessId,
          user_id: userId,
          business_name: validatedData.businessName,
          services: validatedData.services,
          tone: validatedData.tone,
          phone_number: phoneNumber,
          telynyx_phone_id: telynyxPhoneId
        },
        user_id: userId,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

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
      data: {
        business: {
          id: business.id,
          business_name: business.business_name,
          onboarding_completed: business.onboarding_completed,
          phone_number: phoneNumber
        },
        agent: {
          id: agent.id,
          name: agent.name,
          is_active: agent.is_active
        }
      },
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error("Error", error as Error, {
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
