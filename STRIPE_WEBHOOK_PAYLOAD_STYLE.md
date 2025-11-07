# Stripe Webhook Payload Style - Choose Snapshot

## 🎯 Quick Answer: Choose "Snapshot" Style

When Stripe asks you to configure destinations with different payload styles:

### ✅ Choose "Snapshot" for All Events

**Why?**
- Your code expects full object data (`event.data.object`)
- Snapshot payloads include complete object data
- No extra API calls needed
- Simpler to handle

### ❌ Avoid "Thin" Style (Unless Required)

**Why not?**
- Thin payloads only include IDs
- You'd need to fetch full objects from Stripe API
- Requires code changes to handle both styles
- More complex

---

## 📋 What to Do in Stripe Dashboard

When you see the "Configure destinations" screen:

1. **For each destination/payload style:**
   - Choose **"Snapshot"** style if available
   - If some events only support "Thin", that's okay (we'll handle it)

2. **If you can only choose one style for all events:**
   - Choose **"Snapshot"**

3. **Continue with the webhook setup**

---

## 🔧 Your Code Status

Your current code uses:
```typescript
event.data.object as Stripe.Checkout.Session
event.data.object as Stripe.Subscription
event.data.object as Stripe.Invoice
```

This works perfectly with **Snapshot** payloads because they include the full object.

---

## 💡 If You Must Use Thin Payloads

If some events only support thin payloads, your code will still work, but you might need to:

1. Check if object is expanded (has full data)
2. If not, fetch the full object from Stripe API

**However**, for subscription/checkout/invoice events, **Snapshot style is always available**, so you should be fine choosing Snapshot for everything.

---

## ✅ Action Steps

1. In Stripe dashboard, when configuring destinations:
   - Select **"Snapshot"** payload style
   - Continue with setup

2. Your code will work as-is ✅

3. No code changes needed ✅

---

**TL;DR:** Choose "Snapshot" style for all events. Your code already handles it correctly.







