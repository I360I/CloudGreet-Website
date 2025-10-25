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

    // Check if customer already exists
    if (business.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        customerId: business.stripe_customer_id,
        message: 'Stripe customer already exists'
      })
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: business.email,
      name: business.business_name,
      phone: business.phone_number,
      metadata: {
        business_id: businessId,
        user_id: userId,
        business_type: business.business_type
      }
    })

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
        error: updateError.message,
        businessId,
        customerId: customer.id
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to save customer information'
      }, { status: 500 })
    }

    logger.info('Stripe customer created successfully', {
      businessId,
      userId,
      customerId: customer.id
    })

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Stripe customer created successfully'
    })

  } catch (error) {
    logger.error('Stripe customer creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to create Stripe customer'
    }, { status: 500 })
  }
}
