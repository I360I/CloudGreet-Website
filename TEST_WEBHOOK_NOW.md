# Test Your Stripe Webhook Right Now

## 🎯 Quick Test Steps

### Step 1: Go to Stripe Dashboard
1. Open: https://dashboard.stripe.com/webhooks
2. Find your webhook: `https://cloudgreet.com/api/stripe/webhook`
3. Click on it

### Step 2: Send Test Webhook
1. Click **"Send test webhook"** button (usually at the top)
2. In the dropdown, select: **`checkout.session.completed`**
3. Click **"Send test webhook"** button

### Step 3: Check Result
Look at **"Recent deliveries"** section:
- ✅ **200 OK** = Working perfectly!
- ❌ **401 Unauthorized** = Webhook secret mismatch
- ❌ **500 Error** = Code error (check Vercel logs)

---

## 🔍 What to Check

### In Stripe Dashboard:
- **Recent deliveries** tab shows:
  - Status: 200 OK ✅
  - Response time: < 1 second
  - Response body: `{"success":true,"received":true}`

### In Vercel Dashboard:
1. Go to: Your Project → Functions → `/api/stripe/webhook`
2. Click to view logs
3. Should see:
   - "Stripe webhook event received"
   - Event type logged
   - No errors

---

## ✅ Expected Results

### Success (200 OK):
```json
{
  "success": true,
  "received": true
}
```

### Error (401):
```json
{
  "success": false,
  "error": "Missing signature"
}
```
**Fix:** Webhook secret not set or wrong

### Error (500):
```json
{
  "success": false,
  "error": "Webhook processing failed"
}
```
**Fix:** Check Vercel logs for details

---

## 🧪 Test Multiple Events

Test these events one by one:

1. **`checkout.session.completed`** ✅
   - Should return 200 OK
   - Logs to `webhook_events` table

2. **`customer.subscription.created`** ✅
   - Should return 200 OK
   - Creates subscription record

3. **`invoice.payment_succeeded`** ✅
   - Should return 200 OK
   - Logs payment to billing_history

---

## 📊 Verify Database (Optional)

After sending test webhook:

1. Go to Supabase Dashboard
2. Open `webhook_events` table
3. Should see new entry:
   - `event_type`: `checkout.session.completed`
   - `provider`: `stripe`
   - `processed_at`: timestamp set

---

## 🆘 Troubleshooting

### "401 Unauthorized"
**Problem:** Webhook secret mismatch
**Fix:**
1. Check `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe
2. Make sure you used Snapshot secret (not Thin)
3. Redeploy Vercel after updating secret

### "500 Internal Server Error"
**Problem:** Code error or missing env vars
**Fix:**
1. Check Vercel function logs for error details
2. Verify `STRIPE_SECRET_KEY` is set
3. Check database tables exist (`webhook_events`, `businesses`)

### "Timeout"
**Problem:** Function taking too long
**Fix:**
1. Check database connection
2. Verify Supabase is accessible
3. Check function timeout settings

---

## 🎉 Success!

If you get **200 OK**, your webhook is working! 

**What happens now:**
- Real checkout events will be processed automatically
- Subscription activations will work
- Payment tracking will work
- Cancellations will be handled

---

**Go test it now!** Use Stripe's "Send test webhook" feature - it's the only way to properly test Stripe webhooks because they require valid signatures.









