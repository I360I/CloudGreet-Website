# Stripe Webhook - Final Setup Checklist

## ✅ What You've Completed

- [x] Created new webhook in Stripe
- [x] Added all events (or selected events)
- [x] Configured payload style (Snapshot)
- [x] Copied webhook secret
- [x] Added `STRIPE_WEBHOOK_SECRET` to Vercel

---

## 🔄 Next Steps

### Step 1: Redeploy Vercel (Important!)

The environment variable change requires a redeploy:

**Option A: Auto-redeploy (if enabled)**
- Wait a few minutes for auto-deploy
- Check deployments tab for new deployment

**Option B: Manual redeploy**
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Click "..." on latest deployment
4. Click "Redeploy"
5. Wait for deployment to complete

---

### Step 2: Test the Webhook

#### Test 1: Send Test Event (Stripe Dashboard)
1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook: `https://cloudgreet.com/api/stripe/webhook`
3. Click **"Send test webhook"** button
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check **"Recent deliveries"** section
7. You should see **200 OK** (green checkmark) ✅

#### Test 2: Check Vercel Logs
1. Go to Vercel Dashboard → Your Project
2. Click **"Functions"** tab
3. Find `/api/stripe/webhook`
4. Click to view logs
5. You should see successful webhook processing logs

#### Test 3: Verify Database (Optional)
Check that events are being logged:
1. Go to your Supabase dashboard
2. Check `webhook_events` table
3. Should see new entry with event type `checkout.session.completed`

---

## ✅ Verification Checklist

After redeploy and testing:

- [ ] Vercel redeployed (or auto-deploy completed)
- [ ] Test webhook sent successfully (200 OK)
- [ ] Vercel logs show successful processing
- [ ] No errors in Vercel function logs
- [ ] Webhook events table has entries (optional check)

---

## 🎯 What Should Work Now

Your webhook should now handle:
- ✅ `checkout.session.completed` → Activates subscriptions
- ✅ `customer.subscription.created` → Creates subscription records
- ✅ `customer.subscription.updated` → Updates subscription status
- ✅ `customer.subscription.deleted` → Cancels subscriptions
- ✅ `invoice.payment_succeeded` → Logs payments
- ✅ `invoice.payment_failed` → Handles payment failures

---

## 🆘 If Test Fails

### Error: 401 Unauthorized
**Cause:** Webhook secret mismatch
**Fix:**
1. Double-check `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe
2. Make sure you used the Snapshot secret
3. Redeploy after fixing

### Error: 500 Internal Server Error
**Cause:** Code error or missing environment variables
**Fix:**
1. Check Vercel function logs for error details
2. Verify `STRIPE_SECRET_KEY` is set
3. Check database tables exist (`webhook_events`, `businesses`, etc.)

### Error: Webhook not receiving events
**Cause:** Deployment issue or webhook not enabled
**Fix:**
1. Verify webhook is "Enabled" in Stripe
2. Check webhook URL is correct: `https://cloudgreet.com/api/stripe/webhook`
3. Make sure Vercel deployment succeeded

---

## 🎉 You're Done!

Once the test webhook returns 200 OK, your Stripe webhook is fully configured and ready for production!

**Next time:** When a real customer completes checkout, the webhook will automatically:
1. Activate their subscription
2. Create subscription records
3. Track payments
4. Handle cancellations

---

**Need help?** If the test fails, share:
1. The error code (401, 500, etc.)
2. What you see in Vercel logs
3. What you see in Stripe "Recent deliveries"










