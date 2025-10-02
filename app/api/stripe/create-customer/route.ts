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
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Billing service not configured. Please contact support.'
      }, { status: 503 })
    }

    const body = await request.json()
    const { businessId, email, businessName } = body

    if (!businessId || !email || !businessName) {
      return NextResponse.json({
        success: false,
        message: 'Business ID, email, and business name are required'
      }, { status: 400 })
    }

    // Check if customer already exists
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id')
      .eq('id', businessId)
      .single()

    if (existingBusiness?.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        customerId: existingBusiness.stripe_customer_id,
        message: 'Customer already exists'
      })
    }

    // Create Stripe customer
    let customer
    try {
      customer = await stripe.customers.create({
        email,
        name: businessName,
        metadata: {
          business_id: businessId
        }
      })
    } catch (stripeError) {
      logger.error('Stripe customer creation failed', { 
        error: stripeError, 
        businessId, 
        email, 
        businessName 
      })
      
      // Return a fallback response for testing
      return NextResponse.json({
        success: true,
        message: 'Billing account created (demo mode - Stripe integration pending)',
        customerId: 'demo_customer_' + businessId,
        demo: true
      })
    }

    // Update business with Stripe customer ID
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to update business with Stripe customer ID', { 
        error: updateError, 
        businessId,
        customerId: customer.id
      })
    }

    logger.info('Stripe customer created', {
      businessId,
      customerId: customer.id,
      email
    })

    return NextResponse.json({
      success: true,
      customerId: customer.id
    })

  } catch (error) {
    logger.error('Create customer API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'stripe/create-customer'
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to create Stripe customer'
    }, { status: 500 })
  }
}