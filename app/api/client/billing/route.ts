import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Client Billing API
 * 
 * GET: Get client's subscription status, billing history, and Stripe portal link
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = authResult.businessId

    // Get business with subscription info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, subscription_status, stripe_customer_id, created_at')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for billing', {
        businessId,
        error: businessError?.message
      })
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get billing summary from Stripe if customer exists
    let subscriptionStatus = business.subscription_status || 'inactive'
    let currentPeriodEnd: string | null = null
    let currentPeriodStart: string | null = null
    let cancelAtPeriodEnd = false
    let mrrCents = 0
    let nextInvoiceDate: string | null = null
    let nextInvoiceAmountCents = 0
    let portalUrl: string | null = null

    if (business.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16' as any
        })

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: business.stripe_customer_id,
          status: 'all',
          limit: 10
        })

        const activeSubscription = subscriptions.data.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        )

        if (activeSubscription) {
          subscriptionStatus = activeSubscription.status === 'trialing' ? 'trialing' : 'active'
          currentPeriodEnd = new Date(activeSubscription.current_period_end * 1000).toISOString()
          currentPeriodStart = new Date(activeSubscription.current_period_start * 1000).toISOString()
          cancelAtPeriodEnd = activeSubscription.cancel_at_period_end || false

          // Calculate MRR
          const price = activeSubscription.items.data[0]?.price
          if (price) {
            mrrCents = price.unit_amount || 0
          }

          // Get upcoming invoice
          try {
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: business.stripe_customer_id,
              subscription: activeSubscription.id
            })
            nextInvoiceDate = upcomingInvoice.period_end 
              ? new Date(upcomingInvoice.period_end * 1000).toISOString()
              : null
            nextInvoiceAmountCents = upcomingInvoice.amount_due || 0
          } catch (invoiceError) {
            // Upcoming invoice may not exist yet
            logger.debug('No upcoming invoice', { customerId: business.stripe_customer_id })
          }
        }

        // Create Stripe Customer Portal session
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: business.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/dashboard/billing`
          })
          portalUrl = session.url
        } catch (portalError) {
          logger.error('Failed to create Stripe portal session', {
            error: portalError instanceof Error ? portalError.message : 'Unknown error',
            customerId: business.stripe_customer_id
          })
        }
      } catch (stripeError) {
        logger.error('Stripe API error in billing endpoint', {
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
          businessId
        })
        // Continue without Stripe data
      }
    }

    // Get per-booking charges (from appointments)
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('created_at')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    const bookingsLast30Days = appointments?.length || 0
    const perBookingFeeCents = 5000 // $50 per booking
    const bookingFeesLast30DaysCents = bookingsLast30Days * perBookingFeeCents

    return NextResponse.json({
      success: true,
      billing: {
        subscriptionStatus,
        mrrCents,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        nextInvoiceDate,
        nextInvoiceAmountCents,
        bookingFeesLast30DaysCents,
        bookingsLast30Days,
        portalUrl
      }
    })
  } catch (error) {
    logger.error('Client billing API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to load billing information' },
      { status: 500 }
    )
  }
}
