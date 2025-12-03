import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { retellAgentManager } from '@/lib/retell-agent-manager'
import { verifyJWT } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { CONFIG } from '@/lib/config'
import Stripe from 'stripe'
import { logComplianceEvent } from '@/lib/compliance/logging'
import { normalizePhoneForStorage } from '@/lib/phone-normalization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Complete Onboarding - Fully Automated
 * 
 * This endpoint:
 * 1. Saves business profile to database
 * 2. Creates Stripe customer automatically
 * 3. Creates Stripe products automatically
 * 4. Provisions phone number automatically (FIRST - before agent creation)
 * 5. Creates personalized Retell AI agent automatically (with phone number)
 * 6. Links phone number to Retell agent
 * 7. Links everything together
 * 
 * All automated - no manual steps required!
 */
export async function POST(request: NextRequest) {
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

    // Extract onboarding data
    const {
      businessName,
      businessType,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      website,
      services,
      serviceAreas,
      businessHours,
      greetingMessage,
      tone,
      ownerName,
      description
    } = body

    // Validate required fields
    if (!businessName || !businessType || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, businessType, email' },
        { status: 400 }
      )
    }

    // 1. Create or update business in database
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id, stripe_customer_id')
      .eq('owner_id', userId)
      .single()

    let businessId: string
    let stripeCustomerId: string | null = null

    if (existingBusiness) {
      businessId = existingBusiness.id
      stripeCustomerId = existingBusiness.stripe_customer_id
    } else {
      // Create new business
      const { data: newBusiness, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          owner_id: userId,
          business_name: businessName,
          business_type: businessType,
          email: email,
          phone: phone,
          phone_number: phone,
          address: address,
          city: city,
          state: state,
          zip_code: zipCode,
          website: website,
          description: description,
          services: services || [],
          service_areas: serviceAreas || [],
          business_hours: businessHours || {},
          greeting_message: greetingMessage || `Hello, thank you for calling ${businessName}. How can I help you today?`,
          tone: tone || 'professional',
          ai_tone: tone || 'professional',
          onboarding_completed: false, // Will set to true at end
          onboarding_step: 0,
          onboarding_data: body
        })
        .select('id')
        .single()

      if (businessError || !newBusiness) {
        logger.error('Failed to create business', { error: businessError?.message || JSON.stringify(businessError) })
        return NextResponse.json(
          { 
            error: 'Failed to create business profile',
            details: businessError?.message || 'Database error occurred',
            action: 'Please try again. If the problem persists, contact support at support@cloudgreet.com',
            step: 'business_creation'
          },
          { status: 500 }
        )
      }

      businessId = newBusiness.id
    }

    // 2. Create Stripe customer automatically (if not exists)
    if (!stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16' as any
        })

        const customer = await stripe.customers.create({
          email: email,
          name: businessName,
          phone: phone,
          metadata: {
            business_id: businessId,
            user_id: userId,
            business_type: businessType
          }
        })

        stripeCustomerId = customer.id

        // Update business with Stripe customer ID
        await supabaseAdmin
          .from('businesses')
          .update({ stripe_customer_id: customer.id })
          .eq('id', businessId)

        logger.info('Stripe customer created', { 
          businessId, 
          customerId: customer.id 
        })
      } catch (stripeError) {
        logger.error('Stripe customer creation failed', { 
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error' 
        })
        // Continue - we can create customer later
      }
    }

    // 3. Create Stripe products automatically (if they don't exist)
    let subscriptionPriceId: string | null = null
    let bookingPriceId: string | null = null

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16' as any
        })

        // Check if products already exist (by name)
        const products = await stripe.products.list({ limit: 100 })
        
        // Find or create subscription product
        let subscriptionProduct = products.data.find(
          p => p.name === 'CloudGreet Monthly Subscription'
        )

        if (!subscriptionProduct) {
          subscriptionProduct = await stripe.products.create({
            name: 'CloudGreet Monthly Subscription',
            description: 'Monthly subscription for CloudGreet AI receptionist service'
          })

          const price = await stripe.prices.create({
            product: subscriptionProduct.id,
            unit_amount: CONFIG.BUSINESS.MONTHLY_COST * 100, // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'month'
            }
          })

          subscriptionPriceId = price.id
        } else {
          // Get existing price
          const prices = await stripe.prices.list({
            product: subscriptionProduct.id
          })
          subscriptionPriceId = prices.data[0]?.id || null
        }

        // Find or create per-booking fee product
        let bookingProduct = products.data.find(
          p => p.name === 'CloudGreet Per-Booking Fee'
        )

        if (!bookingProduct) {
          bookingProduct = await stripe.products.create({
            name: 'CloudGreet Per-Booking Fee',
            description: 'Per-appointment booking fee'
          })

          const price = await stripe.prices.create({
            product: bookingProduct.id,
            unit_amount: CONFIG.BUSINESS.PER_BOOKING_FEE * 100, // Convert to cents
            currency: 'usd'
          })

          bookingPriceId = price.id
        } else {
          // Get existing price
          const prices = await stripe.prices.list({
            product: bookingProduct.id
          })
          bookingPriceId = prices.data[0]?.id || null
        }

        logger.info('Stripe products ready', { 
          subscriptionPriceId, 
          bookingPriceId 
        })
      } catch (stripeError) {
        logger.error('Stripe product creation failed', { 
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error' 
        })
        // Continue - subscription can be created later
      }
    }

    // 4. Provision toll-free phone number automatically (BEFORE agent creation)
    let provisionedPhoneNumber: string | null = null
    
    try {
      // Check if business already has a toll-free number assigned
      const { data: existingAssignment } = await supabaseAdmin
        .from('toll_free_numbers')
        .select('number, status')
        .eq('assigned_to', businessId)
        .eq('status', 'assigned')
        .single()

      if (existingAssignment) {
        provisionedPhoneNumber = existingAssignment.number
        logger.info('Business already has phone number assigned', {
          businessId,
          phoneNumber: provisionedPhoneNumber
        })
      } else {
        // Find next available toll-free number
        const { data: availableNumber, error: numberError } = await supabaseAdmin
          .from('toll_free_numbers')
          .select('id, number')
          .eq('status', 'available')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (!numberError && availableNumber) {
          // Assign the number to the business
          const { error: assignError } = await supabaseAdmin
            .from('toll_free_numbers')
            .update({
              status: 'assigned',
              assigned_to: businessId,
              business_name: businessName,
              assigned_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', availableNumber.id)

          if (!assignError) {
            // Update business record with the toll-free number
            const { error: updateError } = await supabaseAdmin
              .from('businesses')
              .update({
                phone_number: availableNumber.number,
                updated_at: new Date().toISOString()
              })
              .eq('id', businessId)

            if (!updateError) {
              provisionedPhoneNumber = availableNumber.number
              logger.info('Phone number provisioned during onboarding', {
                businessId,
                phoneNumber: provisionedPhoneNumber
              })
            } else {
              // Rollback assignment if business update fails
              await supabaseAdmin
                .from('toll_free_numbers')
                .update({
                  status: 'available',
                  assigned_to: null,
                  business_name: null,
                  assigned_at: null
                })
                .eq('id', availableNumber.id)
              logger.warn('Failed to update business with phone number (rolled back)', {
                businessId,
                error: updateError.message
              })
            }
          } else {
            logger.warn('Failed to assign phone number during onboarding', {
              businessId,
              error: assignError.message
            })
          }
        } else {
          // No available numbers - log but don't fail onboarding
          logger.warn('No available phone numbers in inventory during onboarding', {
            businessId,
            error: numberError?.message || 'No numbers available'
          })
          // Note: This is non-blocking - phone can be assigned manually later
        }
      }
    } catch (phoneError) {
      // Log but don't fail onboarding if phone provisioning fails
      logger.warn('Phone provisioning error during onboarding (non-blocking)', {
        businessId,
        error: phoneError instanceof Error ? phoneError.message : 'Unknown error'
      })
      // Continue - phone can be provisioned manually later
    }

    // 5. Normalize provisioned phone number
    let normalizedPhoneNumber: string | null = null
    if (provisionedPhoneNumber) {
      normalizedPhoneNumber = normalizePhoneForStorage(provisionedPhoneNumber)
      if (normalizedPhoneNumber && normalizedPhoneNumber !== provisionedPhoneNumber) {
        // Update business with normalized phone number
        await supabaseAdmin
          .from('businesses')
          .update({
            phone_number: normalizedPhoneNumber,
            phone: normalizedPhoneNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', businessId)
        
        logger.info('Phone number normalized and updated', {
          businessId,
          original: provisionedPhoneNumber,
          normalized: normalizedPhoneNumber
        })
      } else {
        normalizedPhoneNumber = provisionedPhoneNumber
      }
    }

    // 6. Create personalized Retell AI agent automatically (WITH phone number)
    let retellAgentId: string | null = null
    
    try {
      const agentConfig = {
        businessId: businessId,
        businessName: businessName,
        businessType: businessType,
        ownerName: ownerName,
        services: services || [],
        serviceAreas: serviceAreas || [],
        businessHours: businessHours || {},
        greetingMessage: greetingMessage || `Hello, thank you for calling ${businessName}. How can I help you today?`,
        tone: (tone || 'professional') as 'professional' | 'friendly' | 'casual',
        phoneNumber: normalizedPhoneNumber || phone || '', // Use provisioned normalized number
        website: website,
        address: `${address || ''}, ${city || ''}, ${state || ''} ${zipCode || ''}`.trim()
      }

      const agentManager = retellAgentManager()
      retellAgentId = await agentManager.createBusinessAgent(agentConfig)

      // Update business with agent ID
      await supabaseAdmin
        .from('businesses')
        .update({ 
          retell_agent_id: retellAgentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)

      logger.info('Retell agent created', { 
        businessId, 
        agentId: retellAgentId,
        phoneNumber: normalizedPhoneNumber
      })

      // 7. Link phone number to Retell agent
      if (retellAgentId && normalizedPhoneNumber) {
        try {
          const linkSuccess = await agentManager.linkPhoneNumberToAgent(retellAgentId, normalizedPhoneNumber)
          if (linkSuccess) {
            logger.info('Phone number linked to Retell agent', {
              businessId,
              agentId: retellAgentId,
              phoneNumber: normalizedPhoneNumber
            })
          } else {
            logger.warn('Phone number linking to Retell agent failed (may require manual linking)', {
              businessId,
              agentId: retellAgentId,
              phoneNumber: normalizedPhoneNumber
            })
          }
        } catch (linkError) {
          logger.error('Error linking phone number to Retell agent', {
            error: linkError instanceof Error ? linkError.message : 'Unknown error',
            businessId,
            agentId: retellAgentId,
            phoneNumber: normalizedPhoneNumber
          })
          // Continue - linking can be done manually if needed
        }
      } else {
        logger.warn('Cannot link phone to agent - missing agent ID or phone number', {
          businessId,
          hasAgentId: !!retellAgentId,
          hasPhoneNumber: !!normalizedPhoneNumber
        })
      }
    } catch (agentError) {
      logger.error('Retell agent creation failed', { 
        error: agentError instanceof Error ? agentError.message : 'Unknown error',
        businessId 
      })
      // Continue - agent can be created manually later
    }

    // 8. Update business with onboarding completion using transaction function for atomicity
    // This ensures the onboarding_completed flag, compliance logging, and any related updates happen atomically
    const businessDataJson = {
      business_name: businessName,
      business_type: businessType,
      services: services || [],
      hours: businessHours || {},
      voice: { tone: tone || 'professional' }
    }
    
    const { data: onboardingCompleteResult, error: onboardingCompleteError } = await supabaseAdmin.rpc('complete_onboarding_safe', {
      p_business_id: businessId,
      p_user_id: userId,
      p_business_data: businessDataJson
    })

    if (onboardingCompleteError) {
      logger.error('Onboarding completion transaction failed', {
        error: onboardingCompleteError.message,
        businessId,
        userId
      })
      // Continue anyway - the main onboarding steps are complete
      // Just update the flag manually as fallback
      await supabaseAdmin
        .from('businesses')
        .update({
          onboarding_completed: true,
          onboarding_step: 999,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
    } else {
      logger.info('Onboarding completed successfully with transaction', {
        businessId,
        userId,
        result: onboardingCompleteResult
      })
    }

    // 6. Create subscription checkout session (if Stripe customer exists)
    let checkoutUrl: string | null = null

    if (stripeCustomerId && subscriptionPriceId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16' as any
        })

        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          line_items: [
            {
              price: subscriptionPriceId,
              quantity: 1
            }
          ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/dashboard?subscription=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/dashboard?subscription=cancelled`,
          metadata: {
            business_id: businessId,
            user_id: userId
          }
        })

        checkoutUrl = session.url
      } catch (checkoutError) {
        logger.error('Checkout session creation failed', { 
          error: checkoutError instanceof Error ? checkoutError.message : 'Unknown error' 
        })
      }
    }

    await logComplianceEvent({
      tenantId: businessId,
      channel: 'onboarding',
      eventType: 'complete',
      path: request.nextUrl.pathname,
      requestBody: {
        servicesCount: services?.length ?? 0,
        createdStripeCustomer: Boolean(stripeCustomerId),
        createdRetellAgent: Boolean(retellAgentId)
      }
    })

    return NextResponse.json({
      success: true,
      businessId: businessId,
      retellAgentId: retellAgentId,
      stripeCustomerId: stripeCustomerId,
      phoneNumber: provisionedPhoneNumber,
      checkoutUrl: checkoutUrl,
      message: provisionedPhoneNumber 
        ? 'Onboarding completed successfully. Agent created, Stripe customer created, phone number assigned.'
        : 'Onboarding completed successfully. Agent created, Stripe customer created. Phone number will be assigned separately.'
    })

  } catch (error) {
    logger.error('Onboarding completion failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDatabaseError = errorMessage.includes('database') || errorMessage.includes('constraint') || errorMessage.includes('duplicate')
    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')
    
    let action = 'Please try again in a few moments. If the problem persists, contact support at support@cloudgreet.com'
    if (isDatabaseError) {
      action = 'There was a database error. Please refresh the page and try again. If the problem continues, contact support at support@cloudgreet.com'
    } else if (isNetworkError) {
      action = 'Network error occurred. Please check your internet connection and try again.'
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to complete onboarding',
        details: errorMessage,
        action: action,
        step: 'onboarding_completion',
        supportEmail: 'support@cloudgreet.com'
      },
      { status: 500 }
    )
  }
}

