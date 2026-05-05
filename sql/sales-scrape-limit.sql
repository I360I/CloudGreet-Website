-- Per-rep cap on the lead scraper. Treated as a *daily* total - the
-- API sums results_count across the rep's scrape_jobs created today
-- and caps any new scrape to the remaining budget.
--
-- Default 200; admin can raise individual reps in their profile.
-- Idempotent: safe to re-run.
alter table public.sales_reps
  add column if not exists lead_scrape_limit integer not null default 200;

-- Bump the column default to 200 for any future inserts (no-op if
-- already 200).
alter table public.sales_reps
  alter column lead_scrape_limit set default 200;

-- Existing reps still on the old 100 default get bumped to 200.
update public.sales_reps
  set lead_scrape_limit = 200
  where lead_scrape_limit = 100;
