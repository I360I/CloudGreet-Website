# Stripe Webhook Configuration Guide

## ✅ Your Current Configuration

**Webhook URL:** `https://cloudgreet.com/api/stripe/webhook`
**Status:** ✅ Configured
**Payload Style:** Thin (recommended)
**Events Currently Listening To:** 
- ❌ `v1.billing.meter.error_report_triggered` (NOT NEEDED - This is for billing meters)
- ❌ `v1.billing.meter.no_meter_found` (NOT NEEDED - This is for billing meters)

**⚠️ PROBLEM:** These events are for billing meters, not subscriptions! You need to replace them with subscription/payment events.

---

## 📋 Required Events for Full Functionality

Your webhook endpoint handles these events. **Make sure all of these are configured in Stripe:**

### Critical Events (Must Have):
1. ✅ `checkout.session.completed`
   - **Purpose:** Activates subscription when customer completes checkout
   - **Action:** Updates `businesses.subscription_status` to 'active'
   - **Impact:** Business can start using the service

2. ✅ `customer.subscription.created`
   - **Purpose:** Creates subscription record in database
   - **Action:** Inserts into `stripe_subscriptions` table
   - **Impact:** Tracks subscription lifecycle

3. ✅ `customer.subscription.updated`
   - **Purpose:** Updates subscription status (active, past_due, cancelled, etc.)
   - **Action:** Updates `businesses.subscription_status` and `stripe_subscriptions`
   - **Impact:** Keeps subscription status in sync

4. ✅ `customer.subscription.deleted`
   - **Purpose:** Handles subscription cancellation
   - **Action:** Sets subscription status to 'cancelled'
   - **Impact:** Prevents access after cancellation

### Payment Events (Recommended):
5. ✅ `invoice.payment_succeeded`
   - **Purpose:** Logs successful subscription payments
   - **Action:** Inserts into `billing_history` table
   - **Impact:** Payment tracking and accounting

6. ✅ `invoice.payment_failed`
   - **Purpose:** Notifies of payment failures
   - **Action:** Sets subscription status to 'past_due'
   - **Impact:** Alerts business of billing issues

---

## 🔍 How to Verify Your Configuration

### Step 1: Check Current Events
1. Go to: https://dashboard.stripe.com/acct_1Rz4EFEWqBe9pRB4/workbench/webhooks/ed_61TEhkLuPB5RBnJoY16T8SBbQkSQNHD1wTU3U0BuKNe4
2. Click "Show" next to "Listening to 2 events"
3. Verify which events are currently configured

### Step 2: Remove Wrong Events & Add Correct Events
**You currently have billing meter events - you need to replace them with subscription events!**

> **📖 Need detailed step-by-step instructions?** See `STRIPE_WEBHOOK_EVENTS_SETUP.md` for a complete guide with screenshots descriptions.

**Quick steps:**
1. Click "Edit" on the webhook
2. **Remove the current events:**
   - Uncheck `v1.billing.meter.error_report_triggered`
   - Uncheck `v1.billing.meter.no_meter_found`
3. **Add the correct events:**
   - Click "Add events" or search for events
   - Check the boxes for:
     - `checkout.session.completed` (under "Checkout")
     - `customer.subscription.created` (under "Customer Subscription")
     - `customer.subscription.updated` (under "Customer Subscription")
     - `customer.subscription.deleted` (under "Customer Subscription")
     - `invoice.payment_succeeded` (under "Invoice")
     - `invoice.payment_failed` (under "Invoice")
4. Click "Save"

**Note:** The billing meter events are for Stripe's usage-based billing feature. You don't need them unless you're using metered billing. For subscription-based billing (which CloudGreet uses), you need the subscription and invoice events listed above.

### Step 3: Get Webhook Secret
1. In the webhook details page, find "Signing secret"
2. Click "Reveal" (or "Click to reveal")
3. Copy the secret (starts with `whsec_`)
4. Add to Vercel environment variables:
   - **Variable Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (the secret you copied)

