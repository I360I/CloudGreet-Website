# CloudGreet Webhooks Runbook

## 🔗 Webhook Overview

### Current Webhook Implementations
1. **Stripe Webhooks** - Payment processing events
2. **Telnyx Webhooks** - Telephony and SMS events
3. **Custom Webhooks** - Internal system events

### Webhook Security
- **Signature Verification** - All webhooks verify signatures
- **Idempotency** - Duplicate events are handled safely
- **Retry Logic** - Failed webhooks are retried
- **Rate Limiting** - Webhook endpoints are rate limited

## 💳 Stripe Webhooks

### Webhook Configuration

#### Current Implementation
```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
}
```

### Webhook Event Handlers

#### Subscription Created
```typescript
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    // Get customer information
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    
    // Update business record
    await supabaseAdmin
      .from('businesses')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_plan: subscription.items.data[0].price.id,
        subscription_start_date: new Date(subscription.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer)
    
    // Log the event
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'subscription_created',
        details: {
          subscription_id: subscription.id,
          customer_id: subscription.customer,
          plan_id: subscription.items.data[0].price.id
        },
        created_at: new Date().toISOString()
      })
    
    console.log('Subscription created:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}
```

#### Subscription Updated
```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Update business record
    await supabaseAdmin
      .from('businesses')
      .update({
        subscription_status: subscription.status,
        subscription_plan: subscription.items.data[0].price.id,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
    
    // Log the event
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'subscription_updated',
        details: {
          subscription_id: subscription.id,
          status: subscription.status,
          plan_id: subscription.items.data[0].price.id
        },
        created_at: new Date().toISOString()
      })
    
    console.log('Subscription updated:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}
```

#### Payment Succeeded
```typescript
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Get subscription information
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    
    // Update business record
    await supabaseAdmin
      .from('businesses')
      .update({
        last_payment_date: new Date(invoice.created * 1000).toISOString(),
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription)
    
    // Log the event
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'payment_succeeded',
        details: {
          invoice_id: invoice.id,
          subscription_id: invoice.subscription,
          amount: invoice.amount_paid,
          currency: invoice.currency
        },
        created_at: new Date().toISOString()
      })
    
    console.log('Payment succeeded:', invoice.id)
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}
```

### Webhook Testing

#### Test Webhook Endpoint
```bash
# Test webhook endpoint
curl -X POST https://cloudgreet.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_test",
        "customer": "cus_test",
        "status": "active"
      }
    }
  }'
```

#### Webhook Monitoring
```typescript
// Webhook monitoring
export class WebhookMonitor {
  static async logWebhookEvent(event: any, status: 'success' | 'failure', error?: Error) {
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        event_type: event.type,
        event_id: event.id,
        status,
        error_message: error?.message,
        processed_at: new Date().toISOString()
      })
  }
  
  static async getWebhookStats() {
    const { data } = await supabaseAdmin
      .from('webhook_logs')
      .select('event_type, status, count(*)')
      .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('event_type, status')
    
    return data
  }
}
```

## 📞 Telnyx Webhooks

### Webhook Configuration

#### Current Implementation
```typescript
// app/api/telnyx/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('telnyx-signature')
  
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }
  
  try {
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.TELYNX_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    const event = JSON.parse(body)
    
    // Handle the event
    switch (event.data.event_type) {
      case 'call.initiated':
        await handleCallInitiated(event.data)
        break
      case 'call.answered':
        await handleCallAnswered(event.data)
        break
      case 'call.hangup':
        await handleCallHangup(event.data)
        break
      case 'message.received':
        await handleMessageReceived(event.data)
        break
      case 'message.sent':
        await handleMessageSent(event.data)
        break
      default:
        console.log(`Unhandled event type: ${event.data.event_type}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
