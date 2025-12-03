# Stripe Webhook Verification Checklist

Use this checklist to verify your Stripe webhook is properly configured and working.

---

## ✅ Pre-Deployment Checks

### Code Verification
- [ ] Webhook handler file exists: `app/api/stripe/webhook/route.ts`
- [ ] All 6 event handlers are implemented
- [ ] Signature verification is in place
- [ ] Idempotency check is implemented
- [ ] Error handling is present

### Environment Variables
- [ ] `STRIPE_WEBHOOK_SECRET` is set in Vercel
- [ ] `STRIPE_SECRET_KEY` is set in Vercel
- [ ] Webhook secret matches the one in Stripe dashboard
- [ ] Using Snapshot payload secret (not Thin, unless both configured)

### Database Tables
- [ ] `webhook_events` table exists (for idempotency)
- [ ] `businesses` table exists (for subscription status)
- [ ] `stripe_subscriptions` table exists (for subscription records)
- [ ] `billing_history` table exists (for payment logging)

---

## ✅ Stripe Dashboard Checks

### Webhook Configuration
1. Go to: Stripe Dashboard → Developers → Webhooks
2. Find your webhook: `https://cloudgreet.com/api/stripe/webhook`
3. Click on it to open webhook details

- [ ] Webhook URL is correct: `https://cloudgreet.com/api/stripe/webhook`
- [ ] Webhook status is **Enabled**
- [ ] Payload style is **Snapshot** (or both if configured)

### Events Configuration
- [ ] `checkout.session.completed` is selected
- [ ] `customer.subscription.created` is selected
- [ ] `customer.subscription.updated` is selected
- [ ] `customer.subscription.deleted` is selected
- [ ] `invoice.payment_succeeded` is selected
- [ ] `invoice.payment_failed` is selected
- [ ] Events are **NOT greyed out** (if greyed out, see fix guide)

### Webhook Secret
- [ ] Signing secret is revealed/copied
- [ ] Secret starts with `whsec_`
- [ ] Secret matches `STRIPE_WEBHOOK_SECRET` in Vercel

---

## ✅ Vercel Dashboard Checks

### Environment Variables
1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

- [ ] `STRIPE_WEBHOOK_SECRET` is set
- [ ] `STRIPE_SECRET_KEY` is set
- [ ] Values are correct (not placeholder text)
- [ ] Variables are set for **Production** environment

### Deployment
- [ ] Latest deployment is successful
- [ ] Deployment included environment variable changes
- [ ] No deployment errors related to webhook

### Function Logs
1. Go to: Vercel Dashboard → Your Project → Functions → `/api/stripe/webhook`

- [ ] Function exists and is accessible
- [ ] Recent logs show successful processing (if events received)
- [ ] No recurring errors in logs

---

## ✅ Testing

### Test 1: Endpoint Accessibility
Run verification script:
```bash
node scripts/verify-webhook-config.js
```

- [ ] Endpoint is accessible (returns 401/400 for invalid signature is OK)
- [ ] No timeout errors

### Test 2: Stripe Dashboard Logs
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click on the **"Event deliveries"** tab (or "Logs" tab)

- [ ] Check for any recent webhook attempts
- [ ] Look for status codes:
  - ✅ **200 OK** = Working!
  - ❌ **401** = Signature mismatch (check webhook secret)
  - ❌ **500** = Code error (check Vercel logs)
  - ❌ **Timeout** = Function taking too long
- [ ] Click on any delivery to see request/response details

### Test 3: Stripe CLI (Optional but Recommended)
If you have Stripe CLI installed:
```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
```

Then in another terminal:
```bash
stripe trigger checkout.session.completed
```

- [ ] Webhook receives event
- [ ] Returns 200 OK
- [ ] Vercel logs show successful processing

### Test 4: Real Event Test
Create a test subscription in Stripe:
1. Go to Customers → Create customer
2. Create a test subscription
3. Watch webhook logs

- [ ] `customer.subscription.created` event received
- [ ] `invoice.payment_succeeded` event received (if payment succeeds)
- [ ] Database records created/updated

---

## ✅ Database Verification

### Check Webhook Events Table
1. Go to Supabase Dashboard → Table Editor → `webhook_events`

- [ ] Table exists
- [ ] Recent test events are logged
- [ ] `processed_at` is set for successful events

### Check Businesses Table
1. Go to Supabase Dashboard → Table Editor → `businesses`

- [ ] Subscription status updates correctly
- [ ] `stripe_customer_id` is set after checkout

### Check Stripe Subscriptions Table
1. Go to Supabase Dashboard → Table Editor → `stripe_subscriptions`

- [ ] Subscription records are created
- [ ] Status matches Stripe dashboard

### Check Billing History Table
1. Go to Supabase Dashboard → Table Editor → `billing_history`

- [ ] Payments are logged
- [ ] Amounts are correct

---

## 🆘 Troubleshooting

### Issue: 401 Unauthorized
**Cause:** Webhook secret mismatch
**Fix:**
1. Get webhook secret from Stripe dashboard
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy

### Issue: 500 Internal Server Error
**Cause:** Code error or missing env vars
**Fix:**
1. Check Vercel function logs for error details
2. Verify `STRIPE_SECRET_KEY` is set
3. Check database tables exist
4. Verify Supabase connection

### Issue: Events Not Received
**Cause:** Webhook not configured or disabled
**Fix:**
1. Check webhook is enabled in Stripe
2. Verify events are selected
3. Check webhook URL is correct
4. Verify Vercel deployment is live

### Issue: Events Greyed Out
**Cause:** Webhook configured as Connect webhook
**Fix:**
1. Delete old webhook
2. Create new webhook as regular account webhook
3. Make sure "Connect" is unchecked

---

## ✅ Success Criteria

Your webhook is working correctly if:
- ✅ Test webhook returns 200 OK
- ✅ Events are logged in `webhook_events` table
- ✅ Database records are created/updated
- ✅ No errors in Vercel logs
- ✅ Stripe dashboard shows successful deliveries

---

## 📝 Quick Verification Command

Run this to check everything:
```bash
node scripts/verify-webhook-config.js
```

This will check:
- Endpoint accessibility
- Environment variables
- Code structure
- Database tables

---

**Last Updated:** After webhook setup
**Status:** Ready for testing

