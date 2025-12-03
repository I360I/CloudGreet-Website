# Finding the Stripe CLI Event

## The Error You Saw

The error at `04:36:58` is from our test script - that's expected (it has invalid signature).

## What We Need to Find

When you ran `stripe trigger checkout.session.completed`, it should have:
1. Sent a webhook event to your endpoint
2. Created a log entry in Vercel

## Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Functions → `/api/stripe/webhook`
2. Look for log entries **AFTER** `04:36:58` (the error you saw)
3. Check for entries around the time you ran the `stripe trigger` command

**Look for:**
- ✅ "Stripe webhook event received"
- ✅ "Event type: checkout.session.completed"
- ✅ "Business subscription activated" (if business_id was in metadata)
- ❌ Any error messages

## Check Stripe Dashboard

1. Go to: **Developers** → **Webhooks**
2. Click your webhook
3. Check **"Logs"** tab
4. Look for recent entries (should be from when you ran the trigger)

**You should see:**
- Event: `checkout.session.completed`
- Status: 200 OK (if successful) or an error code
- Time: When you ran the trigger

## Important Questions

1. **When did you run `stripe trigger checkout.session.completed`?**
   - Was it before or after `04:36:58`?
   - Check the timestamp in the Stripe CLI output

2. **Do you see any entries in Vercel logs AFTER that error?**
   - Scroll down in Vercel logs
   - Look for entries with timestamps after `04:36:58`

3. **Do you see the event in Stripe dashboard logs?**
   - Check the "Logs" tab on your webhook
   - Look for `checkout.session.completed` event

## If You Don't See the Event

**Possible reasons:**
1. **Stripe CLI didn't forward to your endpoint**
   - Did you run `stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook` first?
   - If not, Stripe CLI just created the event but didn't send it to your webhook

2. **Webhook secret mismatch**
   - If Stripe CLI is using a different secret than your webhook
   - Check if `stripe listen` showed a webhook secret

3. **Event was sent but webhook rejected it**
   - Check for 401/500 errors in Stripe dashboard

## Quick Check

**Run this to see if Stripe CLI is forwarding:**
```bash
stripe listen --forward-to https://cloudgreet.com/api/stripe/webhook
```

Then in another terminal:
```bash
stripe trigger checkout.session.completed
```

You should see the event appear in the first terminal if it's forwarding correctly.

---

**What do you see in:**
1. Vercel logs (any entries after `04:36:58`)?
2. Stripe dashboard logs (any `checkout.session.completed` entries)?