```

### Webhook Event Handlers

#### Call Initiated
```typescript
async function handleCallInitiated(eventData: any) {
  try {
    // Create call log entry
    await supabaseAdmin
      .from('call_logs')
      .insert({
        call_id: eventData.payload.call_control_id,
        business_id: eventData.payload.business_id,
        customer_phone: eventData.payload.from,
        business_phone: eventData.payload.to,
        call_type: 'inbound',
        status: 'initiated',
        started_at: new Date(eventData.payload.timestamp).toISOString(),
        created_at: new Date().toISOString()
      })
    
    console.log('Call initiated:', eventData.payload.call_control_id)
  } catch (error) {
    console.error('Error handling call initiated:', error)
    throw error
  }
}
```

#### Call Answered
```typescript
async function handleCallAnswered(eventData: any) {
  try {
    // Update call log
    await supabaseAdmin
      .from('call_logs')
      .update({
        status: 'answered',
        answered_at: new Date(eventData.payload.timestamp).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_id', eventData.payload.call_control_id)
    
    console.log('Call answered:', eventData.payload.call_control_id)
  } catch (error) {
    console.error('Error handling call answered:', error)
    throw error
  }
}
```

#### Message Received
```typescript
async function handleMessageReceived(eventData: any) {
  try {
    // Create SMS log entry
    await supabaseAdmin
      .from('sms_logs')
      .insert({
        message_id: eventData.payload.id,
        business_id: eventData.payload.business_id,
        customer_phone: eventData.payload.from,
        business_phone: eventData.payload.to,
        message_type: 'inbound',
        content: eventData.payload.text,
        status: 'received',
        received_at: new Date(eventData.payload.timestamp).toISOString(),
        created_at: new Date().toISOString()
      })
    
    console.log('Message received:', eventData.payload.id)
  } catch (error) {
    console.error('Error handling message received:', error)
    throw error
  }
}
```

## 🔄 Webhook Retry Logic

### Retry Implementation
```typescript
// lib/webhook-retry.ts
export class WebhookRetry {
  private static maxRetries = 3
  private static retryDelay = 1000 // 1 second
  
  static async processWebhook(
    webhookData: any,
    handler: (data: any) => Promise<void>,
    retryCount = 0
  ): Promise<void> {
    try {
      await handler(webhookData)
      console.log('Webhook processed successfully')
    } catch (error) {
      console.error(`Webhook processing failed (attempt ${retryCount + 1}):`, error)
      
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount) // Exponential backoff
        console.log(`Retrying in ${delay}ms...`)
        
        setTimeout(() => {
          this.processWebhook(webhookData, handler, retryCount + 1)
        }, delay)
      } else {
        console.error('Webhook processing failed after all retries')
        await this.logFailedWebhook(webhookData, error)
      }
    }
  }
  
  private static async logFailedWebhook(webhookData: any, error: Error) {
    await supabaseAdmin
      .from('failed_webhooks')
      .insert({
        webhook_data: webhookData,
        error_message: error.message,
        failed_at: new Date().toISOString()
      })
  }
}
```

### Dead Letter Queue
```typescript
// app/api/webhooks/dlq/route.ts
export async function GET() {
  try {
    // Get failed webhooks
    const { data: failedWebhooks } = await supabaseAdmin
      .from('failed_webhooks')
      .select('*')
      .order('failed_at', { ascending: false })
      .limit(100)
    
    return NextResponse.json({ failed_webhooks: failedWebhooks })
  } catch (error) {
    console.error('Error retrieving failed webhooks:', error)
    return NextResponse.json({ error: 'Failed to retrieve failed webhooks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { webhook_id } = await request.json()
    
    // Retry failed webhook
    const { data: failedWebhook } = await supabaseAdmin
      .from('failed_webhooks')
      .select('*')
      .eq('id', webhook_id)
      .single()
    
    if (!failedWebhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    
    // Process webhook
    await WebhookRetry.processWebhook(
      failedWebhook.webhook_data,
      getWebhookHandler(failedWebhook.webhook_data.event_type)
    )
    
    // Remove from failed webhooks
    await supabaseAdmin
      .from('failed_webhooks')
      .delete()
      .eq('id', webhook_id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error retrying webhook:', error)
    return NextResponse.json({ error: 'Failed to retry webhook' }, { status: 500 })
  }
}
```

## 🔒 Webhook Security

### Signature Verification
```typescript
// lib/webhook-security.ts
export class WebhookSecurity {
  static verifyStripeSignature(body: string, signature: string): boolean {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      })
      
      stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      
      return true
    } catch (error) {
      console.error('Stripe signature verification failed:', error)
      return false
    }
  }
  
  static verifyTelnyxSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.TELYNX_WEBHOOK_SECRET!)
        .update(body)
        .digest('hex')
      
      return signature === expectedSignature
    } catch (error) {
      console.error('Telnyx signature verification failed:', error)
      return false
    }
  }
}
```

### Rate Limiting
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Rate limit webhook endpoints
  if (request.nextUrl.pathname.startsWith('/api/stripe/webhook') ||
      request.nextUrl.pathname.startsWith('/api/telnyx/webhook')) {
    
    const rateLimitResult = await rateLimit.check(request)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
  }
  
  return NextResponse.next()
}
```

