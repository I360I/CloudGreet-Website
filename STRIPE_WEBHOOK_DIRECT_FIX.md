# STRIPE WEBHOOK - DIRECT FIX

## Problem: Events are grayed out

## Solution: Delete and recreate webhook

1. **Delete current webhook:**
   - Go to your webhook page
   - Click "Delete" or trash icon
   - Confirm deletion

2. **Create NEW webhook:**
   - Go to: Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://cloudgreet.com/api/stripe/webhook`
   - **When you select events, they should ALL be available** (not grayed out)
   - Select these 6:
     - checkout.session.completed
     - customer.subscription.created
     - customer.subscription.updated
     - customer.subscription.deleted
     - invoice.payment_succeeded
     - invoice.payment_failed
   - Click "Add endpoint"

3. **Copy webhook secret:**
   - On the new webhook page, click "Reveal" on signing secret
   - Copy `whsec_...` value
   - Add to Vercel: `STRIPE_WEBHOOK_SECRET`

## If events still grayed out:

**Check your Stripe account:**
- Are you in Test mode or Live mode? (switch to Live if needed)
- Do you have a subscription product created? (you need one)
- Is your account fully activated?

**Alternative: Use Stripe CLI to forward webhooks:**
```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
```

This bypasses the dashboard completely.












