-- ============================================================
-- Lead enrichment + quality score
-- ============================================================
-- Surfaces the data we already pull from Google Places (rating,
-- review count, address, types) on the lead row itself instead of
-- buried in scrape_results.raw. Lets the rep portal sort by quality
-- and render a "real business" card instead of just a phone number.
--
-- quality_score: numeric column we sort by. Computed at promote time
--   as log(review_count + 1) * rating, so a 4.7-star shop with 142
--   reviews scores ~10.4, while a 1.0-star ghost listing with 2
--   reviews scores ~0.5. NULL means "no Google enrichment" and sorts
--   to the bottom.
--
-- google_last_activity_at: best-effort proxy for "is this business
--   alive right now". Populated from the most recent review timestamp
--   when we have it. Reps use this to skip zombie shops.
--
-- Idempotent.
-- ============================================================

alter table public.leads
  add column if not exists website                 text,
  add column if not exists address                 text,
  add column if not exists city                    text,
  add column if not exists state                   text,
  add column if not exists zip                     text,
  add column if not exists business_type           text,
  add column if not exists google_rating           numeric(3,1),
  add column if not exists google_review_count     integer,
  add column if not exists google_place_id         text,
  add column if not exists google_last_activity_at timestamptz,
  add column if not exists google_business_status  text,
  add column if not exists quality_score           numeric;

create index if not exists leads_quality_idx
  on public.leads (quality_score desc nulls last);

create index if not exists leads_google_place_idx
  on public.leads (google_place_id) where google_place_id is not null;
