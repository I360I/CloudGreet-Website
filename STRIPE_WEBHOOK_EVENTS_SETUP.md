# Stripe Webhook Events - Step-by-Step Setup Guide

## 🎯 Quick Start: Adding Events to Your Webhook

### Step 1: Open Your Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Find your webhook with URL: `https://cloudgreet.com/api/stripe/webhook`
3. Click on it to open the webhook details page

---

### Step 2: Edit the Webhook

1. **Click the "Edit" button** (usually in the top right or near the webhook URL)
2. You'll see a section that says "Events to send" or "Listening to X events"

---

### Step 3: Remove Wrong Events (If Present)

If you see these events, **uncheck/remove them**:
- ❌ `v1.billing.meter.error_report_triggered`
- ❌ `v1.billing.meter.no_meter_found`

(These are for billing meters, not subscriptions)

---

### Step 4: Add the Required Events

**Option A: Using the Search/Add Events Button**

1. Click **"Add events"** or **"Select events"** button
2. You'll see a list or search box
3. **Search for each event** and check the box:

#### Event 1: Checkout Session Completed
- **Search for:** `checkout.session.completed`
- **Where to find it:** Under "Checkout" section
- **Check the box** ✅

#### Event 2: Customer Subscription Created
- **Search for:** `customer.subscription.created`
- **Where to find it:** Under "Customer subscription" section
- **Check the box** ✅

#### Event 3: Customer Subscription Updated
- **Search for:** `customer.subscription.updated`
- **Where to find it:** Under "Customer subscription" section
- **Check the box** ✅

#### Event 4: Customer Subscription Deleted
- **Search for:** `customer.subscription.deleted`
- **Where to find it:** Under "Customer subscription" section
- **Check the box** ✅

#### Event 5: Invoice Payment Succeeded
- **Search for:** `invoice.payment_succeeded`
- **Where to find it:** Under "Invoice" section
- **Check the box** ✅

#### Event 6: Invoice Payment Failed
- **Search for:** `invoice.payment_failed`
- **Where to find it:** Under "Invoice" section
- **Check the box** ✅

**Option B: Using Event Categories**

If Stripe shows categories instead of a search:
1. Expand **"Checkout"** → Check `checkout.session.completed`
2. Expand **"Customer subscription"** → Check:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Expand **"Invoice"** → Check:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

---

### Step 5: Save Your Changes

1. **Click "Save"** or "Update webhook" button
2. Wait for confirmation that the webhook was updated
3. You should now see "Listening to 6 events" (or however many you added)

---

### Step 6: Get Your Webhook Secret

1. On the same webhook page, scroll down to find **"Signing secret"**
2. Click **"Reveal"** or **"Click to reveal"** button
3. **Copy the secret** (it starts with `whsec_`)
4. **Save it somewhere safe** - you'll need it for Vercel

---

### Step 7: Add Secret to Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your CloudGreet project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (paste the secret you copied)
6. Click **"Save"**
7. **Redeploy** your application (or wait for auto-deploy)

---

## ✅ Verification Checklist

After completing the steps above:

- [ ] Webhook shows 6 events (or at least 2 minimum events)
- [ ] Events include `checkout.session.completed` ✅
- [ ] Events include `customer.subscription.updated` ✅
- [ ] Webhook secret copied (starts with `whsec_`)
- [ ] `STRIPE_WEBHOOK_SECRET` added to Vercel environment variables
- [ ] Vercel deployment completed

---

## 🧪 Test Your Setup

### Quick Test (Stripe Dashboard)

1. Go back to your webhook in Stripe
2. Click **"Send test webhook"** button
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check the **"Recent deliveries"** section
6. You should see a **200 OK** response (green checkmark)

### If You See Errors

- **401 Unauthorized:** Webhook secret is wrong or missing in Vercel
- **500 Error:** Check Vercel function logs for details
- **404 Not Found:** Webhook URL is incorrect

---

## 📋 Minimum vs. Full Setup

### Minimum Setup (2 Events)
If you only want the basics, add these 2:
- ✅ `checkout.session.completed` (activates subscriptions)
- ✅ `customer.subscription.updated` (keeps status in sync)

### Full Setup (6 Events) - Recommended
Add all 6 events for complete functionality:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

---

## 🆘 Troubleshooting

### "Events are greyed out with 'not compatible' message"
**This is a common issue!** See `STRIPE_WEBHOOK_FIX_GREYED_OUT_EVENTS.md` for the complete fix.

**Quick fix:** Your webhook is likely configured as a Connect webhook. You need to:
1. Delete the old webhook
2. Create a NEW webhook as a **regular account webhook** (not Connect)
3. Make sure "Connect" or "For Connect" checkbox is **UNCHECKED**

### "I can't find the Add events button"
- Look for "Edit webhook" or "Manage events" button first
- Some Stripe views show events in a different section
- Try clicking directly on the number of events shown (e.g., "Listening to 2 events")

### "The event I'm looking for doesn't appear"
- Make sure you're in the **live mode** or **test mode** that matches your webhook
- Some events might be under different categories
- Try searching for just part of the name (e.g., "subscription" or "checkout")
- **If events are greyed out, see the fix above**

### "I don't see Signing secret"
- Scroll down on the webhook page
- Look for "Signing secret" or "Webhook signing secret"
- If using test mode, make sure you're viewing the test webhook

---

## 📸 What You Should See

After setup, your webhook page should show:
- **Endpoint URL:** `https://cloudgreet.com/api/stripe/webhook`
- **Status:** Enabled ✅
- **Events:** Listening to 6 events (or however many you added)
- **Signing secret:** `whsec_...` (revealed)

---

**Need help?** If you're stuck, tell me:
1. What step you're on
2. What you see on your screen
3. Any error messages

