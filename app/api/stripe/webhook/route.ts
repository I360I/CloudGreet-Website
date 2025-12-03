import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Stripe Webhook Handler
 * 
 * Handles critical Stripe events:
 * - checkout.session.completed → Activate subscription
 * - customer.subscription.created → Create subscription record
 * - customer.subscription.updated → Update subscription status
 * - customer.subscription.deleted → Cancel subscription
 * - invoice.payment_succeeded → Log successful payment
 * - invoice.payment_failed → Notify of payment failure
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Get Stripe signature from headers
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      logger.warn('Stripe webhook missing signature')
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature using Stripe SDK
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { success: false, error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Initialize Stripe client
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16' as any
    })

    let event: Stripe.Event
    
    try {
      // Verify signature and construct event
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      )
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error'
      })
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Check for idempotency (prevent duplicate processing)
    const eventId = event.id
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .eq('provider', 'stripe')
      .single()

    // If event already exists, skip (idempotency check)
    if (existingEvent) {
      logger.info('Stripe webhook event already processed', { eventId })
      return NextResponse.json({ success: true, message: 'Event already processed' })
    }

      // Claim the event by inserting it (processed_at will be updated after successful processing)
      const now = new Date().toISOString()
      const { error: insertError } = await supabaseAdmin
        .from('webhook_events')
        .insert({
          event_id: eventId,
          provider: 'stripe',
          event_type: event.type,
          processed_at: now, // Claim timestamp, will be updated after processing
          created_at: now
        })
      
      if (insertError) {
        // If insert fails (e.g., race condition), treat as already processed
        logger.warn('Failed to claim webhook event (may be duplicate)', {
          error: insertError.message || JSON.stringify(insertError),
          eventId
        })
        // Don't throw - if it's a duplicate, we'll handle it gracefully
      }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        logger.info('Unhandled Stripe webhook event type', { type: event.type })
    }

    // Mark event as processed
    const { error: updateError } = await supabaseAdmin
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('provider', 'stripe')
    
    if (updateError) {
      logger.warn('Failed to update webhook event status', {
        error: updateError.message || JSON.stringify(updateError),
        eventId
      })
    }

    return NextResponse.json({ success: true, received: true })

  } catch (error) {
    logger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout session completed
 * Updates business subscription status and activates subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const businessId = session.metadata?.business_id
    const customerId = session.customer as string

    if (!businessId) {
      logger.warn('Checkout session missing business_id', { sessionId: session.id })
      return
    }

    // Update business with subscription status
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'active',
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to update business subscription status', {
        error: updateError.message,
        businessId,
        sessionId: session.id
      })
      return
    }

    logger.info('Business subscription activated', {
      businessId,
      customerId,
      sessionId: session.id
    })

  } catch (error) {
    logger.error('Error handling checkout completed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: session.id
    })
  }
}

