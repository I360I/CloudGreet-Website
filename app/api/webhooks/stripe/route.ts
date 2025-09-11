import { NextRequest, NextResponse } from 'next/server'
import { withPublic } from '@/lib/middleware'
import { Logger } from '@/lib/logger'
import { db } from '@/lib/database/connection'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function handleStripeWebhook(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      Logger.warn('Stripe webhook signature missing')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      Logger.error('Stripe webhook signature verification failed', { error })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    Logger.info('Stripe webhook received', { 
      type: event.type,
      id: event.id
    })

    // Handle different event types
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
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break
      default:
        Logger.info('Unhandled Stripe event type', { type: event.type })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    Logger.error('Stripe webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    await db.query(
      'INSERT INTO subscriptions (business_id, stripe_subscription_id, stripe_customer_id, plan_id, status, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        'temp-business-id', // This would come from customer metadata
        subscription.id,
        subscription.customer,
        subscription.items.data[0]?.price.id,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000)
      ]
    )

    Logger.info('Subscription created', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    })
  } catch (error) {
    Logger.error('Error handling subscription created', { error, subscriptionId: subscription.id })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await db.query(
      'UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3, cancel_at_period_end = $4 WHERE stripe_subscription_id = $5',
      [
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.id
      ]
    )

    Logger.info('Subscription updated', { 
      subscriptionId: subscription.id,
      status: subscription.status
    })
  } catch (error) {
    Logger.error('Error handling subscription updated', { error, subscriptionId: subscription.id })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await db.query(
      'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
      ['canceled', subscription.id]
    )

    Logger.info('Subscription deleted', { subscriptionId: subscription.id })
  } catch (error) {
    Logger.error('Error handling subscription deleted', { error, subscriptionId: subscription.id })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    Logger.info('Payment succeeded', { 
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid
    })

    // Update subscription status if needed
    if (invoice.subscription) {
      await db.query(
        'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
        ['active', invoice.subscription]
      )
    }
  } catch (error) {
    Logger.error('Error handling payment succeeded', { error, invoiceId: invoice.id })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    Logger.warn('Payment failed', { 
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_due
    })

    // Update subscription status
    if (invoice.subscription) {
      await db.query(
        'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
        ['past_due', invoice.subscription]
      )
    }
  } catch (error) {
    Logger.error('Error handling payment failed', { error, invoiceId: invoice.id })
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    Logger.info('Customer created', { 
      customerId: customer.id,
      email: customer.email
    })
  } catch (error) {
    Logger.error('Error handling customer created', { error, customerId: customer.id })
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    Logger.info('Customer updated', { 
      customerId: customer.id,
      email: customer.email
    })
  } catch (error) {
    Logger.error('Error handling customer updated', { error, customerId: customer.id })
  }
}

export const POST = withPublic(handleStripeWebhook)