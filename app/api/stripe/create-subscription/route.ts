import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { priceId, paymentMethodId } = body

    // Get business Stripe customer ID
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('stripe_customer_id, business_name, email')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: 'Stripe customer not created'
      }, { status: 400 })
    }

    // Attach payment method to customer if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: business.stripe_customer_id
      })

      // Set as default payment method
      await stripe.customers.update(business.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: business.stripe_customer_id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        business_id: businessId,
        user_id: userId,
        business_name: business.business_name
      }
    })

    // Update business with subscription info
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        billing_plan: priceId.includes('starter') ? 'starter' : 'pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single()

    if (updateError) {
      logger.error("Error", updateError, {
        requestId,
        businessId,
        userId,
        action: 'update_business_subscription'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update business with subscription info'
      }, { status: 500 })
    }

    // Log successful subscription creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'subscription_created',
        details: {
          business_id: businessId,
          user_id: userId,
          stripe_subscription_id: subscription.id,
          price_id: priceId,
          status: subscription.status
        },
        user_id: userId,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    await logger.info('Stripe subscription created successfully', {
      requestId,
      businessId,
      userId,
      subscriptionId: subscription.id,
      status: subscription.status,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          price_id: priceId
        },
        client_secret: typeof subscription.latest_invoice === 'object' && subscription.latest_invoice?.payment_intent && typeof subscription.latest_invoice.payment_intent === 'object' ? subscription.latest_invoice.payment_intent.client_secret : undefined
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
      endpoint: 'create_subscription',
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      message: 'Failed to create subscription'
    }, { status: 500 })
  }
}
