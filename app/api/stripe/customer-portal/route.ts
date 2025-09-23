import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get business and customer info from database
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('stripe_customer_id, user_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for portal', businessError, { businessId })
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!business.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing`,
    })

    // Log the portal access
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'customer_portal_accessed',
        details: {
          business_id: businessId,
          user_id: business.user_id,
          stripe_customer_id: business.stripe_customer_id,
          portal_session_id: portalSession.id
        },
        user_id: business.user_id,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    logger.info('Stripe Customer Portal session created', {
      businessId,
      userId: business.user_id,
      portalSessionId: portalSession.id
    })

    return NextResponse.json({ 
      url: portalSession.url 
    })

  } catch (error) {
    logger.error('Stripe Customer Portal error', error as Error, { 
      endpoint: 'customer-portal',
      businessId: (await request.json().catch(() => ({}))).businessId
    })
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