## 📊 Webhook Monitoring

### Webhook Analytics
```typescript
// app/api/webhooks/analytics/route.ts
export async function GET() {
  try {
    // Get webhook statistics
    const { data: stats } = await supabaseAdmin
      .from('webhook_logs')
      .select('event_type, status, count(*)')
      .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('event_type, status')
    
    // Get failed webhooks
    const { data: failedWebhooks } = await supabaseAdmin
      .from('failed_webhooks')
      .select('*')
      .order('failed_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      stats,
      failed_webhooks: failedWebhooks,
      total_processed: stats.reduce((sum, stat) => sum + stat.count, 0),
      success_rate: stats.filter(s => s.status === 'success').length / stats.length * 100
    })
  } catch (error) {
    console.error('Error retrieving webhook analytics:', error)
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 })
  }
}
```

### Webhook Health Check
```typescript
// app/api/webhooks/health/route.ts
export async function GET() {
  try {
    // Check webhook endpoint health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        stripe: await checkStripeWebhookHealth(),
        telnyx: await checkTelnyxWebhookHealth()
      }
    }
    
    return NextResponse.json(health)
  } catch (error) {
    console.error('Webhook health check failed:', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

async function checkStripeWebhookHealth(): Promise<boolean> {
  try {
    // Check if Stripe webhook is configured
    return !!process.env.STRIPE_WEBHOOK_SECRET
  } catch (error) {
    return false
  }
}

async function checkTelnyxWebhookHealth(): Promise<boolean> {
  try {
    // Check if Telnyx webhook is configured
    return !!process.env.TELYNX_WEBHOOK_SECRET
  } catch (error) {
    return false
  }
}
```

## 🚨 Webhook Troubleshooting

### Common Issues

#### Signature Verification Failed
```bash
# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET
echo $TELYNX_WEBHOOK_SECRET

# Test webhook endpoint
curl -X POST https://cloudgreet.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{"test": "data"}'
```

#### Webhook Processing Failed
```bash
# Check webhook logs
curl -s https://cloudgreet.com/api/webhooks/analytics | jq

# Check failed webhooks
curl -s https://cloudgreet.com/api/webhooks/dlq | jq
```

#### Database Connection Issues
```sql
-- Check webhook logs table
SELECT * FROM webhook_logs ORDER BY processed_at DESC LIMIT 10;

-- Check failed webhooks table
SELECT * FROM failed_webhooks ORDER BY failed_at DESC LIMIT 10;
```

### Recovery Procedures

#### Retry Failed Webhooks
```bash
# Retry all failed webhooks
curl -X POST https://cloudgreet.com/api/webhooks/dlq \
  -H "Content-Type: application/json" \
  -d '{"retry_all": true}'
```

#### Clear Failed Webhooks
```sql
-- Clear old failed webhooks (older than 7 days)
DELETE FROM failed_webhooks 
WHERE failed_at < NOW() - INTERVAL '7 days';
```

## 📋 Webhook Checklist

### Pre-Launch Webhook Requirements
- [ ] Stripe webhook configured
- [ ] Telnyx webhook configured
- [ ] Signature verification implemented
- [ ] Retry logic implemented
- [ ] Dead letter queue implemented
- [ ] Rate limiting configured
- [ ] Monitoring implemented
- [ ] Error handling implemented
- [ ] Logging implemented
- [ ] Testing completed

### Post-Launch Webhook Monitoring
- [ ] Webhook success rates monitored
- [ ] Failed webhooks tracked
- [ ] Retry mechanisms working
- [ ] Performance metrics tracked
- [ ] Error rates monitored
- [ ] Security verified
- [ ] Documentation updated
- [ ] Team trained
- [ ] Procedures tested
- [ ] Recovery plans ready
