-- Cache the most-recent Stripe Checkout session per close so a
-- double-click on "Generate payment link" returns the same URL
-- instead of orphaning a second session in Stripe.
--
-- We invalidate the cache when the agreed pricing changes or the
-- session expires (Stripe sessions are valid for 24h by default).

alter table public.closes
  add column if not exists latest_payment_session_id text,
  add column if not exists latest_payment_session_url text,
  add column if not exists latest_payment_session_expires_at timestamptz,
  add column if not exists latest_payment_session_monthly_cents integer,
  add column if not exists latest_payment_session_setup_cents integer;