/**
 * Handle subscription created
 * Creates subscription record in database
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Find business by Stripe customer ID
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (businessError || !business) {
      logger.warn('Business not found for subscription', {
        customerId,
        subscriptionId: subscription.id
      })
      return
    }

    // Create or update subscription record
    const { error: subError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .upsert({
        business_id: business.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stripe_subscription_id'
      })

    if (subError) {
      logger.error('Failed to create subscription record', {
        error: subError.message,
        businessId: business.id,
        subscriptionId: subscription.id
      })
      return
    }

    // Update business subscription status
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', business.id)

    logger.info('Subscription created', {
      businessId: business.id,
      subscriptionId: subscription.id,
      status: subscription.status
    })

  } catch (error) {
    logger.error('Error handling subscription created', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subscriptionId: subscription.id
    })
  }
}

/**
 * Handle subscription updated
 * Updates subscription status and period dates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Find business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (businessError || !business) {
      logger.warn('Business not found for subscription update', {
        customerId,
        subscriptionId: subscription.id
      })
      return
    }

    // Update subscription record
    const { error: subError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (subError) {
      logger.error('Failed to update subscription', {
        error: subError.message,
        subscriptionId: subscription.id
      })
    }

    // Update business subscription status
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', business.id)

    logger.info('Subscription updated', {
      businessId: business.id,
      subscriptionId: subscription.id,
      status: subscription.status
    })

  } catch (error) {
    logger.error('Error handling subscription updated', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subscriptionId: subscription.id
    })
  }
}

/**
 * Handle subscription deleted
 * Marks subscription as cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Find business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (businessError || !business) {
      logger.warn('Business not found for subscription deletion', {
        customerId,
        subscriptionId: subscription.id
      })
      return
    }

    // Update subscription status
    await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Update business subscription status
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', business.id)

    logger.info('Subscription cancelled', {
      businessId: business.id,
      subscriptionId: subscription.id
    })

  } catch (error) {
    logger.error('Error handling subscription deleted', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subscriptionId: subscription.id
    })
  }
}

/**
 * Handle invoice payment succeeded
 * Logs successful payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    const amount = invoice.amount_paid / 100 // Convert from cents to dollars

    // Find business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (businessError || !business) {
      logger.warn('Business not found for invoice payment', {
        customerId,
        invoiceId: invoice.id
      })
      return
    }

    // Log payment in billing history
    await supabaseAdmin
      .from('billing_history')
      .insert({
        business_id: business.id,
        amount,
        currency: invoice.currency.toUpperCase(),
        description: `Payment for ${invoice.description || 'subscription'}`,
        billing_type: 'subscription',
        stripe_payment_intent_id: invoice.payment_intent as string,
        status: 'paid',
        created_at: new Date().toISOString()
      })

    logger.info('Invoice payment succeeded', {
      businessId: business.id,
      invoiceId: invoice.id,
      amount
    })

  } catch (error) {
    logger.error('Error handling invoice payment succeeded', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoiceId: invoice.id
    })
  }
}

/**
 * Handle invoice payment failed
 * Notifies business of payment failure
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string

    // Find business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, owner_email')
      .eq('stripe_customer_id', customerId)
      .single()

    if (businessError || !business) {
      logger.warn('Business not found for invoice payment failure', {
        customerId,
        invoiceId: invoice.id
      })
      return
    }

    // Update subscription status if needed
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', business.id)

    // Send email notification to business owner
    if (business.owner_email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
        const amount = (invoice.amount_due / 100).toFixed(2)
        const invoiceUrl = `https://dashboard.stripe.com/invoices/${invoice.id}`
        
        await resend.emails.send({
          from: fromEmail,
          to: business.owner_email,
          subject: `Payment Failed - Action Required for ${business.business_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #dc2626;">Payment Failed - Action Required</h2>
              
              <p>Hi there,</p>
              
              <p>We were unable to process your payment of <strong>$${amount}</strong> for your CloudGreet subscription.</p>
              
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;"><strong>Your subscription is now past due.</strong></p>
                <p style="margin: 8px 0 0 0; color: #991b1b;">Please update your payment method to avoid service interruption.</p>
              </div>
              
              <div style="margin: 24px 0;">
                <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Update Payment Method
                </a>
              </div>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Invoice Details</h3>
                <p style="margin: 4px 0;"><strong>Invoice ID:</strong> ${invoice.id}</p>
                <p style="margin: 4px 0;"><strong>Amount Due:</strong> $${amount}</p>
                <p style="margin: 4px 0;"><strong>Due Date:</strong> ${new Date(invoice.due_date * 1000).toLocaleDateString()}</p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                If you have any questions, please contact support at <a href="mailto:support@cloudgreet.com">support@cloudgreet.com</a> or call (833) 395-6731.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Best regards,<br>
                The CloudGreet Team
              </p>
            </div>
          `,
          text: `
Payment Failed - Action Required

Hi there,

We were unable to process your payment of $${amount} for your CloudGreet subscription.

Your subscription is now past due. Please update your payment method to avoid service interruption.

Update Payment Method: ${invoiceUrl}

Invoice Details:
- Invoice ID: ${invoice.id}
- Amount Due: $${amount}
- Due Date: ${new Date(invoice.due_date * 1000).toLocaleDateString()}

If you have any questions, please contact support at support@cloudgreet.com or call (833) 395-6731.

Best regards,
The CloudGreet Team
          `
        })

        logger.info('Payment failure email sent', {
          businessId: business.id,
          email: business.owner_email,
          invoiceId: invoice.id
        })
      } catch (emailError) {
        logger.error('Failed to send payment failure email', {
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          businessId: business.id,
          invoiceId: invoice.id
        })
        // Don't fail the webhook if email fails
      }
    }

    logger.warn('Invoice payment failed', {
      businessId: business.id,
      invoiceId: invoice.id,
      amount: invoice.amount_due / 100
    })

  } catch (error) {
    logger.error('Error handling invoice payment failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoiceId: invoice.id
    })
  }
}


