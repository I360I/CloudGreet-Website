import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey && !stripeKey.includes('your-') && !stripeKey.includes('demo-') 
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null

async function createSubscription(request: NextRequest) {
  try {
    const { 
      email, 
      businessName, 
      businessType, 
      phoneNumber, 
      agentId,
      priceId = 'price_1234567890' // Default price ID
    } = await request.json()

    // Validate required fields
    if (!email || !businessName || !businessType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, business name, and business type are required'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      }, { status: 400 })
    }

    // Check if Stripe is properly configured
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Stripe API key not configured. Please set STRIPE_SECRET_KEY in environment variables.'
      }, { status: 503 })
    }

    // Create or retrieve customer
    let customer
    try {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: email,
          name: businessName,
          metadata: {
            business_type: businessType,
            phone_number: phoneNumber,
            agent_id: agentId
          }
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer', { error: error instanceof Error ? error.message : 'Unknown error' })
      return NextResponse.json({ 
        error: 'Failed to create customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // Create real Stripe subscription
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          business_name: businessName,
          business_type: businessType,
          agent_id: agentId,
          phone_number: phoneNumber
        }
      })

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
        },
        customer: {
          id: subscription.customer,
          email: email,
          name: businessName
        },
        message: 'Stripe subscription created successfully',
        demo: false
      })
    } catch (error) {
      console.error('Stripe subscription creation error', { error: error instanceof Error ? error.message : 'Unknown error' })
      return NextResponse.json({
        success: false,
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating subscription', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const POST = createSubscription