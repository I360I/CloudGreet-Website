import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, customerId, planId = 'pro' } = body

    if (!businessId || !customerId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID and customer ID are required'
      }, { status: 400 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id, business_name, email')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for subscription creation', { 
        error: businessError, 
        businessId
      })
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    // Define pricing based on plan - amounts from environment variables
    const pricing = {
      starter: { 
        priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter', 
        amount: parseInt(process.env.STRIPE_STARTER_AMOUNT || '97') 
      },
      pro: { 
        priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro', 
        amount: parseInt(process.env.STRIPE_PRO_AMOUNT || '200') 
      },
      premium: { 
        priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium', 
        amount: parseInt(process.env.STRIPE_PREMIUM_AMOUNT || '397') 
      }
    }

    const selectedPlan = pricing[planId as keyof typeof pricing] || pricing.pro

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: selectedPlan.priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        business_id: businessId,
        plan: planId
      }
    })

    // Store subscription info in database
    const { error: subscriptionError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .insert({
        business_id: businessId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        plan: planId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString()
      })

    if (subscriptionError) {
      logger.error('Failed to store subscription in database', { 
        error: subscriptionError, 
        businessId,
        subscriptionId: subscription.id
      })
    }

    // Update business subscription status
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: subscription.status,
        billing_plan: planId,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    logger.info('Stripe subscription created', {
      businessId,
      subscriptionId: subscription.id,
      plan: planId,
      status: subscription.status
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status
    })

  } catch (error) {
    logger.error('Create subscription API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'stripe/create-subscription'
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to create subscription'
    }, { status: 500 })
  }
}
