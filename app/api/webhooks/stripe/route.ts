import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function handleStripeWebhook(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.warn('Stripe webhook signature missing')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('Stripe webhook signature verification failed', { error })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Stripe webhook received', { 
      type: event.type,
      id: event.id
    })

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('Subscription created', { subscriptionId: (event.data.object as Stripe.Subscription).id })
        break
      case 'customer.subscription.updated':
        console.log('Subscription updated', { subscriptionId: (event.data.object as Stripe.Subscription).id })
        break
      case 'customer.subscription.deleted':
        console.log('Subscription deleted', { subscriptionId: (event.data.object as Stripe.Subscription).id })
        break
      case 'invoice.payment_succeeded':
        console.log('Payment succeeded', { invoiceId: (event.data.object as Stripe.Invoice).id })
        break
      case 'invoice.payment_failed':
        console.log('Payment failed', { invoiceId: (event.data.object as Stripe.Invoice).id })
        break
      case 'customer.created':
        console.log('Customer created', { customerId: (event.data.object as Stripe.Customer).id })
        break
      case 'customer.updated':
        console.log('Customer updated', { customerId: (event.data.object as Stripe.Customer).id })
        break
      default:
        console.log('Unhandled Stripe event type', { type: event.type })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Stripe webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export const POST = handleStripeWebhook