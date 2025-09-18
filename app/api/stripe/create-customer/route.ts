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
    const { email, name, phone, address } = body

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      address: address ? {
        line1: address,
        country: 'US'
      } : undefined,
      metadata: {
        business_id: businessId,
        user_id: userId
      }
    })

    // Store Stripe customer ID in database
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single()

    if (businessError) {
      logger.error("Error", businessError, {
        requestId,
        businessId,
        userId,
        action: 'update_business_stripe_id'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update business with Stripe customer ID'
      }, { status: 500 })
    }

    // Log successful customer creation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'stripe_customer_created',
        details: {
          business_id: businessId,
          user_id: userId,
          stripe_customer_id: customer.id,
          email: customer.email
        },
        user_id: userId,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    await logger.info('Stripe customer created successfully', {
      requestId,
      businessId,
      userId,
      stripeCustomerId: customer.id,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Stripe customer created successfully',
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name
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
      endpoint: 'create_stripe_customer',
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      message: 'Failed to create Stripe customer'
    }, { status: 500 })
  }
}
