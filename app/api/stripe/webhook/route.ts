import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'
import Stripe from "stripe"
import { headers } from "next/headers"

// Initialize Stripe with real API key
const stripeKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
let stripe: Stripe | null = null

if (stripeKey && !stripeKey.includes('your-') && !stripeKey.includes('demo-')) {
  stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret || webhookSecret.includes('your-') || webhookSecret.includes('demo-')) {
      return NextResponse.json(
        { error: 'Stripe configuration not complete. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment variables.' },
        { status: 503 }
      )
    }

    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment succeeded:', invoice.id)
        
        // Check if this is a monthly booking charge
        if (invoice.metadata?.chargeType === 'monthly_booking_charge') {
          console.log('Monthly booking charge processed successfully')
        }
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', failedInvoice.id)
        
        // Handle failed payment - could send email notification, suspend service, etc.
        if (failedInvoice.metadata?.chargeType === 'monthly_booking_charge') {
          console.log('Monthly booking charge failed - user should be notified')
        }
        break

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', deletedSubscription.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
