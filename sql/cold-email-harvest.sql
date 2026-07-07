-- Applied 2026-07-06 via Supabase MCP (migration: cold_email_harvest).
-- See lib/cold-outreach/harvest.ts for the pipeline.
create table if not exists public.harvest_targets (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  city text not null,
  state text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'pending',
  found_count integer,
  new_count integer,
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(category, city, state)
);
create index if not exists idx_harvest_targets_pending
  on public.harvest_targets(status) where status = 'pending';
alter table public.email_campaigns
  add column if not exists auto_feed_category text;
