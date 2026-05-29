-- billing_history: de-dupe subscription payments by Stripe invoice id.
--
-- Stripe fires BOTH `invoice.paid` and `invoice.payment_succeeded` for the
-- same invoice (distinct event ids), so the webhook_events idempotency table
-- does not collapse them. The webhook handler inserted a billing_history row
-- on each, double-counting revenue. We add the invoice id + a unique index so
-- the handler can upsert (onConflict: stripe_invoice_id, ignoreDuplicates).
--
-- NULLs are distinct in a Postgres unique index, so existing rows and one-time
-- (mode='payment') checkouts - which have no invoice id - are unaffected.
--
-- Idempotent: safe to re-run.

alter table public.billing_history
  add column if not exists stripe_invoice_id text;

create unique index if not exists billing_history_stripe_invoice_id_key
  on public.billing_history (stripe_invoice_id);
