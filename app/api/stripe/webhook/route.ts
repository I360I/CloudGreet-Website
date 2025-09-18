import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      logger.error("Error", err as Error, {
        requestId,
        endpoint: 'stripe_webhook',
        action: 'webhook_verification_failed'
      })
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, requestId)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, requestId)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, requestId)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, requestId)
        break
      
      default:
        await logger.info('Unhandled Stripe webhook event', {
          requestId,
          eventType: event.type
        })
    }

    await logger.info('Stripe webhook processed successfully', {
      requestId,
      eventType: event.type,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error("Error", error as Error, {
      requestId,
      endpoint: 'stripe_webhook',
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, requestId: string) {
  const businessId = subscription.metadata.business_id
  const userId = subscription.metadata.user_id

  if (!businessId || !userId) {
    logger.error("Error", new Error('Missing metadata in subscription'), {
      requestId,
      subscriptionId: subscription.id
    })
    return
  }

  await supabase
    .from('businesses')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId)

  await supabase
    .from('audit_logs')
    .insert({
      action: 'subscription_updated',
      details: {
        business_id: businessId,
        user_id: userId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      },
      user_id: userId,
      business_id: businessId,
      created_at: new Date().toISOString()
    })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, requestId: string) {
  const businessId = subscription.metadata.business_id
  const userId = subscription.metadata.user_id

  if (!businessId || !userId) {
    logger.error("Error", new Error('Missing metadata in subscription'), {
      requestId,
      subscriptionId: subscription.id
    })
    return
  }

  await supabase
    .from('businesses')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId)

  await supabase
    .from('audit_logs')
    .insert({
      action: 'subscription_cancelled',
      details: {
        business_id: businessId,
        user_id: userId,
        stripe_subscription_id: subscription.id
      },
      user_id: userId,
      business_id: businessId,
      created_at: new Date().toISOString()
    })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, requestId: string) {
  const subscriptionId = invoice.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  const businessId = subscription.metadata.business_id
  const userId = subscription.metadata.user_id

  if (!businessId || !userId) {
    logger.error("Error", new Error('Missing metadata in subscription'), {
      requestId,
      subscriptionId: subscription.id
    })
    return
  }

  await supabase
    .from('audit_logs')
    .insert({
      action: 'payment_succeeded',
      details: {
        business_id: businessId,
        user_id: userId,
        stripe_subscription_id: subscription.id,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency
      },
      user_id: userId,
      business_id: businessId,
      created_at: new Date().toISOString()
    })
}

async function handlePaymentFailed(invoice: Stripe.Invoice, requestId: string) {
  const subscriptionId = invoice.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  const businessId = subscription.metadata.business_id
  const userId = subscription.metadata.user_id

  if (!businessId || !userId) {
    logger.error("Error", new Error('Missing metadata in subscription'), {
      requestId,
      subscriptionId: subscription.id
    })
    return
  }

  await supabase
    .from('businesses')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId)

  await supabase
    .from('audit_logs')
    .insert({
      action: 'payment_failed',
      details: {
        business_id: businessId,
        user_id: userId,
        stripe_subscription_id: subscription.id,
        amount_due: invoice.amount_due,
        currency: invoice.currency
      },
      user_id: userId,
      business_id: businessId,
      created_at: new Date().toISOString()
    })
}
