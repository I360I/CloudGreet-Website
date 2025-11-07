# Test Stripe Webhook with Stripe CLI

## 🎯 Quick Setup

### Step 1: Install Stripe CLI

**Windows (PowerShell):**
```powershell
# Using Scoop
scoop install stripe

# Or download from:
# https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from GitHub releases
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_windows_amd64.zip
# Extract and add to PATH
```

---

### Step 2: Login to Stripe

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Save your API keys locally

---

### Step 3: Forward Webhooks to Your Endpoint

```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
```

**This will:**
- Show you a webhook signing secret (starts with `whsec_`)
- Forward all webhook events to your endpoint
- Display real-time webhook delivery logs

**Keep this terminal open!**

---

### Step 4: Trigger Test Events

**Open a NEW terminal** and run:

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test invoice payment
stripe trigger invoice.payment_succeeded

# Test subscription update
stripe trigger customer.subscription.updated
```

---

### Step 5: Watch the Logs

In the terminal running `stripe listen`, you'll see:
```
2024-01-01 12:00:00   --> checkout.session.completed [evt_xxx]
2024-01-01 12:00:01   <-- [200] POST https://cloudgreet.com/api/stripe/webhook
```

**✅ 200 = Success!**
**❌ 401 = Signature mismatch (check webhook secret)**
**❌ 500 = Code error (check Vercel logs)**

---

## 🔍 Alternative: Check Stripe Dashboard Logs

If you don't want to use CLI:

1. **Go to Stripe Dashboard:**
   - Navigate to: **Developers** → **Webhooks**

2. **Click on your webhook endpoint**

3. **Check "Event deliveries" tab (or "Logs" tab):**
   - Shows all webhook attempts
   - Click on any delivery to see details
   - Look for 200 OK (success) or errors
   - Shows request/response logs
   - Useful for debugging

---

## 🧪 Quick Test Script

I created a test script you can run:

```bash
# Make sure you're in the project root
node scripts/test-stripe-webhook.js
```

This will:
- ✅ Check if endpoint is accessible
- ✅ Verify environment variables
- ✅ Show instructions for Stripe CLI

---

## 📊 What to Look For

### Success Indicators:
- ✅ Stripe CLI shows `[200]` responses
- ✅ Vercel logs show successful processing
- ✅ Database `webhook_events` table has entries
- ✅ No errors in logs

### Error Indicators:
- ❌ `[401]` = Webhook secret mismatch
- ❌ `[500]` = Code error (check Vercel logs)
- ❌ Timeout = Function taking too long

---

## 🆘 Troubleshooting

### "Webhook secret mismatch"
**Fix:**
1. Get the webhook secret from `stripe listen` output
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy

### "Cannot connect to endpoint"
**Fix:**
1. Check if `https://cloudgreet.com` is accessible
2. Verify Vercel deployment is live
3. Check firewall/proxy settings

### "No events showing in Stripe dashboard"
**Fix:**
1. Make sure webhook is enabled
2. Check you're in the correct mode (test vs live)
3. Verify events are configured in webhook settings

---

## ✅ Summary

**Best way to test:**
1. Use Stripe CLI (`stripe listen` + `stripe trigger`)
2. Check Stripe dashboard "Recent deliveries"
3. Check Vercel function logs

**If you see 200 OK responses, your webhook is working!** 🎉

