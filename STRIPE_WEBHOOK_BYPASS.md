# Bypass Stripe Dashboard - Use Stripe CLI Instead

## Why This Works
Stripe CLI can forward webhooks directly to your endpoint WITHOUT needing to configure anything in the dashboard. This bypasses the grayed-out events issue completely.

## Step 1: Install Stripe CLI
```bash
# Windows (PowerShell)
# Download from: https://github.com/stripe/stripe-cli/releases
# Or use winget:
winget install stripe.stripe-cli

# Or use scoop:
scoop install stripe
```

## Step 2: Login to Stripe CLI
```bash
stripe login
```
This will open your browser to authorize. Follow the prompts.

## Step 3: Forward Webhooks to Your Endpoint
```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
```

This will:
- Forward ALL webhook events to your endpoint
- Show you the webhook secret (starts with `whsec_`)
- Work even if dashboard events are grayed out

## Step 4: Copy Webhook Secret
When you run `stripe listen`, it will show:
```
Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

Copy that `whsec_...` value and add to Vercel as `STRIPE_WEBHOOK_SECRET`

## Step 5: Test It
In another terminal:
```bash
stripe trigger checkout.session.completed
```

This sends a test event to your webhook. Check Vercel logs to see if it processed.

## Alternative: Just Use Stripe CLI for Testing
You can keep using Stripe CLI to forward webhooks during development, and only configure the dashboard webhook for production later.








