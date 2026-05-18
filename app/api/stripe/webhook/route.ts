import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { getStripeClient } from '@/lib/billing/stripe-client'

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

 // Stripe fires both `invoice.payment_succeeded` (legacy) and
 // `invoice.paid` (newer) for the same event. Endpoints subscribed
 // to either get the notification; we handle both so commission
 // credit isn't dependent on which the dashboard happens to send.
 // The webhook_events idempotency table de-dupes so we don't double
 // credit when both fire.
 case 'invoice.payment_succeeded':
 case 'invoice.paid': {
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
 const customerId = session.customer as string

 // Rep self-serve path: when a rep-generated payment link is paid,
 // the session has `metadata.cloudgreet_close_id` set but no
 // `cloudgreet_business_id` yet (we hadn't provisioned the business
 // when the link was created). Run the convert flow inline so the
 // rest of this handler can proceed as if a business existed all
 // along. Idempotent - safe to re-run on Stripe retries.
 const closeId = session.metadata?.cloudgreet_close_id as string | undefined
 let businessIdFromClose: string | null = null
 if (closeId) {
   try {
     const { convertCloseToClient } = await import('@/lib/sales/convert-close')
     const result = await convertCloseToClient({
       closeId,
       stripeCustomerId: customerId,
       markPaid: true,
     })
     if (result.ok === true) {
       businessIdFromClose = result.data.business.id
       logger.info('Auto-converted close from rep checkout', {
         sessionId: session.id, closeId, businessId: businessIdFromClose,
       })
       // If a brand-new user was created here (temp_password is non-
       // empty), email them the login. When temp_password is '' the
       // user already existed (rep ran "Send booking link" earlier
       // and the prospect already has the login email).
       if (result.data.temp_password && result.data.user.email) {
         await sendPostPaymentLoginEmail({
           email: result.data.user.email,
           tempPassword: result.data.temp_password,
           businessName: result.data.business.business_name,
         }).catch((e) => {
           logger.warn('Post-payment login email failed', {
             error: e instanceof Error ? e.message : 'Unknown',
           })
         })
       }
     } else if (result.ok === false) {
       logger.error('Auto-convert close failed', {
         sessionId: session.id, closeId, error: result.error,
       })
     }
   } catch (e) {
     logger.error('Auto-convert close threw', {
       sessionId: session.id, closeId,
       error: e instanceof Error ? e.message : 'Unknown',
     })
   }
 }

 // Admin-generated links use `cloudgreet_business_id`; the older signup
 // flow used plain `business_id`. Accept either so historical and current
 // sessions both resolve.
 const businessId =
  businessIdFromClose ||
  (session.metadata?.cloudgreet_business_id as string | undefined) ||
  (session.metadata?.business_id as string | undefined)

 if (!businessId) {
 logger.warn('Checkout session missing business id metadata', { sessionId: session.id })
 return
 }

 // Pull the live subscription so we use Stripe's actual status (so a
 // trialing sub stays "trialing" instead of being force-flipped to
 // "active"). If we can't fetch it, fall back to "active" - the next
 // customer.subscription.updated event will reconcile.
 let resolvedStatus: string = 'active'
 if (session.subscription) {
  try {
   const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
   const stripe = getStripeClient()
   const sub = await stripe.subscriptions.retrieve(subId)
   resolvedStatus = sub.status
  } catch (e) {
   logger.warn('Failed to retrieve subscription on checkout completion', {
    sessionId: session.id, error: e instanceof Error ? e.message : 'Unknown',
   })
  }
 }

 // Update business with subscription status
 const { error: updateError } = await supabaseAdmin
 .from('businesses')
 .update({
 subscription_status: resolvedStatus,
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
 .select('id, rep_id')
 .eq('stripe_customer_id', customerId)
 .single()

 if (businessError || !business) {
 logger.warn('Business not found for subscription', {
 customerId,
 subscriptionId: subscription.id
 })
 return
 }

 // Safety net: when the subscription becomes active or trialing, flip
 // any matching close out of invoice_sent → paid. Normally the
 // invoice.payment_succeeded handler does this, but \$0 trial subs
 // (100% off coupons) don't always fire that event; subscription.created
 // is more reliable for those.
 if (business.rep_id && (subscription.status === 'active' || subscription.status === 'trialing')) {
 try {
 await supabaseAdmin
  .from('closes')
  .update({ status: 'paid', updated_at: new Date().toISOString() })
  .eq('business_id', business.id)
  .in('status', ['invoice_sent', 'pending'])
 } catch (e) {
 logger.warn('subscription.created → close.status flip failed', {
  error: e instanceof Error ? e.message : 'Unknown', businessId: business.id,
 })
 }
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

 // Find business + rep_id (rep_id is set when admin uses
 // "Convert close to client", which is the path that flows
 // commissions to the right rep).
 const { data: business, error: businessError } = await supabaseAdmin
 .from('businesses')
 .select('id, rep_id')
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

 // Commission ledger - the source of truth for what we owe each rep.
 // We split each invoice into MRR (recurring subscription line items)
 // and setup_fee (one-off invoiceitem lines), credit 50% of each
 // bucket to the rep, and rely on UNIQUE(invoice_id, source_type) to
 // prevent double-credits on Stripe webhook retries.
 await creditRepCommission(invoice, business)

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

const COMMISSION_PCT = 0.5

/**
 * Splits the invoice into MRR vs setup_fee buckets, credits 50% of
 * each to the business's rep, and writes one ledger row per bucket.
 * Idempotent via the (source_invoice_id, source_type) unique index.
 *
 * Classification rule:
 *   line.type === 'subscription' OR line has a recurring price → MRR
 *   anything else (proration, one-off invoiceitem)               → setup_fee
 */
async function creditRepCommission(
 invoice: Stripe.Invoice,
 business: { id: string; rep_id: string | null },
): Promise<void> {
 if (!business.rep_id) return // not a rep-sourced client
 if (!invoice.id) return

 // Mark the close as paid the first time we see its invoice. Match
 // the close by business_id (set during convert-to-client). Doing
 // this here keeps the rep's "In flight" → "Paid" transition tied
 // to actual payment, not admin clicks.
 try {
  await supabaseAdmin
   .from('closes')
   .update({ status: 'paid', updated_at: new Date().toISOString() })
   .eq('business_id', business.id)
   .in('status', ['invoice_sent', 'pending'])
 } catch (e) {
  logger.warn('Failed to advance close.status=paid (non-fatal)', {
   error: e instanceof Error ? e.message : 'Unknown',
   businessId: business.id,
  })
 }

 // Sum gross MRR vs setup-fee line amounts (pre-discount), then scale
 // them down by `invoice.amount_paid / total_gross` so commission is
 // computed off what Stripe actually COLLECTED, not the sticker price.
 // Without this, applying a discount code to a $1000 setup fee that
 // collected $10 still credited the rep $500. Proportional scaling
 // splits the discount across MRR and setup the same way Stripe does.
 //
 // Subscription line items have type='subscription' (legacy API) or a
 // recurring price (new). One-off `invoiceitem` lines are setup-fees.
 let mrrGross = 0
 let setupGross = 0
 const lines = invoice.lines?.data || []
 for (const line of lines) {
  const cents = line.amount || 0
  if (cents <= 0) continue // skip $0 / credit lines
  const isRecurring =
   (line as any).type === 'subscription' ||
   !!(line.price as any)?.recurring
  if (isRecurring) mrrGross += cents
  else setupGross += cents
 }
 const totalGross = mrrGross + setupGross
 const actualPaid = invoice.amount_paid || 0

 // Walk from gross sticker → amount_paid (post-discount) → net deposit
 // (post-Stripe-fees). Commission has to be computed off the NET,
 // because the platform never sees the Stripe fee. With a 50/50 split
 // on a $20 sale that nets $18.97, the rep should earn $9.485 — not
 // $10 (which would have us losing money on every sale).
 //
 // Pull the charge's balance_transaction; that's the only place Stripe
 // exposes the fee at webhook time. If the BT isn't available yet
 // (rare for invoice.payment_succeeded but possible right at the
 // billing-engine boundary) we fall back to amount_paid - a small
 // overpayment is better than zeroing out the rep.
 let netCents = actualPaid
 try {
  const chargeRef = (invoice as any).charge as string | Stripe.Charge | null | undefined
  const chargeId = typeof chargeRef === 'string' ? chargeRef : chargeRef?.id || null
  if (chargeId) {
   const charge = await stripe.charges.retrieve(chargeId, {
    expand: ['balance_transaction'],
   })
   const bt = charge.balance_transaction as Stripe.BalanceTransaction | null
   if (bt && typeof bt.net === 'number' && bt.net > 0) {
    netCents = bt.net
   }
  }
 } catch (e) {
  logger.warn('balance_transaction lookup failed - commissioning on amount_paid', {
   invoiceId: invoice.id,
   error: e instanceof Error ? e.message : 'Unknown',
  })
 }

 // If net is 0 (fully discounted invoice that Stripe still marks
 // paid), no commission. If gross was 0, fall through to skip.
 const scale = totalGross > 0 ? netCents / totalGross : 0
 const mrrCents = Math.round(mrrGross * scale)
 const setupCents = Math.round(setupGross * scale)

 const earnedAt = invoice.status_transitions?.paid_at
  ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
  : new Date().toISOString()

 const rows: Array<{
  rep_id: string
  business_id: string
  source_type: 'mrr' | 'setup_fee'
  source_invoice_id: string
  gross_paid_cents: number
  commission_cents: number
  earned_at: string
 }> = []

 if (mrrCents > 0) {
  rows.push({
   rep_id: business.rep_id,
   business_id: business.id,
   source_type: 'mrr',
   source_invoice_id: invoice.id,
   gross_paid_cents: mrrCents,
   commission_cents: Math.round(mrrCents * COMMISSION_PCT),
   earned_at: earnedAt,
  })
 }
 if (setupCents > 0) {
  rows.push({
   rep_id: business.rep_id,
   business_id: business.id,
   source_type: 'setup_fee',
   source_invoice_id: invoice.id,
   gross_paid_cents: setupCents,
   commission_cents: Math.round(setupCents * COMMISSION_PCT),
   earned_at: earnedAt,
  })
 }

 if (rows.length === 0) return

 // Try to attach the close_id when we can find one for this business.
 // Best-effort; the ledger row is the source of truth so this is
 // metadata only.
 const { data: openClose } = await supabaseAdmin
  .from('closes')
  .select('id')
  .eq('business_id', business.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

 const enriched = rows.map((r) => openClose?.id ? { ...r, close_id: openClose.id } : r)

 const { error } = await supabaseAdmin
  .from('commission_ledger')
  .upsert(enriched, {
   onConflict: 'source_invoice_id,source_type',
   ignoreDuplicates: true,
  })
 if (error) {
  logger.error('Commission ledger insert failed', {
   error: error.message,
   invoiceId: invoice.id,
   repId: business.rep_id,
  })
 } else {
  logger.info('Commission credited', {
   repId: business.rep_id,
   businessId: business.id,
   mrrCents,
   setupCents,
   commissionCents: rows.reduce((s, r) => s + r.commission_cents, 0),
  })

  // In-app notifications for the moment of truth: rep gets paid, admin
  // sees the close convert. Best-effort, never blocks the webhook.
  const { notifyAdmin, notifyRep } = await import('@/lib/notifications/notify')
  const totalCommission = rows.reduce((s, r) => s + r.commission_cents, 0)
  const grossDollars = `$${((mrrCents + setupCents) / 100).toFixed(0)}`
  const commissionDollars = `$${(totalCommission / 100).toFixed(0)}`
  // Pull the business name for nicer copy.
  const { data: bizRow } = await supabaseAdmin
   .from('businesses')
   .select('business_name')
   .eq('id', business.id)
   .maybeSingle()
  const bizName = (bizRow as any)?.business_name || 'a client'

  await notifyRep(business.rep_id, {
   type: 'commission_credited',
   title: `${commissionDollars} commission credited`,
   body: `${bizName} just paid ${grossDollars}. Your half is locked in - payouts run Friday.`,
   link: '/sales/earnings',
   severity: 'success',
   icon: 'dollar-sign',
   metadata: {
    business_id: business.id,
    invoice_id: invoice.id,
    commission_cents: totalCommission,
   },
  })

  await notifyAdmin({
   type: 'invoice_paid',
   title: `${bizName} paid ${grossDollars}`,
   body: `Commission ${commissionDollars} credited to rep.`,
   link: `/admin/clients/${business.id}`,
   severity: 'success',
   metadata: {
    business_id: business.id,
    invoice_id: invoice.id,
    rep_id: business.rep_id,
    gross_cents: mrrCents + setupCents,
    commission_cents: totalCommission,
   },
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
 If you have any questions, reply to this email${process.env.SUPPORT_EMAIL ? ` or write to <a href="mailto:${process.env.SUPPORT_EMAIL}">${process.env.SUPPORT_EMAIL}</a>` : ''}.
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

If you have any questions, reply to this email${process.env.SUPPORT_EMAIL ? ` or write to ${process.env.SUPPORT_EMAIL}` : ''}.

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



/**
 * After a Stripe checkout that auto-provisions a new client (rep
 * went straight to "Send payment link" without a prior booking-link
 * email), the prospect needs their login. Sends them the same
 * branded HTML format reps see from /api/sales/leads/[id]/send-onboarding.
 */
async function sendPostPaymentLoginEmail({
 email, tempPassword, businessName,
}: {
 email: string
 tempPassword: string
 businessName: string
}): Promise<void> {
 const resendKey = process.env.RESEND_API_KEY
 if (!resendKey) return
 const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
 const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
 const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
 const loginUrl = `${baseUrl}/login`
 const escape = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
 const text =
`Your CloudGreet account

Sign in:  ${loginUrl}
Email:    ${email}
Password: ${tempPassword}
`
 const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet</div>
          <div style="font-size:20px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">Your account is ready.</div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;line-height:1.6;">
            <tr><td style="padding:6px 0;color:#6b7280;width:90px;">Sign in</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#111827;text-decoration:none;border-bottom:1px solid #d1d5db;">${loginUrl.replace(/^https?:\/\//, '')}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111827;">${escape(email)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Password</td><td style="padding:6px 0;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;color:#111827;">${escape(tempPassword)}</td></tr>
          </table>
          <div style="font-size:13px;color:#374151;line-height:1.6;margin-top:18px;">
            Welcome to CloudGreet, ${escape(businessName)}. Your AI receptionist is being set up - your sales rep will reach out shortly to wire up call forwarding + walk through the dashboard.
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
            CloudGreet · AI receptionist for service businesses
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
 const resend = new Resend(resendKey)
 await resend.emails.send({
  from: `CloudGreet <${fromEmail}>`,
  to: email,
  replyTo,
  subject: 'Your CloudGreet account',
  text,
  html,
 })
}
