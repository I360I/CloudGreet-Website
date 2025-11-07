# Testing Your Webhook Properly

## ✅ Good News: Your Webhook is Working!

The error you saw is **expected behavior** - it means:
- ✅ Endpoint is accessible
- ✅ Code is running
- ✅ Security is working (rejecting invalid signatures)

## 🧪 How to Test Properly

### Method 1: Stripe CLI (Best - Generates Real Signatures)

1. **Install Stripe CLI:**
   ```powershell
   # Download from: https://github.com/stripe/stripe-cli/releases/latest
   # Or: scoop install stripe
   ```

2. **Login:**
   ```bash
   stripe login
   ```

3. **Forward webhooks (this generates valid signatures):**
   ```bash
   stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
   ```
   
   **This will show you a webhook secret like:**
   ```
   Ready! Your webhook signing secret is whsec_xxxxx
   ```

4. **In another terminal, trigger test events:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   ```

5. **Watch the first terminal - you'll see:**
   ```
   2024-11-04 04:00:00   --> checkout.session.completed [evt_xxx]
   2024-11-04 04:00:01   <-- [200] POST https://cloudgreet.com/api/stripe/webhook
   ```
   
   **✅ [200] = Success!**

---

### Method 2: Check Stripe Dashboard Logs

1. **Go to Stripe Dashboard:**
   - Navigate to: **Developers** → **Webhooks**
   - Click on your webhook endpoint

2. **Check "Event deliveries" tab (or "Logs" tab):**
   - Shows all webhook attempts (real and test)
   - Look for status codes:
     - ✅ **200 OK** = Working!
     - ❌ **401** = Signature mismatch
     - ❌ **500** = Code error

3. **Click on any delivery to see:**
   - Request payload
   - Response status
   - Response body
   - Timestamps

---

### Method 3: Create a Test Customer/Subscription

1. **In Stripe Dashboard:**
   - Go to Customers → Create customer
   - Create a test subscription
   - This will trigger real webhook events

2. **Watch Vercel logs:**
   - Should see webhook processing
   - Check for success/errors

---

## 🔍 What You Should See in Vercel Logs

### ✅ Success (200 OK):
```
[info] Stripe webhook event received
[info] Event type: checkout.session.completed
[info] Business subscription activated
```

### ❌ Signature Error (401):
```
[error] Webhook signature verification failed
[error] Unable to extract timestamp and signatures from header
```
**This is what you're seeing now - it's expected for manual tests!**

### ❌ Code Error (500):
```
[error] Stripe webhook error
[error] Failed to update business subscription status
```
**Fix:** Check the specific error message

---

## 🎯 Quick Test Right Now

**Check Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Click your webhook
3. Check "Recent deliveries"
4. **Do you see any entries?**
   - If yes, what status codes?
   - If no, webhook hasn't received any events yet

---

## 💡 Why Manual Tests Fail

When you send a request manually (like the test script):
- ❌ No valid Stripe signature
- ❌ Webhook rejects it (as designed)
- ✅ This proves security is working!

**Only Stripe can generate valid signatures** - that's why you need:
- Stripe CLI (generates valid signatures)
- Real Stripe events (have valid signatures)
- Stripe Dashboard test webhooks (if available)

---

## ✅ Summary

**Your webhook is working correctly!** The error you saw is expected security behavior.

**To test properly:**
1. Use Stripe CLI (best method)
2. Check Stripe dashboard "Recent deliveries"
3. Create a real test subscription

**What status do you see in Stripe dashboard "Recent deliveries"?**

