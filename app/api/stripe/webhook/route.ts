import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      
      default:
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const businessId = subscription.metadata.business_id
    
    if (!businessId) {
      logger.error('No business_id in subscription metadata', { subscriptionId: subscription.id })
      return
    }

    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    logger.info('Subscription activated', { businessId, subscriptionId: subscription.id })
  } catch (error) {
    logger.error('Failed to handle subscription created', { error })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const businessId = subscription.metadata.business_id
    
    if (!businessId) {
      logger.error('No business_id in subscription metadata', { subscriptionId: subscription.id })
      return
    }

    const status = subscription.status === 'active' ? 'active' : 'inactive'

    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    logger.info('Subscription updated', { businessId, subscriptionId: subscription.id, status })
  } catch (error) {
    logger.error('Failed to handle subscription updated', { error })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const businessId = subscription.metadata.business_id
    
    if (!businessId) {
      logger.error('No business_id in subscription metadata', { subscriptionId: subscription.id })
      return
    }

    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    logger.info('Subscription cancelled', { businessId, subscriptionId: subscription.id })
  } catch (error) {
    logger.error('Failed to handle subscription deleted', { error })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const businessId = invoice.metadata.business_id
    
    if (!businessId) {
      logger.error('No business_id in invoice metadata', { invoiceId: invoice.id })
      return
    }

    // Log successful payment
    await supabaseAdmin
      .from('billing_history')
      .insert({
        business_id: businessId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert cents to dollars
        currency: invoice.currency,
        description: `Payment for ${invoice.description || 'Subscription'}`,
        status: 'paid',
        created_at: new Date().toISOString()
      })

    logger.info('Payment succeeded', { businessId, invoiceId: invoice.id, amount: invoice.amount_paid })
  } catch (error) {
    logger.error('Failed to handle payment succeeded', { error })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const businessId = invoice.metadata.business_id
    
    if (!businessId) {
      logger.error('No business_id in invoice metadata', { invoiceId: invoice.id })
      return
    }

    // Log failed payment
    await supabaseAdmin
      .from('billing_history')
      .insert({
        business_id: businessId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100, // Convert cents to dollars
        currency: invoice.currency,
        description: `Failed payment for ${invoice.description || 'Subscription'}`,
        status: 'failed',
        created_at: new Date().toISOString()
      })

    logger.info('Payment failed', { businessId, invoiceId: invoice.id, amount: invoice.amount_due })
  } catch (error) {
    logger.error('Failed to handle payment failed', { error })
  }
}