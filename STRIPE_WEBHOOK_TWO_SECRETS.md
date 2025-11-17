# Handling Two Webhook Secrets

## 🎯 Quick Answer: Use the SNAPSHOT Secret

You got two secrets because Stripe created two destinations (one for Snapshot, one for Thin payloads).

### ✅ Use This One:
- **The SNAPSHOT payload secret** (starts with `whsec_...`)
- This is the one your code is designed to handle

### ❌ Don't Use:
- The Thin payload secret (unless you update your code to handle thin payloads)

---

## 📋 What to Do

### Option 1: Use Only Snapshot (Recommended)

1. **Find the Snapshot secret:**
   - In Stripe dashboard, look at your webhook
   - You should see two destinations/endpoints
   - Find the one labeled "Snapshot" or check the payload style
   - Copy that secret

2. **Add to Vercel:**
   - Go to Vercel → Settings → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with the **Snapshot secret**
   - Save

3. **Optional: Delete Thin Destination**
   - If you only want Snapshot, you can delete the Thin destination in Stripe
   - This will simplify things and remove the extra secret

### Option 2: Keep Both (Advanced)

If you want to handle both payload styles:
1. You'd need to update your code to detect payload style
2. Use different secrets for each
3. More complex - not recommended unless needed

---

## 🔍 How to Identify Which Secret is Which

In Stripe dashboard:
1. Go to your webhook
2. Look at the destinations/endpoints listed
3. Each should show:
   - URL (should be the same: `https://cloudgreet.com/api/stripe/webhook`)
   - Payload style: "Snapshot" or "Thin"
   - Signing secret

**The Snapshot one is what you want.**

---

## ✅ Recommended Action

1. **Use Snapshot secret only:**
   - Copy the Snapshot payload secret
   - Add to Vercel: `STRIPE_WEBHOOK_SECRET`
   - Redeploy

2. **Delete Thin destination (optional but recommended):**
   - In Stripe, find the Thin destination
   - Delete it if you don't need it
   - This keeps things simple

---

## 🧪 Test It

After adding the Snapshot secret:
1. Go to Stripe webhook
2. Click "Send test webhook"
3. Select event: `checkout.session.completed`
4. Check Vercel logs - should see successful processing

---

## 💡 Why Two Secrets?

Stripe created two destinations because:
- Some events support Snapshot style
- Some events support Thin style
- Stripe creates separate destinations for each style

But since your code handles Snapshot style, you only need the Snapshot secret.

---

**TL;DR:** Use the **Snapshot payload secret** in Vercel. Your code is designed for snapshot payloads, so that's the one you need.











