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
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json({
        success: false,
        message: 'Business ID is required'
      }, { status: 400 })
    }

    // Get business Stripe customer ID
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id, business_name, email')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for customer portal', { 
        error: businessError, 
        businessId
      })
      return NextResponse.json({
        success: false,
        message: 'Business not found'
      }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: 'No Stripe customer found. Please contact support.'
      }, { status: 400 })
    }

    // Create Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/billing`,
    })

    logger.info('Customer portal session created', {
      businessId,
      customerId: business.stripe_customer_id,
      sessionId: portalSession.id
    })

    return NextResponse.json({
      success: true,
      url: portalSession.url
    })

  } catch (error) {
    logger.error('Customer portal API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'stripe/customer-portal'
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to create customer portal session'
    }, { status: 500 })
  }
}
