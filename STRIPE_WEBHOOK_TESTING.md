# Testing Your Stripe Webhook Setup

## 📊 Your Current Setup

- **Product with 2 prices:**
  1. $200/month recurring subscription
  2. $50 per booking metered billing

## ✅ What Should Work

Your webhook handler supports this setup:

### Subscription Events (Monthly $200)
- ✅ `customer.subscription.created` - When subscription starts
- ✅ `customer.subscription.updated` - When subscription status changes
- ✅ `invoice.payment_succeeded` - When monthly $200 is paid
- ✅ `checkout.session.completed` - When customer first subscribes

### Per-Booking Events ($50 charges)
- ✅ `invoice.payment_succeeded` - When per-booking fee is charged
  - Your code creates invoice items for per-booking fees
  - These trigger `invoice.payment_succeeded` when paid
  - Already handled by `handleInvoicePaymentSucceeded()`

---

## 🧪 Testing Steps

### Test 1: Send Test Webhook (Subscription)

1. Go to Stripe Dashboard → Your webhook
2. Click "Send test webhook"
3. Select: `checkout.session.completed`
4. Click "Send test webhook"
5. Check "Recent deliveries" → Should show **200 OK**

**Expected:**
- Webhook receives event
- Logs to `webhook_events` table
- Returns 200 OK

### Test 2: Send Test Webhook (Invoice Payment)

1. Click "Send test webhook" again
2. Select: `invoice.payment_succeeded`
3. Click "Send test webhook"
4. Check "Recent deliveries" → Should show **200 OK**

**Expected:**
- Webhook receives event
- Logs to `webhook_events` table
- Returns 200 OK

### Test 3: Check Vercel Logs

1. Go to Vercel → Functions → `/api/stripe/webhook`
2. View logs
3. Should see:
   - "Stripe webhook event received"
   - Event type logged
   - No errors

### Test 4: Check Database (Optional)

1. Go to Supabase → `webhook_events` table
2. Should see entries for test events
3. `processed_at` should be set

---

## 🔍 What to Look For

### ✅ Success Indicators:
- Test webhook returns **200 OK** in Stripe
- Vercel logs show successful processing
- No errors in Vercel function logs
- Events logged in `webhook_events` table

### ❌ Error Indicators:
- **401 Unauthorized** → Webhook secret mismatch
- **500 Internal Server Error** → Code error (check logs)
- **Timeout** → Function taking too long

---

## 💡 Real-World Flow

When a real customer subscribes:

1. **Customer completes checkout:**
   - Stripe sends: `checkout.session.completed`
   - Webhook activates subscription ✅

2. **Subscription created:**
   - Stripe sends: `customer.subscription.created`
   - Webhook creates subscription record ✅

3. **Monthly $200 charged:**
   - Stripe sends: `invoice.payment_succeeded`
   - Webhook logs payment ✅

4. **Per-booking $50 charged:**
   - Your code creates invoice item
   - Stripe sends: `invoice.payment_succeeded`
   - Webhook logs payment ✅

---

## ⚠️ Important Notes

### Metered Billing vs. Subscription

If your $50 per booking is set up as **metered billing** (not separate invoice items):
- Metered billing is part of the subscription
- It will still trigger `invoice.payment_succeeded` when billed
- Your webhook handler will catch it ✅

### Per-Booking Charge Method

Your code currently charges per-booking via:
- Invoice items (created when appointment is booked)
- These trigger `invoice.payment_succeeded` when paid
- This works with your current webhook handler ✅

---

## 🎯 Quick Test Command

You can also test via Stripe CLI (if installed):

```bash
# Test checkout event
stripe trigger checkout.session.completed

# Test invoice payment
stripe trigger invoice.payment_succeeded
```

---

## ✅ Summary

Your webhook should work because:
1. ✅ Subscription events handle monthly $200
2. ✅ Invoice events handle per-booking $50 charges
3. ✅ All events are already configured
4. ✅ Code handles both subscription and invoice events

**Just test it!** Send a test webhook and check if you get 200 OK.







