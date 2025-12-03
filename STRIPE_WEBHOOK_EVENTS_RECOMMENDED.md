# Stripe Webhook Events - Recommended List

## ✅ Currently Handled (6 Events) - REQUIRED

Your webhook handler code processes these events:

1. **`checkout.session.completed`** ✅
   - Activates subscription when customer completes checkout
   - **Action:** Updates `businesses.subscription_status` to 'active'

2. **`customer.subscription.created`** ✅
   - Creates subscription record in database
   - **Action:** Inserts into `stripe_subscriptions` table

3. **`customer.subscription.updated`** ✅
   - Updates subscription status (active, past_due, cancelled, etc.)
   - **Action:** Updates `businesses.subscription_status` and `stripe_subscriptions`

4. **`customer.subscription.deleted`** ✅
   - Handles subscription cancellation
   - **Action:** Sets subscription status to 'cancelled'

5. **`invoice.payment_succeeded`** ✅
   - Logs successful subscription payments
   - **Action:** Inserts into `billing_history` table

6. **`invoice.payment_failed`** ✅
   - Notifies of payment failures
   - **Action:** Sets subscription status to 'past_due'

---

## 📊 Recommended Additional Events (For Better Monitoring)

These events aren't handled in code yet, but are useful to track:

### Customer Events (Monitoring & Analytics)
7. **`customer.created`** 📊
   - When a new Stripe customer is created
   - **Use:** Track customer creation, analytics

8. **`customer.updated`** 📊
   - When customer info changes (email, name, etc.)
   - **Use:** Keep customer data in sync

9. **`customer.deleted`** 📊
   - When customer is deleted from Stripe
   - **Use:** Clean up customer records

### Invoice Events (Better Tracking)
10. **`invoice.created`** 📊
    - When invoice is created (before payment)
    - **Use:** Track invoice lifecycle, send reminders

11. **`invoice.finalized`** 📊
    - When invoice is finalized and ready for payment
    - **Use:** Send invoice notifications

12. **`invoice.updated`** 📊
    - When invoice details change
    - **Use:** Keep invoice records updated

13. **`invoice.voided`** 📊
    - When invoice is voided/cancelled
    - **Use:** Track cancelled invoices

### Payment Events (Additional Payment Tracking)
14. **`payment_intent.succeeded`** 📊
    - When payment intent succeeds
    - **Use:** Additional payment confirmation (backup to invoice.payment_succeeded)

15. **`payment_intent.payment_failed`** 📊
    - When payment intent fails
    - **Use:** Additional failure tracking

### Subscription Trial Events (Future Features)
16. **`customer.subscription.trial_will_end`** 📊
    - Sent 3 days before trial ends
    - **Use:** Send trial ending reminders (not implemented yet)

### Upcoming Invoice Events (Future Features)
17. **`invoice.upcoming`** 📊
    - Sent 7 days before next invoice is due
    - **Use:** Send payment reminders (not implemented yet)

---

## 🎯 Recommendation

### Minimum Setup (6 Events) - What You Have Now
**Required for basic functionality:**
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

### Recommended Setup (10-12 Events) - Better Monitoring
**Add these for better tracking:**
- All 6 minimum events ✅
- customer.created
- customer.updated
- invoice.created
- invoice.finalized
- payment_intent.succeeded (backup tracking)

### Full Setup (17 Events) - Complete Coverage
**Add all events for maximum visibility:**
- All events listed above

---

## 💡 My Recommendation For You

**Start with 10-12 events:**
1. All 6 currently handled events (required)
2. `customer.created` - Track new customers
3. `customer.updated` - Keep customer data sync
4. `invoice.created` - Track invoice lifecycle
5. `invoice.finalized` - Better invoice tracking
6. `payment_intent.succeeded` - Backup payment confirmation

**Why not all 17?**
- Your code doesn't handle them yet (they'll just be logged)
- More events = more webhook traffic (but minimal impact)
- You can always add more later

**Why add more than 6?**
- Better monitoring in Stripe dashboard
- Future-proofing (you can add handlers later)
- Better analytics and debugging
- No downside (they're just logged if not handled)

---

## 🚀 Quick Setup

When creating your new webhook, add these events:

### Required (6):
- ✅ checkout.session.completed
- ✅ customer.subscription.created
- ✅ customer.subscription.updated
- ✅ customer.subscription.deleted
- ✅ invoice.payment_succeeded
- ✅ invoice.payment_failed

### Recommended (4-6 more):
- 📊 customer.created
- 📊 customer.updated
- 📊 invoice.created
- 📊 invoice.finalized
- 📊 payment_intent.succeeded

**Total: 10-11 events** (good balance of functionality and monitoring)

---

## 📝 Notes

- Events not handled in code will still be logged in `webhook_events` table
- You can add handlers for additional events later
- Unhandled events won't cause errors (they just log and continue)
- More events = better visibility into what's happening in Stripe












