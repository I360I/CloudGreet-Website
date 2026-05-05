-- Per-rep cap on the lead scraper.
-- Default 100 results/job; admin can raise individual reps in their profile.
alter table public.sales_reps
  add column if not exists lead_scrape_limit integer not null default 100;
