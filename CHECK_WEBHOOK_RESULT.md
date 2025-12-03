# Check Webhook Result

You just triggered a test event. Let's check if your webhook received it!

## ✅ What Just Happened

Stripe CLI created:
- Product: `prod_TMKnSOi9l0BgVu`
- Price: `price_1SPc7pImfWciK09ZrmbHWx7l`
- Checkout Session: `cs_test_a1MM6LqrsF7luXFsGXXy3h8RlMaT61YqpYnJ8UxkbYeURR8a1cANWAiCNP`
- Payment Status: **paid** ✅
- Session Status: **complete** ✅

This should have triggered: `checkout.session.completed` webhook event

---

## 🔍 Check if Webhook Received It

### Step 1: Check Stripe Dashboard Logs

1. Go to: **Developers** → **Webhooks**
2. Click on your webhook: `https://cloudgreet.com/api/stripe/webhook`
3. Click **"Logs"** tab (or "Event deliveries" tab)
4. **Look for a recent entry:**
   - Event type: `checkout.session.completed`
   - Should be from just now (within last minute)
   - Check the status code

**What status do you see?**
- ✅ **200 OK** = Webhook processed successfully!
- ❌ **401** = Signature mismatch
- ❌ **500** = Code error
- ❌ **No entry** = Webhook didn't receive it (check if webhook is enabled)

### Step 2: Check Vercel Logs

1. Go to: Vercel Dashboard → Your Project
2. Click **Functions** → `/api/stripe/webhook`
3. View logs
4. **Look for recent entries:**
   - Should show "Stripe webhook event received"
   - Event type: `checkout.session.completed`
   - Should show success or error messages

### Step 3: Check Database (Optional)

If you want to verify it was processed:
1. Go to Supabase Dashboard
2. Check `webhook_events` table
3. Should see new entry with:
   - `event_type`: `checkout.session.completed`
   - `provider`: `stripe`
   - `processed_at`: recent timestamp

---

## 💡 What to Tell Me

After checking, tell me:
1. **Do you see the event in Stripe dashboard logs?** (Yes/No)
2. **What status code?** (200, 401, 500, or nothing)
3. **Do you see anything in Vercel logs?** (Yes/No)
4. **Any errors?** (Share error message if any)

---

## 🎯 Expected Result

If everything is working:
- ✅ Event appears in Stripe logs with **200 OK**
- ✅ Event appears in Vercel logs with success message
- ✅ Database has new entry in `webhook_events` table

If there's an issue:
- ❌ Event doesn't appear = Webhook not receiving events
- ❌ 401 error = Signature mismatch (wrong webhook secret)
- ❌ 500 error = Code error (check Vercel logs for details)

---

**Go check the logs now and tell me what you see!**











