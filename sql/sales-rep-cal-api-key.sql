-- Per-rep Cal.com API key. Lets the rep dashboard pull their
-- upcoming bookings so demos they've scheduled with prospects
-- show up in the overview "Call list" alongside manual follow-ups.
--
-- Stored plaintext - Supabase encrypts at rest. Surface this in the
-- rep's Settings page, never in admin lists or shared rep views.
alter table public.sales_reps
  add column if not exists cal_api_key text;
