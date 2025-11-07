# Stripe Webhook Dashboard Guide (2025)

## 📍 How to Access Webhook Logs in Stripe Dashboard

### Step-by-Step Navigation

1. **Go to Stripe Dashboard:**
   - Log in at: https://dashboard.stripe.com

2. **Navigate to Webhooks:**
   - Click **"Developers"** in the left sidebar
   - Click **"Webhooks"** in the submenu
   - Or go directly to: https://dashboard.stripe.com/webhooks

3. **Find Your Webhook:**
   - Look for your webhook endpoint: `https://cloudgreet.com/api/stripe/webhook`
   - Click on it to open webhook details

4. **View Event Deliveries:**
   - Click on the **"Event deliveries"** tab
   - This shows all webhook attempts (successful and failed)
   - Alternative tab names: **"Logs"** or **"Deliveries"** (varies by Stripe version)

---

## 🔍 What You'll See

### Event Deliveries Tab

**Columns:**
- **Event** - Event type (e.g., `checkout.session.completed`)
- **Status** - Delivery status (✅ Success, ❌ Failed)
- **Response** - HTTP status code (200, 401, 500, etc.)
- **Time** - When the event was sent

**Click on any event to see:**
- Request payload (the data Stripe sent)
- Response status code
- Response body (what your endpoint returned)
- Timestamps
- Retry attempts (if any)

---

## ✅ Understanding Status Codes

### Success Indicators
- **200 OK** - Webhook processed successfully ✅
- **201 Created** - Webhook processed and created resource ✅

### Error Indicators
- **401 Unauthorized** - Signature verification failed
  - **Fix:** Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- **400 Bad Request** - Invalid request format
- **500 Internal Server Error** - Code error in your webhook handler
  - **Fix:** Check Vercel function logs for error details
- **502 Bad Gateway** - Server error
- **503 Service Unavailable** - Server down or overloaded
- **Timeout** - Request took too long (> 10 seconds)

---

## 🔄 If You Don't See Any Events

### Possible Reasons:
1. **No events triggered yet**
   - Webhook only shows events after they're sent
   - Create a test subscription or use Stripe CLI to trigger events

2. **Wrong webhook selected**
   - Make sure you're looking at the correct webhook endpoint
   - Check the URL matches: `https://cloudgreet.com/api/stripe/webhook`

3. **Webhook not enabled**
   - Check webhook status shows "Enabled"
   - If disabled, events won't be sent

4. **Events not configured**
   - Check that events are selected in webhook settings
   - Go to webhook → Edit → Check events are selected

---

## 🧪 Testing from Dashboard

### Option 1: Use Stripe CLI (Recommended)
```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
stripe trigger checkout.session.completed
```

### Option 2: Create Test Event in Stripe
1. Go to **Customers** → Create customer
2. Create a test subscription
3. This will trigger real webhook events
4. Check "Event deliveries" tab to see them

---

## 📊 What to Look For

### Healthy Webhook:
- ✅ Most events show **200 OK**
- ✅ Events appear shortly after they're triggered
- ✅ No repeated failures
- ✅ Response times under 1 second

### Issues to Watch For:
- ❌ Multiple 401 errors = Signature mismatch
- ❌ Multiple 500 errors = Code bugs
- ❌ Timeouts = Function too slow
- ❌ No events = Webhook not receiving events

---

## 💡 Quick Checks

**To verify your webhook is working:**
1. Check "Event deliveries" tab has entries
2. Look for 200 OK status codes
3. Click on an event to see full details
4. Check Vercel logs match Stripe logs

**If you see errors:**
1. Click on the failed event
2. Check the response body for error message
3. Match it with Vercel function logs
4. Fix the issue and test again

---

## 🆘 Still Can't Find It?

The Stripe dashboard interface may vary. Try:
- Look for tabs: "Event deliveries", "Logs", "Deliveries", "History"
- Check if there's a filter/search bar
- Make sure you're in the correct Stripe account (test vs live)
- Try refreshing the page

**Last Updated:** November 2025






