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
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Billing service not configured. Please contact support.'
      }, { status: 503 })
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Decode JWT token
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

    // Get business info from database
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, email, stripe_customer_id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    const { business_name, email } = business

    if (!email || !business_name) {
      return NextResponse.json({
        success: false,
        message: 'Business email and name are required'
      }, { status: 400 })
    }

    // Check if customer already exists
    if (business.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        customerId: business.stripe_customer_id,
        message: 'Customer already exists'
      })
    }

    // Create Stripe customer
    let customer
    try {
      customer = await stripe.customers.create({
        email,
        name: business_name,
        metadata: {
          business_id: businessId
        }
      })
    } catch (stripeError) {
      logger.error('Stripe customer creation failed', { 
        error: stripeError, 
        businessId, 
        email, 
        businessName: business_name 
      })
      
      throw new Error(`Stripe customer creation failed: ${stripeError}`)
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
