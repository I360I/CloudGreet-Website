import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET' }, { status: 500 })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'Stripe customer not created. Please create customer first.' 
      }, { status: 400 })
    }

    // Check if subscription already exists
    if (business.subscription_status === 'active') {
      return NextResponse.json({
        success: true,
        subscriptionId: business.stripe_subscription_id,
        message: 'Subscription already active'
      })
    }

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: business.stripe_customer_id,
      items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890', // Monthly subscription price
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        business_id: businessId,
        user_id: userId,
        business_name: business.business_name
      }
    })

    // Update business with subscription info
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: 'pending',
        billing_plan: 'monthly',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to update business with subscription info', {
        error: updateError.message,
        businessId,
        subscriptionId: subscription.id
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to save subscription information'
      }, { status: 500 })
    }

    logger.info('Stripe subscription created successfully', {
      businessId,
      userId,
      subscriptionId: subscription.id
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      message: 'Subscription created successfully'
    })

  } catch (error) {
    logger.error('Stripe subscription creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to create subscription'
    }, { status: 500 })
  }
}