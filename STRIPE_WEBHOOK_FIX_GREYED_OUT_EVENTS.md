# Fix: "Event Not Compatible" Error in Stripe Webhook

## 🔴 Problem
Events like `checkout.session.completed` are greyed out and show:
> "This event is not compatible with this destination. Create a new event destination to listen to this event."

## ✅ Solution: Create a New Webhook (Regular Account Webhook)

The existing webhook is likely configured as a **Connect webhook** or has an incompatible configuration. You need to create a **new regular account webhook**.

---

## 📋 Step-by-Step Fix

### Step 1: Delete the Old Webhook (Optional but Recommended)

1. Go to: https://dashboard.stripe.com/webhooks
2. Find your webhook with URL: `https://cloudgreet.com/api/stripe/webhook`
3. Click on it to open details
4. Scroll down and click **"Delete"** or **"Remove endpoint"**
5. Confirm deletion

> **Note:** If you want to keep the old webhook for reference, you can skip deletion. Just create a new one.

---

### Step 2: Create a New Webhook Endpoint

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"** or **"Create endpoint"** button (top right)
3. **Enter endpoint URL:**
   ```
   https://cloudgreet.com/api/stripe/webhook
   ```
4. **Important:** Make sure you're creating a **regular account webhook**, NOT a Connect webhook
   - If you see "Connect" or "Account" options, choose **"Account"**
   - If you see "For Connect" checkbox, make sure it's **UNCHECKED**

---

### Step 3: Select Events

1. In the "Events to send" section, you'll see a list of events
2. **Search for or scroll to find these events:**

#### Required Events (Check all 6):

**Checkout Events:**
- ✅ `checkout.session.completed`

**Customer Subscription Events:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**Invoice Events:**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

3. **Check the boxes** for all 6 events above
4. Make sure they're **NOT greyed out** - if they are, you might still be in Connect mode

---

### Step 4: Configure Settings

1. **API Version:** Leave as default (or select latest stable version)
2. **Description (optional):** "CloudGreet Subscription Webhook"
3. **Enable events:** Make sure it's enabled

---

### Step 5: Save and Get Secret

1. Click **"Add endpoint"** or **"Save"**
2. Wait for the webhook to be created
3. You'll be taken to the webhook details page
4. **Find "Signing secret"** section
5. Click **"Reveal"** or **"Click to reveal"**
6. **Copy the secret** (starts with `whsec_`)
7. **Save it immediately** - you'll need it for Vercel

---

### Step 6: Update Vercel Environment Variable

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your CloudGreet project
3. Go to **Settings** → **Environment Variables**
4. Find `STRIPE_WEBHOOK_SECRET`
5. Click **Edit** or **Update**
6. **Paste the new webhook secret** (the `whsec_...` value you copied)
7. Click **Save**
8. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Click **"Redeploy"**
   - Or wait for auto-deploy if you have it enabled

---

## ✅ Verification

### Test 1: Check Webhook Status
1. Go back to Stripe webhooks: https://dashboard.stripe.com/webhooks
2. Find your new webhook
3. Verify:
   - ✅ Status: **Enabled**
   - ✅ URL: `https://cloudgreet.com/api/stripe/webhook`
   - ✅ Events: **6 events** (or however many you added)
   - ✅ Events are **NOT greyed out**

### Test 2: Send Test Webhook
1. Click on your webhook
2. Click **"Send test webhook"** button
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check **"Recent deliveries"** section
6. You should see **200 OK** (green checkmark)

### Test 3: Check Vercel Logs
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Functions** → **View Function Logs**
4. Find the webhook function: `/api/stripe/webhook`
5. You should see successful webhook processing logs

---

## 🆘 Troubleshooting

### "Events are still greyed out after creating new webhook"
**Possible causes:**
1. You accidentally created a Connect webhook
   - **Fix:** Delete and recreate, making sure "Connect" is unchecked
2. You're in the wrong Stripe account (test vs live)
   - **Fix:** Make sure you're in the same mode (test/live) as your application
3. API version incompatibility
   - **Fix:** Use default/latest API version when creating webhook

### "Webhook secret doesn't work"
**Possible causes:**
1. Wrong secret copied
   - **Fix:** Reveal and copy again, make sure you got the whole `whsec_...` value
2. Secret not updated in Vercel
   - **Fix:** Make sure you updated `STRIPE_WEBHOOK_SECRET` and redeployed
3. Using old secret from deleted webhook
   - **Fix:** Use the secret from the NEW webhook you just created

### "Test webhook returns 401"
**This means signature verification failed:**
1. Check `STRIPE_WEBHOOK_SECRET` in Vercel matches the new webhook secret
2. Make sure you redeployed after updating the secret
3. Try sending the test webhook again

### "Test webhook returns 500"
**This means there's an error in your code:**
1. Check Vercel function logs for error details
2. Make sure your database tables exist (`webhook_events`, `businesses`, etc.)
3. Verify environment variables are set correctly

---

## 📋 Quick Checklist

After completing the steps:
- [ ] Old webhook deleted (or ignored)
- [ ] New webhook created as **regular account webhook** (not Connect)
- [ ] All 6 events added and **NOT greyed out**
- [ ] Webhook secret copied (`whsec_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` updated in Vercel
- [ ] Vercel application redeployed
- [ ] Test webhook sent successfully (200 OK)
- [ ] Vercel logs show successful processing

---

## 🔍 How to Tell If It's a Connect Webhook

**Signs you created a Connect webhook:**
- Events are greyed out with "not compatible" message
- You see "Connect" in the webhook name or description
- You see "For Connect" checkbox checked
- Webhook URL shows under "Connect" section

**Signs you created a regular webhook (correct):**
- Events are selectable (not greyed out)
- Webhook shows under "Endpoints" section
- All subscription/checkout/invoice events are available

---

## 💡 Alternative: Use Stripe CLI for Testing

If you want to test locally first:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to your local endpoint
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

This is useful for testing before setting up production webhooks.

---

**Need more help?** If you're still stuck:
1. Tell me which step you're on
2. Describe what you see (screenshots help if possible)
3. Share any error messages from Stripe or Vercel logs