---

## 🧪 Testing Your Webhook

### Test 1: Check Webhook Secret
Verify your environment variable is set:
```bash
# Check in Vercel dashboard or run locally:
echo $STRIPE_WEBHOOK_SECRET
# Should output: whsec_...
```

### Test 2: Send Test Event (Stripe Dashboard)
1. Go to your webhook in Stripe dashboard
2. Click "Send test webhook"
3. Select event: `checkout.session.completed`
4. Click "Send test webhook"
5. Check Vercel function logs for success

### Test 3: Real Test (Stripe CLI)
```bash
# Install Stripe CLI if needed
# Forward webhooks to your endpoint
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook

# In another terminal, trigger an event
stripe trigger checkout.session.completed
```

### Test 4: Verify Database Updates
After a test event:
1. Check `webhook_events` table - should have new entry
2. Check `businesses.subscription_status` - should update if checkout completed
3. Check `stripe_subscriptions` - should have record if subscription created

---

## ⚠️ Common Issues

### Issue 1: Webhook Secret Not Set
**Symptom:** Webhook returns 500 error, logs show "STRIPE_WEBHOOK_SECRET not configured"

**Fix:**
1. Get webhook secret from Stripe dashboard
2. Add to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Redeploy or wait for auto-deploy

### Issue 2: Wrong Events Configured
**Symptom:** Subscriptions not activating, payments not logging

**Fix:**
1. Check which events are configured in Stripe
2. Add missing events (see list above)
3. Test with Stripe CLI or dashboard

### Issue 3: Signature Verification Failing
**Symptom:** Webhook returns 401, logs show "Invalid signature"

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches the secret in Stripe dashboard
2. Make sure you're using the correct secret for the webhook endpoint
3. Check webhook URL is exactly `https://cloudgreet.com/api/stripe/webhook`

---

## 📊 Webhook Event Flow

### Subscription Activation Flow:
```
Customer completes checkout
  ↓
Stripe sends: checkout.session.completed
  ↓
Webhook activates subscription
  ↓
Stripe creates subscription
  ↓
Stripe sends: customer.subscription.created
  ↓
Webhook creates subscription record
  ↓
Business subscription_status = 'active' ✅
```

### Payment Flow:
```
Stripe charges customer
  ↓
Stripe sends: invoice.payment_succeeded
  ↓
Webhook logs payment to billing_history
  ↓
Payment recorded ✅
```

### Cancellation Flow:
```
Customer cancels subscription
  ↓
Stripe sends: customer.subscription.deleted
  ↓
Webhook sets subscription_status = 'cancelled'
  ↓
Business access revoked ✅
```

---

## ✅ Checklist

- [ ] Webhook URL configured: `https://cloudgreet.com/api/stripe/webhook`
- [ ] All 6 events configured (or at minimum: checkout.session.completed, customer.subscription.updated)
- [ ] Webhook secret copied: `whsec_...`
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel environment variables
- [ ] Test event sent successfully
- [ ] Database updates verified
- [ ] Production webhook tested with real checkout

---

## 🎯 Quick Fix Summary

**If you only have 2 events configured, you likely need:**

1. **Minimum Required:** 
   - `checkout.session.completed` (activates subscription)
   - `customer.subscription.updated` (keeps status in sync)

2. **Recommended (Full Functionality):**
   - Add all 6 events listed above

**To add events:**
1. Go to webhook in Stripe dashboard
2. Click "Edit" → "Add events"
3. Select missing events
4. Save

**To get webhook secret:**
1. Open webhook in Stripe dashboard
2. Click "Reveal" on signing secret
3. Copy `whsec_...` value
4. Add to Vercel: `STRIPE_WEBHOOK_SECRET`

---

**Your webhook endpoint is ready!** Just make sure:
1. ✅ All necessary events are configured
2. ✅ Webhook secret is in Vercel environment variables
3. ✅ Test it works with a test event

