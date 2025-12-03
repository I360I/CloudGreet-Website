# 🔧 Stripe Webhook Event Fix

## ❌ Current Problem

Your webhook is listening to **billing meter events** instead of **subscription events**:

**Current Events (WRONG):**
- `v1.billing.meter.error_report_triggered`
- `v1.billing.meter.no_meter_found`

These are for Stripe's usage-based billing (metered billing), which CloudGreet doesn't use. You need **subscription and payment events** instead.

---

## ✅ What You Need

Your webhook needs these **6 events** for subscription management:

### Subscription Events:
1. `checkout.session.completed` - Activates subscription after checkout
2. `customer.subscription.created` - Creates subscription record
3. `customer.subscription.updated` - Updates subscription status
4. `customer.subscription.deleted` - Handles cancellations

### Payment Events:
5. `invoice.payment_succeeded` - Logs successful payments
6. `invoice.payment_failed` - Handles payment failures

---

## 🔧 How to Fix (Step-by-Step)

### Step 1: Edit Your Webhook
1. Go to: https://dashboard.stripe.com/acct_1Rz4EFEWqBe9pRB4/workbench/webhooks/ed_61TEhkLuPB5RBnJoY16T8SBbQkSQNHD1wTU3U0BuKNe4
2. Click **"Edit"** button (usually at the top right)

### Step 2: Remove Wrong Events
1. Find the section showing your current events
2. **Uncheck** or remove:
   - `v1.billing.meter.error_report_triggered`
   - `v1.billing.meter.no_meter_found`

### Step 3: Add Correct Events
1. Click **"Add events"** or **"Select events"**
2. You'll see a search/list of available events
3. **Search for and select:**

   **Under "Checkout" section:**
   - ✅ `checkout.session.completed`

   **Under "Customer Subscription" section:**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

   **Under "Invoice" section:**
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. Make sure all 6 are checked ✅
5. Click **"Save"** or **"Update webhook"**

### Step 4: Verify
After saving, you should see:
- **Listening to:** 6 events (instead of 2)
- Events should be the subscription/payment events listed above
- No billing meter events

---

## 📸 Visual Guide

**What you should see after fixing:**

```
Listening to: 6 events
Show events ▼

✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

**NOT:**
```
❌ v1.billing.meter.error_report_triggered
❌ v1.billing.meter.no_meter_found
```

---

## 🧪 Test After Fixing

1. **In Stripe Dashboard:**
   - Go to your webhook
   - Click **"Send test webhook"**
   - Select: `checkout.session.completed`
   - Click **"Send test webhook"**
   - Check Vercel logs - should process successfully

2. **Verify Webhook Secret:**
   - Make sure `STRIPE_WEBHOOK_SECRET` is set in Vercel
   - Copy from webhook page (click "Reveal" on signing secret)

---

## ❓ Why This Matters

**Without the correct events:**
- ❌ Subscriptions won't activate automatically
- ❌ Subscription status won't update
- ❌ Payments won't be logged
- ❌ Cancellations won't be handled

**With the correct events:**
- ✅ Subscriptions activate automatically after checkout
- ✅ Status updates in real-time
- ✅ Payments tracked automatically
- ✅ Cancellations handled properly

---

## 🎯 Quick Summary

**Current:** 2 billing meter events (wrong)  
**Needed:** 6 subscription/payment events (correct)  
**Action:** Remove meter events, add subscription/payment events

**The billing meter events are for Stripe's usage-based billing feature. CloudGreet uses subscription-based billing, so you need subscription events instead.**













